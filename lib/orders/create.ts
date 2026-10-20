import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPublicClient } from '@/lib/supabase/public';
import { mapProduct, PRODUCT_SELECT, type ProductRow } from '@/lib/catalog/mappers';
import { getOperationFresh } from '@/lib/catalog/queries';
import { computeStoreStatus } from '@/lib/business-hours';
import { priceLine, sumLines, type PricedLine, type PricingError } from '@/lib/pricing';
import { centsToDecimal, formatBRL, type Cents } from '@/lib/money';
import { buildOrderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';
import { hashIp, hashPayload, orderAccessToken } from '@/lib/orders/token';
import type { CheckoutPayload, CartLineInput } from '@/lib/validation/checkout';
import type { CatalogProduct } from '@/types/catalog';
import type { DeliveryFeeStatus } from '@/lib/orders/labels';
import { SITE_URL } from '@/config/business';
import { getOrderSnapshot } from './snapshot';

/** Pedidos por IP a cada RATE_WINDOW_MINUTES (variável ORDER_RATE_LIMIT, padrão 8). */
export const MAX_ORDERS_PER_IP_WINDOW = Math.max(1, Number(process.env.ORDER_RATE_LIMIT) || 8);
export const RATE_WINDOW_MINUTES = 10;

export class OrderError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** Busca no banco (sem cache) os produtos do carrinho. */
export async function loadProductsForCart(productIds: string[]): Promise<Map<string, CatalogProduct>> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return new Map();
  const { data, error } = await createPublicClient().from('products').select(PRODUCT_SELECT).in('id', ids);
  if (error) throw new OrderError(503, 'CATALOG_UNAVAILABLE', 'Não foi possível consultar o cardápio agora. Tente novamente.');
  return new Map(
    (data as unknown as ProductRow[])
      .filter((row) => row.is_active && !row.deleted_at)
      .map((row) => [row.id, mapProduct(row)]),
  );
}

export interface QuotedLine {
  index: number;
  ok: boolean;
  line?: PricedLine;
  error?: PricingError;
}

export function quoteLines(
  items: CartLineInput[],
  products: Map<string, CatalogProduct>,
  ctx: { now: Date; openShifts: ('lunch' | 'dinner')[] | null },
): QuotedLine[] {
  return items.map((item, index) => {
    const result = priceLine(products.get(item.productId), { ...item, notes: item.notes ?? undefined }, ctx);
    return result.ok ? { index, ok: true, line: result.line } : { index, ok: false, error: result.error };
  });
}

export interface CreatedOrder {
  code: string;
  accessToken: string;
  trackingUrl: string;
  whatsappUrl: string;
  message: string;
  replayed: boolean;
  totals: {
    grossSubtotal: Cents;
    discountTotal: Cents;
    itemsSubtotal: Cents;
    deliveryFee: Cents | null;
    deliveryFeeStatus: DeliveryFeeStatus;
    total: Cents;
    totalIsFinal: boolean;
  };
}

/**
 * Registra um pedido. Etapas:
 * 1. horário e status de funcionamento (servidor);
 * 2. modalidade e forma de pagamento permitidas;
 * 3. preços recalculados a partir do banco (o total do navegador é só conferência);
 * 4. limite de pedidos por IP;
 * 5. gravação atômica e idempotente (create_order).
 */
export async function createOrder(
  input: CheckoutPayload,
  opts: { customerId: string | null; ip: string; now?: Date },
): Promise<CreatedOrder> {
  const now = opts.now ?? new Date();
  const operation = await getOperationFresh();
  const { settings } = operation;
  const status = computeStoreStatus(operation.hours, now);

  // Reenvio da mesma solicitação (ex.: clique duplo ou rede instável): devolve o mesmo pedido.
  const requestHash = hashPayload({ ...input, idempotencyKey: undefined, confirmed: undefined });
  const admin = createAdminClient();
  const existing = await admin
    .from('orders')
    .select('id, request_hash')
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (existing.data) {
    if (existing.data.request_hash !== requestHash) {
      throw new OrderError(409, 'IDEMPOTENCY_CONFLICT', 'Este pedido já foi enviado com outros dados. Atualize a página.');
    }
    return buildResponse(existing.data.id, settings.whatsappNumber, true);
  }

  if (!status.acceptingOrders) {
    throw new OrderError(409, 'STORE_CLOSED', status.message, { nextOpening: status.nextOpening });
  }

  const enabled = {
    delivery: settings.deliveryEnabled,
    pickup: settings.pickupEnabled,
    dine_in: settings.dineInEnabled,
  }[input.fulfillment];
  if (!enabled) throw new OrderError(422, 'FULFILLMENT_DISABLED', 'Esta modalidade não está disponível no momento.');
  if (!settings.paymentMethods[input.fulfillment]?.includes(input.payment.method)) {
    throw new OrderError(422, 'PAYMENT_NOT_ALLOWED', 'Forma de pagamento indisponível para esta modalidade.');
  }

  const products = await loadProductsForCart(input.items.map((i) => i.productId));
  const quoted = quoteLines(input.items, products, { now, openShifts: status.openShifts });
  const failures = quoted.filter((q) => !q.ok);
  if (failures.length > 0) {
    throw new OrderError(422, 'INVALID_ITEMS', 'Alguns itens do carrinho precisam ser revisados.', {
      items: failures.map((f) => ({ index: f.index, code: f.error?.code, message: f.error?.message })),
    });
  }
  const lines = quoted.map((q) => q.line as PricedLine);
  const totals = sumLines(lines);

  if (totals.itemsSubtotal !== input.expectedItemsTotalCents) {
    throw new OrderError(409, 'PRICE_CHANGED', 'Os valores do cardápio foram atualizados. Confira o novo total antes de enviar.', {
      itemsSubtotal: totals.itemsSubtotal,
    });
  }
  if (settings.minOrderValue !== null && totals.itemsSubtotal < settings.minOrderValue) {
    throw new OrderError(422, 'BELOW_MINIMUM', `O pedido mínimo é de ${formatBRL(settings.minOrderValue)}.`);
  }

  // Taxa de entrega: nunca calculada por distância. Se o bairro tiver taxa cadastrada
  // ela é usada como PREVISÃO; a equipe confirma o valor no painel.
  let deliveryFee: Cents | null = null;
  let feeStatus: DeliveryFeeStatus = 'not_applicable';
  let zoneId: string | null = null;
  if (input.fulfillment === 'delivery') {
    feeStatus = 'pending';
    const zone = input.address?.zoneId ? operation.zones.find((z) => z.id === input.address?.zoneId) : undefined;
    if (zone) {
      zoneId = zone.id;
      if (zone.fee !== null) {
        deliveryFee = zone.fee;
        feeStatus = 'estimated';
      }
    }
  }
  const total = totals.itemsSubtotal + (deliveryFee ?? 0);

  if (input.payment.method === 'cash' && input.payment.changeForCents && input.payment.changeForCents < total) {
    throw new OrderError(422, 'INVALID_CHANGE', `O valor para troco deve ser maior que ${formatBRL(total)}.`);
  }

  const ipHash = hashIp(opts.ip || 'unknown');
  const recent = await admin.rpc('recent_orders_from_ip', { p_ip_hash: ipHash, p_minutes: RATE_WINDOW_MINUTES });
  if (!recent.error && Number(recent.data) >= MAX_ORDERS_PER_IP_WINDOW) {
    throw new OrderError(429, 'RATE_LIMITED', 'Muitos pedidos em pouco tempo. Aguarde alguns minutos ou fale conosco pelo WhatsApp.');
  }

  const address = input.fulfillment === 'delivery' ? input.address : null;
  const location = input.fulfillment === 'delivery' ? input.location : null;
  const payload = {
    idempotency_key: input.idempotencyKey,
    request_hash: requestHash,
    customer_id: opts.customerId,
    customer_name: input.customer.name,
    customer_phone: input.customer.phone,
    fulfillment: input.fulfillment,
    service_shift: status.openShifts[status.openShifts.length - 1] ?? null,
    address_street: address?.street ?? null,
    address_number: address?.number ?? null,
    address_neighborhood: address?.neighborhood ?? null,
    address_complement: address?.complement ?? null,
    address_reference: address?.reference ?? null,
    address_city: address?.city ?? null,
    address_state: address?.state ?? null,
    address_postal_code: address?.postalCode ?? null,
    delivery_zone_id: zoneId,
    latitude: location ? Number(location.latitude.toFixed(6)) : null,
    longitude: location ? Number(location.longitude.toFixed(6)) : null,
    location_accuracy_m: location?.accuracy ? Math.round(location.accuracy) : null,
    location_source: location?.source ?? null,
    table_label: input.fulfillment === 'dine_in' ? input.tableLabel : null,
    payment_method: input.payment.method,
    cash_change_for: input.payment.method === 'cash' && input.payment.changeForCents ? centsToDecimal(input.payment.changeForCents) : null,
    notes: input.notes,
    gross_subtotal: centsToDecimal(totals.grossSubtotal),
    discount_total: centsToDecimal(totals.discountTotal),
    items_subtotal: centsToDecimal(totals.itemsSubtotal),
    delivery_fee: deliveryFee === null ? null : centsToDecimal(deliveryFee),
    delivery_fee_status: feeStatus,
    total: centsToDecimal(total),
    ip_hash: ipHash,
    items: lines.map((line) => ({
      product_id: line.productId,
      variant_id: line.variantId,
      category_id: line.categoryId,
      promotion_id: line.promotionId,
      product_kind: line.kind,
      product_name: line.productName,
      variant_name: line.variantName,
      category_name: line.categoryName,
      quantity: line.quantity,
      unit_regular_price: centsToDecimal(line.unitRegular),
      unit_discount: centsToDecimal(line.unitDiscount),
      unit_price: centsToDecimal(line.unitPrice),
      line_total: centsToDecimal(line.lineTotal),
      notes: line.notes,
      pricing_detail: { ...line.detail, summary: line.summary },
      options: line.options.map((o) => ({
        group_id: o.groupId,
        option_value_id: o.valueId,
        group_kind: o.groupKind,
        group_name: o.groupName,
        value_name: o.valueName,
        price: centsToDecimal(o.price),
      })),
    })),
  };

  const { data, error } = await admin.rpc('create_order', { p_order: payload });
  if (error || !data?.[0]) {
    console.error('[pedido] falha ao gravar', error?.code, error?.message);
    throw new OrderError(503, 'ORDER_NOT_SAVED', 'Não conseguimos registrar seu pedido agora. Seu carrinho foi mantido; tente novamente.');
  }
  const row = data[0] as { order_id: string; created: boolean; stored_request_hash: string };
  if (!row.created && row.stored_request_hash !== requestHash) {
    throw new OrderError(409, 'IDEMPOTENCY_CONFLICT', 'Este pedido já foi enviado com outros dados. Atualize a página.');
  }
  return buildResponse(row.order_id, settings.whatsappNumber, !row.created);
}

/** Monta a resposta (mensagem + link do WhatsApp) a partir do pedido GRAVADO. */
async function buildResponse(orderId: string, whatsappNumber: string, replayed: boolean): Promise<CreatedOrder> {
  const order = await getOrderSnapshot(orderId);
  if (!order) throw new OrderError(503, 'ORDER_NOT_SAVED', 'Pedido não encontrado após o registro.');
  const accessToken = orderAccessToken(orderId);
  const trackingUrl = `${SITE_URL}/pedido/${order.code}?t=${accessToken}`;
  const message = buildOrderMessage({ ...order.whatsapp, trackingUrl });
  return {
    code: order.code,
    accessToken,
    trackingUrl,
    whatsappUrl: buildWhatsAppUrl(whatsappNumber, message),
    message,
    replayed,
    totals: order.totals,
  };
}


export function newIdempotencyKey() {
  return randomUUID();
}

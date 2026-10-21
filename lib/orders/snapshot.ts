import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { toCents, toCentsOrNull, type Cents } from '@/lib/money';
import type { WhatsAppOrder } from '@/lib/whatsapp';
import type {
  CancelReason,
  DeliveryFeeStatus,
  Fulfillment,
  OrderStatus,
  PaymentMethod,
} from '@/lib/orders/labels';

export const ORDER_DETAIL_SELECT = `
  id, code, customer_id, customer_name, customer_phone, fulfillment, status, address_street, address_number,
  address_neighborhood, address_complement, address_reference, address_city, address_state, address_postal_code,
  latitude, longitude, location_accuracy_m, location_source, table_label, payment_method, cash_change_for, notes,
  gross_subtotal, discount_total, items_subtotal, delivery_fee, delivery_fee_status, total, total_is_final,
  submitted_total, approved_total, needs_customer_approval, whatsapp_opened_at, customer_confirmed_at,
  customer_approved_at, accepted_at, completed_at, cancelled_at, cancel_reason, cancel_note, created_at, updated_at,
  service_shift, anonymized_at,
  order_items ( id, product_id, variant_id, product_kind, product_name, variant_name, category_name, quantity,
    unit_regular_price, unit_discount, unit_price, line_total, notes, pricing_detail, sort_order,
    order_item_options ( group_id, option_value_id, group_kind, group_name, value_name, price, sort_order ) ),
  order_status_history ( from_status, to_status, note, changed_by_role, created_at )
`;

export interface OrderItemView {
  id: string;
  productId: string | null;
  /** Pizza metade/metade: o produto do segundo sabor. */
  halfProductId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  categoryName: string | null;
  quantity: number;
  unitRegular: Cents;
  unitDiscount: Cents;
  unitPrice: Cents;
  lineTotal: Cents;
  notes: string | null;
  summary: string[];
  options: { groupId: string | null; valueId: string | null; groupKind: string; groupName: string; valueName: string; price: Cents }[];
}

export interface OrderView {
  id: string;
  code: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  fulfillment: Fulfillment;
  status: OrderStatus;
  address: WhatsAppOrder['address'];
  postalCode: string | null;
  location: { latitude: number; longitude: number; accuracy: number | null; source: string | null } | null;
  tableLabel: string | null;
  paymentMethod: PaymentMethod;
  cashChangeFor: Cents | null;
  notes: string | null;
  items: OrderItemView[];
  totals: {
    grossSubtotal: Cents;
    discountTotal: Cents;
    itemsSubtotal: Cents;
    deliveryFee: Cents | null;
    deliveryFeeStatus: DeliveryFeeStatus;
    total: Cents;
    totalIsFinal: boolean;
  };
  submittedTotal: Cents;
  approvedTotal: Cents | null;
  needsCustomerApproval: boolean;
  whatsappOpenedAt: string | null;
  cancelReason: CancelReason | null;
  cancelNote: string | null;
  createdAt: string;
  updatedAt: string;
  anonymized: boolean;
  history: { fromStatus: OrderStatus | null; toStatus: OrderStatus; note: string | null; role: string | null; createdAt: string }[];
  whatsapp: WhatsAppOrder;
}

type Row = Record<string, unknown> & {
  order_items: (Record<string, unknown> & { order_item_options: Record<string, unknown>[] })[];
  order_status_history: Record<string, unknown>[];
};

export function mapOrder(row: Row): OrderView {
  const items: OrderItemView[] = [...row.order_items]
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map((i) => {
      const detail = (i.pricing_detail ?? {}) as { summary?: string[]; halves?: { productId: string }[] };
      return {
        id: String(i.id),
        productId: (i.product_id as string | null) ?? null,
        halfProductId: detail.halves?.[1]?.productId ?? null,
        variantId: (i.variant_id as string | null) ?? null,
        productName: String(i.product_name),
        variantName: (i.variant_name as string | null) ?? null,
        categoryName: (i.category_name as string | null) ?? null,
        quantity: Number(i.quantity),
        unitRegular: toCents(i.unit_regular_price as string),
        unitDiscount: toCents(i.unit_discount as string),
        unitPrice: toCents(i.unit_price as string),
        lineTotal: toCents(i.line_total as string),
        notes: (i.notes as string | null) ?? null,
        summary: detail.summary ?? [],
        options: [...i.order_item_options]
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
          .map((o) => ({
            groupId: (o.group_id as string | null) ?? null,
            valueId: (o.option_value_id as string | null) ?? null,
            groupKind: String(o.group_kind),
            groupName: String(o.group_name),
            valueName: String(o.value_name),
            price: toCents(o.price as string),
          })),
      };
    });

  const hasAddress = row.fulfillment === 'delivery' && row.address_street;
  const address = hasAddress
    ? {
        street: String(row.address_street),
        number: String(row.address_number ?? ''),
        neighborhood: String(row.address_neighborhood ?? ''),
        complement: (row.address_complement as string | null) ?? null,
        reference: (row.address_reference as string | null) ?? null,
        city: String(row.address_city ?? ''),
        state: String(row.address_state ?? ''),
      }
    : null;
  const location =
    row.latitude !== null && row.longitude !== null && row.latitude !== undefined
      ? {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracy: (row.location_accuracy_m as number | null) ?? null,
          source: (row.location_source as string | null) ?? null,
        }
      : null;
  const totals = {
    grossSubtotal: toCents(row.gross_subtotal as string),
    discountTotal: toCents(row.discount_total as string),
    itemsSubtotal: toCents(row.items_subtotal as string),
    deliveryFee: toCentsOrNull(row.delivery_fee as string | null),
    deliveryFeeStatus: row.delivery_fee_status as DeliveryFeeStatus,
    total: toCents(row.total as string),
    totalIsFinal: Boolean(row.total_is_final),
  };
  const view: Omit<OrderView, 'whatsapp'> = {
    id: String(row.id),
    code: String(row.code),
    customerId: (row.customer_id as string | null) ?? null,
    customerName: (row.customer_name as string | null) ?? null,
    customerPhone: (row.customer_phone as string | null) ?? null,
    fulfillment: row.fulfillment as Fulfillment,
    status: row.status as OrderStatus,
    address,
    postalCode: (row.address_postal_code as string | null) ?? null,
    location,
    tableLabel: (row.table_label as string | null) ?? null,
    paymentMethod: row.payment_method as PaymentMethod,
    cashChangeFor: toCentsOrNull(row.cash_change_for as string | null),
    notes: (row.notes as string | null) ?? null,
    items,
    totals,
    submittedTotal: toCents(row.submitted_total as string),
    approvedTotal: toCentsOrNull(row.approved_total as string | null),
    needsCustomerApproval: Boolean(row.needs_customer_approval),
    whatsappOpenedAt: (row.whatsapp_opened_at as string | null) ?? null,
    cancelReason: (row.cancel_reason as CancelReason | null) ?? null,
    cancelNote: (row.cancel_note as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    anonymized: Boolean(row.anonymized_at),
    history: [...row.order_status_history]
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((h) => ({
        fromStatus: (h.from_status as OrderStatus | null) ?? null,
        toStatus: h.to_status as OrderStatus,
        note: (h.note as string | null) ?? null,
        role: (h.changed_by_role as string | null) ?? null,
        createdAt: String(h.created_at),
      })),
  };
  return {
    ...view,
    whatsapp: {
      code: view.code,
      customerName: view.customerName ?? 'Cliente',
      customerPhone: view.customerPhone ?? '',
      fulfillment: view.fulfillment,
      items: items.map((i) => ({
        quantity: i.quantity,
        productName: i.productName,
        variantName: i.variantName,
        summary: i.summary,
        notes: i.notes,
        lineTotal: i.lineTotal,
      })),
      ...totals,
      paymentMethod: view.paymentMethod,
      cashChangeFor: view.cashChangeFor,
      address,
      location: location ? { latitude: location.latitude, longitude: location.longitude } : null,
      tableLabel: view.tableLabel,
      notes: view.notes,
    },
  };
}

/** Lê um pedido com a chave secreta. Use SOMENTE após validar token ou permissão. */
export async function getOrderSnapshot(orderId: string): Promise<OrderView | null> {
  const { data, error } = await createAdminClient().from('orders').select(ORDER_DETAIL_SELECT).eq('id', orderId).maybeSingle();
  if (error || !data) return null;
  return mapOrder(data as unknown as Row);
}

export async function getOrderIdByCode(code: string): Promise<string | null> {
  if (!/^ALC-[0-9A-Z]{6}$/.test(code)) return null;
  const { data } = await createAdminClient().from('orders').select('id').eq('code', code).maybeSingle();
  return data?.id ?? null;
}

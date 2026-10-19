/**
 * Mensagem do pedido para o WhatsApp.
 * Usa o link oficial https://wa.me/<número>?text=<mensagem>. O link apenas ABRE a
 * conversa com o texto preenchido: o cliente ainda precisa tocar em "Enviar".
 */
import { formatBRL, type Cents } from '@/lib/money';
import { formatBrazilPhone } from '@/lib/phone';
import {
  FULFILLMENT_LABEL,
  PAYMENT_LABEL,
  type DeliveryFeeStatus,
  type Fulfillment,
  type PaymentMethod,
} from '@/lib/orders/labels';

export interface WhatsAppOrderItem {
  quantity: number;
  productName: string;
  variantName: string | null;
  summary: string[];
  notes: string | null;
  lineTotal: Cents;
}

export interface WhatsAppOrder {
  code: string;
  customerName: string;
  customerPhone: string;
  fulfillment: Fulfillment;
  items: WhatsAppOrderItem[];
  grossSubtotal: Cents;
  discountTotal: Cents;
  itemsSubtotal: Cents;
  deliveryFee: Cents | null;
  deliveryFeeStatus: DeliveryFeeStatus;
  total: Cents;
  paymentMethod: PaymentMethod;
  cashChangeFor: Cents | null;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement: string | null;
    reference: string | null;
    city: string;
    state: string;
  } | null;
  location?: { latitude: number; longitude: number } | null;
  tableLabel?: string | null;
  notes: string | null;
  trackingUrl?: string | null;
}

export function mapLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

export function buildOrderMessage(order: WhatsAppOrder): string {
  const lines: string[] = [];
  lines.push('Olá, Alcinão! Gostaria de confirmar meu pedido.');
  lines.push('');
  lines.push(`*Pedido: #${order.code}*`);
  lines.push('');
  lines.push(`Cliente: ${order.customerName}`);
  lines.push(`Telefone: ${formatBrazilPhone(order.customerPhone)}`);
  lines.push('');
  lines.push(`*MODALIDADE: ${FULFILLMENT_LABEL[order.fulfillment].toUpperCase()}*`);
  if (order.fulfillment === 'dine_in' && order.tableLabel) lines.push(`Mesa: ${order.tableLabel}`);
  lines.push('');
  lines.push('*ITENS:*');
  for (const item of order.items) {
    const title = `${item.quantity}x ${item.productName}${item.variantName ? ` — ${item.variantName}` : ''}`;
    lines.push(`• ${title} (${formatBRL(item.lineTotal)})`);
    for (const detail of item.summary) lines.push(`   - ${detail}`);
    if (item.notes) lines.push(`   - Obs.: ${item.notes}`);
  }
  lines.push('');

  const totalIsFinal = order.fulfillment !== 'delivery' || order.deliveryFeeStatus === 'confirmed';
  if (order.discountTotal > 0) {
    lines.push(`Subtotal (preço normal): ${formatBRL(order.grossSubtotal)}`);
    lines.push(`Descontos: -${formatBRL(order.discountTotal)}`);
    lines.push(`Subtotal dos itens: ${formatBRL(order.itemsSubtotal)}`);
  } else {
    lines.push(`Subtotal: ${formatBRL(order.itemsSubtotal)}`);
  }
  if (order.fulfillment === 'delivery') {
    if (order.deliveryFeeStatus === 'confirmed' && order.deliveryFee !== null) {
      lines.push(`Taxa de entrega: ${formatBRL(order.deliveryFee)}`);
    } else if (order.deliveryFeeStatus === 'estimated' && order.deliveryFee !== null) {
      lines.push(`Taxa de entrega: ${formatBRL(order.deliveryFee)} (prevista, a confirmar)`);
    } else {
      lines.push('Taxa de entrega: A confirmar');
    }
  }
  if (totalIsFinal) {
    lines.push(`*Total: ${formatBRL(order.total)}*`);
  } else if (order.deliveryFeeStatus === 'estimated') {
    lines.push(`*Total estimado: ${formatBRL(order.total)} (a confirmar)*`);
  } else {
    lines.push(`*Total: A confirmar* (itens: ${formatBRL(order.itemsSubtotal)} + taxa de entrega)`);
  }
  lines.push('');
  lines.push(`Pagamento: ${PAYMENT_LABEL[order.paymentMethod]}`);
  if (order.paymentMethod === 'cash') {
    lines.push(order.cashChangeFor ? `Troco para: ${formatBRL(order.cashChangeFor)}` : 'Não precisa de troco');
  }

  if (order.fulfillment === 'delivery' && order.address) {
    const a = order.address;
    lines.push('');
    lines.push(`Endereço: ${a.street}, ${a.number}${a.complement ? ` (${a.complement})` : ''} — ${a.neighborhood}, ${a.city}/${a.state}`);
    if (a.reference) lines.push(`Referência: ${a.reference}`);
    if (order.location) lines.push(`Localização: ${mapLink(order.location.latitude, order.location.longitude)}`);
  }
  if (order.notes) {
    lines.push('');
    lines.push(`Observações: ${order.notes}`);
  }
  lines.push('');
  if (order.fulfillment === 'delivery') {
    lines.push('Aguardo a confirmação da disponibilidade, da taxa de entrega e do pedido.');
  } else {
    lines.push('Aguardo a confirmação da disponibilidade e do pedido.');
  }
  if (order.trackingUrl) {
    lines.push('');
    lines.push(`Acompanhar: ${order.trackingUrl}`);
  }
  return lines.join('\n');
}

export function buildWhatsAppUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Link para a equipe abrir conversa com o cliente (sem mensagem). */
export function buildCustomerChatUrl(phoneDigits: string, message?: string): string {
  const number = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
  return message ? buildWhatsAppUrl(number, message) : `https://wa.me/${number}`;
}

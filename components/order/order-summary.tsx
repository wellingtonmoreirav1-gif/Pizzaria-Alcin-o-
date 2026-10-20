import { formatBRL } from '@/lib/money';
import { FEE_STATUS_LABEL, FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/lib/orders/labels';
import type { OrderView } from '@/lib/orders/snapshot';

/** Itens e valores de um pedido (usado pelo cliente e pelo painel). */
export function OrderSummary({ order }: { order: OrderView }) {
  const t = order.totals;
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-3">
            <div>
              <p className="font-semibold">
                {item.quantity}x {item.productName}
                {item.variantName ? <span className="font-normal text-muted"> — {item.variantName}</span> : null}
              </p>
              {item.summary.map((s) => (
                <p key={s} className="text-xs text-muted">{s}</p>
              ))}
              {item.notes ? <p className="text-xs italic text-muted">Obs.: {item.notes}</p> : null}
            </div>
            <p className="shrink-0 text-right tabular-nums">
              {item.unitDiscount > 0 ? <s className="block text-xs text-muted">{formatBRL(item.unitRegular * item.quantity)}</s> : null}
              {formatBRL(item.lineTotal)}
            </p>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
        <Row label="Subtotal (preço de tabela)" value={formatBRL(t.grossSubtotal)} />
        {t.discountTotal > 0 ? <Row label="Descontos" value={`-${formatBRL(t.discountTotal)}`} /> : null}
        {order.fulfillment === 'delivery' ? (
          <Row
            label={`Taxa de entrega (${FEE_STATUS_LABEL[t.deliveryFeeStatus].toLowerCase()})`}
            value={t.deliveryFee !== null ? formatBRL(t.deliveryFee) : 'A confirmar'}
          />
        ) : null}
        <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
          <dt>{t.totalIsFinal ? 'Total' : t.deliveryFeeStatus === 'estimated' ? 'Total estimado (a confirmar)' : 'Total dos itens (taxa a confirmar)'}</dt>
          <dd className="tabular-nums text-gold" data-testid="order-total">{formatBRL(t.total)}</dd>
        </div>
      </dl>
      <dl className="grid gap-2 rounded-2xl bg-mist p-4 text-sm sm:grid-cols-2">
        <Row label="Modalidade" value={`${FULFILLMENT_LABEL[order.fulfillment]}${order.tableLabel ? ` · Mesa ${order.tableLabel}` : ''}`} stacked />
        <Row label="Pagamento" value={`${PAYMENT_LABEL[order.paymentMethod]}${order.cashChangeFor ? ` · troco para ${formatBRL(order.cashChangeFor)}` : ''}`} stacked />
        {order.address ? (
          <Row
            stacked
            label="Endereço"
            value={`${order.address.street}, ${order.address.number}${order.address.complement ? ` (${order.address.complement})` : ''} — ${order.address.neighborhood}, ${order.address.city}/${order.address.state}${order.address.reference ? ` · Ref.: ${order.address.reference}` : ''}`}
          />
        ) : null}
        {order.notes ? <Row label="Observações" value={order.notes} stacked /> : null}
      </dl>
    </div>
  );
}

function Row({ label, value, stacked }: { label: string; value: string; stacked?: boolean }) {
  return stacked ? (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  ) : (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

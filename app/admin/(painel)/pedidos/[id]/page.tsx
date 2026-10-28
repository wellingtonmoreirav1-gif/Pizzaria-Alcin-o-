import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ChevronLeft, ExternalLink, MapPin, MessageCircle } from 'lucide-react';
import { z } from 'zod';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { mapOrder, ORDER_DETAIL_SELECT } from '@/lib/orders/snapshot';
import { formatBRL, toCents } from '@/lib/money';
import { formatBrazilPhone } from '@/lib/phone';
import { buildCustomerChatUrl, mapLink } from '@/lib/whatsapp';
import { allowedNextStatuses, CANCEL_REASON_LABEL, FEE_STATUS_LABEL, ORDER_STATUS_LABEL, type CancelReason, type OrderStatus } from '@/lib/orders/labels';
import { Card, PageHeader, SelectField, TextField, centsInput } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { OrderStatusBadge } from '@/components/admin/order-status-badge';
import { OrderSummary } from '@/components/order/order-summary';
import { Notice } from '@/components/ui/feedback';
import { approveTotal, changeStatus, setDeliveryFee } from '../actions';

export const metadata = { title: 'Pedido' };

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  customer_confirmed: 'Cliente confirmou no WhatsApp',
  accepted: 'Aceitar pedido',
  preparing: 'Iniciar preparo',
  ready: 'Marcar como pronto',
  out_for_delivery: 'Saiu para entrega',
  completed: 'Concluir pedido',
};

export default async function OrderDetailPage({ params }: PageProps<'/admin/pedidos/[id]'>) {
  const ctx = await requireStaff([...PERMISSIONS.orders]);
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSessionClient();
  const [{ data }, adjustments] = await Promise.all([
    supabase.from('orders').select(ORDER_DETAIL_SELECT).eq('id', id).maybeSingle(),
    supabase
      .from('order_adjustments')
      .select('kind, old_fee, new_fee, new_fee_status, old_total, new_total, note, created_at')
      .eq('order_id', id)
      .order('created_at'),
  ]);
  if (!data) notFound();
  const order = mapOrder(data as never);
  const next = allowedNextStatuses(order.status, order.fulfillment).filter((s) => s !== 'cancelled');
  const canCancel = allowedNextStatuses(order.status, order.fulfillment).includes('cancelled');
  const closed = order.status === 'completed' || order.status === 'cancelled';
  const feeLocked =
    order.totals.deliveryFeeStatus === 'confirmed' && ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(order.status) && ctx.role === 'attendant';

  const confirmText = order.totals.totalIsFinal
    ? `Olá, ${order.customerName ?? ''}! Pedido #${order.code} confirmado. Total: ${formatBRL(order.totals.total)}.`
    : `Olá, ${order.customerName ?? ''}! Recebemos o pedido #${order.code}.`;

  return (
    <div className="space-y-6">
      <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-strong">
        <ChevronLeft className="size-4" aria-hidden /> Pedidos
      </Link>
      <PageHeader
        title={`Pedido #${order.code}`}
        description={`Registrado em ${new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Fortaleza' })}`}
        actions={<OrderStatusBadge status={order.status} />}
      />
      {order.needsCustomerApproval && !closed ? (
        <Notice tone="warning" title="Total alterado: aguardando aprovação do cliente">
          Envie o novo total ({formatBRL(order.totals.total)}) pelo WhatsApp e registre quando o cliente aprovar.
        </Notice>
      ) : null}
      {order.fulfillment === 'delivery' && order.totals.deliveryFeeStatus !== 'confirmed' && !closed ? (
        <Notice tone="warning" title="Taxa de entrega não confirmada">
          O pedido só pode ser aceito depois de confirmar a taxa.
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Card title="Itens e valores">
            <OrderSummary order={order} />
          </Card>
          <Card title="Histórico">
            <ol className="space-y-2 text-sm">
              {order.history.map((h, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="text-muted">
                    {new Date(h.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' })}
                  </span>
                  <strong>{ORDER_STATUS_LABEL[h.toStatus]}</strong>
                  {h.role ? (
                    <span className="text-muted">por {h.role === 'admin' ? 'administrador' : h.role === 'manager' ? 'gerente' : 'atendente'}</span>
                  ) : (
                    <span className="text-muted">pelo site</span>
                  )}
                  {h.note ? <span>— {h.note}</span> : null}
                </li>
              ))}
              {order.whatsappOpenedAt ? (
                <li className="text-muted">
                  Cliente tocou em “Abrir WhatsApp” em{' '}
                  {new Date(order.whatsappOpenedAt).toLocaleString('pt-BR', { timeStyle: 'short', dateStyle: 'short', timeZone: 'America/Fortaleza' })} (não
                  garante o envio).
                </li>
              ) : null}
              {(adjustments.data ?? []).map((a, i) => (
                <li key={`a${i}`} className="text-muted">
                  {new Date(a.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' })} —{' '}
                  {a.kind === 'delivery_fee'
                    ? `Taxa ${a.old_fee !== null ? formatBRL(toCents(a.old_fee)) : 'a confirmar'} → ${formatBRL(toCents(a.new_fee))} (${FEE_STATUS_LABEL[a.new_fee_status as 'confirmed']}); total ${formatBRL(toCents(a.old_total))} → ${formatBRL(toCents(a.new_total))}`
                    : 'Cliente aprovou o total'}
                  {a.note ? ` · ${a.note}` : ''}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Cliente">
            {order.customerPhone ? (
              <div className="space-y-3 text-sm">
                <p className="font-semibold">{order.customerName}</p>
                <p>{formatBrazilPhone(order.customerPhone)}</p>
                <a
                  href={buildCustomerChatUrl(order.customerPhone, confirmText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1f8f4e] px-4 font-semibold text-white"
                >
                  <MessageCircle className="size-4" aria-hidden /> Abrir conversa no WhatsApp
                </a>
                {order.location ? (
                  <a
                    href={mapLink(order.location.latitude, order.location.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-semibold text-brand-700 underline"
                  >
                    <MapPin className="size-4" aria-hidden /> Ver localização no mapa <ExternalLink className="size-3" aria-hidden />
                    {order.location.accuracy ? <span className="font-normal text-muted">(±{order.location.accuracy} m)</span> : null}
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted">Dados pessoais anonimizados.</p>
            )}
          </Card>

          {!closed ? (
            <Card title="Andamento">
              <div className="space-y-3">
                {next.map((s) => (
                  <ActionForm
                    key={s}
                    action={changeStatus.bind(null, order.id, s)}
                    submitLabel={ACTION_LABEL[s] ?? ORDER_STATUS_LABEL[s]}
                    variant={s === 'customer_confirmed' ? 'outline' : 'dark'}
                    className="space-y-2"
                  >
                    <TextField label="Observação (opcional)" name="note" maxLength={300} />
                  </ActionForm>
                ))}
              </div>
            </Card>
          ) : null}

          {order.fulfillment === 'delivery' && !closed ? (
            <Card title="Taxa de entrega" description={`Situação: ${FEE_STATUS_LABEL[order.totals.deliveryFeeStatus]}. Definida manualmente pela equipe.`}>
              {feeLocked ? (
                <p className="text-sm text-muted">Pedido em andamento com taxa confirmada: somente gerente ou administrador pode alterar.</p>
              ) : (
                <ActionForm action={setDeliveryFee.bind(null, order.id)} submitLabel="Registrar taxa">
                  <TextField
                    label="Taxa (R$)"
                    name="fee"
                    inputMode="decimal"
                    defaultValue={centsInput(order.totals.deliveryFee !== null ? order.totals.deliveryFee / 100 : null)}
                    required
                  />
                  <SelectField label="Tipo" name="mode" defaultValue="confirm">
                    <option value="confirm">Confirmada</option>
                    <option value="estimate">Prevista (ainda a confirmar)</option>
                  </SelectField>
                  <TextField label="Justificativa" name="note" maxLength={300} hint="Obrigatória para alterar a taxa de pedido já aceito." />
                </ActionForm>
              )}
            </Card>
          ) : null}

          {order.needsCustomerApproval && !closed ? (
            <Card title="Aprovação do cliente">
              <ActionForm action={approveTotal.bind(null, order.id)} submitLabel="Cliente aprovou o novo total">
                <TextField label="Observação" name="note" maxLength={300} />
              </ActionForm>
            </Card>
          ) : null}

          {canCancel ? (
            <Card title="Cancelar pedido" description="Use também para fora da área de entrega ou item indisponível.">
              <ActionForm
                action={changeStatus.bind(null, order.id, 'cancelled')}
                submitLabel="Cancelar pedido"
                variant="danger"
                confirm="Cancelar este pedido?"
              >
                <SelectField label="Motivo" name="cancelReason" required defaultValue="">
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {(Object.keys(CANCEL_REASON_LABEL) as CancelReason[]).map((r) => (
                    <option key={r} value={r}>
                      {CANCEL_REASON_LABEL[r]}
                    </option>
                  ))}
                </SelectField>
                <TextField label="Justificativa" name="note" maxLength={300} />
              </ActionForm>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

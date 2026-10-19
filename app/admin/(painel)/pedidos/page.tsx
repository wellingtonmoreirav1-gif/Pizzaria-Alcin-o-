import Link from 'next/link';
import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { formatBRL, toCents } from '@/lib/money';
import { formatBrazilPhone } from '@/lib/phone';
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, ORDER_STATUSES, type Fulfillment, type OrderStatus } from '@/lib/orders/labels';
import { PageHeader, SelectField, TextField } from '@/components/admin/fields';
import { OrderStatusBadge } from '@/components/admin/order-status-badge';
import { AutoRefresh } from '@/components/order/auto-refresh';
import { EmptyState } from '@/components/ui/feedback';

export const metadata = { title: 'Pedidos' };

function todayLocal() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function OrdersPage({ searchParams }: PageProps<'/admin/pedidos'>) {
  await requireStaff([...PERMISSIONS.orders]);
  await connection();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const from = get('de') || todayLocal();
  const to = get('ate') || from;
  const status = get('status');
  const fulfillment = get('modalidade');
  const q = get('q').replace(/[^\p{L}\p{N}\- ]/gu, '').trim().slice(0, 60);

  const supabase = await createSessionClient();
  let query = supabase
    .from('orders')
    .select('id, code, created_at, customer_name, customer_phone, fulfillment, status, total, total_is_final, delivery_fee_status, payment_method, needs_customer_approval, whatsapp_opened_at, order_items(quantity, product_name)')
    .gte('created_at', new Date(`${from}T00:00:00-03:00`).toISOString())
    .lt('created_at', new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 86400000).toISOString())
    .order('created_at', { ascending: false })
    .limit(200);
  if (status && (ORDER_STATUSES as string[]).includes(status)) query = query.eq('status', status);
  if (status === 'abertos') query = query.not('status', 'in', '(completed,cancelled)');
  if (fulfillment && ['delivery', 'pickup', 'dine_in'].includes(fulfillment)) query = query.eq('fulfillment', fulfillment);
  if (q) query = /^ALC-/i.test(q) ? query.ilike('code', `${q}%`) : query.or(`customer_phone.ilike.%${q.replace(/\D/g, '') || '_'}%,customer_name.ilike.%${q}%`);
  const { data: orders, error } = await query;

  return (
    <div>
      <AutoRefresh seconds={30} />
      <PageHeader title="Pedidos" description="Atualiza automaticamente a cada 30 segundos." />
      <form className="mb-5 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <TextField label="De" name="de" type="date" defaultValue={from} />
        <TextField label="Até" name="ate" type="date" defaultValue={to} />
        <SelectField label="Status" name="status" defaultValue={status}>
          <option value="">Todos</option>
          <option value="abertos">Em aberto</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
          ))}
        </SelectField>
        <SelectField label="Modalidade" name="modalidade" defaultValue={fulfillment}>
          <option value="">Todas</option>
          {(['delivery', 'pickup', 'dine_in'] as Fulfillment[]).map((f) => (
            <option key={f} value={f}>{FULFILLMENT_LABEL[f]}</option>
          ))}
        </SelectField>
        <TextField label="Código, nome ou telefone" name="q" defaultValue={q} />
        <button type="submit" className="h-10 self-end rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white">Filtrar</button>
      </form>
      {error ? <p className="text-brand-700">Não foi possível carregar os pedidos.</p> : null}
      {orders && orders.length === 0 ? <EmptyState title="Nenhum pedido no filtro">Ajuste as datas ou o status.</EmptyState> : null}
      <ul className="grid gap-3">
        {(orders ?? []).map((o) => (
          <li key={o.id}>
            <Link href={`/admin/pedidos/${o.id}`} className="block rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-[var(--shadow-card)]" data-testid="admin-order-row">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-mono text-sm font-bold">#{o.code}</span>
                <OrderStatusBadge status={o.status as OrderStatus} />
                <span className="text-sm text-muted">{new Date(o.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' })}</span>
                <span className="text-sm">{FULFILLMENT_LABEL[o.fulfillment as Fulfillment]}</span>
                {o.fulfillment === 'delivery' && o.delivery_fee_status !== 'confirmed' && !['completed', 'cancelled'].includes(o.status) ? (
                  <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-600">Taxa a confirmar</span>
                ) : null}
                {o.needs_customer_approval ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Aguardando aprovação do total</span> : null}
                <span className="ml-auto font-bold tabular-nums">
                  {formatBRL(toCents(o.total))}
                  {o.total_is_final ? '' : ' + taxa'}
                </span>
              </div>
              <p className="mt-2 text-sm">
                <strong>{o.customer_name ?? 'Cliente anonimizado'}</strong>
                {o.customer_phone ? <span className="text-muted"> · {formatBrazilPhone(o.customer_phone)}</span> : null}
                {o.whatsapp_opened_at ? <span className="text-xs text-muted"> · abriu o WhatsApp</span> : null}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-muted">{(o.order_items ?? []).map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

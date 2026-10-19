import Link from 'next/link';
import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { formatBRL, toCents } from '@/lib/money';
import { formatBrazilPhone, normalizeBrazilPhone } from '@/lib/phone';
import { Card, PageHeader, TextField } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { OrderStatusBadge } from '@/components/admin/order-status-badge';
import type { OrderStatus } from '@/lib/orders/labels';
import { isoDaysAgo } from '@/lib/admin/reports';
import { anonymizeByPhone } from './actions';

export const metadata = { title: 'Clientes' };

export default async function CustomersPage({ searchParams }: PageProps<'/admin/clientes'>) {
  const ctx = await requireStaff([...PERMISSIONS.customers]);
  await connection();
  const sp = await searchParams;
  const phone = typeof sp.telefone === 'string' ? normalizeBrazilPhone(sp.telefone) : null;
  const supabase = await createSessionClient();
  const since = isoDaysAgo(180);
  const [recurring, history, accounts] = await Promise.all([
    supabase.rpc('report_recurring_customers', { p_from: since, p_to: isoDaysAgo(-1), p_min_orders: 2 }),
    phone
      ? supabase.from('orders').select('id, code, created_at, status, total, customer_name, fulfillment').eq('customer_phone', phone).order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: null }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description="Acesso restrito a gerente e administrador. Use os dados somente para atender pedidos e para relatórios internos." />
      <Card title="Consultar histórico por telefone">
        <form className="flex flex-wrap items-end gap-3">
          <TextField label="Telefone" name="telefone" defaultValue={phone ? formatBrazilPhone(phone) : ''} />
          <button type="submit" className="h-10 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white">Buscar</button>
        </form>
        {history.data ? (
          <ul className="mt-4 divide-y divide-line text-sm">
            {history.data.length === 0 ? <li className="py-2 text-muted">Nenhum pedido com este telefone.</li> : null}
            {history.data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold underline">#{o.code}</Link>
                <span className="text-muted">{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                <OrderStatusBadge status={o.status as OrderStatus} />
                <span>{o.customer_name}</span>
                <span className="ml-auto tabular-nums">{formatBRL(toCents(o.total))}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
      <Card title="Clientes recorrentes (últimos 180 dias)" description={`Identificados pelo telefone informado nos pedidos concluídos. Contas cadastradas: ${accounts.count ?? 0}.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2">Cliente</th><th>Telefone</th><th>Pedidos</th><th>Total</th><th>Último</th></tr></thead>
            <tbody>
              {((recurring.data ?? []) as { customer_phone: string; customer_name: string; registered: boolean; orders: number; revenue: number; last_order_at: string }[]).map((c) => (
                <tr key={c.customer_phone} className="border-t border-line">
                  <td className="py-2">{c.customer_name}{c.registered ? <span className="text-xs text-muted"> · com conta</span> : null}</td>
                  <td><Link href={`/admin/clientes?telefone=${c.customer_phone}`} className="underline">{formatBrazilPhone(c.customer_phone)}</Link></td>
                  <td>{c.orders}</td>
                  <td className="tabular-nums">{formatBRL(toCents(c.revenue))}</td>
                  <td>{new Date(c.last_order_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {ctx.role === 'admin' ? (
        <Card title="Pedido de exclusão de dados (LGPD)" description="Para clientes SEM conta. Clientes com conta podem excluir sozinhos em “Minha conta”. Remove nome, telefone, endereço e localização dos pedidos; mantém itens e valores.">
          <ActionForm action={anonymizeByPhone} submitLabel="Anonimizar pedidos" variant="danger" resetOnSuccess>
            <div className="grid gap-3 md:grid-cols-3">
              <TextField label="Telefone do cliente" name="phone" required />
              <TextField label="Digite ANONIMIZAR para confirmar" name="confirm" required />
            </div>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}

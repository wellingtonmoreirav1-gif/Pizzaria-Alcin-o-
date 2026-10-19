import Link from 'next/link';
import { connection } from 'next/server';
import { AlertTriangle } from 'lucide-react';
import { requireStaff } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { getOperationFresh } from '@/lib/catalog/queries';
import { computeStoreStatus } from '@/lib/business-hours';
import { formatBRL, toCents } from '@/lib/money';
import { Card, PageHeader } from '@/components/admin/fields';
import { Notice } from '@/components/ui/feedback';
import { AutoRefresh } from '@/components/order/auto-refresh';

export const metadata = { title: 'Início' };

interface Dashboard {
  today_total: number;
  registered: number;
  customer_confirmed: number;
  accepted: number;
  preparing: number;
  ready: number;
  out_for_delivery: number;
  completed: number;
  cancelled: number;
  pending_fee: number;
  needs_approval: number;
  can_see_money: boolean;
  revenue_today?: number;
  revenue_week?: number;
  revenue_month?: number;
  registered_value_today?: number;
  average_ticket_month?: number;
}

function Stat({ label, value, hint, href, tone }: { label: string; value: string | number; hint?: string; href?: string; tone?: 'brand' }) {
  const body = (
    <div className={`h-full rounded-2xl border p-4 ${tone === 'brand' ? 'border-brand-200 bg-brand-50' : 'border-line bg-white'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

export default async function AdminHome() {
  const ctx = await requireStaff();
  await connection();
  const supabase = await createSessionClient();
  const [dash, operation, demo, hours] = await Promise.all([
    supabase.rpc('dashboard_today'),
    getOperationFresh(),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_demo', true).is('deleted_at', null),
    supabase.from('business_hours').select('shift, closes_at, is_active').eq('shift', 'lunch').eq('is_active', true).is('closes_at', null).limit(1),
  ]);
  const d = (dash.data ?? {}) as Dashboard;
  const status = computeStoreStatus(operation.hours, new Date());
  const m = (v: number | undefined) => formatBRL(toCents(v ?? 0));

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={60} />
      <PageHeader title="Início" description="Resumo de hoje (fuso America/Fortaleza). Cancelados não contam como vendas." />
      <Notice tone={status.acceptingOrders ? 'success' : 'warning'} title={status.acceptingOrders ? 'Site recebendo pedidos' : 'Site NÃO está recebendo pedidos'}>
        {status.message} <Link href="/admin/operacao" className="font-semibold underline">Operação do dia</Link>
      </Notice>
      {(demo.count ?? 0) > 0 && ctx.role !== 'attendant' ? (
        <Notice tone="warning" title="Há produtos de demonstração publicados">
          Remova-os antes de divulgar o site (veja README → “Remover dados de exemplo”).
        </Notice>
      ) : null}
      {hours.data?.length && status.openShifts.includes('lunch') ? (
        <Notice tone="info">
          <span className="inline-flex items-center gap-1"><AlertTriangle className="size-4" aria-hidden /> O almoço não tem horário de término: lembre de encerrá-lo em “Operação do dia” quando a comida acabar.</span>
        </Notice>
      ) : null}

      <section aria-label="Pedidos de hoje" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pedidos hoje" value={d.today_total ?? 0} href="/admin/pedidos" />
        <Stat label="Aguardando confirmação" value={(d.registered ?? 0) + (d.customer_confirmed ?? 0)} hint="Registrados + cliente confirmou" href="/admin/pedidos?status=abertos" tone="brand" />
        <Stat label="Taxa de entrega a confirmar" value={d.pending_fee ?? 0} href="/admin/pedidos?status=abertos" />
        <Stat label="Aguardando aprovação do total" value={d.needs_approval ?? 0} href="/admin/pedidos?status=abertos" />
        <Stat label="Aceitos" value={d.accepted ?? 0} href="/admin/pedidos?status=accepted" />
        <Stat label="Em preparação" value={d.preparing ?? 0} href="/admin/pedidos?status=preparing" />
        <Stat label="Em entrega" value={d.out_for_delivery ?? 0} href="/admin/pedidos?status=out_for_delivery" />
        <Stat label="Concluídos" value={d.completed ?? 0} hint={`${d.cancelled ?? 0} cancelado(s)`} href="/admin/pedidos?status=completed" />
      </section>

      {d.can_see_money ? (
        <Card title="Vendas" description="Vendas = pedidos concluídos (itens após descontos + taxas de entrega). Não é lucro.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Vendas hoje" value={m(d.revenue_today)} />
            <Stat label="Vendas na semana" value={m(d.revenue_week)} />
            <Stat label="Vendas no mês" value={m(d.revenue_month)} />
            <Stat label="Ticket médio (mês)" value={m(d.average_ticket_month)} />
            <Stat label="Registrado hoje" value={m(d.registered_value_today)} hint="Pedidos não cancelados, ainda não concluídos inclusive" />
          </div>
          <Link href="/admin/relatorios" className="mt-4 inline-block text-sm font-semibold text-brand-700 underline">Ver relatórios completos</Link>
        </Card>
      ) : null}
    </div>
  );
}

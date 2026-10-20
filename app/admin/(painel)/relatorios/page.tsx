import Link from 'next/link';
import { connection } from 'next/server';
import { Download } from 'lucide-react';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { fillBuckets, reportRange } from '@/lib/admin/reports';
import { formatBRL, toCents } from '@/lib/money';
import { CANCEL_REASON_LABEL, FULFILLMENT_LABEL, PAYMENT_LABEL, type CancelReason, type Fulfillment, type PaymentMethod } from '@/lib/orders/labels';
import { Card, PageHeader, SelectField, TextField } from '@/components/admin/fields';
import { BarList, ColumnChart } from '@/components/admin/charts';

export const metadata = { title: 'Relatórios' };

interface Overview {
  orders_registered: number;
  registered_value: number;
  orders_open: number;
  orders_completed: number;
  orders_cancelled: number;
  cancelled_value: number;
  gross_items: number;
  discounts: number;
  net_items: number;
  delivery_fees: number;
  revenue: number;
  average_ticket: number;
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function ReportsPage({ searchParams }: PageProps<'/admin/relatorios'>) {
  await requireStaff([...PERMISSIONS.reports]);
  await connection();
  const range = reportRange(await searchParams);
  const db = await createSessionClient();
  const args = { p_from: range.from, p_to: range.to };
  const [overview, series, top, categories, noSales, fulfillment, payment, cancels, together, recurring] = await Promise.all([
    db.rpc('report_overview', args),
    db.rpc('report_sales_series', { ...args, p_bucket: range.bucket }),
    db.rpc('report_top_products', { ...args, p_limit: 15 }),
    db.rpc('report_categories', args),
    db.rpc('report_products_without_sales', args),
    db.rpc('report_breakdown', { ...args, p_dimension: 'fulfillment' }),
    db.rpc('report_breakdown', { ...args, p_dimension: 'payment_method' }),
    db.rpc('report_cancellations', args),
    db.rpc('report_bought_together', { ...args, p_min_orders: 3 }),
    db.rpc('report_recurring_customers', { ...args, p_min_orders: 2 }),
  ]);
  if (overview.error) return <p className="text-brand-700">Não foi possível gerar os relatórios.</p>;
  const o = overview.data as Overview;
  const c = (v: number) => toCents(v);
  const qs = `de=${range.fromDate}&ate=${range.toDate}`;
  const exportLink = (tipo: string) => `/admin/relatorios/exportar?tipo=${tipo}&${qs}`;
  const bucketLabel = (d: string) => {
    const date = new Date(`${d}T12:00:00Z`);
    return range.bucket === 'month' ? date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Dados reais do banco. Vendas e faturamento consideram somente pedidos concluídos; cancelados aparecem à parte. Faturamento não é lucro (o sistema não conhece custos)."
      />
      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4" aria-label="Filtros do relatório">
        <SelectField label="Período" name="periodo" defaultValue={range.preset}>
          <option value="hoje">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="mes">Este mês</option>
          <option value="365">Últimos 12 meses</option>
        </SelectField>
        <TextField label="Ou de" name="de" type="date" defaultValue={range.fromDate} />
        <TextField label="até" name="ate" type="date" defaultValue={range.toDate} />
        <SelectField label="Agrupar por" name="agrupar" defaultValue={range.bucket}>
          <option value="day">Dia</option>
          <option value="week">Semana</option>
          <option value="month">Mês</option>
        </SelectField>
        <button type="submit" className="h-10 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white">Aplicar</button>
        <Link href="/admin/relatorios" className="h-10 content-center px-2 text-sm underline">Limpar</Link>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo">
        <Tile label="Faturamento (concluídos)" value={formatBRL(c(o.revenue))} hint="Itens após descontos + taxas" />
        <Tile label="Vendas concluídas" value={String(o.orders_completed)} />
        <Tile label="Ticket médio" value={formatBRL(c(o.average_ticket))} hint="Faturamento dividido pelas vendas concluídas" />
        <Tile label="Pedidos registrados" value={String(o.orders_registered)} hint={`${formatBRL(c(o.registered_value))} · inclui ${o.orders_open} em aberto`} />
        <Tile label="Itens a preço de tabela" value={formatBRL(c(o.gross_items))} hint="Somente concluídos" />
        <Tile label="Descontos concedidos" value={formatBRL(c(o.discounts))} />
        <Tile label="Taxas de entrega" value={formatBRL(c(o.delivery_fees))} />
        <Tile label="Cancelados" value={String(o.orders_cancelled)} hint={formatBRL(c(o.cancelled_value))} />
      </section>

      <Card title="Faturamento por período" actions={<ExportLink href={exportLink('vendas')} />}>
        <ColumnChart
          title="Faturamento de pedidos concluídos por período"
          data={fillBuckets(
            (series.data ?? []) as { bucket: string; revenue: number; orders_completed: number; orders_registered: number; orders_cancelled: number }[],
            range.fromDate,
            range.toDate,
            range.bucket,
            (bucket) => ({ bucket, revenue: 0, orders_completed: 0, orders_registered: 0, orders_cancelled: 0 }),
          ).map((s) => ({
            label: bucketLabel(s.bucket),
            value: c(s.revenue),
            detail: `${s.orders_completed} concluído(s), ${s.orders_registered} registrado(s), ${s.orders_cancelled} cancelado(s)`,
          }))}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Produtos mais vendidos" description="Quantidade em pedidos concluídos." actions={<ExportLink href={exportLink('produtos')} />}>
          <BarList data={((top.data ?? []) as { product_name: string; quantity: number; revenue: number }[]).map((p) => ({ label: p.product_name, value: Number(p.quantity), secondary: formatBRL(c(p.revenue)) }))} />
        </Card>
        <Card title="Categorias" description="Valor em itens de pedidos concluídos." actions={<ExportLink href={exportLink('categorias')} />}>
          <BarList money data={((categories.data ?? []) as { category_name: string; quantity: number; revenue: number }[]).map((x) => ({ label: x.category_name, value: c(x.revenue), secondary: `${x.quantity} itens` }))} />
        </Card>
        <Card title="Modalidade" description="Pedidos concluídos por modalidade.">
          <BarList data={((fulfillment.data ?? []) as { dimension: string; orders_completed: number; revenue: number }[]).map((x) => ({ label: FULFILLMENT_LABEL[x.dimension as Fulfillment] ?? x.dimension, value: Number(x.orders_completed), secondary: formatBRL(c(x.revenue)) }))} />
        </Card>
        <Card title="Formas de pagamento escolhidas" description="Concluídos por forma de pagamento informada pelo cliente.">
          <BarList data={((payment.data ?? []) as { dimension: string; orders_completed: number; revenue: number }[]).map((x) => ({ label: PAYMENT_LABEL[x.dimension as PaymentMethod] ?? x.dimension, value: Number(x.orders_completed), secondary: formatBRL(c(x.revenue)) }))} />
        </Card>
        <Card title="Cancelamentos" actions={<ExportLink href={exportLink('cancelamentos')} />}>
          <BarList empty="Nenhum cancelamento no período." data={((cancels.data ?? []) as { reason: string; orders: number; value: number }[]).map((x) => ({ label: CANCEL_REASON_LABEL[x.reason as CancelReason] ?? x.reason, value: Number(x.orders), secondary: formatBRL(c(x.value)) }))} />
        </Card>
        <Card title="Vendidos juntos" description="Pares de produtos no mesmo pedido concluído (mínimo de 3 pedidos).">
          {(together.data ?? []).length ? (
            <ul className="divide-y divide-line text-sm">
              {((together.data ?? []) as { product_a: string; product_b: string; orders_together: number }[]).map((t) => (
                <li key={`${t.product_a}${t.product_b}`} className="flex justify-between gap-3 py-2"><span>{t.product_a} + {t.product_b}</span><span className="tabular-nums">{t.orders_together} pedidos</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ainda não há dados suficientes.</p>
          )}
        </Card>
        <Card title="Produtos sem vendas no período" description="Ativos no cardápio, sem venda concluída.">
          <ul className="max-h-72 divide-y divide-line overflow-y-auto text-sm">
            {((noSales.data ?? []) as { product_name: string; category_name: string; is_available: boolean }[]).map((p) => (
              <li key={p.product_name} className="flex justify-between py-1.5"><span>{p.product_name}</span><span className="text-muted">{p.category_name}{p.is_available ? '' : ' · esgotado'}</span></li>
            ))}
          </ul>
        </Card>
        <Card title="Clientes recorrentes" description="2+ pedidos concluídos no período (pelo telefone)." actions={<ExportLink href={exportLink('clientes')} />}>
          <p className="text-3xl font-semibold tabular-nums">{(recurring.data ?? []).length}</p>
          <Link href="/admin/clientes" className="text-sm font-semibold underline">Ver clientes</Link>
        </Card>
      </div>
    </div>
  );
}

function ExportLink({ href }: { href: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-strong hover:bg-mist">
      <Download className="size-3.5" aria-hidden /> CSV
    </a>
  );
}

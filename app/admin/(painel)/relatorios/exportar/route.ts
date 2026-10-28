import type { NextRequest } from 'next/server';
import { staffOrNull, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { reportRange } from '@/lib/admin/reports';
import { toCsv } from '@/lib/images/prompts';
import { CANCEL_REASON_LABEL, type CancelReason } from '@/lib/orders/labels';

/** Exportação CSV dos relatórios (acesso restrito; telefones só no relatório de clientes). */
export async function GET(request: NextRequest) {
  const ctx = await staffOrNull([...PERMISSIONS.reports]);
  if (!ctx) return new Response('Não autorizado', { status: 403 });
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const range = reportRange(sp);
  const db = await createSessionClient();
  const args = { p_from: range.from, p_to: range.to };
  const tipo = sp.tipo;
  let rows: Record<string, string | number | null>[] = [];
  if (tipo === 'vendas') {
    const { data } = await db.rpc('report_sales_series', { ...args, p_bucket: range.bucket });
    rows = (data ?? []).map((r: { bucket: string; orders_registered: number; orders_completed: number; orders_cancelled: number; revenue: number }) => ({
      periodo: r.bucket,
      pedidos_registrados: r.orders_registered,
      vendas_concluidas: r.orders_completed,
      cancelados: r.orders_cancelled,
      faturamento: String(r.revenue).replace('.', ','),
    }));
  } else if (tipo === 'produtos') {
    const { data } = await db.rpc('report_top_products', { ...args, p_limit: 200 });
    rows = (data ?? []).map((r: { product_name: string; category_name: string; quantity: number; revenue: number }) => ({
      produto: r.product_name,
      categoria: r.category_name,
      quantidade: r.quantity,
      valor: String(r.revenue).replace('.', ','),
    }));
  } else if (tipo === 'categorias') {
    const { data } = await db.rpc('report_categories', args);
    rows = (data ?? []).map((r: { category_name: string; quantity: number; revenue: number }) => ({
      categoria: r.category_name,
      quantidade: r.quantity,
      valor: String(r.revenue).replace('.', ','),
    }));
  } else if (tipo === 'cancelamentos') {
    const { data } = await db.rpc('report_cancellations', args);
    rows = (data ?? []).map((r: { reason: string; orders: number; value: number }) => ({
      motivo: CANCEL_REASON_LABEL[r.reason as CancelReason] ?? r.reason,
      pedidos: r.orders,
      valor: String(r.value).replace('.', ','),
    }));
  } else if (tipo === 'clientes') {
    if (!PERMISSIONS.customers.includes(ctx.role as never)) return new Response('Não autorizado', { status: 403 });
    const { data } = await db.rpc('report_recurring_customers', { ...args, p_min_orders: 2 });
    rows = (data ?? []).map((r: { customer_name: string; customer_phone: string; orders: number; revenue: number; last_order_at: string }) => ({
      cliente: r.customer_name,
      telefone: r.customer_phone,
      pedidos: r.orders,
      valor: String(r.revenue).replace('.', ','),
      ultimo_pedido: r.last_order_at.slice(0, 10),
    }));
  } else {
    return new Response('Relatório inválido', { status: 400 });
  }
  return new Response(toCsv(rows.length ? rows : [{ aviso: 'sem dados no período' }]), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="alcinao-${tipo}-${range.fromDate}-a-${range.toDate}.csv"`,
      'cache-control': 'no-store',
    },
  });
}

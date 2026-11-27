import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { as, connect, createOrder, createUser, resetDatabase } from './helpers';

let client: pg.Client;
let manager: string, attendant: string;
const from = '2000-01-01T00:00:00Z';
const to = '2100-01-01T00:00:00Z';

beforeAll(async () => {
  resetDatabase();
  client = await connect();
  manager = await createUser(client, 'gerente@teste.local', 'manager');
  attendant = await createUser(client, 'atendente@teste.local', 'attendant');
  const pickup = {
    fulfillment: 'pickup',
    delivery_fee_status: 'not_applicable',
    address_street: null,
    address_number: null,
    address_neighborhood: null,
    latitude: null,
    longitude: null,
    location_source: null,
  };
  const a = await createOrder(client, { ...pickup, customer_phone: '83900000001' });
  const b = await createOrder(client, { ...pickup, customer_phone: '83900000001', payment_method: 'cash' });
  const c = await createOrder(client, { customer_phone: '83900000002' });
  await client.query(`update public.orders set status = 'completed' where id in ($1, $2)`, [a.order_id, b.order_id]);
  await client.query(`update public.orders set status = 'cancelled', cancel_reason = 'out_of_area' where id = $1`, [c.order_id]);
  await createOrder(client, { ...pickup });
});
afterAll(async () => {
  await client.end();
});

const run = (sql: string, userId = manager) => as(client, { role: 'authenticated', userId }, (c) => c.query(sql, [from, to]));

describe('relatórios', () => {
  it('atendente não acessa relatórios financeiros', async () => {
    await expect(run('select public.report_overview($1, $2)', attendant)).rejects.toThrow(/not_authorized/);
    const dash = await as(client, { role: 'authenticated', userId: attendant }, (c) => c.query('select public.dashboard_today() as d'));
    expect(dash.rows[0].d.can_see_money).toBe(false);
    expect(dash.rows[0].d.revenue_today).toBeUndefined();
  });

  it('resumo diferencia registrados, concluídos e cancelados', async () => {
    const { rows } = await run('select public.report_overview($1, $2) as r');
    expect(rows[0].r).toMatchObject({
      orders_registered: 3,
      orders_completed: 2,
      orders_cancelled: 1,
      orders_open: 1,
      revenue: 36,
      discounts: 4,
      gross_items: 40,
      average_ticket: 18,
      cancelled_value: 18,
    });
  });

  it('produtos, categorias, pagamentos, cancelamentos e recorrentes', async () => {
    const top = await run('select product_name, quantity from public.report_top_products($1, $2, 10)');
    expect(top.rows).toContainEqual({ product_name: '[EXEMPLO] Refrigerante', quantity: '2' });
    const cats = await run('select category_name, quantity from public.report_categories($1, $2)');
    expect(cats.rows.map((r) => r.category_name).sort()).toEqual(['Bebidas', 'Pizzas']);
    const pay = await run(`select dimension, orders_completed from public.report_breakdown($1, $2, 'payment_method')`);
    expect(pay.rows).toContainEqual({ dimension: 'cash', orders_completed: '1' });
    const canc = await run('select reason, orders from public.report_cancellations($1, $2)');
    expect(canc.rows).toEqual([{ reason: 'out_of_area', orders: '1' }]);
    const rec = await as(client, { role: 'authenticated', userId: manager }, (c) =>
      c.query('select customer_phone, orders from public.report_recurring_customers($1, $2, 2)', [from, to]),
    );
    expect(rec.rows).toEqual([{ customer_phone: '83900000001', orders: '2' }]);
    const together = await as(client, { role: 'authenticated', userId: manager }, (c) =>
      c.query('select orders_together from public.report_bought_together($1, $2, 2)', [from, to]),
    );
    expect(together.rows[0].orders_together).toBe('2');
    const none = await run('select product_name from public.report_products_without_sales($1, $2)');
    expect(none.rows.map((r) => r.product_name)).toContain('[EXEMPLO] Espetinho');
    const series = await as(client, { role: 'authenticated', userId: manager }, (c) =>
      c.query(`select orders_completed, revenue from public.report_sales_series($1, $2, 'month')`, [from, to]),
    );
    expect(series.rows[0]).toEqual({ orders_completed: '2', revenue: '36.00' });
  });

  it('vitrine "mais vendidos" só aparece com volume mínimo', async () => {
    const empty = await as(client, { role: 'anon' }, (c) => c.query('select * from public.public_best_sellers(8)'));
    expect(empty.rowCount).toBe(0);
    await client.query('update public.business_settings set best_sellers_min_orders = 2');
    const ranked = await as(client, { role: 'anon' }, (c) => c.query('select * from public.public_best_sellers(8)'));
    expect(ranked.rowCount).toBe(2);
  });
});

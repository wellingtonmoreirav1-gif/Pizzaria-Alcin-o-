import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { as, connect, createOrder, createUser, resetDatabase } from './helpers';

let client: pg.Client;
let manager: string, attendant: string;

beforeAll(async () => {
  resetDatabase();
  client = await connect();
  manager = await createUser(client, 'gerente@teste.local', 'manager');
  attendant = await createUser(client, 'atendente@teste.local', 'attendant');
});
afterAll(async () => {
  await client.end();
});

const status = (orderId: string, to: string, extra = 'null, null', userId = attendant) =>
  as(client, { role: 'authenticated', userId }, (c) =>
    c.query(`select status from public.update_order_status($1, $2::public.order_status, ${extra})`, [orderId, to]),
  );

describe('create_order', () => {
  it('cria pedido, itens, opções e histórico de forma atômica', async () => {
    const r = await createOrder(client);
    expect(r.created).toBe(true);
    expect(r.order_code).toMatch(/^ALC-[0-9A-Z]{6}$/);
    const { rows } = await client.query('select * from public.orders where id = $1', [r.order_id]);
    expect(rows[0]).toMatchObject({ status: 'registered', total: '18.00', submitted_total: '18.00', total_is_final: false, delivery_fee_status: 'pending' });
    const items = await client.query('select count(*)::int as n from public.order_items where order_id = $1', [r.order_id]);
    expect(items.rows[0].n).toBe(2);
    const opts = await client.query(
      'select value_name from public.order_item_options o join public.order_items i on i.id = o.order_item_id where i.order_id = $1',
      [r.order_id],
    );
    expect(opts.rows[0].value_name).toBe('Sabor exemplo A');
    const hist = await client.query('select to_status from public.order_status_history where order_id = $1', [r.order_id]);
    expect(hist.rows).toEqual([{ to_status: 'registered' }]);
  });

  it('é idempotente: mesma chave devolve o mesmo pedido', async () => {
    const key = randomUUID();
    const a = await createOrder(client, { idempotency_key: key });
    const b = await createOrder(client, { idempotency_key: key });
    expect(b.created).toBe(false);
    expect(b.order_id).toBe(a.order_id);
    const { rows } = await client.query('select count(*)::int as n from public.orders where idempotency_key = $1', [key]);
    expect(rows[0].n).toBe(1);
  });

  it('chamadas concorrentes com a mesma chave criam um único pedido', async () => {
    const key = randomUUID();
    const clients = await Promise.all([connect(), connect(), connect()]);
    try {
      const results = await Promise.all(clients.map((c) => createOrder(c, { idempotency_key: key })));
      expect(new Set(results.map((r) => r.order_id)).size).toBe(1);
      expect(results.filter((r) => r.created).length).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it('rejeita totais inconsistentes e pedido sem itens (transação desfeita)', async () => {
    await expect(createOrder(client, { total: '99.00' })).rejects.toThrow(/check constraint/);
    const key = randomUUID();
    await expect(createOrder(client, { idempotency_key: key, items: [] })).rejects.toThrow(/order_without_items/);
    const { rows } = await client.query('select count(*)::int as n from public.orders where idempotency_key = $1', [key]);
    expect(rows[0].n).toBe(0);
    await expect(
      createOrder(client, {
        items: [
          {
            product_id: '00000000-0000-4000-8000-000000000002',
            product_kind: 'simple',
            product_name: 'x',
            quantity: 2,
            unit_regular_price: '1.00',
            unit_discount: '0',
            unit_price: '1.00',
            line_total: '5.00',
          },
        ],
        gross_subtotal: '5.00',
        discount_total: '0',
        items_subtotal: '5.00',
        total: '5.00',
      }),
    ).rejects.toThrow(/check constraint/);
  });

  it('pedido de entrega exige endereço', async () => {
    await expect(createOrder(client, { address_street: null })).rejects.toThrow(/check constraint/);
  });

  it('pedido de retirada tem total final', async () => {
    const r = await createOrder(client, {
      fulfillment: 'pickup',
      delivery_fee_status: 'not_applicable',
      address_street: null,
      address_number: null,
      address_neighborhood: null,
      latitude: null,
      longitude: null,
      location_source: null,
    });
    const { rows } = await client.query('select total_is_final, approved_total from public.orders where id = $1', [r.order_id]);
    expect(rows[0]).toEqual({ total_is_final: true, approved_total: '18.00' });
  });
});

describe('status e taxa de entrega', () => {
  it('não aceita pedido de entrega sem taxa confirmada', async () => {
    const r = await createOrder(client);
    await expect(status(r.order_id, 'accepted')).rejects.toThrow(/delivery_fee_not_confirmed/);
    await expect(status(r.order_id, 'completed')).rejects.toThrow(/invalid_transition/);
  });

  it('confirmação da taxa é auditada e exige aprovação do cliente quando o total muda', async () => {
    const r = await createOrder(client);
    await status(r.order_id, 'customer_confirmed');
    await as(client, { role: 'authenticated', userId: attendant }, (c) =>
      c.query(`select public.set_delivery_fee($1, 5.00, true, 'Bairro Centro')`, [r.order_id]),
    );
    let { rows } = await client.query('select total, delivery_fee, total_is_final, needs_customer_approval from public.orders where id = $1', [r.order_id]);
    expect(rows[0]).toEqual({ total: '23.00', delivery_fee: '5.00', total_is_final: true, needs_customer_approval: true });
    await expect(status(r.order_id, 'accepted')).rejects.toThrow(/customer_approval_pending/);
    await as(client, { role: 'authenticated', userId: attendant }, (c) => c.query('select public.mark_customer_approved_total($1)', [r.order_id]));
    await status(r.order_id, 'accepted');
    const adj = await client.query(`select kind, old_total, new_total, created_by from public.order_adjustments where order_id = $1 order by id`, [r.order_id]);
    expect(adj.rows[0]).toMatchObject({ kind: 'delivery_fee', old_total: '18.00', new_total: '23.00', created_by: attendant });
    expect(adj.rows[1]).toMatchObject({ kind: 'customer_approval' });

    // Depois de aceito, atendente não altera a taxa; gerente altera com justificativa.
    await expect(
      as(client, { role: 'authenticated', userId: attendant }, (c) => c.query(`select public.set_delivery_fee($1, 7.00, true, 'x')`, [r.order_id])),
    ).rejects.toThrow(/fee_locked/);
    await expect(
      as(client, { role: 'authenticated', userId: manager }, (c) => c.query(`select public.set_delivery_fee($1, 7.00, true, null)`, [r.order_id])),
    ).rejects.toThrow(/note_required/);
    await as(client, { role: 'authenticated', userId: manager }, (c) =>
      c.query(`select public.set_delivery_fee($1, 7.00, true, 'Erro de digitação')`, [r.order_id]),
    );
    ({ rows } = await client.query('select total, needs_customer_approval from public.orders where id = $1', [r.order_id]));
    expect(rows[0]).toEqual({ total: '25.00', needs_customer_approval: true });
  });

  it('taxa estimada igual à confirmada não exige nova aprovação', async () => {
    const r = await createOrder(client, { delivery_fee: '5.00', delivery_fee_status: 'estimated', total: '23.00' });
    await as(client, { role: 'authenticated', userId: attendant }, (c) => c.query(`select public.set_delivery_fee($1, 5.00, true, null)`, [r.order_id]));
    const { rows } = await client.query('select needs_customer_approval from public.orders where id = $1', [r.order_id]);
    expect(rows[0].needs_customer_approval).toBe(false);
  });

  it('fluxo completo registra quem alterou cada status', async () => {
    const r = await createOrder(client, {
      fulfillment: 'pickup',
      delivery_fee_status: 'not_applicable',
      address_street: null,
      address_number: null,
      address_neighborhood: null,
      latitude: null,
      longitude: null,
      location_source: null,
    });
    for (const s of ['accepted', 'preparing', 'ready']) await status(r.order_id, s);
    await expect(status(r.order_id, 'out_for_delivery')).rejects.toThrow(/invalid_transition/);
    await status(r.order_id, 'completed');
    await expect(status(r.order_id, 'cancelled', `null, 'other'`)).rejects.toThrow(/invalid_transition/);
    const hist = await client.query(
      'select from_status, to_status, changed_by, changed_by_role from public.order_status_history where order_id = $1 order by id',
      [r.order_id],
    );
    expect(hist.rows.map((h) => h.to_status)).toEqual(['registered', 'accepted', 'preparing', 'ready', 'completed']);
    expect(hist.rows[4]).toMatchObject({ from_status: 'ready', changed_by: attendant, changed_by_role: 'attendant' });
  });

  it('cancelamento exige motivo; cliente não muda status', async () => {
    const r = await createOrder(client);
    await expect(status(r.order_id, 'cancelled')).rejects.toThrow(/cancel_reason_required/);
    await status(r.order_id, 'cancelled', `'Fora da área', 'out_of_area'`);
    const customer = await createUser(client, `c-${randomUUID()}@t.local`);
    await expect(status(r.order_id, 'accepted', 'null, null', customer)).rejects.toThrow(/not_authorized/);
  });
});

describe('limite anti-abuso', () => {
  it('conta pedidos recentes do mesmo IP (hash) e só pode ser chamado pelo servidor', async () => {
    await createOrder(client, { ip_hash: 'ip-teste-limite' });
    await createOrder(client, { ip_hash: 'ip-teste-limite' });
    const { rows } = await as(client, { role: 'service_role' }, (c) => c.query(`select public.recent_orders_from_ip('ip-teste-limite', 10) as n`));
    expect(rows[0].n).toBe(2);
    await expect(as(client, { role: 'anon' }, (c) => c.query(`select public.recent_orders_from_ip('x', 10)`))).rejects.toThrow(/permission denied/);
  });
});

describe('operação', () => {
  it('encerra o almoço de hoje e pausa pedidos', async () => {
    await as(client, { role: 'authenticated', userId: attendant }, (c) =>
      c.query(`select public.set_operation_status(p_lunch_closed => true, p_pause_minutes => 15)`),
    );
    const { rows } = await client.query(
      `select lunch_closed_on = (now() at time zone 'America/Fortaleza')::date as closed_today, paused_until > now() as paused from public.business_settings`,
    );
    expect(rows[0]).toEqual({ closed_today: true, paused: true });
    await as(client, { role: 'authenticated', userId: attendant }, (c) =>
      c.query(`select public.set_operation_status(p_lunch_closed => false, p_pause_minutes => 0)`),
    );
    const after = await client.query('select lunch_closed_on, paused_until from public.business_settings');
    expect(after.rows[0]).toEqual({ lunch_closed_on: null, paused_until: null });
  });

  it('limpa coordenadas antigas e anonimiza pedidos', async () => {
    const r = await createOrder(client, { customer_phone: '83911112222' });
    await client.query(`update public.orders set status = 'cancelled', cancel_reason = 'other', created_at = now() - interval '200 days' where id = $1`, [
      r.order_id,
    ]);
    const purged = await as(client, { role: 'service_role' }, (c) => c.query('select public.purge_expired_personal_data() as n'));
    expect(purged.rows[0].n).toBeGreaterThanOrEqual(1);
    const anon = await as(client, { role: 'service_role' }, (c) => c.query(`select public.anonymize_customer_orders(null, '83911112222') as n`));
    expect(anon.rows[0].n).toBe(1);
    const { rows } = await client.query('select customer_name, customer_phone, latitude, address_street, total from public.orders where id = $1', [r.order_id]);
    expect(rows[0]).toEqual({ customer_name: null, customer_phone: null, latitude: null, address_street: null, total: '18.00' });
  });
});

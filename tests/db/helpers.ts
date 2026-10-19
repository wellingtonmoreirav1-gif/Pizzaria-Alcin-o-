import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

/**
 * Testes de banco: rodam contra o PostgreSQL local criado por
 * scripts/local-supabase/start.sh (porta 54322). Cada arquivo recria o esquema.
 */
export const DB_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54322/postgres';

export function resetDatabase() {
  execFileSync('bash', [path.resolve(__dirname, '../../scripts/local-supabase/apply-migrations.sh')], {
    stdio: 'pipe',
    env: { ...process.env, WITH_DEMO: '1' },
  });
}

export async function connect() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

export async function createUser(client: pg.Client, email: string, role?: 'admin' | 'manager' | 'attendant') {
  const id = randomUUID();
  await client.query(
    `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, '{"full_name":"Teste"}', now(), now())`,
    [id, email],
  );
  if (role) await client.query('insert into public.user_roles (user_id, role) values ($1, $2)', [id, role]);
  return id;
}

type Who = { role: 'anon' } | { role: 'authenticated'; userId: string } | { role: 'service_role' };

/** Executa consultas simulando o papel do PostgREST (anon/authenticated/service_role). */
export async function as<T>(client: pg.Client, who: Who, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  await client.query('begin');
  try {
    const claims = who.role === 'authenticated' ? { sub: who.userId, role: 'authenticated' } : { role: who.role };
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await client.query(`set local role ${who.role}`);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

export function orderPayload(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: randomUUID(),
    request_hash: 'hash-1',
    customer_name: 'Cliente Teste',
    customer_phone: '83999998888',
    fulfillment: 'delivery',
    service_shift: 'dinner',
    address_street: 'Rua A',
    address_number: '10',
    address_neighborhood: 'Centro',
    address_city: 'São Bento',
    address_state: 'PB',
    latitude: -6.48,
    longitude: -37.45,
    location_source: 'gps',
    payment_method: 'pix',
    gross_subtotal: '20.00',
    discount_total: '2.00',
    items_subtotal: '18.00',
    delivery_fee: null,
    delivery_fee_status: 'pending',
    total: '18.00',
    ip_hash: 'iphash',
    items: [
      {
        product_id: '00000000-0000-4000-8000-000000000002',
        variant_id: '00000000-0000-4000-8000-000000000014',
        product_kind: 'simple',
        product_name: '[EXEMPLO] Refrigerante',
        variant_name: '2 litros (exemplo)',
        category_name: 'Bebidas',
        quantity: 1,
        unit_regular_price: '14.00',
        unit_discount: '2.00',
        unit_price: '12.00',
        line_total: '12.00',
        options: [],
      },
      {
        product_id: '00000000-0000-4000-8000-000000000001',
        variant_id: '00000000-0000-4000-8000-000000000011',
        product_kind: 'pizza',
        product_name: '[EXEMPLO] Pizza',
        variant_name: 'Pequena',
        category_name: 'Pizzas',
        quantity: 1,
        unit_regular_price: '6.00',
        unit_discount: '0.00',
        unit_price: '6.00',
        line_total: '6.00',
        options: [
          {
            group_id: '00000000-0000-4000-8000-000000000021',
            option_value_id: '00000000-0000-4000-8000-000000000031',
            group_kind: 'flavor',
            group_name: 'Sabores',
            value_name: 'Sabor exemplo A',
            price: '0.00',
          },
        ],
      },
    ],
    ...overrides,
  };
}

export async function createOrder(client: pg.Client, overrides: Record<string, unknown> = {}) {
  const payload = orderPayload(overrides);
  const { rows } = await as(client, { role: 'service_role' }, (c) =>
    c.query('select * from public.create_order($1)', [JSON.stringify(payload)]),
  );
  return { ...rows[0], payload } as { order_id: string; order_code: string; created: boolean; payload: typeof payload };
}

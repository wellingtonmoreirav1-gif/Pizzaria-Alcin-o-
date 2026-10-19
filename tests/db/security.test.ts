import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { as, connect, createOrder, createUser, resetDatabase } from './helpers';

let client: pg.Client;
let admin: string, manager: string, attendant: string, customer: string, other: string;

beforeAll(async () => {
  resetDatabase();
  client = await connect();
  admin = await createUser(client, 'admin@teste.local', 'admin');
  manager = await createUser(client, 'gerente@teste.local', 'manager');
  attendant = await createUser(client, 'atendente@teste.local', 'attendant');
  customer = await createUser(client, 'cliente@teste.local');
  other = await createUser(client, 'outro@teste.local');
});
afterAll(async () => {
  await client.end();
});

describe('RLS: catálogo', () => {
  it('visitante lê produtos ativos mas não inativos', async () => {
    await client.query(`update public.products set is_active = false where slug = 'exemplo-espetinho'`);
    const rows = await as(client, { role: 'anon' }, (c) => c.query('select slug from public.products'));
    const slugs = rows.rows.map((r) => r.slug);
    expect(slugs).toContain('exemplo-pizza');
    expect(slugs).not.toContain('exemplo-espetinho');
    const staff = await as(client, { role: 'authenticated', userId: attendant }, (c) => c.query('select slug from public.products'));
    expect(staff.rows.map((r) => r.slug)).toContain('exemplo-espetinho');
  });

  it('visitante e cliente não alteram preços', async () => {
    await expect(
      as(client, { role: 'anon' }, (c) => c.query(`update public.product_variants set price = 0.01`)),
    ).rejects.toThrow(/permission denied/);
    // Cliente autenticado: a RLS não encontra nenhuma linha que ele possa alterar.
    const res = await as(client, { role: 'authenticated', userId: customer }, (c) =>
      c.query(`update public.product_variants set price = 0.01 returning id`),
    );
    expect(res.rowCount).toBe(0);
    const { rows } = await client.query(`select count(*)::int as n from public.product_variants where price = 0.01`);
    expect(rows[0].n).toBe(0);
  });

  it('atendente não edita catálogo, mas pode marcar esgotado', async () => {
    const res = await as(client, { role: 'authenticated', userId: attendant }, (c) =>
      c.query(`update public.products set name = 'X' where slug = 'exemplo-pizza' returning id`),
    );
    expect(res.rowCount).toBe(0);
    await as(client, { role: 'authenticated', userId: attendant }, (c) =>
      c.query(`select public.set_availability('product', '00000000-0000-4000-8000-000000000002', false)`),
    );
    const { rows } = await client.query(`select is_available from public.products where id = '00000000-0000-4000-8000-000000000002'`);
    expect(rows[0].is_available).toBe(false);
    await expect(
      as(client, { role: 'authenticated', userId: customer }, (c) =>
        c.query(`select public.set_availability('product', '00000000-0000-4000-8000-000000000002', true)`),
      ),
    ).rejects.toThrow(/not_authorized/);
  });

  it('gerente edita catálogo e a alteração fica auditada', async () => {
    await as(client, { role: 'authenticated', userId: manager }, (c) =>
      c.query(`update public.product_variants set price = 15.00 where id = '00000000-0000-4000-8000-000000000014'`),
    );
    const { rows } = await client.query(
      `select actor_id, actor_role, old_data->>'price' as old, new_data->>'price' as new from public.audit_logs
       where table_name = 'product_variants' order by id desc limit 1`,
    );
    expect(rows[0]).toMatchObject({ actor_id: manager, actor_role: 'manager', old: '14.00', new: '15.00' });
  });
});

describe('RLS: pedidos e dados pessoais', () => {
  it('visitante não lê nem cria pedidos diretamente', async () => {
    await createOrder(client);
    await expect(as(client, { role: 'anon' }, (c) => c.query('select * from public.orders'))).rejects.toThrow(/permission denied/);
    await expect(
      as(client, { role: 'anon' }, (c) => c.query(`select public.create_order('{}'::jsonb)`)),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(client, { role: 'authenticated', userId: customer }, (c) => c.query(`select public.create_order('{}'::jsonb)`)),
    ).rejects.toThrow(/permission denied/);
  });

  it('cliente vê somente os próprios pedidos', async () => {
    const mine = await createOrder(client, { customer_id: customer });
    await createOrder(client, { customer_id: other });
    const rows = await as(client, { role: 'authenticated', userId: customer }, (c) => c.query('select id from public.orders'));
    expect(rows.rows.map((r) => r.id)).toEqual([mine.order_id]);
    const items = await as(client, { role: 'authenticated', userId: customer }, (c) => c.query('select order_id from public.order_items'));
    expect(new Set(items.rows.map((r) => r.order_id))).toEqual(new Set([mine.order_id]));
    const staffRows = await as(client, { role: 'authenticated', userId: attendant }, (c) => c.query('select id from public.orders'));
    expect(staffRows.rowCount).toBeGreaterThanOrEqual(3);
  });

  it('cliente não altera pedidos diretamente', async () => {
    await expect(
      as(client, { role: 'authenticated', userId: customer }, (c) => c.query(`update public.orders set total = 0`)),
    ).rejects.toThrow(/permission denied/);
  });

  it('endereços e favoritos são privados', async () => {
    await as(client, { role: 'authenticated', userId: customer }, (c) =>
      c.query(`insert into public.customer_addresses (user_id, street, number, neighborhood, city, state)
               values ($1, 'Rua B', '1', 'Centro', 'São Bento', 'PB')`, [customer]),
    );
    await expect(
      as(client, { role: 'authenticated', userId: customer }, (c) =>
        c.query(`insert into public.customer_addresses (user_id, street, number, neighborhood, city, state)
                 values ($1, 'Rua C', '1', 'Centro', 'São Bento', 'PB')`, [other]),
      ),
    ).rejects.toThrow(/row-level security/);
    const seen = await as(client, { role: 'authenticated', userId: other }, (c) => c.query('select * from public.customer_addresses'));
    expect(seen.rowCount).toBe(0);
    const seenByStaff = await as(client, { role: 'authenticated', userId: attendant }, (c) => c.query('select * from public.customer_addresses'));
    expect(seenByStaff.rowCount).toBe(0);
  });

  it('perfis: cliente vê o próprio; gerente vê todos; atendente não', async () => {
    const own = await as(client, { role: 'authenticated', userId: customer }, (c) => c.query('select id from public.profiles'));
    expect(own.rows.map((r) => r.id)).toEqual([customer]);
    const mgr = await as(client, { role: 'authenticated', userId: manager }, (c) => c.query('select id from public.profiles'));
    expect(mgr.rowCount).toBeGreaterThanOrEqual(5);
    const att = await as(client, { role: 'authenticated', userId: attendant }, (c) => c.query('select id from public.profiles'));
    expect(att.rows.map((r) => r.id)).toEqual([attendant]);
  });

  it('avaliações: visitante só vê aprovadas e sem dados pessoais', async () => {
    await client.query(`insert into public.reviews (author_name, rating, status, customer_id) values ('A', 5, 'approved', $1), ('B', 1, 'pending', null)`, [customer]);
    const rows = await as(client, { role: 'anon' }, (c) => c.query('select author_name, rating from public.reviews'));
    expect(rows.rows).toEqual([{ author_name: 'A', rating: 5 }]);
    await expect(as(client, { role: 'anon' }, (c) => c.query('select customer_id from public.reviews'))).rejects.toThrow(/permission denied/);
  });
});

describe('papéis da equipe', () => {
  it('somente admin gerencia papéis e não remove o último admin', async () => {
    await expect(
      as(client, { role: 'authenticated', userId: manager }, (c) => c.query(`select public.admin_set_user_role('cliente@teste.local', 'admin')`)),
    ).rejects.toThrow(/not_authorized/);
    await expect(
      as(client, { role: 'authenticated', userId: customer }, (c) => c.query(`insert into public.user_roles (user_id, role) values ($1, 'admin')`, [customer])),
    ).rejects.toThrow(/permission denied/);
    await as(client, { role: 'authenticated', userId: admin }, (c) => c.query(`select public.admin_set_user_role('cliente@teste.local', 'attendant')`));
    const staff = await as(client, { role: 'authenticated', userId: admin }, (c) => c.query('select email, role from public.admin_list_staff()'));
    expect(staff.rows).toContainEqual({ email: 'cliente@teste.local', role: 'attendant' });
    await expect(
      as(client, { role: 'authenticated', userId: admin }, (c) => c.query(`select public.admin_remove_user_role($1)`, [admin])),
    ).rejects.toThrow(/last_admin/);
    await as(client, { role: 'authenticated', userId: admin }, (c) => c.query(`select public.admin_remove_user_role($1)`, [customer]));
  });

  it('bootstrap do primeiro admin não pode ser chamado por usuários', async () => {
    await expect(
      as(client, { role: 'authenticated', userId: customer }, (c) => c.query(`select public.bootstrap_first_admin('cliente@teste.local')`)),
    ).rejects.toThrow(/permission denied/);
    await expect(client.query(`select public.bootstrap_first_admin('cliente@teste.local')`)).rejects.toThrow(/admin_already_exists/);
  });
});

describe('storage', () => {
  it('somente gerente/admin envia imagens no bucket do catálogo', async () => {
    await expect(
      as(client, { role: 'authenticated', userId: attendant }, (c) =>
        c.query(`insert into storage.objects (bucket_id, name) values ('catalog', 'products/a.jpg')`),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(client, { role: 'authenticated', userId: manager }, (c) =>
        c.query(`insert into storage.objects (bucket_id, name) values ('catalog', 'outros/a.jpg')`),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(client, { role: 'authenticated', userId: manager }, (c) =>
        c.query(`insert into storage.objects (bucket_id, name) values ('catalog', 'products/a.exe')`),
      ),
    ).rejects.toThrow(/row-level security/);
    await as(client, { role: 'authenticated', userId: manager }, (c) =>
      c.query(`insert into storage.objects (bucket_id, name) values ('catalog', 'products/a.webp')`),
    );
    const read = await as(client, { role: 'anon' }, (c) => c.query(`select name from storage.objects where bucket_id = 'catalog'`));
    expect(read.rows.map((r) => r.name)).toContain('products/a.webp');
  });
});

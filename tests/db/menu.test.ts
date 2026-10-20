import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type pg from 'pg';
import { as, connect, createUser, resetDatabase } from './helpers';

let client: pg.Client;
const migration = (name: string) => fs.readFileSync(path.resolve(__dirname, '../../supabase/migrations', name), 'utf8');
const MENU_SQL = migration('20261020000200_official_menu.sql');
const DRINKS_SQL = migration('20261021000100_menu_confirmations_and_drinks.sql');
const REMOVE_DEMO_SQL = migration('20261021000200_remove_demo.sql');

beforeAll(async () => {
  resetDatabase();
  client = await connect();
});
afterAll(async () => {
  await client.end();
});

const EXPECTED: Record<string, string[]> = {
  'pizzas-tradicionais': ['Pizza Muçarela', 'Pizza Calabresa', 'Pizza Frango', 'Pizza Marguerita', 'Pizza Portuguesa', 'Pizza Bacon'],
  'pizzas-especiais': ['Pizza Frango com Catupiry', 'Pizza Calabresa com Catupiry', 'Pizza Carne de Sol', 'Pizza Carne de Sol com Queijo Coalho', 'Pizza Quatro Queijos', 'Pizza Frango com Cheddar', 'Pizza Pepperoni', 'Pizza Costela'],
  'pizzas-premium': ['Pizza Camarão com Catupiry', 'Pizza Camarão aos Quatro Queijos'],
  'pizzas-doces': ['Pizza Chocolate', 'Pizza Banana com Canela', 'Pizza Prestígio', 'Pizza Romeu e Julieta'],
  'lanches-tradicionais': ['Misto Quente', 'X-Burguer', 'X-Frango', 'X-Bacon', 'X-Calabresa'],
  'lanches-especiais': ['Cheddar Bacon', 'Duplo Burguer', 'Alcinão — Especial da Casa'],
  beirute: ['Beirute'],
  petiscos: ['Batata Frita 400 g', 'Batata Frita com Cheddar e Bacon', 'Isca de Frango Crocante', 'Calabresa do Chef'],
  'pratos-da-casa': ['Picanha na Chapa', 'Filé Mignon na Chapa', 'Filé à Parmegiana de Frango', 'Peixe Frito'],
  lasanhas: ['Lasanha de Carne', 'Lasanha de Frango', 'Lasanha Mista'],
  bebidas: ['Coca-Cola', 'Fanta Laranja', 'Cajuína', 'Cerveja', 'H2OH! 500 ml', 'Água mineral 500 ml'],
};

async function snapshot() {
  const { rows } = await client.query(`
    select c.slug as category, p.name, p.kind, p.base_price, p.serves, p.price_confirmed, p.is_featured, p.image_url,
      coalesce(json_agg(json_build_object('code', v.size_code, 'name', v.name, 'price', v.price) order by v.sort_order)
        filter (where v.id is not null), '[]') as sizes
    from public.products p join public.categories c on c.id = p.category_id
    left join public.product_variants v on v.product_id = p.id and v.deleted_at is null
    where not p.is_demo and p.deleted_at is null
    group by c.slug, c.sort_order, p.id order by c.sort_order, p.sort_order`);
  return rows as { category: string; name: string; kind: string; base_price: string | null; serves: string | null; price_confirmed: boolean; is_featured: boolean; image_url: string; sizes: { code: string; name: string; price: number }[] }[];
}

describe('cardápio oficial', () => {
  it('cadastra todas as categorias e produtos, sem duplicatas', async () => {
    const rows = await snapshot();
    for (const [category, names] of Object.entries(EXPECTED)) {
      expect(rows.filter((r) => r.category === category).map((r) => r.name), category).toEqual(names);
    }
    expect(rows).toHaveLength(46);
    const cats = await client.query(`select slug, section_type from public.categories where is_active order by sort_order`);
    expect(cats.rows.slice(0, 12).map((c) => c.slug)).toEqual([
      'pizzas-tradicionais', 'pizzas-especiais', 'pizzas-premium', 'pizzas-doces', 'bordas-recheadas', 'lanches-tradicionais',
      'lanches-especiais', 'beirute', 'petiscos', 'pratos-da-casa', 'lasanhas', 'molhos',
    ]);
    expect(cats.rows[12]?.slug).toBe('bebidas');
    expect(cats.rows.filter((c) => c.section_type === 'options').map((c) => c.slug)).toEqual(['bordas-recheadas', 'molhos']);
  });

  it('pizzas: 5 tamanhos com os preços informados, todos confirmados', async () => {
    const rows = await snapshot();
    const pizzas = rows.filter((r) => r.category.startsWith('pizzas-'));
    expect(pizzas).toHaveLength(20);
    for (const p of pizzas) {
      expect(p.kind).toBe('pizza');
      expect(p.sizes.map((s) => s.code)).toEqual(['P', 'M', 'G', 'GG', 'F']);
      expect(p.sizes.map((s) => s.name)).toEqual(['Pequena (P)', 'Média (M)', 'Grande (G)', 'Gigante (GG)', 'Família (F)']);
      const reference = p.category === 'pizzas-especiais' || p.category === 'pizzas-premium';
      expect(p.sizes.map((s) => Number(s.price)), p.name).toEqual(reference ? [30, 45, 55, 65, 80] : [25, 39, 50, 60, 75]);
      expect(p.price_confirmed, p.name).toBe(true);
    }
  });

  it('lanches, beirute, petiscos, pratos e lasanhas com preços e porções', async () => {
    const rows = await snapshot();
    const price = (name: string) => Number(rows.find((r) => r.name === name)?.base_price);
    expect([price('Misto Quente'), price('X-Burguer'), price('X-Frango'), price('X-Bacon'), price('X-Calabresa')]).toEqual([7, 15, 17, 19, 19]);
    expect([price('Cheddar Bacon'), price('Duplo Burguer'), price('Alcinão — Especial da Casa')]).toEqual([25, 27, 30]);
    expect(price('Beirute')).toBe(49.9);
    expect(rows.find((r) => r.name === 'Beirute')?.serves).toBe('Serve até 3 pessoas');
    expect([price('Batata Frita 400 g'), price('Batata Frita com Cheddar e Bacon'), price('Isca de Frango Crocante'), price('Calabresa do Chef')]).toEqual([17, 22, 30.9, 30.9]);
    const pratos = rows.filter((r) => r.category === 'pratos-da-casa');
    expect(pratos.map((p) => Number(p.base_price))).toEqual([70, 60, 50, 65]);
    expect(pratos.every((p) => p.serves === 'Serve 2 pessoas')).toBe(true);
    const las = Object.fromEntries(rows.filter((r) => r.category === 'lasanhas').map((r) => [r.name, r.sizes.map((s) => `${s.name}:${Number(s.price)}`)]));
    expect(las).toEqual({
      'Lasanha de Carne': ['Pequena:21', 'Média:43', 'Grande:53'],
      'Lasanha de Frango': ['Pequena:19', 'Média:41', 'Grande:51'],
      'Lasanha Mista': ['Pequena:24', 'Média:48', 'Grande:57'],
    });
    expect(rows.find((r) => r.name === 'Alcinão — Especial da Casa')?.is_featured).toBe(true);
    expect(rows.every((r) => r.image_url === `/images/products/${r.image_url.split('/').pop()}` && r.image_url.endsWith('.svg'))).toBe(true);
    expect(new Set(rows.map((r) => r.image_url)).size).toBe(46);
  });

  it('bordas: tabela por tamanho ligada a todas as pizzas; molhos grátis e liberados', async () => {
    const { rows } = await client.query(`
      select v.name, array_agg(sp.price order by array_position(array['P','M','G','GG','F'], sp.size_code))::text as prices
      from public.option_groups g join public.option_values v on v.group_id = g.id
      join public.option_value_size_prices sp on sp.option_value_id = v.id
      where g.shared_key = 'bordas-recheadas' group by v.name, v.sort_order order by v.sort_order`);
    expect(rows).toEqual([
      { name: 'Requeijão', prices: '{4.00,6.00,8.00,8.00,10.00}' },
      { name: 'Catupiry Original', prices: '{8.00,10.00,16.00,18.00,20.00}' },
      { name: 'Cream Cheese', prices: '{8.00,10.00,16.00,18.00,20.00}' },
      { name: 'Quatro Queijos', prices: '{8.00,10.00,16.00,18.00,20.00}' },
      { name: 'Cheddar', prices: '{4.00,6.00,8.00,8.00,10.00}' },
    ]);
    const links = await client.query(`
      select count(*)::int as n from public.product_shared_groups l join public.option_groups g on g.id = l.group_id
      join public.products p on p.id = l.product_id where g.shared_key = 'bordas-recheadas' and p.kind = 'pizza' and not p.is_demo`);
    expect(links.rows[0].n).toBe(20);
    const molhos = await client.query(`select v.name, v.price::text as price, v.price_confirmed from public.option_values v join public.option_groups g on g.id = v.group_id where g.shared_key = 'molhos' order by v.sort_order`);
    expect(molhos.rows).toEqual([
      { name: 'Maionese verde', price: '0.00', price_confirmed: true },
      { name: 'Maionese de alho', price: '0.00', price_confirmed: true },
      { name: 'Maionese de bacon', price: '0.00', price_confirmed: true },
      { name: 'Maionese de calabresa', price: '0.00', price_confirmed: true },
    ]);
  });

  it('bebidas: tamanhos cadastrados, sem preço e em conferência; reaplicar não duplica nem mexe em preço conferido', async () => {
    const drinks = async () =>
      (await client.query(`
        select p.slug, p.price_confirmed, p.base_price,
          coalesce(json_agg(v.name order by v.sort_order) filter (where v.id is not null and v.deleted_at is null), '[]') as sizes,
          coalesce(sum(v.price) filter (where v.deleted_at is null), 0)::text as total
        from public.products p join public.categories c on c.id = p.category_id
        left join public.product_variants v on v.product_id = p.id
        where c.slug = 'bebidas' and not p.is_demo group by p.id order by p.sort_order`)).rows;
    const all = ['Lata', '600 ml', '1 litro', '2 litros'];
    expect(await drinks()).toEqual([
      { slug: 'coca-cola', price_confirmed: false, base_price: null, sizes: all, total: '0.00' },
      { slug: 'fanta-laranja', price_confirmed: false, base_price: null, sizes: all, total: '0.00' },
      { slug: 'cajuina', price_confirmed: false, base_price: null, sizes: all, total: '0.00' },
      { slug: 'cerveja', price_confirmed: false, base_price: null, sizes: [], total: '0' },
      { slug: 'h2oh-500ml', price_confirmed: false, base_price: null, sizes: [], total: '0' },
      { slug: 'agua-mineral-500ml', price_confirmed: false, base_price: null, sizes: [], total: '0' },
    ]);
    // A equipe confere a Coca-Cola e remove um tamanho; reaplicar a migration não desfaz nada.
    await client.query(`update public.product_variants v set price = 6 from public.products p where p.id = v.product_id and p.slug = 'coca-cola'`);
    await client.query(`update public.product_variants v set deleted_at = now() from public.products p where p.id = v.product_id and p.slug = 'fanta-laranja' and v.name = '1 litro'`);
    await client.query(`update public.products set price_confirmed = true where slug = 'coca-cola'`);
    await client.query(DRINKS_SQL);
    const after = await drinks();
    expect(after[0]).toMatchObject({ slug: 'coca-cola', price_confirmed: true, sizes: all, total: '24.00' });
    expect(after[1]).toMatchObject({ slug: 'fanta-laranja', sizes: ['Lata', '600 ml', '2 litros'] });
    expect(after).toHaveLength(6);
  });

  it('limpeza dos dados de exemplo remove só os produtos de demonstração', async () => {
    const before = await client.query(`select count(*)::int as n from public.products where not is_demo`);
    expect((await client.query(`select count(*)::int as n from public.products where is_demo`)).rows[0].n).toBeGreaterThan(0);
    await client.query(REMOVE_DEMO_SQL);
    await client.query(REMOVE_DEMO_SQL); // idempotente
    expect((await client.query(`select count(*)::int as n from public.products where is_demo and deleted_at is null`)).rows[0].n).toBe(0);
    expect((await client.query(`select count(*)::int as n from public.products where not is_demo`)).rows[0].n).toBe(before.rows[0].n);
    const cats = await client.query(`select slug, is_active from public.categories where slug in ('bebidas', 'pizzas', 'combos') order by slug`);
    expect(cats.rows).toEqual([
      { slug: 'bebidas', is_active: true },
      { slug: 'combos', is_active: false },
      { slug: 'pizzas', is_active: false },
    ]);
  });

  it('reaplicar o cardápio atualiza sem duplicar e não troca foto já enviada', async () => {
    await client.query(`update public.products set image_url = 'https://exemplo.supabase.co/storage/v1/object/public/catalog/products/x.webp', base_price = 99 where slug = 'x-bacon'`);
    await client.query(MENU_SQL);
    const rows = await snapshot();
    expect(rows).toHaveLength(46);
    const xbacon = rows.find((r) => r.name === 'X-Bacon');
    expect(Number(xbacon?.base_price)).toBe(19);
    expect(xbacon?.image_url).toContain('catalog/products/x.webp');
    // Conferências feitas pela equipe continuam valendo (pizzas especiais e molhos).
    const kept = await client.query(`select count(*)::int as n from public.products p join public.categories c on c.id = p.category_id where c.slug in ('pizzas-especiais', 'pizzas-premium') and not p.price_confirmed`);
    expect(kept.rows[0].n).toBe(0);
    const sauces = await client.query(`select count(*)::int as n from public.option_values v join public.option_groups g on g.id = v.group_id where g.shared_key = 'molhos' and not v.price_confirmed`);
    expect(sauces.rows[0].n).toBe(0);
    const dup = await client.query(`select count(*)::int as n from (select product_id, size_code from public.product_variants where deleted_at is null and size_code is not null group by 1, 2 having count(*) > 1) d`);
    expect(dup.rows[0].n).toBe(0);
    const values = await client.query(`select count(*)::int as n from public.option_values v join public.option_groups g on g.id = v.group_id where g.shared_key in ('bordas-recheadas', 'molhos')`);
    expect(values.rows[0].n).toBe(9);
  });

  it('visitante lê grupos compartilhados mas não altera; só gerente/admin altera preços', async () => {
    const read = await as(client, { role: 'anon' }, (c) => c.query(`select count(*)::int as n from public.option_value_size_prices`));
    expect(read.rows[0].n).toBe(25);
    await expect(as(client, { role: 'anon' }, (c) => c.query(`update public.option_value_size_prices set price = 0`))).rejects.toThrow(/permission denied/);
    const attendant = await createUser(client, 'atendente-menu@teste.local', 'attendant');
    const res = await as(client, { role: 'authenticated', userId: attendant }, (c) => c.query(`update public.products set base_price = 1 where slug = 'beirute' returning id`));
    expect(res.rowCount).toBe(0);
    const manager = await createUser(client, 'gerente-menu@teste.local', 'manager');
    await as(client, { role: 'authenticated', userId: manager }, (c) =>
      c.query(`update public.products set price_confirmed = false where slug = 'pizza-pepperoni'`),
    );
    const { rows } = await client.query(`select actor_role from public.audit_logs where table_name = 'products' and new_data->>'slug' = 'pizza-pepperoni' order by id desc limit 1`);
    expect(rows[0].actor_role).toBe('manager');
    await expect(
      client.query(`
        with own as (
          insert into public.option_groups (product_id, kind, name) select id, 'extra', 'Grupo próprio' from public.products where slug = 'x-frango' returning id
        )
        insert into public.product_shared_groups (product_id, group_id) select p.id, own.id from public.products p, own where p.slug = 'beirute'`),
    ).rejects.toThrow(/group_not_shared/);
  });

  it('quem confirmou e quando é gravado pelo banco, sem aceitar valores enviados pelo navegador', async () => {
    const manager = await createUser(client, 'gerente-precos@teste.local', 'manager');
    const other = await createUser(client, 'outro-precos@teste.local', 'manager');
    await client.query(`update public.products set price_confirmed = false where slug = 'pizza-costela'`);
    await as(client, { role: 'authenticated', userId: manager }, (c) =>
      c.query(`update public.products set price_confirmed = true, price_confirmed_at = '2000-01-01', price_confirmed_by = $1 where slug = 'pizza-costela'`, [other]),
    );
    const confirmed = await client.query(`select price_confirmed_by, price_confirmed_at > now() - interval '1 minute' as recent from public.products where slug = 'pizza-costela'`);
    expect(confirmed.rows[0]).toEqual({ price_confirmed_by: manager, recent: true });
    // Editar outro campo não troca o registro da conferência.
    await as(client, { role: 'authenticated', userId: other }, (c) => c.query(`update public.products set price_confirmed_by = $1, sort_order = 99 where slug = 'pizza-costela'`, [other]));
    expect((await client.query(`select price_confirmed_by from public.products where slug = 'pizza-costela'`)).rows[0].price_confirmed_by).toBe(manager);
    // Voltar para "em conferência" limpa o registro; o molho só é liberado com conferência explícita.
    await as(client, { role: 'authenticated', userId: manager }, (c) => c.query(`update public.products set price_confirmed = false where slug = 'pizza-costela'`));
    expect((await client.query(`select price_confirmed_at, price_confirmed_by from public.products where slug = 'pizza-costela'`)).rows[0]).toEqual({ price_confirmed_at: null, price_confirmed_by: null });
    await client.query(`update public.option_values set price_confirmed = false where name = 'Maionese verde'`);
    await as(client, { role: 'authenticated', userId: manager }, (c) => c.query(`update public.option_values set price = 0, price_confirmed = true where name = 'Maionese verde'`));
    const sauce = await client.query(`select price_confirmed_by from public.option_values where name = 'Maionese verde'`);
    expect(sauce.rows[0].price_confirmed_by).toBe(manager);
  });
});

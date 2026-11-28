-- =============================================================================
-- Alcinão — CALZONES e nova tabela de tamanhos das pizzas (28/11/2026) — Issue #13
--   1. Pizzas tradicionais e doces: P 30,00 · M 45,00 · G 55,00 · GG 65,00 · F 80,00
--      (pizzas especiais e premium já estavam nessa tabela: não mudam).
--   2. Nova categoria "Calzones" com 5 sabores, tamanhos P 38,00 · M 42,00 · G 47,00.
-- Idempotente: pode ser aplicada mais de uma vez sem duplicar nada.
-- =============================================================================

create or replace function pg_temp.uid(p_key text)
returns uuid language sql immutable as $$
  select (substr(h, 1, 12) || '4' || substr(h, 14, 3) || '8' || substr(h, 18, 15))::uuid
  from (select md5('alcinao-cardapio:' || p_key) as h) s
$$;

-- ------------------------------------------------------------ 1. pizzas tradicionais e doces
update public.product_variants v
set price = t.price, is_active = true
from public.products p
join public.categories c on c.id = p.category_id,
  (values ('P', 30.00), ('M', 45.00), ('G', 55.00), ('GG', 65.00), ('F', 80.00)) as t (code, price)
where v.product_id = p.id
  and v.size_code = t.code
  and v.deleted_at is null
  and p.deleted_at is null
  and c.slug in ('pizzas-tradicionais', 'pizzas-doces');

update public.products p
set price_confirmed = true
from public.categories c
where c.id = p.category_id
  and c.slug in ('pizzas-tradicionais', 'pizzas-doces')
  and p.deleted_at is null;

-- ------------------------------------------------------------ 2. calzones
insert into public.categories (id, slug, name, sort_order, description, is_active, show_on_home)
values (pg_temp.uid('categoria:calzones'), 'calzones', 'Calzones', 45, 'Tamanhos P, M e G.', true, true)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order,
  description = excluded.description, is_active = true, deleted_at = null;

do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select * from (values
      ('calzone-carne-de-sol', 'Calzone de Carne de Sol', 'Massa recheada com carne de sol e muçarela.', 1),
      ('calzone-frango', 'Calzone de Frango', 'Massa recheada com frango e muçarela.', 2),
      ('calzone-do-chef', 'Calzone do Chef', 'Massa recheada com o recheio especial da casa.', 3),
      ('calzone-chocolate', 'Calzone de Chocolate', 'Massa recheada com chocolate.', 4),
      ('calzone-chocolate-branco', 'Calzone de Chocolate Branco', 'Massa recheada com chocolate branco.', 5)
    ) as t(slug, name, description, sort)
  loop
    insert into public.products (
      id, category_id, kind, slug, name, short_description, description, base_price, sort_order, price_confirmed,
      serves, tags, is_featured, featured_order, image_url, image_alt, is_active, is_available
    ) values (
      pg_temp.uid('produto:' || r.slug), (select id from public.categories where slug = 'calzones'), 'simple', r.slug, r.name,
      left(r.description, 200), r.description, null, r.sort, true,
      null, '{}', false, null,
      '/images/products/' || r.slug || '.svg', 'Imagem ilustrativa provisória de ' || r.name || ' (foto oficial em breve)', true, true
    )
    on conflict (slug) do update set
      category_id = excluded.category_id, kind = excluded.kind, name = excluded.name,
      short_description = excluded.short_description, description = excluded.description,
      sort_order = excluded.sort_order, price_confirmed = excluded.price_confirmed,
      image_url = coalesce(public.products.image_url, excluded.image_url),
      image_alt = coalesce(public.products.image_alt, excluded.image_alt),
      deleted_at = null
    returning id into v_id;

    insert into public.product_variants (id, product_id, size_code, name, price, sort_order, max_flavors, flavor_price_rule)
    values
      (pg_temp.uid('tamanho:' || v_id || ':P'), v_id, 'P', 'Pequeno', 38.00, 1, 1, 'fixed'),
      (pg_temp.uid('tamanho:' || v_id || ':M'), v_id, 'M', 'Médio', 42.00, 2, 1, 'fixed'),
      (pg_temp.uid('tamanho:' || v_id || ':G'), v_id, 'G', 'Grande', 47.00, 3, 1, 'fixed')
    on conflict (product_id, size_code) where size_code is not null and deleted_at is null
    do update set name = excluded.name, price = excluded.price, sort_order = excluded.sort_order;
  end loop;
end;
$$;

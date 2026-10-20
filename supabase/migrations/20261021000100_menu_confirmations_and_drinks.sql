-- =============================================================================
-- Alcinão — Definições do restaurante (21/10/2026)
--   1. Pizzas especiais e premium: tabela única nos 5 tamanhos
--      (P 30,00 · M 45,00 · G 55,00 · GG 65,00 · F 80,00), preços CONFIRMADOS.
--   2. Molhos: grátis (R$ 0,00), CONFIRMADOS.
--   3. Bebidas: categoria reativada e itens cadastrados. Bebida que já existir no
--      banco mantém nome, tamanhos e preços; as novas entram "em conferência"
--      (sem valor) até a equipe informar o preço no painel.
-- Idempotente: pode ser aplicada mais de uma vez sem duplicar nada.
-- =============================================================================

create or replace function pg_temp.uid(p_key text)
returns uuid language sql immutable as $$
  select (substr(h, 1, 12) || '4' || substr(h, 14, 3) || '8' || substr(h, 18, 15))::uuid
  from (select md5('alcinao-cardapio:' || p_key) as h) s
$$;

-- ------------------------------------------------------------ 1. pizzas especiais e premium
update public.product_variants v
set price = t.price, is_active = true
from public.products p
join public.categories c on c.id = p.category_id,
  (values ('P', 30.00), ('M', 45.00), ('G', 55.00), ('GG', 65.00), ('F', 80.00)) as t (code, price)
where v.product_id = p.id
  and v.size_code = t.code
  and v.deleted_at is null
  and p.deleted_at is null
  and c.slug in ('pizzas-especiais', 'pizzas-premium');

update public.products p
set price_confirmed = true
from public.categories c
where c.id = p.category_id
  and c.slug in ('pizzas-especiais', 'pizzas-premium')
  and p.deleted_at is null
  and not p.price_confirmed;

-- ------------------------------------------------------------ 2. molhos grátis
update public.option_values v
set price = 0, price_confirmed = true
from public.option_groups g
where g.id = v.group_id
  and g.shared_key = 'molhos'
  and v.deleted_at is null;

-- ------------------------------------------------------------ 3. bebidas
insert into public.categories (id, slug, name, sort_order, is_active, show_on_home, section_type)
values (pg_temp.uid('categoria:bebidas'), 'bebidas', 'Bebidas', 130, true, true, 'products')
on conflict (slug) do update set name = 'Bebidas', sort_order = 130, is_active = true, deleted_at = null,
  section_type = 'products', shared_group_id = null;

-- Produto novo: sem preço e "em conferência". Produto já existente: só volta a ficar
-- visível na categoria Bebidas; nome, preços e conferência são mantidos.
create or replace function pg_temp.drink(p_slug text, p_name text, p_description text, p_sort integer, p_tags text[])
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.products (
    id, category_id, kind, slug, name, short_description, description, base_price, sort_order, price_confirmed,
    tags, image_url, image_alt, is_active, is_available
  ) values (
    pg_temp.uid('produto:' || p_slug), (select id from public.categories where slug = 'bebidas'), 'simple', p_slug, p_name,
    p_description, p_description, null, p_sort, false, p_tags,
    '/images/products/' || p_slug || '.svg', 'Imagem ilustrativa provisória de ' || p_name || ' (foto oficial em breve)', true, true
  )
  on conflict (slug) do update set
    category_id = excluded.category_id, is_active = true, deleted_at = null
  returning id into v_id;
  return v_id;
end $$;

-- Tamanho novo entra com valor 0 apenas como marcador: o produto continua
-- "em conferência" e o site mostra "Preço a definir" até a confirmação.
create or replace function pg_temp.drink_size(p_product uuid, p_name text, p_sort integer)
returns void language plpgsql as $$
begin
  if exists (
    select 1 from public.products where id = p_product and price_confirmed
  ) then
    return; -- produto já conferido pela equipe: não mexe nos tamanhos dela
  end if;
  insert into public.product_variants (id, product_id, name, price, sort_order, max_flavors, flavor_price_rule)
  select pg_temp.uid('tamanho:' || p_product || ':' || lower(p_name)), p_product, p_name, 0, p_sort, 1, 'fixed'
  -- Não recria tamanho que a equipe removeu ou renomeou.
  where not exists (
    select 1 from public.product_variants where product_id = p_product and lower(name) = lower(p_name)
  )
  on conflict (id) do nothing;
end $$;

do $$
declare
  v_id uuid;
  sizes constant text[] := array['Lata', '600 ml', '1 litro', '2 litros'];
begin
  v_id := pg_temp.drink('coca-cola', 'Coca-Cola', 'Lata, 600 ml, 1 litro ou 2 litros.', 10, '{bebida}');
  for i in 1..4 loop perform pg_temp.drink_size(v_id, sizes[i], i); end loop;

  v_id := pg_temp.drink('fanta-laranja', 'Fanta Laranja', 'Lata, 600 ml, 1 litro ou 2 litros.', 20, '{bebida}');
  for i in 1..4 loop perform pg_temp.drink_size(v_id, sizes[i], i); end loop;

  v_id := pg_temp.drink('cajuina', 'Cajuína', 'Lata, 600 ml, 1 litro ou 2 litros.', 30, '{bebida}');
  for i in 1..4 loop perform pg_temp.drink_size(v_id, sizes[i], i); end loop;

  -- Marcas e tamanhos de cerveja não foram informados: cadastrar no painel
  -- (Tamanhos / variantes) junto com os preços.
  perform pg_temp.drink('cerveja', 'Cerveja', 'Consulte as marcas disponíveis. Venda proibida para menores de 18 anos.', 40, '{bebida,alcoolica}');

  perform pg_temp.drink('h2oh-500ml', 'H2OH! 500 ml', 'Garrafa de 500 ml.', 50, '{bebida}');
  perform pg_temp.drink('agua-mineral-500ml', 'Água mineral 500 ml', 'Garrafa de 500 ml.', 60, '{bebida}');
end;
$$;

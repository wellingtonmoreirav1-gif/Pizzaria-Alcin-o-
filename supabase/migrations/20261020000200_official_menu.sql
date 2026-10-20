-- =============================================================================
-- Alcinão — CARDÁPIO OFICIAL (preços informados pelo estabelecimento em 20/10/2026)
--
-- * Idempotente: atualiza pelo "slug" (não duplica) e nunca troca uma foto já enviada.
-- * Pizzas ESPECIAIS e PREMIUM entram com "price_confirmed = false": preços de
--   referência que precisam ser conferidos em /admin/precos antes de serem vendidos.
-- * Molhos entram SEM preço definido (price_confirmed = false): o administrador
--   define se são gratuitos ou pagos antes de poderem ser escolhidos.
-- * Imagens: ilustrações provisórias em /images/products/<slug>.svg (substituíveis
--   pelo painel). Não são fotos dos produtos.
-- =============================================================================

create function pg_temp.cat(p_slug text, p_name text, p_sort integer, p_description text default null)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.categories (slug, name, sort_order, description, is_active, show_on_home)
  values (p_slug, p_name, p_sort, p_description, true, true)
  on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order,
    description = coalesce(excluded.description, public.categories.description), is_active = true, deleted_at = null
  returning id into v_id;
  return v_id;
end $$;

create function pg_temp.product(
  p_category text, p_slug text, p_name text, p_kind public.product_kind, p_description text,
  p_base_price numeric, p_sort integer, p_price_confirmed boolean default true,
  p_serves text default null, p_tags text[] default '{}', p_featured boolean default false, p_featured_order integer default null
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.products (
    category_id, kind, slug, name, short_description, description, base_price, sort_order, price_confirmed,
    serves, tags, is_featured, featured_order, image_url, image_alt, is_active, is_available
  ) values (
    (select id from public.categories where slug = p_category), p_kind, p_slug, p_name, left(p_description, 200), p_description,
    p_base_price, p_sort, p_price_confirmed, p_serves, p_tags, p_featured, p_featured_order,
    '/images/products/' || p_slug || '.svg', 'Imagem ilustrativa provisória de ' || p_name || ' (foto oficial em breve)', true, true
  )
  on conflict (slug) do update set
    category_id = excluded.category_id, kind = excluded.kind, name = excluded.name,
    short_description = excluded.short_description, description = excluded.description,
    base_price = excluded.base_price, sort_order = excluded.sort_order, price_confirmed = excluded.price_confirmed,
    serves = excluded.serves, tags = excluded.tags, is_featured = excluded.is_featured,
    featured_order = excluded.featured_order,
    image_url = coalesce(public.products.image_url, excluded.image_url),
    image_alt = coalesce(public.products.image_alt, excluded.image_alt),
    deleted_at = null
  returning id into v_id;
  return v_id;
end $$;

create function pg_temp.size(p_product uuid, p_code text, p_name text, p_price numeric, p_sort integer)
returns void language plpgsql as $$
begin
  insert into public.product_variants (product_id, size_code, name, price, sort_order, max_flavors, flavor_price_rule)
  values (p_product, p_code, p_name, p_price, p_sort, 1, 'fixed')
  on conflict (product_id, size_code) where size_code is not null and deleted_at is null
  do update set name = excluded.name, price = excluded.price, sort_order = excluded.sort_order;
end $$;

create function pg_temp.pizza_sizes(p_product uuid, p_prices numeric[])
returns void language plpgsql as $$
begin
  perform pg_temp.size(p_product, 'P', 'Pequena (P)', p_prices[1], 1);
  perform pg_temp.size(p_product, 'M', 'Média (M)', p_prices[2], 2);
  perform pg_temp.size(p_product, 'G', 'Grande (G)', p_prices[3], 3);
  perform pg_temp.size(p_product, 'GG', 'Gigante (GG)', p_prices[4], 4);
  perform pg_temp.size(p_product, 'F', 'Família (F)', p_prices[5], 5);
end $$;

create function pg_temp.shared_group(p_key text, p_kind public.option_group_kind, p_name text, p_min integer, p_max integer, p_description text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.option_groups (shared_key, kind, name, min_select, max_select, description, sort_order)
  values (p_key, p_kind, p_name, p_min, p_max, p_description, 50)
  on conflict (shared_key) do update set kind = excluded.kind, name = excluded.name, min_select = excluded.min_select,
    max_select = excluded.max_select, description = excluded.description, is_active = true, deleted_at = null
  returning id into v_id;
  return v_id;
end $$;

create function pg_temp.option(p_group uuid, p_name text, p_sort integer, p_price numeric, p_confirmed boolean)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from public.option_values where group_id = p_group and lower(name) = lower(p_name) and deleted_at is null;
  if v_id is null then
    insert into public.option_values (group_id, name, sort_order, price, price_confirmed)
    values (p_group, p_name, p_sort, p_price, p_confirmed) returning id into v_id;
  else
    update public.option_values set sort_order = p_sort, price = p_price, price_confirmed = p_confirmed where id = v_id;
  end if;
  return v_id;
end $$;

create function pg_temp.option_sizes(p_value uuid, p_prices numeric[])
returns void language plpgsql as $$
declare
  codes text[] := array['P', 'M', 'G', 'GG', 'F'];
begin
  for i in 1..5 loop
    insert into public.option_value_size_prices (option_value_id, size_code, price, is_offered)
    values (p_value, codes[i], p_prices[i], true)
    on conflict (option_value_id, size_code) do update set price = excluded.price, is_offered = true;
  end loop;
end $$;

create function pg_temp.link(p_product uuid, p_group uuid, p_sort integer)
returns void language sql as $$
  insert into public.product_shared_groups (product_id, group_id, sort_order) values (p_product, p_group, p_sort)
  on conflict (product_id, group_id) do update set sort_order = excluded.sort_order
$$;

do $$
declare
  g_bordas uuid;
  g_molhos uuid;
  v_id uuid;
  trad constant numeric[] := array[25.00, 39.00, 50.00, 60.00, 75.00];
  especial constant numeric[] := array[30.00, 45.00, 55.00, 65.00, 80.00]; -- referência, a conferir
  r record;
begin
  -- ------------------------------------------------------------ categorias
  perform pg_temp.cat('pizzas-tradicionais', 'Pizzas tradicionais', 10);
  perform pg_temp.cat('pizzas-especiais', 'Pizzas especiais', 20);
  perform pg_temp.cat('pizzas-premium', 'Pizzas premium', 30);
  perform pg_temp.cat('pizzas-doces', 'Pizzas doces', 40);
  perform pg_temp.cat('bordas-recheadas', 'Bordas recheadas', 50, 'Adicione na hora de montar a sua pizza. Valor somado ao preço da pizza, conforme o tamanho.');
  perform pg_temp.cat('lanches-tradicionais', 'Lanches tradicionais', 60);
  perform pg_temp.cat('lanches-especiais', 'Lanches especiais', 70);
  perform pg_temp.cat('beirute', 'Beirute', 80);
  perform pg_temp.cat('petiscos', 'Petiscos', 90);
  perform pg_temp.cat('pratos-da-casa', 'Pratos da casa', 100, 'Todos os pratos servem 2 pessoas.');
  perform pg_temp.cat('lasanhas', 'Lasanhas', 110);
  perform pg_temp.cat('molhos', 'Molhos', 120, 'Molhos da casa para acompanhar lanches e petiscos.');

  -- Categorias criadas na instalação inicial e que não fazem parte do cardápio oficial:
  -- ficam ocultas (não excluídas) se não tiverem produtos.
  update public.categories c set is_active = false
  where c.slug in ('pizzas', 'almoco', 'churrasco', 'combos', 'porcoes', 'bebidas', 'sobremesas')
    and not exists (select 1 from public.products p where p.category_id = c.id and p.deleted_at is null);

  -- ------------------------------------------------------------ bordas (grupo compartilhado)
  g_bordas := pg_temp.shared_group('bordas-recheadas', 'crust', 'Borda recheada', 0, 1, 'Opcional. Valor somado ao preço da pizza.');
  perform pg_temp.option_sizes(pg_temp.option(g_bordas, 'Requeijão', 1, 0, true), array[4.00, 6.00, 8.00, 8.00, 10.00]);
  perform pg_temp.option_sizes(pg_temp.option(g_bordas, 'Catupiry Original', 2, 0, true), array[8.00, 10.00, 16.00, 18.00, 20.00]);
  perform pg_temp.option_sizes(pg_temp.option(g_bordas, 'Cream Cheese', 3, 0, true), array[8.00, 10.00, 16.00, 18.00, 20.00]);
  perform pg_temp.option_sizes(pg_temp.option(g_bordas, 'Quatro Queijos', 4, 0, true), array[8.00, 10.00, 16.00, 18.00, 20.00]);
  perform pg_temp.option_sizes(pg_temp.option(g_bordas, 'Cheddar', 5, 0, true), array[4.00, 6.00, 8.00, 8.00, 10.00]);

  -- ------------------------------------------------------------ molhos (sem preço definido)
  g_molhos := pg_temp.shared_group('molhos', 'extra', 'Molhos', 0, 4, 'Opcional.');
  perform pg_temp.option(g_molhos, 'Maionese verde', 1, 0, false);
  perform pg_temp.option(g_molhos, 'Maionese de alho', 2, 0, false);
  perform pg_temp.option(g_molhos, 'Maionese de bacon', 3, 0, false);
  perform pg_temp.option(g_molhos, 'Maionese de calabresa', 4, 0, false);

  update public.categories set section_type = 'options', shared_group_id = g_bordas where slug = 'bordas-recheadas';
  update public.categories set section_type = 'options', shared_group_id = g_molhos where slug = 'molhos';

  -- ------------------------------------------------------------ pizzas
  for r in
    select * from (values
      ('pizzas-tradicionais', 'pizza-mucarela', 'Pizza Muçarela', 'Molho, muçarela e orégano.', 1, true, '{}'::text[]),
      ('pizzas-tradicionais', 'pizza-calabresa', 'Pizza Calabresa', 'Molho, calabresa e orégano.', 2, true, '{}'),
      ('pizzas-tradicionais', 'pizza-frango', 'Pizza Frango', 'Molho, frango e orégano.', 3, true, '{}'),
      ('pizzas-tradicionais', 'pizza-marguerita', 'Pizza Marguerita', 'Molho, muçarela, tomate e orégano.', 4, true, '{}'),
      ('pizzas-tradicionais', 'pizza-portuguesa', 'Pizza Portuguesa', 'Molho, presunto, ovos, cebola, pimentão, azeitona e orégano.', 5, true, '{}'),
      ('pizzas-tradicionais', 'pizza-bacon', 'Pizza Bacon', 'Molho, muçarela, bacon e orégano.', 6, true, '{}'),
      ('pizzas-especiais', 'pizza-frango-com-catupiry', 'Pizza Frango com Catupiry', 'Molho, frango, catupiry, cebola e orégano.', 1, false, '{}'),
      ('pizzas-especiais', 'pizza-calabresa-com-catupiry', 'Pizza Calabresa com Catupiry', 'Molho, calabresa, catupiry, cebola e orégano.', 2, false, '{}'),
      ('pizzas-especiais', 'pizza-carne-de-sol', 'Pizza Carne de Sol', 'Molho, carne de sol, muçarela, cebola e orégano.', 3, false, '{}'),
      ('pizzas-especiais', 'pizza-carne-de-sol-com-queijo-coalho', 'Pizza Carne de Sol com Queijo Coalho', 'Molho, carne de sol, queijo coalho, cebola e orégano.', 4, false, '{}'),
      ('pizzas-especiais', 'pizza-quatro-queijos', 'Pizza Quatro Queijos', 'Molho, muçarela, catupiry, parmesão e provolone.', 5, false, '{}'),
      ('pizzas-especiais', 'pizza-frango-com-cheddar', 'Pizza Frango com Cheddar', 'Ingredientes principais: molho, frango, muçarela, cheddar e orégano.', 6, false, '{}'),
      ('pizzas-especiais', 'pizza-pepperoni', 'Pizza Pepperoni', 'Molho, muçarela, pepperoni e orégano.', 7, false, '{}'),
      ('pizzas-especiais', 'pizza-costela', 'Pizza Costela', 'Molho, costela desfiada, cebola e muçarela.', 8, false, '{}'),
      ('pizzas-premium', 'pizza-camarao-com-catupiry', 'Pizza Camarão com Catupiry', 'Ingredientes principais: molho, camarão, catupiry, cebola e orégano.', 1, false, '{camarão}'),
      ('pizzas-premium', 'pizza-camarao-aos-quatro-queijos', 'Pizza Camarão aos Quatro Queijos', 'Ingredientes principais: molho, camarão, muçarela, catupiry, parmesão e provolone.', 2, false, '{camarão}'),
      ('pizzas-doces', 'pizza-chocolate', 'Pizza Chocolate', 'Muçarela, chocolate e granulado.', 1, true, '{doce}'),
      ('pizzas-doces', 'pizza-banana-com-canela', 'Pizza Banana com Canela', 'Muçarela, banana, açúcar e canela.', 2, true, '{doce}'),
      ('pizzas-doces', 'pizza-prestigio', 'Pizza Prestígio', 'Muçarela, coco e leite condensado.', 3, true, '{doce}'),
      ('pizzas-doces', 'pizza-romeu-e-julieta', 'Pizza Romeu e Julieta', 'Muçarela, goiabada e catupiry.', 4, true, '{doce}')
    ) as t(category, slug, name, description, sort, confirmed, tags)
  loop
    v_id := pg_temp.product(r.category, r.slug, r.name, 'pizza', r.description, null, r.sort, r.confirmed, null, r.tags);
    perform pg_temp.pizza_sizes(v_id, case when r.category in ('pizzas-especiais', 'pizzas-premium') then especial else trad end);
    perform pg_temp.link(v_id, g_bordas, 10);
  end loop;

  -- ------------------------------------------------------------ lanches, beirute e petiscos
  for r in
    select * from (values
      ('lanches-tradicionais', 'misto-quente', 'Misto Quente', 'Pão, queijo, presunto, batata palha e molho.', 7.00, 1, null::text, '{}'::text[], false, null::int),
      ('lanches-tradicionais', 'x-burguer', 'X-Burguer', 'Pão, carne artesanal, queijo, batata palha, salada, cebola caramelizada e molho.', 15.00, 2, null, '{}', false, null),
      ('lanches-tradicionais', 'x-frango', 'X-Frango', 'Pão, frango com catupiry, batata palha, queijo, milho com requeijão e salada.', 17.00, 3, null, '{}', false, null),
      ('lanches-tradicionais', 'x-bacon', 'X-Bacon', 'Pão, carne, queijo cheddar, bacon, batata palha, salada, cebola caramelizada e molho.', 19.00, 4, null, '{}', false, null),
      ('lanches-tradicionais', 'x-calabresa', 'X-Calabresa', 'Pão, carne, queijo, calabresa, batata palha, salada, cebola caramelizada na chapa e molho.', 19.00, 5, null, '{}', false, null),
      ('lanches-especiais', 'cheddar-bacon', 'Cheddar Bacon', 'Pão, duas carnes, queijo cheddar, bacon, salada, cebola caramelizada e molho.', 25.00, 1, null, '{}', false, null),
      ('lanches-especiais', 'duplo-burguer', 'Duplo Burguer', 'Pão, duas carnes, dois queijos, presunto, salada, cebola caramelizada e molho.', 27.00, 2, null, '{}', false, null),
      ('lanches-especiais', 'alcinao-especial-da-casa', 'Alcinão — Especial da Casa', 'Pão, duas carnes (frango e bovina), queijo, carne de sol, cream cheese, catupiry empanado, bacon, salada, cebola caramelizada e batata palha.', 30.00, 3, null, '{especial-da-casa}', true, 1),
      ('beirute', 'beirute', 'Beirute', 'Pão, hambúrguer, ovo, salada, queijo e mortadela. Acompanha batata frita.', 49.90, 1, 'Serve até 3 pessoas', '{}', false, null),
      ('petiscos', 'batata-frita-400g', 'Batata Frita 400 g', 'Batata frita com molho rosé acompanhado.', 17.00, 1, null, '{}', false, null),
      ('petiscos', 'batata-frita-cheddar-bacon', 'Batata Frita com Cheddar e Bacon', 'Batata frita, bacon crocante, cheddar derretido e molho rosé.', 22.00, 2, null, '{}', false, null),
      ('petiscos', 'isca-de-frango-crocante', 'Isca de Frango Crocante', 'Iscas de frango empanadas com farinha panko, acompanhadas de molho rosé.', 30.90, 3, null, '{}', false, null),
      ('petiscos', 'calabresa-do-chef', 'Calabresa do Chef', 'Calabresa grelhada com cebola, azeitona verde, batata frita e muçarela gratinada.', 30.90, 4, null, '{}', false, null)
    ) as t(category, slug, name, description, price, sort, serves, tags, featured, featured_order)
  loop
    v_id := pg_temp.product(r.category, r.slug, r.name, 'simple', r.description, r.price, r.sort, true, r.serves, r.tags, r.featured, r.featured_order);
    perform pg_temp.link(v_id, g_molhos, 20);
  end loop;

  -- ------------------------------------------------------------ pratos da casa (servem 2 pessoas)
  for r in
    select * from (values
      ('picanha-na-chapa', 'Picanha na Chapa', 'Picanha feita na chapa, arroz, farofa e vinagrete.', 70.00, 1),
      ('file-mignon-na-chapa', 'Filé Mignon na Chapa', 'Filé mignon feito na chapa, arroz, farofa e vinagrete.', 60.00, 2),
      ('file-a-parmegiana-de-frango', 'Filé à Parmegiana de Frango', 'Filé de frango empanado, molho de tomate, fettuccine e queijo gratinado.', 50.00, 3),
      ('peixe-frito', 'Peixe Frito', 'Filé de peixe, arroz, farofa e vinagrete.', 65.00, 4)
    ) as t(slug, name, description, price, sort)
  loop
    perform pg_temp.product('pratos-da-casa', r.slug, r.name, 'simple', r.description, r.price, r.sort, true, 'Serve 2 pessoas');
  end loop;

  -- ------------------------------------------------------------ lasanhas (P, M, G)
  for r in
    select * from (values
      ('lasanha-de-carne', 'Lasanha de Carne', 'Massa de lasanha, carne moída, presunto, queijo, orégano e molho.', 21.00, 43.00, 53.00, 1),
      ('lasanha-de-frango', 'Lasanha de Frango', 'Massa de lasanha, frango desfiado, presunto, queijo, orégano e molho.', 19.00, 41.00, 51.00, 2),
      ('lasanha-mista', 'Lasanha Mista', 'Massa de lasanha, carne moída, frango desfiado, presunto, queijo, orégano e molho.', 24.00, 48.00, 57.00, 3)
    ) as t(slug, name, description, p, m, g, sort)
  loop
    v_id := pg_temp.product('lasanhas', r.slug, r.name, 'simple', r.description, null, r.sort, true);
    perform pg_temp.size(v_id, 'P', 'Pequena', r.p, 1);
    perform pg_temp.size(v_id, 'M', 'Média', r.m, 2);
    perform pg_temp.size(v_id, 'G', 'Grande', r.g, 3);
  end loop;
end;
$$;

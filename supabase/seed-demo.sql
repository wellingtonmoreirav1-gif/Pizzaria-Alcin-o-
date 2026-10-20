-- =============================================================================
-- DADOS DE DEMONSTRAÇÃO — NÃO SÃO O CARDÁPIO DO ALCINÃO
-- Produtos e preços FICTÍCIOS, marcados com is_demo = true e com "[EXEMPLO]" no nome,
-- usados apenas para desenvolvimento e testes automatizados.
-- Para remover antes da publicação, execute supabase/remove-demo.sql.
-- =============================================================================

-- Categorias usadas somente pelos produtos de demonstração.
insert into public.categories (slug, name, sort_order) values
  ('pizzas', 'Pizzas (exemplo)', 900), ('almoco', 'Almoço (exemplo)', 910), ('churrasco', 'Churrasco (exemplo)', 920),
  ('combos', 'Combos (exemplo)', 930), ('bebidas', 'Bebidas', 940)
on conflict (slug) do update set is_active = true, deleted_at = null;

do $$
declare
  c_pizzas uuid := (select id from public.categories where slug = 'pizzas');
  c_almoco uuid := (select id from public.categories where slug = 'almoco');
  c_bebidas uuid := (select id from public.categories where slug = 'bebidas');
  c_combos uuid := (select id from public.categories where slug = 'combos');
  c_churrasco uuid := (select id from public.categories where slug = 'churrasco');
  p_pizza uuid := '00000000-0000-4000-8000-000000000001';
  v_p uuid := '00000000-0000-4000-8000-000000000011';
  v_g uuid := '00000000-0000-4000-8000-000000000012';
  g_flavor uuid := '00000000-0000-4000-8000-000000000021';
  g_crust uuid := '00000000-0000-4000-8000-000000000022';
  g_extra uuid := '00000000-0000-4000-8000-000000000023';
  f_a uuid := '00000000-0000-4000-8000-000000000031';
  f_b uuid := '00000000-0000-4000-8000-000000000032';
  f_doce uuid := '00000000-0000-4000-8000-000000000033';
  cr_1 uuid := '00000000-0000-4000-8000-000000000041';
  ex_1 uuid := '00000000-0000-4000-8000-000000000051';
  p_refri uuid := '00000000-0000-4000-8000-000000000002';
  v_lata uuid := '00000000-0000-4000-8000-000000000013';
  v_2l uuid := '00000000-0000-4000-8000-000000000014';
  p_marmita uuid := '00000000-0000-4000-8000-000000000003';
  g_acomp uuid := '00000000-0000-4000-8000-000000000024';
  p_combo uuid := '00000000-0000-4000-8000-000000000004';
  p_espeto uuid := '00000000-0000-4000-8000-000000000005';
begin
  insert into public.products (id, category_id, kind, slug, name, short_description, is_featured, featured_order, is_demo, tags)
  values (p_pizza, c_pizzas, 'pizza', 'exemplo-pizza', '[EXEMPLO] Pizza monte a sua',
          'Produto fictício para testes. Escolha tamanho, sabores, borda e adicionais.', true, 1, true, '{pizza}');
  insert into public.product_variants (id, product_id, name, description, price, max_flavors, flavor_price_rule, allow_mixed_flavor_tags, sort_order) values
    (v_p, p_pizza, 'Pequena (exemplo)', '4 fatias', 30.00, 1, 'highest', true, 1),
    (v_g, p_pizza, 'Grande (exemplo)', '8 fatias', 50.00, 2, 'highest', false, 2);
  insert into public.option_groups (id, product_id, kind, name, min_select, max_select, sort_order) values
    (g_flavor, p_pizza, 'flavor', 'Sabores', 1, 2, 1),
    (g_crust, p_pizza, 'crust', 'Borda', 0, 1, 2),
    (g_extra, p_pizza, 'extra', 'Adicionais', 0, 3, 3);
  insert into public.option_values (id, group_id, name, description, price, combination_tag, sort_order) values
    (f_a, g_flavor, 'Sabor exemplo A', 'Ingredientes fictícios', 0, 'salgada', 1),
    (f_b, g_flavor, 'Sabor exemplo B (especial)', 'Ingredientes fictícios', 0, 'salgada', 2),
    (f_doce, g_flavor, 'Sabor exemplo doce', 'Ingredientes fictícios', 0, 'doce', 3),
    (cr_1, g_crust, 'Borda exemplo', null, 6.00, null, 1),
    (ex_1, g_extra, 'Adicional exemplo', null, 4.00, null, 1);
  insert into public.option_value_variant_prices (option_value_id, variant_id, price, is_offered) values
    (f_b, v_p, 36.00, true),
    (f_b, v_g, 60.00, true),
    (cr_1, v_g, 9.00, true),
    (f_doce, v_p, null, false);

  insert into public.products (id, category_id, kind, slug, name, short_description, is_demo, tags)
  values (p_refri, c_bebidas, 'simple', 'exemplo-refrigerante', '[EXEMPLO] Refrigerante',
          'Bebida fictícia para testes.', true, '{bebida}');
  insert into public.product_variants (id, product_id, name, price, sort_order) values
    (v_lata, p_refri, 'Lata (exemplo)', 6.00, 1),
    (v_2l, p_refri, '2 litros (exemplo)', 14.00, 2);

  insert into public.products (id, category_id, kind, slug, name, short_description, base_price, shift_restriction, is_demo, is_featured, featured_order)
  values (p_marmita, c_almoco, 'simple', 'exemplo-prato-do-dia', '[EXEMPLO] Prato do dia',
          'Prato fictício para testes.', 22.00, 'lunch', true, true, 2);
  insert into public.option_groups (id, product_id, kind, name, min_select, max_select, sort_order) values
    (g_acomp, p_marmita, 'choice', 'Acompanhamentos', 1, 2, 1);
  insert into public.option_values (group_id, name, price, sort_order) values
    (g_acomp, 'Acompanhamento exemplo 1', 0, 1),
    (g_acomp, 'Acompanhamento exemplo 2', 0, 2),
    (g_acomp, 'Acompanhamento exemplo 3', 3.00, 3);

  insert into public.products (id, category_id, kind, slug, name, short_description, is_demo, base_price)
  values (p_espeto, c_churrasco, 'simple', 'exemplo-espetinho', '[EXEMPLO] Espetinho',
          'Item fictício para testes.', true, 12.00);

  insert into public.products (id, category_id, kind, slug, name, short_description, base_price, is_demo)
  values (p_combo, c_combos, 'combo', 'exemplo-combo', '[EXEMPLO] Combo pizza + refri',
          'Combo fictício para testes.', 58.00, true);
  insert into public.combo_items (combo_product_id, item_product_id, item_variant_id, quantity, description, sort_order) values
    (p_combo, p_pizza, v_g, 1, 'Pizza grande (exemplo)', 1),
    (p_combo, p_refri, v_2l, 1, 'Refrigerante 2 litros (exemplo)', 2);

  insert into public.promotions (title, product_id, variant_id, promo_price, is_active)
  values ('[EXEMPLO] Promoção de teste', p_refri, v_2l, 12.00, true);
end;
$$;

-- =============================================================================
-- Alcinão — Limpeza dos dados de demonstração ("[EXEMPLO]"), autorizada pelo
-- restaurante em 21/10/2026. Mesmo conteúdo de supabase/remove-demo.sql.
-- Afeta SOMENTE produtos com is_demo = true. Produtos de exemplo que aparecem em
-- algum pedido são apenas arquivados, para preservar o histórico.
-- =============================================================================

update public.products set deleted_at = now(), is_active = false, is_featured = false
where is_demo and deleted_at is null and exists (select 1 from public.order_items i where i.product_id = products.id);

delete from public.promotions where product_id in (select id from public.products where is_demo);
delete from public.combo_items where combo_product_id in (select id from public.products where is_demo)
   or item_product_id in (select id from public.products where is_demo and deleted_at is null);
delete from public.products where is_demo
  and not exists (select 1 from public.order_items i where i.product_id = products.id);

-- Oculta as categorias que só existiam para os exemplos (se ficaram vazias).
update public.categories c set is_active = false
where c.slug in ('pizzas', 'almoco', 'churrasco', 'combos', 'bebidas')
  and not exists (select 1 from public.products p where p.category_id = c.id and p.deleted_at is null);

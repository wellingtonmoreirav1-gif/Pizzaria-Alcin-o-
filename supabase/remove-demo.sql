-- Remove TODOS os dados de demonstração (is_demo = true) antes de publicar o site.
-- Produtos que já aparecem em pedidos são apenas arquivados para preservar o histórico.
update public.products set deleted_at = now(), is_active = false
where is_demo and exists (select 1 from public.order_items i where i.product_id = products.id);
delete from public.promotions where product_id in (select id from public.products where is_demo);
delete from public.combo_items where combo_product_id in (select id from public.products where is_demo)
   or item_product_id in (select id from public.products where is_demo and deleted_at is null);
delete from public.products where is_demo
  and not exists (select 1 from public.order_items i where i.product_id = products.id);

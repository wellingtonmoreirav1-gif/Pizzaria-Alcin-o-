-- =============================================================================
-- Alcinão — Row Level Security e privilégios
-- Regra geral:
--   * catálogo e dados públicos do restaurante: leitura pública do que está ativo;
--     escrita apenas por administrador e gerente;
--   * dados pessoais: somente o próprio cliente ou a equipe autorizada;
--   * pedidos: criados exclusivamente pelo servidor (service_role) e alterados
--     somente por funções que validam papel e regras de negócio.
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'user_roles', 'categories', 'products', 'product_images', 'product_variants',
    'option_groups', 'option_values', 'option_value_variant_prices', 'combo_items', 'promotions',
    'business_settings', 'business_hours', 'business_hour_exceptions', 'delivery_zones', 'banners',
    'customer_addresses', 'favorites', 'orders', 'order_items', 'order_item_options',
    'order_status_history', 'order_adjustments', 'reviews', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- catálogo
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'product_images', 'product_variants', 'option_groups', 'option_values',
    'option_value_variant_prices', 'combo_items', 'promotions', 'business_hours',
    'business_hour_exceptions', 'delivery_zones', 'banners'
  ] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_catalog_manager())',
      t || '_manager_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager())',
      t || '_manager_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_catalog_manager())',
      t || '_manager_delete', t);
  end loop;
end;
$$;

create policy categories_public_read on public.categories for select to anon, authenticated
  using ((is_active and deleted_at is null) or public.is_staff());
create policy products_public_read on public.products for select to anon, authenticated
  using ((is_active and deleted_at is null) or public.is_staff());
create policy product_images_public_read on public.product_images for select to anon, authenticated
  using (true);
create policy product_variants_public_read on public.product_variants for select to anon, authenticated
  using ((is_active and deleted_at is null) or public.is_staff());
create policy option_groups_public_read on public.option_groups for select to anon, authenticated
  using ((is_active and deleted_at is null) or public.is_staff());
create policy option_values_public_read on public.option_values for select to anon, authenticated
  using ((is_active and deleted_at is null) or public.is_staff());
create policy ovvp_public_read on public.option_value_variant_prices for select to anon, authenticated
  using (true);
create policy combo_items_public_read on public.combo_items for select to anon, authenticated
  using (true);
create policy promotions_public_read on public.promotions for select to anon, authenticated
  using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or public.is_staff()
  );
create policy business_hours_public_read on public.business_hours for select to anon, authenticated
  using (true);
create policy business_hour_exceptions_public_read on public.business_hour_exceptions for select to anon, authenticated
  using (date >= current_date - 1 or public.is_staff());
create policy delivery_zones_public_read on public.delivery_zones for select to anon, authenticated
  using (is_active or public.is_staff());
create policy banners_public_read on public.banners for select to anon, authenticated
  using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or public.is_staff()
  );

-- ---------------------------------------------------------------- configurações
grant select on public.business_settings to anon, authenticated;
grant update on public.business_settings to authenticated;
create policy business_settings_public_read on public.business_settings for select to anon, authenticated
  using (true);
create policy business_settings_manager_update on public.business_settings for update to authenticated
  using (public.is_catalog_manager()) with check (public.is_catalog_manager());

-- ---------------------------------------------------------------- perfis e papéis
grant select, update on public.profiles to authenticated;
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_catalog_manager());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant select on public.user_roles to authenticated;
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role('admin'));
-- Alterações de papéis somente via funções admin_* (security definer).

-- ---------------------------------------------------------------- dados do cliente
grant select, insert, update, delete on public.customer_addresses to authenticated;
create policy customer_addresses_owner on public.customer_addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.favorites to authenticated;
create policy favorites_owner on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- pedidos
grant select on public.orders, public.order_items, public.order_item_options,
  public.order_status_history, public.order_adjustments to authenticated;

create policy orders_owner_or_staff_read on public.orders for select to authenticated
  using (customer_id = auth.uid() or public.is_staff());
create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or public.is_staff())));
create policy order_item_options_read on public.order_item_options for select to authenticated
  using (exists (select 1 from public.order_items i join public.orders o on o.id = i.order_id
                 where i.id = order_item_id and (o.customer_id = auth.uid() or public.is_staff())));
create policy order_status_history_read on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or public.is_staff())));
create policy order_adjustments_read on public.order_adjustments for select to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------- avaliações
-- Visitantes só enxergam colunas públicas de avaliações aprovadas.
grant select (id, author_name, rating, comment, is_verified, created_at, status) on public.reviews to anon;
grant select on public.reviews to authenticated;
grant update (status, moderated_by, moderated_at) on public.reviews to authenticated;
create policy reviews_public_read on public.reviews for select to anon
  using (status = 'approved');
create policy reviews_auth_read on public.reviews for select to authenticated
  using (status = 'approved' or customer_id = auth.uid() or public.is_catalog_manager());
create policy reviews_moderate on public.reviews for update to authenticated
  using (public.is_catalog_manager()) with check (public.is_catalog_manager());

-- ---------------------------------------------------------------- auditoria
grant select on public.audit_logs to authenticated;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
  using (public.has_role('admin', 'manager'));

-- Funções auxiliares de papel podem ser chamadas pelas políticas e pela aplicação.
revoke execute on function public.current_app_role() from public;
revoke execute on function public.has_role(public.app_role[]) from public;
revoke execute on function public.is_staff() from public;
revoke execute on function public.is_catalog_manager() from public;
grant execute on function public.current_app_role() to anon, authenticated, service_role;
grant execute on function public.has_role(public.app_role[]) to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_catalog_manager() to anon, authenticated, service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_trigger() from public, anon, authenticated;

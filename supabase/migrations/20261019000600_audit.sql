-- =============================================================================
-- Alcinão — Registro de auditoria de alterações administrativas
-- =============================================================================

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role public.app_role,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_table_idx on public.audit_logs (table_name, record_id);

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and v_old - 'updated_at' = v_new - 'updated_at' then
    return new;
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    (select role from public.user_roles where user_id = auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'option_value_id', v_old ->> 'option_value_id', v_new ->> 'user_id', v_old ->> 'user_id'),
    v_old,
    v_new
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'product_images', 'product_variants', 'option_groups', 'option_values',
    'option_value_variant_prices', 'combo_items', 'promotions', 'business_settings', 'business_hours',
    'business_hour_exceptions', 'delivery_zones', 'banners', 'user_roles', 'reviews'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_trigger()',
      t || '_audit', t
    );
  end loop;
end;
$$;

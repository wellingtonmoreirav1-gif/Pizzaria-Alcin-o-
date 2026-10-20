-- =============================================================================
-- Alcinão — Estrutura do cardápio oficial
--   * Grupos de opções COMPARTILHADOS (ex.: bordas recheadas e molhos), definidos
--     uma única vez e ligados a vários produtos.
--   * Código de tamanho nas variantes (P, M, G, GG, F) e preço de opção por código
--     de tamanho (ex.: borda de Catupiry na G = R$ 16,00 em qualquer pizza).
--   * Conferência de preços: itens com preço "a confirmar" ficam visíveis, mas não
--     podem ser pedidos até o administrador conferir.
--   * Seções informativas no cardápio (ex.: tabela de bordas, lista de molhos).
-- =============================================================================

-- ------------------------------------------------------------ tamanhos
alter table public.product_variants
  add column size_code text check (size_code is null or size_code ~ '^[A-Z]{1,3}$');
create unique index product_variants_size_unique
  on public.product_variants (product_id, size_code)
  where size_code is not null and deleted_at is null;

-- ------------------------------------------------------------ conferência de preços
alter table public.products
  add column price_confirmed boolean not null default true,
  add column price_confirmed_at timestamptz,
  add column price_confirmed_by uuid references auth.users (id) on delete set null;
alter table public.option_values
  add column price_confirmed boolean not null default true,
  add column price_confirmed_at timestamptz,
  add column price_confirmed_by uuid references auth.users (id) on delete set null;

-- ------------------------------------------------------------ grupos compartilhados
alter table public.option_groups alter column product_id drop not null;
alter table public.option_groups
  add column shared_key text unique check (shared_key is null or shared_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint option_groups_owner check ((product_id is null) <> (shared_key is null));

create unique index option_values_name_unique
  on public.option_values (group_id, lower(name))
  where deleted_at is null;

create table public.product_shared_groups (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.option_groups (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, group_id)
);
create index product_shared_groups_group_idx on public.product_shared_groups (group_id);

create or replace function public.ensure_shared_group()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.option_groups where id = new.group_id and shared_key is not null) then
    raise exception 'group_not_shared' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger product_shared_groups_check before insert or update on public.product_shared_groups
  for each row execute function public.ensure_shared_group();

-- Preço/oferta de uma opção por CÓDIGO de tamanho (vale para todos os produtos).
create table public.option_value_size_prices (
  option_value_id uuid not null references public.option_values (id) on delete cascade,
  size_code text not null check (size_code ~ '^[A-Z]{1,3}$'),
  price numeric(10, 2) check (price is null or price >= 0),
  is_offered boolean not null default true,
  primary key (option_value_id, size_code)
);

-- ------------------------------------------------------------ seções informativas
alter table public.categories
  add column section_type text not null default 'products' check (section_type in ('products', 'options')),
  add column shared_group_id uuid references public.option_groups (id) on delete set null,
  add constraint categories_section_group check (section_type = 'products' or shared_group_id is not null);

-- ------------------------------------------------------------ segurança
do $$
declare
  t text;
begin
  foreach t in array array['product_shared_groups', 'option_value_size_prices'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_catalog_manager())', t || '_manager_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager())', t || '_manager_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_catalog_manager())', t || '_manager_delete', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t || '_audit', t);
  end loop;
end;
$$;
revoke execute on function public.ensure_shared_group() from public, anon, authenticated;

-- O registro de auditoria identifica a linha também por grupo/opção.
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
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'option_value_id', v_old ->> 'option_value_id',
             v_new ->> 'product_id', v_old ->> 'product_id', v_new ->> 'user_id', v_old ->> 'user_id'),
    v_old,
    v_new
  );
  return coalesce(new, old);
end;
$$;
revoke execute on function public.audit_trigger() from public, anon, authenticated;

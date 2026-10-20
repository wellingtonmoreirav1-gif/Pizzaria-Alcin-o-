-- =============================================================================
-- Alcinão — Funções operacionais e administrativas
-- =============================================================================

-- Marcar produto / tamanho / opção como disponível ou esgotado (toda a equipe).
create or replace function public.set_availability(p_entity text, p_id uuid, p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_entity = 'product' then
    update public.products set is_available = p_available where id = p_id;
  elsif p_entity = 'variant' then
    update public.product_variants set is_available = p_available where id = p_id;
  elsif p_entity = 'option_value' then
    update public.option_values set is_available = p_available where id = p_id;
  else
    raise exception 'invalid_entity' using errcode = '22023';
  end if;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Controles rápidos de operação (toda a equipe):
--   p_accepting       liga/desliga o recebimento de pedidos
--   p_pause_minutes   pausa temporária (0 remove a pausa)
--   p_lunch_closed    encerra (true) ou reabre (false) o almoço de hoje
create or replace function public.set_operation_status(
  p_accepting boolean default null,
  p_pause_minutes integer default null,
  p_pause_message text default null,
  p_lunch_closed boolean default null
)
returns public.business_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.business_settings;
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_pause_minutes is not null and (p_pause_minutes < 0 or p_pause_minutes > 720) then
    raise exception 'invalid_pause' using errcode = '22023';
  end if;
  select * into v_settings from public.business_settings where id = 1 for update;
  update public.business_settings set
    accepting_orders = coalesce(p_accepting, accepting_orders),
    paused_until = case
      when p_pause_minutes is null then paused_until
      when p_pause_minutes = 0 then null
      else now() + make_interval(mins => p_pause_minutes) end,
    pause_message = case
      when p_pause_message is not null then nullif(left(trim(p_pause_message), 200), '')
      else pause_message end,
    lunch_closed_on = case
      when p_lunch_closed is null then lunch_closed_on
      when p_lunch_closed then (now() at time zone v_settings.timezone)::date
      else null end
  where id = 1
  returning * into v_settings;
  return v_settings;
end;
$$;

-- ----------------------------------------------------------------- equipe
create or replace function public.admin_list_staff()
returns table (user_id uuid, email text, role public.app_role, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return query
    select r.user_id, u.email::text, r.role, r.created_at
    from public.user_roles r join auth.users u on u.id = r.user_id
    order by r.role, u.email;
end;
$$;

create or replace function public.admin_set_user_role(p_email text, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_current public.app_role;
begin
  if not public.has_role('admin') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  select role into v_current from public.user_roles where user_id = v_user_id;
  if v_current = 'admin' and p_role <> 'admin'
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'last_admin' using errcode = '22023';
  end if;
  insert into public.user_roles (user_id, role, created_by)
  values (v_user_id, p_role, auth.uid())
  on conflict (user_id) do update set role = excluded.role;
end;
$$;

create or replace function public.admin_remove_user_role(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if (select role from public.user_roles where user_id = p_user_id) = 'admin'
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'last_admin' using errcode = '22023';
  end if;
  delete from public.user_roles where user_id = p_user_id;
end;
$$;

-- Cria o PRIMEIRO administrador. Só funciona enquanto não existir nenhum admin e
-- só pode ser executada pelo dono do banco (SQL Editor do Supabase) ou service_role.
create or replace function public.bootstrap_first_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'admin_already_exists' using errcode = '22023';
  end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'user_not_found: crie a conta em /admin/login (ou no painel Authentication) antes' using errcode = 'P0002';
  end if;
  insert into public.user_roles (user_id, role) values (v_user_id, 'admin');
  return 'Administrador criado para ' || p_email;
end;
$$;

-- ----------------------------------------------------------------- vitrine
-- Produtos mais vendidos (pedidos concluídos) no período configurado.
-- Só retorna resultado quando há pedidos suficientes para não inventar popularidade.
create or replace function public.public_best_sellers(p_limit integer default 8)
returns table (product_id uuid, rank integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer;
  v_min integer;
  v_orders integer;
begin
  select best_sellers_days, best_sellers_min_orders into v_days, v_min
  from public.business_settings where id = 1;
  select count(*) into v_orders from public.orders
  where status = 'completed' and created_at > now() - make_interval(days => v_days);
  if v_orders < v_min then
    return;
  end if;
  return query
    select i.product_id, (row_number() over (order by sum(i.quantity) desc))::integer
    from public.order_items i
    join public.orders o on o.id = i.order_id
    join public.products p on p.id = i.product_id
    where o.status = 'completed'
      and o.created_at > now() - make_interval(days => v_days)
      and p.is_active and p.deleted_at is null
    group by i.product_id
    order by sum(i.quantity) desc
    limit least(greatest(p_limit, 1), 24);
end;
$$;

-- ----------------------------------------------------------------- LGPD
-- Remove coordenadas e hash de IP de pedidos encerrados após o prazo de retenção.
create or replace function public.purge_expired_personal_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days integer;
  v_count integer;
begin
  select location_retention_days into v_days from public.business_settings where id = 1;
  update public.orders set latitude = null, longitude = null, location_accuracy_m = null, location_source = null
  where latitude is not null
    and status in ('completed', 'cancelled')
    and created_at < now() - make_interval(days => v_days);
  get diagnostics v_count = row_count;
  update public.orders set ip_hash = null
  where ip_hash is not null and created_at < now() - interval '2 days';
  return v_count;
end;
$$;

-- Anonimiza os pedidos de um cliente (pedido de exclusão de dados). Os valores e itens
-- são mantidos para o histórico de vendas, sem dados pessoais.
create or replace function public.anonymize_customer_orders(p_user_id uuid default null, p_phone text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not public.has_role('admin') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_user_id is null and coalesce(p_phone, '') = '' then
    raise exception 'missing_identifier' using errcode = '22023';
  end if;
  update public.orders set
    customer_name = null, customer_phone = null, customer_id = null,
    address_street = null, address_number = null, address_neighborhood = null,
    address_complement = null, address_reference = null, address_postal_code = null,
    latitude = null, longitude = null, location_accuracy_m = null, location_source = null,
    notes = null, ip_hash = null, anonymized_at = now()
  where (p_user_id is not null and customer_id = p_user_id)
     or (p_phone is not null and customer_phone = p_phone);
  get diagnostics v_count = row_count;
  update public.reviews set author_name = 'Cliente', customer_id = null
  where (p_user_id is not null and customer_id = p_user_id);
  return v_count;
end;
$$;

revoke execute on function public.set_availability(text, uuid, boolean) from public, anon;
revoke execute on function public.set_operation_status(boolean, integer, text, boolean) from public, anon;
revoke execute on function public.admin_list_staff() from public, anon;
revoke execute on function public.admin_set_user_role(text, public.app_role) from public, anon;
revoke execute on function public.admin_remove_user_role(uuid) from public, anon;
revoke execute on function public.bootstrap_first_admin(text) from public, anon, authenticated;
revoke execute on function public.purge_expired_personal_data() from public, anon, authenticated;
revoke execute on function public.anonymize_customer_orders(uuid, text) from public, anon;
revoke execute on function public.public_best_sellers(integer) from public;
grant execute on function public.set_availability(text, uuid, boolean) to authenticated;
grant execute on function public.set_operation_status(boolean, integer, text, boolean) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;
grant execute on function public.admin_set_user_role(text, public.app_role) to authenticated;
grant execute on function public.admin_remove_user_role(uuid) to authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;
grant execute on function public.purge_expired_personal_data() to service_role;
grant execute on function public.anonymize_customer_orders(uuid, text) to authenticated, service_role;
grant execute on function public.public_best_sellers(integer) to anon, authenticated, service_role;

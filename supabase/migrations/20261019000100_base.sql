-- =============================================================================
-- Alcinão — Base: tipos, perfis, papéis e funções auxiliares de autorização
-- =============================================================================

create type public.app_role as enum ('admin', 'manager', 'attendant');
create type public.product_kind as enum ('simple', 'pizza', 'combo');
create type public.option_group_kind as enum ('flavor', 'crust', 'extra', 'choice');
create type public.flavor_price_rule as enum ('fixed', 'highest', 'average');
create type public.service_shift as enum ('lunch', 'dinner');
create type public.shift_restriction as enum ('any', 'lunch', 'dinner');
create type public.fulfillment_type as enum ('delivery', 'pickup', 'dine_in');
create type public.payment_method as enum ('pix', 'cash', 'credit_card', 'debit_card', 'on_delivery');
create type public.order_status as enum (
  'registered',          -- pedido registrado no site
  'customer_confirmed',  -- equipe recebeu a mensagem do cliente no WhatsApp
  'accepted',            -- equipe aceitou o pedido
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled'
);
create type public.delivery_fee_status as enum ('not_applicable', 'pending', 'estimated', 'confirmed');
create type public.cancel_reason as enum (
  'out_of_area', 'unavailable', 'customer_request', 'no_customer_response', 'duplicate', 'other'
);
create type public.review_status as enum ('pending', 'approved', 'rejected');

-- Atualiza updated_at automaticamente.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Perfis (dados complementares de usuários autenticados)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) between 1 and 120),
  phone text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Papéis da equipe (um papel por usuário)
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

create or replace function public.has_role(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = any (roles)
  )
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid())
$$;

create or replace function public.is_catalog_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin', 'manager')
$$;

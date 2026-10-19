-- =============================================================================
-- Alcinão — Clientes: endereços salvos e favoritos
-- =============================================================================

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text check (label is null or char_length(label) <= 40),
  street text not null check (char_length(street) between 2 and 120),
  number text not null check (char_length(number) between 1 and 20),
  neighborhood text not null check (char_length(neighborhood) between 2 and 80),
  complement text check (complement is null or char_length(complement) <= 80),
  reference text check (reference is null or char_length(reference) <= 160),
  city text not null check (char_length(city) between 2 and 80),
  state text not null check (state ~ '^[A-Z]{2}$'),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{8}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_addresses_user_idx on public.customer_addresses (user_id);
create trigger customer_addresses_updated_at before update on public.customer_addresses
  for each row execute function public.set_updated_at();

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

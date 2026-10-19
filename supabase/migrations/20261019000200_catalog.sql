-- =============================================================================
-- Alcinão — Catálogo: categorias, produtos, tamanhos, opções, combos, promoções
-- =============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 300),
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  show_on_home boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  kind public.product_kind not null default 'simple',
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  short_description text check (short_description is null or char_length(short_description) <= 200),
  description text check (description is null or char_length(description) <= 2000),
  image_url text,
  image_alt text check (image_alt is null or char_length(image_alt) <= 200),
  -- Preço usado quando o produto não tem tamanhos/variantes (simples e combos).
  base_price numeric(10, 2) check (base_price is null or base_price >= 0),
  is_active boolean not null default true,      -- publicado no site
  is_available boolean not null default true,   -- false = esgotado
  is_featured boolean not null default false,   -- destaque manual
  featured_order integer,
  sort_order integer not null default 0,
  shift_restriction public.shift_restriction not null default 'any',
  available_from timestamptz,
  available_until timestamptz,
  tags text[] not null default '{}',
  serves text check (serves is null or char_length(serves) <= 60),
  max_quantity integer not null default 30 check (max_quantity between 1 and 99),
  is_demo boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_until is null or available_from is null or available_until > available_from)
);
create index products_category_idx on public.products (category_id) where deleted_at is null;
create index products_featured_idx on public.products (featured_order) where is_featured and deleted_at is null;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text check (alt is null or char_length(alt) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id);

-- Tamanhos / porções / variantes.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 200),
  -- Simples: preço da variante. Pizza: preço-base do tamanho (veja docs/REGRAS-DE-PRECO.md).
  price numeric(10, 2) not null check (price >= 0),
  max_flavors integer not null default 1 check (max_flavors between 1 and 8),
  flavor_price_rule public.flavor_price_rule not null default 'highest',
  allow_mixed_flavor_tags boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_available boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- Grupos de personalização (sabores, bordas, adicionais, escolhas).
create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind public.option_group_kind not null,
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 200),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_select >= min_select)
);
create index option_groups_product_idx on public.option_groups (product_id);
create unique index option_groups_single_flavor_crust
  on public.option_groups (product_id, kind)
  where kind in ('flavor', 'crust') and deleted_at is null;
create trigger option_groups_updated_at before update on public.option_groups
  for each row execute function public.set_updated_at();

create table public.option_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  image_url text,
  price numeric(10, 2) not null default 0 check (price >= 0),
  -- Etiqueta de combinação (ex.: "doce", "salgada"). Usada pela regra de mistura de sabores.
  combination_tag text check (combination_tag is null or char_length(combination_tag) <= 30),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_available boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index option_values_group_idx on public.option_values (group_id);
create trigger option_values_updated_at before update on public.option_values
  for each row execute function public.set_updated_at();

-- Preço / oferta de uma opção por tamanho (ex.: sabor especial na pizza grande).
create table public.option_value_variant_prices (
  option_value_id uuid not null references public.option_values (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  price numeric(10, 2) check (price is null or price >= 0),
  is_offered boolean not null default true,
  primary key (option_value_id, variant_id)
);
create index ovvp_variant_idx on public.option_value_variant_prices (variant_id);

-- Itens incluídos em combos.
create table public.combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_product_id uuid not null references public.products (id) on delete cascade,
  item_product_id uuid not null references public.products (id),
  item_variant_id uuid references public.product_variants (id),
  quantity integer not null default 1 check (quantity between 1 and 20),
  description text check (description is null or char_length(description) <= 120),
  sort_order integer not null default 0,
  check (combo_product_id <> item_product_id)
);
create index combo_items_combo_idx on public.combo_items (combo_product_id);

-- Promoções com período de validade. Só valem se o preço promocional for menor que o normal.
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  promo_price numeric(10, 2) not null check (promo_price >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index promotions_product_idx on public.promotions (product_id);
create trigger promotions_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

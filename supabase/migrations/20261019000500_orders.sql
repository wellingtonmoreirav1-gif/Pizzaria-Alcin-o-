-- =============================================================================
-- Alcinão — Pedidos (com fotografia dos dados comerciais no momento da compra)
-- =============================================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^ALC-[0-9A-Z]{6}$'),
  idempotency_key uuid not null unique,
  request_hash text not null,
  customer_id uuid references auth.users (id) on delete set null,
  customer_name text check (customer_name is null or char_length(customer_name) between 1 and 120),
  customer_phone text check (customer_phone is null or customer_phone ~ '^[0-9]{10,13}$'),
  fulfillment public.fulfillment_type not null,
  status public.order_status not null default 'registered',
  service_shift public.service_shift,
  -- Endereço (somente entrega)
  address_street text,
  address_number text,
  address_neighborhood text,
  address_complement text,
  address_reference text,
  address_city text,
  address_state text,
  address_postal_code text,
  delivery_zone_id uuid references public.delivery_zones (id) on delete set null,
  latitude numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  location_accuracy_m integer check (location_accuracy_m is null or location_accuracy_m >= 0),
  location_source text check (location_source is null or location_source in ('gps', 'map_pin')),
  table_label text check (table_label is null or char_length(table_label) <= 20),
  -- Pagamento
  payment_method public.payment_method not null,
  cash_change_for numeric(10, 2) check (cash_change_for is null or cash_change_for > 0),
  notes text check (notes is null or char_length(notes) <= 500),
  -- Valores
  gross_subtotal numeric(10, 2) not null check (gross_subtotal >= 0),  -- preço de tabela
  discount_total numeric(10, 2) not null default 0 check (discount_total >= 0),
  items_subtotal numeric(10, 2) not null check (items_subtotal >= 0),  -- itens após descontos
  delivery_fee numeric(10, 2) check (delivery_fee is null or delivery_fee >= 0),
  delivery_fee_status public.delivery_fee_status not null,
  total numeric(10, 2) not null check (total >= 0),
  total_is_final boolean generated always as (
    fulfillment <> 'delivery' or delivery_fee_status = 'confirmed'
  ) stored,
  submitted_total numeric(10, 2) not null,     -- total exibido ao cliente no envio
  approved_total numeric(10, 2),               -- último total aprovado pelo cliente
  needs_customer_approval boolean not null default false,
  -- Linha do tempo
  whatsapp_opened_at timestamptz,
  customer_confirmed_at timestamptz,
  customer_approved_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason public.cancel_reason,
  cancel_note text check (cancel_note is null or char_length(cancel_note) <= 300),
  ip_hash text,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (items_subtotal = gross_subtotal - discount_total),
  check (total = items_subtotal + coalesce(delivery_fee, 0)),
  check (anonymized_at is not null or (customer_name is not null and customer_phone is not null)),
  check (fulfillment <> 'delivery' or anonymized_at is not null or
         (address_street is not null and address_number is not null and address_neighborhood is not null)),
  check ((fulfillment = 'delivery') = (delivery_fee_status <> 'not_applicable')),
  check (status <> 'cancelled' or cancel_reason is not null),
  check ((latitude is null) = (longitude is null))
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_phone_idx on public.orders (customer_phone);
create index orders_ip_recent_idx on public.orders (ip_hash, created_at desc) where ip_hash is not null;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  promotion_id uuid references public.promotions (id) on delete set null,
  product_kind public.product_kind not null,
  product_name text not null,
  variant_name text,
  category_name text,
  quantity integer not null check (quantity between 1 and 99),
  unit_regular_price numeric(10, 2) not null check (unit_regular_price >= 0),
  unit_discount numeric(10, 2) not null default 0 check (unit_discount >= 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  notes text check (notes is null or char_length(notes) <= 200),
  pricing_detail jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  check (unit_price = unit_regular_price - unit_discount),
  check (line_total = unit_price * quantity)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  group_id uuid references public.option_groups (id) on delete set null,
  option_value_id uuid references public.option_values (id) on delete set null,
  group_kind public.option_group_kind not null,
  group_name text not null,
  value_name text not null,
  price numeric(10, 2) not null default 0 check (price >= 0),
  sort_order integer not null default 0
);
create index order_item_options_item_idx on public.order_item_options (order_item_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  changed_by_role public.app_role,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Ajustes auditáveis de valores (taxa de entrega, aprovação do cliente).
create table public.order_adjustments (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('delivery_fee', 'customer_approval')),
  old_fee numeric(10, 2),
  new_fee numeric(10, 2),
  old_fee_status public.delivery_fee_status,
  new_fee_status public.delivery_fee_status,
  old_total numeric(10, 2),
  new_total numeric(10, 2),
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_adjustments_order_idx on public.order_adjustments (order_id, created_at);

-- Avaliações (moderadas). "Verificada" somente quando ligada a um pedido concluído.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 60),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  status public.review_status not null default 'pending',
  is_verified boolean not null default false,
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_status_idx on public.reviews (status, created_at desc);

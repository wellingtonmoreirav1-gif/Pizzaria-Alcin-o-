-- =============================================================================
-- Alcinão — Operação: configurações gerais, horários, exceções, entrega, banners
-- =============================================================================

create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Pizzaria e Churrascaria Alcinão',
  whatsapp_number text not null default '5583999216691' check (whatsapp_number ~ '^[0-9]{12,13}$'),
  address_line text,
  city text,
  state text,
  reference_point text,
  latitude numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  logo_url text,
  hero_image_url text,
  timezone text not null default 'America/Fortaleza',
  -- Controles de operação
  accepting_orders boolean not null default true,
  pause_message text check (pause_message is null or char_length(pause_message) <= 200),
  paused_until timestamptz,
  lunch_closed_on date,
  order_grace_minutes integer not null default 0 check (order_grace_minutes between 0 and 60),
  -- Modalidades e pagamentos
  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  dine_in_enabled boolean not null default true,
  payment_methods jsonb not null default
    '{"delivery":["pix","cash","credit_card","debit_card","on_delivery"],"pickup":["pix","cash","credit_card","debit_card"],"dine_in":["pix","cash","credit_card","debit_card"]}'::jsonb,
  min_order_value numeric(10, 2) check (min_order_value is null or min_order_value >= 0),
  -- Textos editáveis
  hero_title text,
  hero_subtitle text,
  promo_text text,
  delivery_info_text text,
  cancellation_policy text,
  privacy_contact_email text,
  seo_title text,
  seo_description text,
  instagram_url text,
  -- Vitrine "Em alta"
  best_sellers_days integer not null default 30 check (best_sellers_days between 1 and 365),
  best_sellers_min_orders integer not null default 10 check (best_sellers_min_orders >= 1),
  -- Retenção de dados (LGPD)
  location_retention_days integer not null default 90 check (location_retention_days between 1 and 3650),
  updated_at timestamptz not null default now()
);
create trigger business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

-- Turnos regulares por dia da semana (0 = domingo ... 6 = sábado).
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  shift public.service_shift not null,
  opens_at time not null,
  closes_at time, -- null = até a equipe encerrar manualmente (ex.: almoço "até acabar")
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekday, shift),
  check (closes_at is null or closes_at > opens_at)
);
create trigger business_hours_updated_at before update on public.business_hours
  for each row execute function public.set_updated_at();

-- Feriados, folgas e horários especiais.
create table public.business_hour_exceptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  shift public.service_shift, -- null = dia inteiro
  is_closed boolean not null default true,
  opens_at time,
  closes_at time,
  note text check (note is null or char_length(note) <= 120),
  created_at timestamptz not null default now(),
  check (is_closed or opens_at is not null),
  check (closes_at is null or opens_at is null or closes_at > opens_at),
  check (is_closed or shift is not null)
);
create unique index business_hour_exceptions_unique
  on public.business_hour_exceptions (date, shift) nulls not distinct;

-- Bairros atendidos. A taxa é opcional; quando informada é tratada como estimativa
-- e a equipe confirma o valor final no pedido.
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  city text not null default 'São Bento',
  fee numeric(10, 2) check (fee is null or fee >= 0),
  notes text check (notes is null or char_length(notes) <= 200),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index delivery_zones_name_unique on public.delivery_zones (lower(name), lower(city));
create trigger delivery_zones_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text check (body is null or char_length(body) <= 200),
  image_url text,
  image_alt text check (image_alt is null or char_length(image_alt) <= 200),
  cta_label text check (cta_label is null or char_length(cta_label) <= 30),
  cta_href text check (cta_href is null or cta_href ~ '^(/[^/\s]|https://)'),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger banners_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

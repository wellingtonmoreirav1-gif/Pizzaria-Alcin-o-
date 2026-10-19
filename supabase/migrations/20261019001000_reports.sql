-- =============================================================================
-- Alcinão — Relatórios comerciais (somente administrador e gerente)
--
-- Definições (veja docs/RELATORIOS.md):
--   * Pedidos registrados: todos os pedidos criados no período, exceto cancelados.
--   * Vendas concluídas: pedidos com status "completed".
--   * Faturamento: soma do total dos pedidos concluídos (itens após descontos + taxa).
--   * Descontos: diferença entre preço de tabela e preço promocional aplicado.
--   * Ticket médio: faturamento ÷ quantidade de vendas concluídas.
--   * Cancelados nunca entram em vendas ou faturamento.
--   Faturamento NÃO é lucro: o sistema não conhece custos.
-- =============================================================================

create or replace function public.business_tz()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select timezone from public.business_settings where id = 1), 'America/Fortaleza')
$$;

create or replace function public.assert_report_access()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin', 'manager') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.report_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform public.assert_report_access();
  select jsonb_build_object(
    'orders_registered', count(*) filter (where status <> 'cancelled'),
    'registered_value', coalesce(sum(total) filter (where status <> 'cancelled'), 0),
    'orders_open', count(*) filter (where status not in ('completed', 'cancelled')),
    'orders_completed', count(*) filter (where status = 'completed'),
    'orders_cancelled', count(*) filter (where status = 'cancelled'),
    'cancelled_value', coalesce(sum(total) filter (where status = 'cancelled'), 0),
    'gross_items', coalesce(sum(gross_subtotal) filter (where status = 'completed'), 0),
    'discounts', coalesce(sum(discount_total) filter (where status = 'completed'), 0),
    'net_items', coalesce(sum(items_subtotal) filter (where status = 'completed'), 0),
    'delivery_fees', coalesce(sum(delivery_fee) filter (where status = 'completed'), 0),
    'revenue', coalesce(sum(total) filter (where status = 'completed'), 0),
    'average_ticket', coalesce(round(avg(total) filter (where status = 'completed'), 2), 0)
  ) into v
  from public.orders
  where created_at >= p_from and created_at < p_to;
  return v;
end;
$$;

create or replace function public.report_sales_series(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns table (bucket date, orders_registered bigint, orders_completed bigint, orders_cancelled bigint, revenue numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := public.business_tz();
begin
  perform public.assert_report_access();
  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'invalid_bucket' using errcode = '22023';
  end if;
  return query
    select date_trunc(p_bucket, o.created_at at time zone v_tz)::date as b,
           count(*) filter (where o.status <> 'cancelled'),
           count(*) filter (where o.status = 'completed'),
           count(*) filter (where o.status = 'cancelled'),
           coalesce(sum(o.total) filter (where o.status = 'completed'), 0)
    from public.orders o
    where o.created_at >= p_from and o.created_at < p_to
    group by b
    order by b;
end;
$$;

create or replace function public.report_top_products(p_from timestamptz, p_to timestamptz, p_limit integer default 20)
returns table (product_id uuid, product_name text, category_name text, quantity bigint, revenue numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_report_access();
  return query
    select i.product_id, max(i.product_name), max(i.category_name), sum(i.quantity)::bigint, sum(i.line_total)
    from public.order_items i join public.orders o on o.id = i.order_id
    where o.status = 'completed' and o.created_at >= p_from and o.created_at < p_to
    group by i.product_id
    order by sum(i.quantity) desc, sum(i.line_total) desc
    limit least(greatest(p_limit, 1), 200);
end;
$$;

create or replace function public.report_categories(p_from timestamptz, p_to timestamptz)
returns table (category_name text, quantity bigint, revenue numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_report_access();
  return query
    select coalesce(i.category_name, 'Sem categoria'), sum(i.quantity)::bigint, sum(i.line_total)
    from public.order_items i join public.orders o on o.id = i.order_id
    where o.status = 'completed' and o.created_at >= p_from and o.created_at < p_to
    group by 1
    order by 3 desc;
end;
$$;

create or replace function public.report_products_without_sales(p_from timestamptz, p_to timestamptz)
returns table (product_id uuid, product_name text, category_name text, is_available boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_report_access();
  return query
    select p.id, p.name, c.name, p.is_available
    from public.products p join public.categories c on c.id = p.category_id
    where p.deleted_at is null and p.is_active
      and not exists (
        select 1 from public.order_items i join public.orders o on o.id = i.order_id
        where i.product_id = p.id and o.status = 'completed'
          and o.created_at >= p_from and o.created_at < p_to)
    order by c.sort_order, p.sort_order, p.name;
end;
$$;

create or replace function public.report_breakdown(p_from timestamptz, p_to timestamptz, p_dimension text)
returns table (dimension text, orders_registered bigint, orders_completed bigint, revenue numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_report_access();
  if p_dimension not in ('fulfillment', 'payment_method', 'cancel_reason') then
    raise exception 'invalid_dimension' using errcode = '22023';
  end if;
  return query execute format(
    'select %1$I::text, count(*) filter (where status <> ''cancelled''), count(*) filter (where status = ''completed''),
            coalesce(sum(total) filter (where status = ''completed''), 0)
     from public.orders where created_at >= $1 and created_at < $2 %2$s
     group by 1 order by 2 desc, 1',
    p_dimension,
    case when p_dimension = 'cancel_reason' then 'and status = ''cancelled''' else '' end
  ) using p_from, p_to;
end;
$$;

-- Cancelamentos com quantidade e valor.
create or replace function public.report_cancellations(p_from timestamptz, p_to timestamptz)
returns table (reason text, orders bigint, value numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_report_access();
  return query
    select coalesce(cancel_reason::text, 'other'), count(*), sum(total)
    from public.orders
    where status = 'cancelled' and created_at >= p_from and created_at < p_to
    group by 1 order by 2 desc;
end;
$$;

-- Itens frequentemente vendidos juntos (pares de produtos no mesmo pedido concluído).
create or replace function public.report_bought_together(p_from timestamptz, p_to timestamptz, p_min_orders integer default 3)
returns table (product_a text, product_b text, orders_together bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_report_access();
  return query
    with items as (
      select distinct i.order_id, i.product_id, i.product_name
      from public.order_items i join public.orders o on o.id = i.order_id
      where o.status = 'completed' and o.created_at >= p_from and o.created_at < p_to
        and i.product_id is not null
    )
    select a.product_name, b.product_name, count(*)::bigint
    from items a join items b on a.order_id = b.order_id and a.product_id < b.product_id
    group by a.product_name, b.product_name
    having count(*) >= greatest(p_min_orders, 2)
    order by 3 desc
    limit 30;
end;
$$;

-- Clientes recorrentes, identificados pelo telefone informado nos pedidos.
create or replace function public.report_recurring_customers(p_from timestamptz, p_to timestamptz, p_min_orders integer default 2)
returns table (customer_phone text, customer_name text, registered boolean, orders bigint, revenue numeric, last_order_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_report_access();
  return query
    select o.customer_phone,
           (array_agg(o.customer_name order by o.created_at desc))[1],
           bool_or(o.customer_id is not null),
           count(*)::bigint,
           sum(o.total),
           max(o.created_at)
    from public.orders o
    where o.status = 'completed' and o.customer_phone is not null
      and o.created_at >= p_from and o.created_at < p_to
    group by o.customer_phone
    having count(*) >= greatest(p_min_orders, 2)
    order by 4 desc, 5 desc
    limit 200;
end;
$$;

-- Painel do dia: contagens para toda a equipe; valores somente para admin/gerente.
create or replace function public.dashboard_today()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := public.business_tz();
  v_start timestamptz := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  v_counts jsonb;
  v_money jsonb := '{}'::jsonb;
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'today_total', count(*),
    'registered', count(*) filter (where status = 'registered'),
    'customer_confirmed', count(*) filter (where status = 'customer_confirmed'),
    'accepted', count(*) filter (where status = 'accepted'),
    'preparing', count(*) filter (where status = 'preparing'),
    'ready', count(*) filter (where status = 'ready'),
    'out_for_delivery', count(*) filter (where status = 'out_for_delivery'),
    'completed', count(*) filter (where status = 'completed'),
    'cancelled', count(*) filter (where status = 'cancelled'),
    'pending_fee', count(*) filter (where fulfillment = 'delivery' and delivery_fee_status <> 'confirmed'
                                    and status not in ('completed', 'cancelled')),
    'needs_approval', count(*) filter (where needs_customer_approval and status not in ('completed', 'cancelled'))
  ) into v_counts
  from public.orders where created_at >= v_start;

  if public.has_role('admin', 'manager') then
    select jsonb_build_object(
      'revenue_today', coalesce(sum(total) filter (where status = 'completed' and created_at >= v_start), 0),
      'revenue_week', coalesce(sum(total) filter (where status = 'completed'
          and created_at >= date_trunc('week', now() at time zone v_tz) at time zone v_tz), 0),
      'revenue_month', coalesce(sum(total) filter (where status = 'completed'
          and created_at >= date_trunc('month', now() at time zone v_tz) at time zone v_tz), 0),
      'registered_value_today', coalesce(sum(total) filter (where status <> 'cancelled' and created_at >= v_start), 0),
      'average_ticket_month', coalesce(round(avg(total) filter (where status = 'completed'
          and created_at >= date_trunc('month', now() at time zone v_tz) at time zone v_tz), 2), 0)
    ) into v_money
    from public.orders
    where created_at >= least(v_start, date_trunc('month', now() at time zone v_tz) at time zone v_tz,
                              date_trunc('week', now() at time zone v_tz) at time zone v_tz);
  end if;
  return v_counts || v_money || jsonb_build_object('can_see_money', public.has_role('admin', 'manager'));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.assert_report_access()',
    'public.report_overview(timestamptz, timestamptz)',
    'public.report_sales_series(timestamptz, timestamptz, text)',
    'public.report_top_products(timestamptz, timestamptz, integer)',
    'public.report_categories(timestamptz, timestamptz)',
    'public.report_products_without_sales(timestamptz, timestamptz)',
    'public.report_breakdown(timestamptz, timestamptz, text)',
    'public.report_cancellations(timestamptz, timestamptz)',
    'public.report_bought_together(timestamptz, timestamptz, integer)',
    'public.report_recurring_customers(timestamptz, timestamptz, integer)',
    'public.dashboard_today()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;
grant execute on function public.business_tz() to anon, authenticated, service_role;

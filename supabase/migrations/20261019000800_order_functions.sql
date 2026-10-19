-- =============================================================================
-- Alcinão — Funções de pedidos
-- A aplicação (servidor Next.js) valida o carrinho, recalcula os preços a partir do
-- banco e chama create_order com service_role. As demais funções são usadas pela
-- equipe e verificam papel e regras de transição dentro do banco.
-- =============================================================================

create or replace function public.generate_order_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := 'ALC-';
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- Cria o pedido de forma atômica e idempotente.
-- Retorna o pedido existente quando a mesma chave de idempotência já foi usada.
create or replace function public.create_order(p_order jsonb)
returns table (order_id uuid, order_code text, created boolean, stored_request_hash text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.orders;
  v_order_id uuid;
  v_code text;
  v_item jsonb;
  v_opt jsonb;
  v_item_id uuid;
  v_idx integer := 0;
  v_opt_idx integer;
  v_attempt integer := 0;
begin
  select * into v_existing from public.orders where idempotency_key = (p_order ->> 'idempotency_key')::uuid;
  if found then
    return query select v_existing.id, v_existing.code, false, v_existing.request_hash;
    return;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_order_code();
    begin
      insert into public.orders (
        code, idempotency_key, request_hash, customer_id, customer_name, customer_phone,
        fulfillment, service_shift,
        address_street, address_number, address_neighborhood, address_complement, address_reference,
        address_city, address_state, address_postal_code, delivery_zone_id,
        latitude, longitude, location_accuracy_m, location_source, table_label,
        payment_method, cash_change_for, notes,
        gross_subtotal, discount_total, items_subtotal, delivery_fee, delivery_fee_status,
        total, submitted_total, approved_total, ip_hash
      ) values (
        v_code,
        (p_order ->> 'idempotency_key')::uuid,
        p_order ->> 'request_hash',
        nullif(p_order ->> 'customer_id', '')::uuid,
        p_order ->> 'customer_name',
        p_order ->> 'customer_phone',
        (p_order ->> 'fulfillment')::public.fulfillment_type,
        nullif(p_order ->> 'service_shift', '')::public.service_shift,
        p_order ->> 'address_street',
        p_order ->> 'address_number',
        p_order ->> 'address_neighborhood',
        p_order ->> 'address_complement',
        p_order ->> 'address_reference',
        p_order ->> 'address_city',
        p_order ->> 'address_state',
        p_order ->> 'address_postal_code',
        nullif(p_order ->> 'delivery_zone_id', '')::uuid,
        (p_order ->> 'latitude')::numeric,
        (p_order ->> 'longitude')::numeric,
        (p_order ->> 'location_accuracy_m')::integer,
        p_order ->> 'location_source',
        p_order ->> 'table_label',
        (p_order ->> 'payment_method')::public.payment_method,
        (p_order ->> 'cash_change_for')::numeric,
        p_order ->> 'notes',
        (p_order ->> 'gross_subtotal')::numeric,
        (p_order ->> 'discount_total')::numeric,
        (p_order ->> 'items_subtotal')::numeric,
        (p_order ->> 'delivery_fee')::numeric,
        (p_order ->> 'delivery_fee_status')::public.delivery_fee_status,
        (p_order ->> 'total')::numeric,
        (p_order ->> 'total')::numeric,
        case when (p_order ->> 'fulfillment') <> 'delivery' then (p_order ->> 'total')::numeric end,
        p_order ->> 'ip_hash'
      )
      returning id into v_order_id;
      exit;
    exception
      when unique_violation then
        -- Corrida com a mesma chave de idempotência: devolve o pedido já criado.
        select * into v_existing from public.orders where idempotency_key = (p_order ->> 'idempotency_key')::uuid;
        if found then
          return query select v_existing.id, v_existing.code, false, v_existing.request_hash;
          return;
        end if;
        if v_attempt >= 8 then
          raise;
        end if;
    end;
  end loop;

  if jsonb_typeof(p_order -> 'items') <> 'array' or jsonb_array_length(p_order -> 'items') = 0 then
    raise exception 'order_without_items' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_order -> 'items') loop
    v_idx := v_idx + 1;
    insert into public.order_items (
      order_id, product_id, variant_id, category_id, promotion_id, product_kind, product_name,
      variant_name, category_name, quantity, unit_regular_price, unit_discount, unit_price,
      line_total, notes, pricing_detail, sort_order
    ) values (
      v_order_id,
      (v_item ->> 'product_id')::uuid,
      nullif(v_item ->> 'variant_id', '')::uuid,
      nullif(v_item ->> 'category_id', '')::uuid,
      nullif(v_item ->> 'promotion_id', '')::uuid,
      (v_item ->> 'product_kind')::public.product_kind,
      v_item ->> 'product_name',
      v_item ->> 'variant_name',
      v_item ->> 'category_name',
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_regular_price')::numeric,
      (v_item ->> 'unit_discount')::numeric,
      (v_item ->> 'unit_price')::numeric,
      (v_item ->> 'line_total')::numeric,
      v_item ->> 'notes',
      coalesce(v_item -> 'pricing_detail', '{}'::jsonb),
      v_idx
    )
    returning id into v_item_id;

    v_opt_idx := 0;
    for v_opt in select * from jsonb_array_elements(coalesce(v_item -> 'options', '[]'::jsonb)) loop
      v_opt_idx := v_opt_idx + 1;
      insert into public.order_item_options (
        order_item_id, group_id, option_value_id, group_kind, group_name, value_name, price, sort_order
      ) values (
        v_item_id,
        (v_opt ->> 'group_id')::uuid,
        (v_opt ->> 'option_value_id')::uuid,
        (v_opt ->> 'group_kind')::public.option_group_kind,
        v_opt ->> 'group_name',
        v_opt ->> 'value_name',
        (v_opt ->> 'price')::numeric,
        v_opt_idx
      );
    end loop;
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (v_order_id, null, 'registered', 'Pedido registrado pelo site');

  return query select v_order_id, v_code, true, p_order ->> 'request_hash';
end;
$$;

-- Limite simples contra abuso: pedidos do mesmo IP (hash) em uma janela de tempo.
create or replace function public.recent_orders_from_ip(p_ip_hash text, p_minutes integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.orders
  where ip_hash = p_ip_hash and created_at > now() - make_interval(mins => p_minutes)
$$;

-- Marca que o cliente tocou no botão para abrir o WhatsApp (não garante o envio).
create or replace function public.mark_order_whatsapp_opened(p_order_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders set whatsapp_opened_at = coalesce(whatsapp_opened_at, now())
  where id = p_order_id
$$;

-- Transições de status permitidas.
create or replace function public.allowed_next_statuses(p_status public.order_status, p_fulfillment public.fulfillment_type)
returns public.order_status[]
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'registered' then array['customer_confirmed', 'accepted', 'cancelled']::public.order_status[]
    when 'customer_confirmed' then array['accepted', 'cancelled']::public.order_status[]
    when 'accepted' then array['preparing', 'cancelled']::public.order_status[]
    when 'preparing' then array['ready', 'cancelled']::public.order_status[]
    when 'ready' then case when p_fulfillment = 'delivery'
      then array['out_for_delivery', 'completed', 'cancelled']::public.order_status[]
      else array['completed', 'cancelled']::public.order_status[] end
    when 'out_for_delivery' then array['completed', 'cancelled']::public.order_status[]
    else array[]::public.order_status[]
  end
$$;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_to public.order_status,
  p_note text default null,
  p_cancel_reason public.cancel_reason default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_order public.orders;
begin
  if v_role is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if not (p_to = any (public.allowed_next_statuses(v_order.status, v_order.fulfillment))) then
    raise exception 'invalid_transition' using errcode = '22023',
      detail = format('%s -> %s', v_order.status, p_to);
  end if;
  if p_to = 'accepted' and v_order.fulfillment = 'delivery' and v_order.delivery_fee_status <> 'confirmed' then
    raise exception 'delivery_fee_not_confirmed' using errcode = '22023';
  end if;
  if p_to = 'accepted' and v_order.needs_customer_approval then
    raise exception 'customer_approval_pending' using errcode = '22023';
  end if;
  if p_to = 'cancelled' and p_cancel_reason is null then
    raise exception 'cancel_reason_required' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 300 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;

  update public.orders set
    status = p_to,
    customer_confirmed_at = case when p_to = 'customer_confirmed' then now() else customer_confirmed_at end,
    accepted_at = case when p_to = 'accepted' then now() else accepted_at end,
    completed_at = case when p_to = 'completed' then now() else completed_at end,
    cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end,
    cancel_reason = case when p_to = 'cancelled' then p_cancel_reason else cancel_reason end,
    cancel_note = case when p_to = 'cancelled' then p_note else cancel_note end
  where id = p_order_id
  returning * into v_order;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by, changed_by_role)
  select p_order_id, h.to_status, p_to, p_note, auth.uid(), v_role
  from (select to_status from public.order_status_history where order_id = p_order_id
        order by created_at desc, id desc limit 1) h;

  return v_order;
end;
$$;

-- Registra/confirma a taxa de entrega de forma auditável.
create or replace function public.set_delivery_fee(
  p_order_id uuid,
  p_fee numeric,
  p_confirm boolean default true,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_order public.orders;
  v_new_status public.delivery_fee_status := case when p_confirm then 'confirmed' else 'estimated' end;
  v_new_total numeric(10, 2);
  v_reference_total numeric(10, 2);
begin
  if v_role is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_fee is null or p_fee < 0 or p_fee > 1000 then
    raise exception 'invalid_fee' using errcode = '22023';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.fulfillment <> 'delivery' then
    raise exception 'not_a_delivery_order' using errcode = '22023';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'order_closed' using errcode = '22023';
  end if;
  -- Depois que o pedido foi aceito com a taxa confirmada, só gerente/admin altera, com justificativa.
  if v_order.delivery_fee_status = 'confirmed'
     and v_order.status in ('accepted', 'preparing', 'ready', 'out_for_delivery') then
    if v_role not in ('admin', 'manager') then
      raise exception 'fee_locked' using errcode = '42501';
    end if;
    if coalesce(trim(p_note), '') = '' then
      raise exception 'note_required' using errcode = '22023';
    end if;
  end if;

  v_new_total := v_order.items_subtotal + p_fee;
  v_reference_total := coalesce(v_order.approved_total, v_order.submitted_total);

  insert into public.order_adjustments (
    order_id, kind, old_fee, new_fee, old_fee_status, new_fee_status, old_total, new_total, note, created_by
  ) values (
    p_order_id, 'delivery_fee', v_order.delivery_fee, p_fee, v_order.delivery_fee_status, v_new_status,
    v_order.total, v_new_total, p_note, auth.uid()
  );

  update public.orders set
    delivery_fee = p_fee,
    delivery_fee_status = v_new_status,
    total = v_new_total,
    -- O cliente precisa aprovar quando o total muda em relação ao que ele viu/aprovou.
    needs_customer_approval = (v_new_total <> v_reference_total)
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- Registra que o cliente aprovou (pelo WhatsApp) o novo total do pedido.
create or replace function public.mark_customer_approved_total(p_order_id uuid, p_note text default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.orders set
    needs_customer_approval = false,
    approved_total = total,
    customer_approved_at = now()
  where id = p_order_id and status not in ('completed', 'cancelled')
  returning * into v_order;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  insert into public.order_adjustments (order_id, kind, old_total, new_total, note, created_by)
  values (p_order_id, 'customer_approval', v_order.total, v_order.total,
          coalesce(p_note, 'Cliente aprovou o total pelo WhatsApp'), auth.uid());
  return v_order;
end;
$$;

revoke execute on function public.generate_order_code() from public, anon, authenticated;
revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
revoke execute on function public.recent_orders_from_ip(text, integer) from public, anon, authenticated;
revoke execute on function public.mark_order_whatsapp_opened(uuid) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.recent_orders_from_ip(text, integer) to service_role;
grant execute on function public.mark_order_whatsapp_opened(uuid) to service_role;
revoke execute on function public.update_order_status(uuid, public.order_status, text, public.cancel_reason) from public, anon;
revoke execute on function public.set_delivery_fee(uuid, numeric, boolean, text) from public, anon;
revoke execute on function public.mark_customer_approved_total(uuid, text) from public, anon;
grant execute on function public.update_order_status(uuid, public.order_status, text, public.cancel_reason) to authenticated;
grant execute on function public.set_delivery_fee(uuid, numeric, boolean, text) to authenticated;
grant execute on function public.mark_customer_approved_total(uuid, text) to authenticated;

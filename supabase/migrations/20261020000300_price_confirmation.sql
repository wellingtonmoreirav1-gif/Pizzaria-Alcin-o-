-- =============================================================================
-- Alcinão — Conferência de preços: quem confirmou e quando é preenchido pelo
-- banco (não pelo navegador). Desmarcar a conferência limpa os dois campos.
-- =============================================================================

create or replace function public.stamp_price_confirmation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.price_confirmed then
    new.price_confirmed_at := null;
    new.price_confirmed_by := null;
  elsif tg_op = 'INSERT' or not old.price_confirmed then
    new.price_confirmed_at := now();
    new.price_confirmed_by := auth.uid();
  else
    -- Já estava conferido: mantém o registro original.
    new.price_confirmed_at := old.price_confirmed_at;
    new.price_confirmed_by := old.price_confirmed_by;
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_price_confirmation() from public, anon, authenticated;

create trigger products_price_confirmation before insert or update of price_confirmed, price_confirmed_at, price_confirmed_by
  on public.products for each row execute function public.stamp_price_confirmation();
create trigger option_values_price_confirmation before insert or update of price_confirmed, price_confirmed_at, price_confirmed_by
  on public.option_values for each row execute function public.stamp_price_confirmation();


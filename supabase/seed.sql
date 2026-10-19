-- =============================================================================
-- Alcinão — Dados iniciais OFICIAIS (informados pelo estabelecimento)
-- Não contém produtos nem preços: o cardápio real é cadastrado pelo painel.
-- Pode ser executado mais de uma vez sem duplicar dados.
-- =============================================================================

insert into public.business_settings (
  id, business_name, whatsapp_number, address_line, city, state, reference_point, timezone,
  hero_title, hero_subtitle
) values (
  1,
  'Pizzaria e Churrascaria Alcinão',
  '5583999216691',
  'Avenida Pedro Eulâmpio',
  'São Bento',
  'PB',
  'Ao lado do Hospital Dr. Jarques',
  'America/Fortaleza',
  'Seu próximo sabor favorito está aqui.',
  'Pizzas, almoço e churrasco do Alcinão, em São Bento (PB). Monte seu pedido e envie pelo WhatsApp.'
)
on conflict (id) do nothing;

-- Horários informados: almoço a partir das 10h30 (até acabar a comida — encerramento
-- manual no painel) e atendimento noturno das 18h30 às 23h.
-- Os dias da semana ainda não foram informados: todos começam ativos e devem ser
-- revisados em /admin/horarios.
insert into public.business_hours (weekday, shift, opens_at, closes_at, is_active)
select d, 'lunch', '10:30', null, true from generate_series(0, 6) d
on conflict (weekday, shift) do nothing;
insert into public.business_hours (weekday, shift, opens_at, closes_at, is_active)
select d, 'dinner', '18:30', '23:00', true from generate_series(0, 6) d
on conflict (weekday, shift) do nothing;

-- Categorias definidas no briefing. "Promoções" e "Mais vendidos" são vitrines
-- automáticas (calculadas), não categorias físicas.
insert into public.categories (slug, name, sort_order) values
  ('pizzas', 'Pizzas', 10),
  ('almoco', 'Almoço', 20),
  ('churrasco', 'Churrasco', 30),
  ('combos', 'Combos', 40),
  ('porcoes', 'Porções', 50),
  ('bebidas', 'Bebidas', 60),
  ('sobremesas', 'Sobremesas', 70)
on conflict (slug) do nothing;

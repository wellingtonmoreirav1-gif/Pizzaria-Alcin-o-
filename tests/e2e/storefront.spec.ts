import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openAllDay, sql } from './db';
import { addDrink, addHalfAndHalfPizza, clearClientState, fillAddress, fillCustomer } from './helpers';

test.beforeEach(async ({ page }) => {
  await openAllDay();
  await clearClientState(page);
});

test('página inicial mostra vitrine, status e chamada para pedir', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(/Sabor irresistível no Alcinão — pizzaria e churrascaria/i);
  // Topo animado: a sequência de quadros da pizza carrega e acompanha a rolagem.
  const hero = page.getByTestId('hero');
  await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.5));
  await expect.poll(async () => Number(await hero.evaluate((el) => getComputedStyle(el).getPropertyValue('--p')))).toBeGreaterThan(0);
  // Durante a animação: a apresentação some (e sai do Tab), o botão de pedido fica à mão.
  await expect(hero).toHaveAttribute('data-stage', /[12]/);
  await expect(hero.getByRole('link', { name: 'Falar no WhatsApp' })).toBeHidden();
  await expect(hero.getByRole('link', { name: /Pedir agora/ })).toBeVisible();
  // No fim, o convite para escolher a pizza.
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid=hero]')!;
    window.scrollTo(0, el.offsetTop + el.offsetHeight - window.innerHeight);
  });
  await expect(hero.getByRole('link', { name: /Escolher minha pizza/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(hero.getByRole('link', { name: 'Falar no WhatsApp' })).toHaveAttribute('href', /wa\.me\/\d+/);
  await expect(page.getByRole('heading', { name: 'Peça agora pelo WhatsApp' })).toBeVisible();
  await expect(page.getByTestId('store-status').first()).toContainText('Aberto');
  await expect(page.getByRole('heading', { name: /Destaque da semana:\s*X Frango Assado/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'O que você quer hoje?' })).toBeVisible();
  // Bordas e molhos não se pedem sozinhos: não viram faixa na página inicial.
  await expect(page.getByTestId('category-bands')).not.toContainText('Bordas recheadas');
  // Pizzas, lanches, petiscos e pratos têm blocos próprios ("Pedir …"); bebidas ficam fora daqui.
  const categorias = page.locator('#categorias');
  for (const name of ['Pedir pizzas', 'Pedir lanches', 'Pedir petiscos da casa', 'Pedir pratos']) {
    await expect(categorias.getByRole('link', { name })).toBeVisible();
  }
  await expect(categorias).not.toContainText('Bebidas');
  await expect(categorias).not.toContainText('Pizzas tradicionais');
  // Fileiras sem nada que dê para pedir (bebidas sem preço) ficam só no cardápio; "Pratos da casa" tem a sua.
  await expect(page.getByRole('heading', { name: 'Pratos da casa', level: 2 })).toBeVisible();
  await hero.getByRole('link', { name: /Pedir agora/ }).first().click();
  await expect(page).toHaveURL(/\/cardapio$/);
});

test('destaque da semana abre o lanche para pedir', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
  const weekly = page.locator('#em-alta');
  await weekly.getByRole('link', { name: /Pedir agora/ }).click();
  await expect(page.getByRole('dialog', { name: 'X-Frango' })).toBeVisible();
});

test('Pedir pizzas leva às pizzas separadas por categoria', async ({ page }) => {
  await page.goto('/');
  await page.locator('#categorias').getByRole('link', { name: /Pedir pizzas/ }).click();
  await expect(page).toHaveURL(/\/pizzas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Pizzas' })).toBeVisible();
  for (const name of ['Pizzas tradicionais', 'Pizzas especiais', 'Pizzas premium', 'Pizzas doces']) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  }
  await expect(page.getByRole('heading', { level: 2, name: 'Lanches tradicionais' })).toHaveCount(0);
});

test('Pedir pratos reúne pratos da casa e lasanhas', async ({ page }) => {
  await page.goto('/');
  await page.locator('#categorias').getByRole('link', { name: 'Pedir pratos' }).click();
  await expect(page).toHaveURL(/\/pratos$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Pratos da casa' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Lasanhas' })).toBeVisible();
});

test('história da Alcinão: vídeo com capa, carrossel e Instagram', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
  const story = page.locator('#historia');
  await story.scrollIntoViewIfNeeded();
  await expect(story.getByText('No início, a Alcinão era um restaurante de sucesso.')).toBeVisible();
  await expect(story.getByRole('button', { name: /Assistir ao vídeo: Das cinzas à inauguração/ })).toBeVisible();
  const carousel = story.getByRole('region', { name: 'Vídeos da Alcinão' });
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel.locator('video[controls]')).toHaveAttribute('src', '/historia/video-2.mp4');
  await carousel.getByRole('button', { name: 'Próximo vídeo' }).click();
  await expect(carousel.locator('video[controls]')).toHaveAttribute('src', '/historia/video-3.mp4');
  await expect(story.getByRole('link', { name: /Seguir @pizzariaalcinao no Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/pizzariaalcinao/');
});

test('quem pede menos movimento vê o topo parado, da altura da tela', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.getByTestId('hero');
  const height = await hero.evaluate((el) => (el as HTMLElement).offsetHeight);
  expect(height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(hero.getByRole('link', { name: /Pedir agora/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(hero.getByRole('link', { name: /Pedir agora/ })).toBeVisible();
});

test('busca e filtros do cardápio funcionam', async ({ page }) => {
  await page.goto('/cardapio');
  await page.getByRole('searchbox', { name: 'Buscar no cardápio' }).fill('refrigerante');
  await expect(page.getByTestId('product-card')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Buscar no cardápio' }).fill('');
  await page.getByRole('button', { name: 'Promoções' }).click();
  await expect(page.getByTestId('product-card')).toHaveCount(1);
  await expect(page.getByTestId('product-card').first()).toContainText('Refrigerante');
  await page.getByRole('button', { name: 'Tudo' }).click();
  await page.getByRole('button', { name: 'Bebidas', exact: true }).click();
  await expect(page).toHaveURL(/categoria=bebidas/);
});

test('montagem da pizza aplica regras de sabores, borda e preço', async ({ page }) => {
  await page.goto('/produto/exemplo-pizza');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('add-to-cart').filter({ visible: true })).toBeVisible();
  // Com vários tamanhos, nenhum vem pré-selecionado. Na pequena só cabe 1 sabor e o doce não é oferecido.
  await page.getByText('Pequena (exemplo)').click();
  await page.getByText('Sabor exemplo A', { exact: true }).click();
  await expect(page.getByText('Indisponível neste tamanho')).toBeVisible();
  await expect(page.getByTestId('add-to-cart')).toContainText('R$ 30,00');
  // Na grande: até 2 sabores, sem misturar doce com salgada; vale o mais caro.
  await page.getByText('Grande (exemplo)').click();
  await page.getByText('Sabor exemplo B (especial)').click();
  await expect(page.getByText('Não combina com o sabor escolhido')).toBeVisible();
  await expect(page.getByTestId('add-to-cart')).toContainText('R$ 60,00');
  await page.getByText('Borda exemplo').click();
  await page.getByText('Adicional exemplo').click();
  await expect(page.getByTestId('add-to-cart')).toContainText('R$ 73,00');
  await expect(page.getByRole('img', { name: /Pizza com Sabor exemplo A, Sabor exemplo B/ })).toBeVisible();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByLabel('Seu carrinho').getByTestId('cart-lines')).toContainText('1/2 Sabor exemplo A');
});

test('carrinho altera quantidade, remove e persiste após recarregar', async ({ page }) => {
  await addDrink(page);
  await addHalfAndHalfPizza(page);
  await page.goto('/carrinho');
  await expect(page.getByText('Total dos itens', { exact: true })).toBeVisible();
  // Promoção ativa do refrigerante 2L: R$ 12,00.
  await expect(page.locator('aside')).toContainText('R$ 81,00');
  await page.getByRole('button', { name: 'Aumentar quantidade' }).first().click();
  await expect(page.locator('aside')).toContainText('R$ 93,00');
  await page.reload();
  await expect(page.locator('aside')).toContainText('R$ 93,00');
  await page.getByRole('button', { name: /Remover \[EXEMPLO\] Refrigerante/ }).click();
  await expect(page.locator('aside')).toContainText('R$ 69,00');
});

test('checkout de entrega com GPS registra o pedido e gera mensagem do WhatsApp', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -6.4871, longitude: -37.4512, accuracy: 25 });
  await addHalfAndHalfPizza(page);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await page.getByText('Entrega', { exact: true }).click();
  await page.getByTestId('next-step').click();
  await fillCustomer(page);
  await page.getByTestId('next-step').click();
  await fillAddress(page);
  await page.getByRole('button', { name: 'Usar minha localização atual' }).click();
  await expect(page.getByTestId('map-picker')).toBeVisible();
  await expect(page.getByText(/precisão aproximada de 25 m/)).toBeVisible();
  // Ajuste manual do marcador tocando no mapa.
  await page.getByTestId('map-picker').click({ position: { x: 60, y: 60 } });
  await expect(page.getByText('Ponto marcado. Toque no mapa')).toBeVisible();
  await page.getByTestId('next-step').click();
  await page.getByText('Dinheiro').click();
  await page.getByText('Preciso de troco').click();
  await page.getByLabel('Troco para quanto?').fill('100,00');
  await page.getByTestId('next-step').click();
  await expect(page.getByText('Total dos itens', { exact: true })).toBeVisible();
  await expect(page.locator('aside')).toContainText('A confirmar');
  await page.getByText('Confirmo que os itens').click();
  await page.getByTestId('submit-order').click();

  await expect(page).toHaveURL(/\/pedido\/ALC-[0-9A-Z]{6}\?t=.+&novo=1/);
  await expect(page.getByRole('heading', { name: 'Falta só enviar no WhatsApp!' })).toBeVisible();
  await expect(page.getByText(/não é enviada automaticamente/)).toBeVisible();
  const code = /ALC-[0-9A-Z]{6}/.exec(page.url())?.[0] as string;
  const href = await page.getByTestId('open-whatsapp').getAttribute('href');
  expect(href).toMatch(/^https:\/\/wa\.me\/5583999216691\?text=/);
  const text = decodeURIComponent(new URL(href as string).searchParams.get('text') ?? '');
  expect(text).toContain(`*Pedido: #${code}*`);
  expect(text).toContain('*MODALIDADE: ENTREGA*');
  expect(text).toContain('Taxa de entrega: A confirmar');
  expect(text).toContain('*Total: A confirmar*');
  expect(text).toContain('Troco para: R$ 100,00');
  expect(text).toContain('Localização: https://www.google.com/maps?q=');

  const [order] = await sql<{ status: string; total: string; delivery_fee_status: string; latitude: string | null; location_source: string; customer_phone: string }>(
    'select status, total, delivery_fee_status, latitude, location_source, customer_phone from public.orders where code = $1',
    [code],
  );
  expect(order).toMatchObject({ status: 'registered', total: '69.00', delivery_fee_status: 'pending', location_source: 'map_pin', customer_phone: '83988887777' });
  expect(order?.latitude).not.toBeNull();

  // O carrinho foi limpo e o clique no WhatsApp é registrado (sem afirmar que a mensagem foi enviada).
  await page.getByTestId('open-whatsapp').click({ modifiers: [] }).catch(() => undefined);
  await expect.poll(async () => (await sql('select whatsapp_opened_at from public.orders where code = $1', [code]))[0]?.whatsapp_opened_at).not.toBeNull();
});

test('GPS negado: o pedido segue com o endereço digitado', async ({ page }) => {
  // Simula o cliente recusando a permissão de localização no navegador.
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
  });
  await addDrink(page);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await page.getByText('Entrega', { exact: true }).click();
  await page.getByTestId('next-step').click();
  await fillCustomer(page, 'João Sem GPS', '83977776666');
  await page.getByTestId('next-step').click();
  await fillAddress(page);
  await page.getByRole('button', { name: 'Usar minha localização atual' }).click();
  await expect(page.getByText(/não autorizou a localização|Não foi possível obter/)).toBeVisible();
  await page.getByTestId('next-step').click();
  await page.getByText('Pix').click();
  await page.getByTestId('next-step').click();
  await page.getByText('Confirmo que os itens').click();
  await page.getByTestId('submit-order').click();
  await expect(page).toHaveURL(/\/pedido\/ALC-/);
  const rows = await sql<{ latitude: string | null }>(`select latitude from public.orders where customer_name = 'João Sem GPS'`);
  expect(rows).toEqual([{ latitude: null }]);
});

test('retirada: total é final e mensagem não traz endereço; copiar mensagem funciona', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await addDrink(page);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await page.getByText('Retirada no local').click();
  await page.getByTestId('next-step').click();
  await fillCustomer(page, 'Ana Retirada', '83966665555');
  await page.getByTestId('next-step').click();
  await expect(page.getByText('Pagamento na entrega')).toHaveCount(0);
  await page.getByText('Cartão de débito').click();
  await page.getByTestId('next-step').click();
  await page.getByText('Confirmo que os itens').click();
  await page.getByTestId('submit-order').click();
  await expect(page).toHaveURL(/\/pedido\/ALC-/);
  await expect(page.getByTestId('order-total')).toHaveText('R$ 12,00');
  await page.getByTestId('copy-message').click();
  await expect(page.getByText('Mensagem copiada!')).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('*MODALIDADE: RETIRADA NO LOCAL*');
  expect(clip).not.toContain('Endereço');
  expect(clip).toContain('*Total: R$ 12,00*');
});

test('cliques repetidos não duplicam o pedido', async ({ page }) => {
  await addDrink(page);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await page.getByText('Retirada no local').click();
  await page.getByTestId('next-step').click();
  await fillCustomer(page, 'Duplo Clique', '83955554444');
  await page.getByTestId('next-step').click();
  await page.getByText('Pix').click();
  await page.getByTestId('next-step').click();
  await page.getByText('Confirmo que os itens').click();
  await page.getByTestId('submit-order').dblclick();
  await expect(page).toHaveURL(/\/pedido\/ALC-/);
  const rows = await sql(`select id from public.orders where customer_name = 'Duplo Clique'`);
  expect(rows).toHaveLength(1);
});

test('loja fechada: aviso no site e servidor recusa o pedido sem perder o carrinho', async ({ page, request }) => {
  await addDrink(page);
  await sql(`update public.business_settings set accepting_orders = false, pause_message = 'Pausa para manutenção'`);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Não estamos recebendo pedidos agora').first()).toBeVisible();
  await expect(page.getByText('Pausa para manutenção').first()).toBeVisible();
  const res = await request.post('/api/orders', {
    headers: { 'content-type': 'application/json' },
    data: {
      idempotencyKey: crypto.randomUUID(),
      fulfillment: 'pickup',
      customer: { name: 'Fora', phone: '83944443333' },
      payment: { method: 'pix' },
      items: [{ productId: '00000000-0000-4000-8000-000000000005', variantId: null, options: {}, quantity: 1 }],
      expectedItemsTotalCents: 1200,
      confirmed: true,
    },
  });
  expect(res.status()).toBe(409);
  expect((await res.json()).code).toBe('STORE_CLOSED');
  await page.goto('/carrinho');
  await expect(page.locator('#conteudo').getByTestId('cart-lines')).toContainText('Refrigerante');
});

test('servidor recalcula preços e ignora valores do navegador', async ({ request }) => {
  const base = {
    fulfillment: 'pickup',
    customer: { name: 'Hacker', phone: '83933332222' },
    payment: { method: 'pix' },
    items: [{ productId: '00000000-0000-4000-8000-000000000005', variantId: null, options: {}, quantity: 2, unitPrice: 1 }],
    confirmed: true,
  };
  const wrong = await request.post('/api/orders', { data: { ...base, idempotencyKey: crypto.randomUUID(), expectedItemsTotalCents: 2 } });
  expect(wrong.status()).toBe(409);
  expect((await wrong.json()).code).toBe('PRICE_CHANGED');
  const ok = await request.post('/api/orders', { data: { ...base, idempotencyKey: crypto.randomUUID(), expectedItemsTotalCents: 2400 } });
  expect(ok.status()).toBe(201);
  const body = await ok.json();
  const [order] = await sql<{ total: string }>('select total from public.orders where code = $1', [body.code]);
  expect(order?.total).toBe('24.00');
  // Mesmo código com token errado não abre o pedido.
  const page = await request.get(`/pedido/${body.code}?t=token-invalido-123`);
  expect(await page.text()).toContain('Pedido não encontrado');
});

test('almoço encerrado bloqueia itens do almoço', async ({ request }) => {
  await sql(`update public.business_settings set lunch_closed_on = (now() at time zone 'America/Fortaleza')::date`);
  const res = await request.post('/api/orders', {
    data: {
      idempotencyKey: crypto.randomUUID(),
      fulfillment: 'pickup',
      customer: { name: 'Almoço', phone: '83922221111' },
      payment: { method: 'pix' },
      items: [{ productId: '00000000-0000-4000-8000-000000000003', variantId: null, options: { '00000000-0000-4000-8000-000000000024': [] }, quantity: 1 }],
      expectedItemsTotalCents: 2200,
      confirmed: true,
    },
  });
  expect(res.status()).toBe(422);
  const data = await res.json();
  expect(JSON.stringify(data.items)).toMatch(/almoço|Acompanhamentos/);
});

test('layout móvel sem rolagem horizontal', async ({ page }) => {
  for (const path of ['/', '/cardapio', '/produto/exemplo-pizza', '/checkout', '/conta']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test('acessibilidade essencial (axe) sem violações graves', async ({ page }) => {
  for (const path of ['/', '/cardapio', '/produto/exemplo-pizza', '/checkout']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious.map((v) => `${path}: ${v.id} — ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} ${n.failureSummary ?? ''}`).join(' | ')}`)).toEqual([]);
  }
});

test('falha de rede ou do servidor no envio: mensagem clara e carrinho preservado, sem duplicar', async ({ page }) => {
  await addDrink(page);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await page.getByText('Retirada no local').click();
  await page.getByTestId('next-step').click();
  await fillCustomer(page, 'Rede Instavel', '83911110000');
  await page.getByTestId('next-step').click();
  await page.getByText('Pix').click();
  await page.getByTestId('next-step').click();
  await page.getByText('Confirmo que os itens').click();

  // 1) Sem conexão.
  await page.route('**/api/orders', (route) => route.abort('internetdisconnected'));
  await page.getByTestId('submit-order').click();
  await expect(page.getByText('Sem conexão')).toBeVisible();
  // 2) Banco indisponível (resposta 503 do servidor).
  await page.unroute('**/api/orders');
  await page.route('**/api/orders', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, code: 'ORDER_NOT_SAVED', message: 'Não conseguimos registrar seu pedido agora. Seu carrinho foi mantido; tente novamente.' }) }),
  );
  await page.getByTestId('submit-order').click();
  await expect(page.getByText('Não conseguimos registrar seu pedido agora.')).toBeVisible();
  await expect(page.locator('#conteudo').getByTestId('cart-lines')).toContainText('Refrigerante');
  // 3) Conexão volta: o mesmo pedido é enviado uma única vez.
  await page.unroute('**/api/orders');
  await expect(page.getByTestId('submit-order')).toBeEnabled();
  const response = page.waitForResponse('**/api/orders');
  await page.getByTestId('submit-order').click();
  expect((await response).status()).toBe(201);
  await expect(page).toHaveURL(/\/pedido\/ALC-/);
  expect(await sql(`select id from public.orders where customer_name = 'Rede Instavel'`)).toHaveLength(1);
});

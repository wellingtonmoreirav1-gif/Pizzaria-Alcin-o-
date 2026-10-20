import { expect, test, type Page } from '@playwright/test';
import { openAllDay, sql } from './db';
import { clearClientState, fillCustomer } from './helpers';
import { PASSWORD, USERS } from './global-setup';

/** Testes do cardápio oficial (categorias, tamanhos, bordas, carrinho, pedido e conferência de preços). */

const CATEGORIES: Record<string, string[]> = {
  'pizzas-tradicionais': ['Pizza Muçarela', 'Pizza Calabresa', 'Pizza Frango', 'Pizza Marguerita', 'Pizza Portuguesa', 'Pizza Bacon'],
  'pizzas-especiais': [
    'Pizza Frango com Catupiry', 'Pizza Calabresa com Catupiry', 'Pizza Carne de Sol', 'Pizza Carne de Sol com Queijo Coalho',
    'Pizza Quatro Queijos', 'Pizza Frango com Cheddar', 'Pizza Pepperoni', 'Pizza Costela',
  ],
  'pizzas-premium': ['Pizza Camarão com Catupiry', 'Pizza Camarão aos Quatro Queijos'],
  'pizzas-doces': ['Pizza Chocolate', 'Pizza Banana com Canela', 'Pizza Prestígio', 'Pizza Romeu e Julieta'],
  'lanches-tradicionais': ['Misto Quente', 'X-Burguer', 'X-Frango', 'X-Bacon', 'X-Calabresa'],
  'lanches-especiais': ['Cheddar Bacon', 'Duplo Burguer', 'Alcinão — Especial da Casa'],
  beirute: ['Beirute'],
  petiscos: ['Batata Frita 400 g', 'Batata Frita com Cheddar e Bacon', 'Isca de Frango Crocante', 'Calabresa do Chef'],
  'pratos-da-casa': ['Picanha na Chapa', 'Filé Mignon na Chapa', 'Filé à Parmegiana de Frango', 'Peixe Frito'],
  lasanhas: ['Lasanha de Carne', 'Lasanha de Frango', 'Lasanha Mista'],
  bebidas: ['Coca-Cola', 'Fanta Laranja', 'Cajuína', 'Cerveja', 'H2OH! 500 ml', 'Água mineral 500 ml'],
};

const addButton = (page: Page) => page.getByTestId('add-to-cart').filter({ visible: true });

async function openProduct(page: Page, slug: string) {
  await page.goto(`/produto/${slug}`);
  await page.waitForLoadState('networkidle');
}

/** Pizza Calabresa Grande + borda de Catupiry (R$ 50 + R$ 16), quantidade 2. */
async function addCalabresaG(page: Page) {
  await openProduct(page, 'pizza-calabresa');
  await page.getByText('Grande (G)').click();
  await page.getByText('Catupiry Original').click();
  await expect(addButton(page)).toContainText('R$ 66,00');
  await page.getByRole('button', { name: 'Aumentar quantidade' }).filter({ visible: true }).click();
  await expect(addButton(page)).toContainText('R$ 132,00');
  await addButton(page).click();
}

async function login(page: Page, email: string) {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/admin/login'));
}

test.beforeEach(async ({ page }) => {
  await openAllDay();
  await clearClientState(page);
});

test('todas as categorias e produtos aparecem no cardápio, na ordem e sem duplicatas', async ({ page }) => {
  await page.goto('/cardapio');
  await page.waitForLoadState('networkidle');
  for (const [slug, names] of Object.entries(CATEGORIES)) {
    const section = page.locator(`section#${slug}`);
    await expect(section.getByTestId('product-card').first()).toBeVisible();
    // Ignora os itens criados só para os testes ("[EXEMPLO]" e o produto do teste do painel).
    const shown = (await section.getByTestId('product-card').locator('h3').allTextContents()).map((t) => t.trim()).filter((t) => !t.startsWith('[EXEMPLO]') && t !== 'Suco Teste E2E');
    expect(shown, slug).toEqual(names);
  }
  // Bordas e molhos aparecem como seções informativas.
  await expect(page.getByTestId('info-bordas-recheadas')).toContainText('Catupiry Original');
  await expect(page.getByTestId('info-molhos')).toContainText('Maionese verde');
  const allNames = await page.getByTestId('product-card').locator('h3').allTextContents();
  expect(new Set(allNames).size).toBe(allNames.length);
  // Navegação por categoria.
  await page.getByRole('button', { name: 'Lasanhas', exact: true }).click();
  await expect(page).toHaveURL(/categoria=lasanhas/);
  await expect(page.getByTestId('product-card')).toHaveCount(3);
});

test('pizza: tamanhos com preços corretos e borda somada conforme o tamanho', async ({ page }) => {
  await openProduct(page, 'pizza-calabresa');
  const sizes: [string, string][] = [['Pequena (P)', 'R$ 25,00'], ['Média (M)', 'R$ 39,00'], ['Grande (G)', 'R$ 50,00'], ['Gigante (GG)', 'R$ 60,00'], ['Família (F)', 'R$ 75,00']];
  for (const [size, price] of sizes) {
    await expect(page.getByRole('radio', { name: new RegExp(size.replace(/[()]/g, '\\$&')) }).locator('..')).toContainText(price);
  }
  // Sem tamanho escolhido não dá para adicionar.
  await addButton(page).click();
  await expect(page.getByText('Escolha o tamanho de Pizza Calabresa.').filter({ visible: true })).toBeVisible();
  await page.getByText('Pequena (P)').click();
  await page.getByText('Requeijão').click();
  await expect(addButton(page)).toContainText('R$ 29,00');
  await page.getByText('Família (F)').click();
  await page.getByText('Catupiry Original').click();
  await expect(addButton(page)).toContainText('R$ 95,00');
  await page.getByText('Sem borda recheada').click();
  await expect(addButton(page)).toContainText('R$ 75,00');
});

test('carrinho: preço unitário, subtotal, quantidade, remoção e persistência', async ({ page }) => {
  await addCalabresaG(page);
  await page.goto('/carrinho');
  const lines = page.locator('#conteudo').getByTestId('cart-lines');
  await expect(lines).toContainText('Pizza Calabresa');
  await expect(lines).toContainText('Grande (G)');
  await expect(lines).toContainText('Catupiry Original');
  await expect(lines.getByTestId('line-unit')).toHaveText('R$ 66,00 cada');
  await expect(lines.getByTestId('line-subtotal')).toHaveText('R$ 132,00');
  await expect(page.getByTestId('cart-page-total')).toHaveText('R$ 132,00');
  await page.reload();
  await expect(page.getByTestId('cart-page-total')).toHaveText('R$ 132,00');
  await lines.getByRole('button', { name: 'Diminuir quantidade' }).click();
  await expect(page.getByTestId('cart-page-total')).toHaveText('R$ 66,00');
  await lines.getByRole('button', { name: /Remover Pizza Calabresa/ }).click();
  await expect(page.getByText('Seu carrinho está vazio').first()).toBeVisible();
});

test('Beirute serve até 3 pessoas e pratos da casa servem 2', async ({ page }) => {
  await page.goto('/cardapio?categoria=beirute');
  await page.waitForLoadState('networkidle');
  const beirute = page.getByTestId('product-card').filter({ hasText: 'Beirute', visible: true });
  await expect(beirute).toContainText('Serve até 3 pessoas');
  await expect(beirute).toContainText('R$ 49,90');
  await expect(beirute).toContainText('batata frita');
  await page.goto('/cardapio?categoria=pratos-da-casa');
  await page.waitForLoadState('networkidle');
  const pratos = page.getByTestId('product-card').filter({ visible: true });
  await expect(pratos).toHaveCount(4);
  for (const card of await pratos.all()) await expect(card).toContainText('Serve 2 pessoas');
});

test('lasanha exige a escolha de um dos 3 tamanhos', async ({ page }) => {
  await openProduct(page, 'lasanha-mista');
  await expect(page.getByRole('radio')).toHaveCount(3);
  await addButton(page).click();
  await expect(page.getByText('Escolha o tamanho de Lasanha Mista.').filter({ visible: true })).toBeVisible();
  await page.getByText('Média').click();
  await expect(addButton(page)).toContainText('R$ 48,00');
  await page.getByText('Grande').click();
  await expect(addButton(page)).toContainText('R$ 57,00');
});

test('pizzas especiais liberadas, molhos grátis e bebida sem preço não pode ser pedida (nem pela API)', async ({ page, request }) => {
  // Especiais/premium confirmadas: G (55,00) + borda de Catupiry (16,00).
  await openProduct(page, 'pizza-quatro-queijos');
  await expect(page.getByText('Preço em conferência')).toHaveCount(0);
  await page.getByText('Grande (G)').click();
  await page.getByText('Catupiry Original').click();
  await expect(addButton(page)).toBeEnabled();
  await expect(addButton(page)).toContainText('R$ 71,00');
  // Molhos grátis: selecionáveis sem alterar o valor.
  await openProduct(page, 'x-bacon');
  await expect(page.getByText('Valor a definir pelo restaurante')).toHaveCount(0);
  await page.getByText('Maionese verde').click();
  await page.getByText('Maionese de alho').click();
  await expect(addButton(page)).toContainText('R$ 19,00');
  // Bebida nova: aparece com "Preço a definir" e não pode ser pedida.
  await page.goto('/cardapio?categoria=bebidas');
  await page.waitForLoadState('networkidle');
  const coca = page.getByTestId('product-card').filter({ hasText: 'Coca-Cola', visible: true });
  await expect(coca).toContainText('Preço a definir');
  await expect(coca).not.toContainText('R$ 0,00');
  await openProduct(page, 'coca-cola');
  await expect(page.getByText('a definir').first()).toBeVisible();
  await expect(addButton(page)).toBeDisabled();

  const [row] = await sql<{ product: string; variant: string }>(
    `select p.id as product, v.id as variant from public.products p join public.product_variants v on v.product_id = p.id where p.slug = 'coca-cola' and v.name = 'Lata'`,
  );
  const res = await request.post('/api/orders', {
    data: {
      idempotencyKey: crypto.randomUUID(),
      fulfillment: 'pickup',
      customer: { name: 'Conferência', phone: '83911112222' },
      payment: { method: 'pix' },
      items: [{ productId: row!.product, variantId: row!.variant, options: {}, quantity: 1 }],
      expectedItemsTotalCents: 0,
      confirmed: true,
    },
  });
  expect(res.status()).toBe(422);
  expect(JSON.stringify(await res.json())).toContain('conferência');
});

test('pedido com pizza e borda: total correto, registrado uma vez e resumo do WhatsApp fiel', async ({ page }) => {
  await addCalabresaG(page);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await page.getByText('Retirada no local').click();
  await page.getByTestId('next-step').click();
  await fillCustomer(page, 'Cliente Cardápio', '83977776666');
  await page.getByTestId('next-step').click();
  await page.getByText('Pix').click();
  await page.getByTestId('next-step').click();
  await page.getByText('Confirmo que os itens').click();
  await page.getByTestId('submit-order').dblclick();
  await expect(page).toHaveURL(/\/pedido\/ALC-/);
  await expect(page.getByTestId('order-total')).toHaveText('R$ 132,00');
  const href = await page.getByTestId('open-whatsapp').first().getAttribute('href');
  const message = decodeURIComponent(new URL(href!).searchParams.get('text') ?? '');
  expect(message).toContain('2x Pizza Calabresa — Grande (G) (R$ 132,00)');
  expect(message).toContain('Catupiry Original');
  expect(message).toContain('*Total: R$ 132,00*');
  const orders = await sql<{ total: string; n: number }>(
    `select o.total, (select count(*)::int from public.order_item_options x join public.order_items i on i.id = x.order_item_id where i.order_id = o.id) as n
       from public.orders o where o.customer_name = 'Cliente Cardápio'`,
  );
  expect(orders).toHaveLength(1);
  expect(orders[0]).toEqual({ total: '132.00', n: 1 });
});

test('telas pequenas (320 px): cardápio, produto e carrinho sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await addCalabresaG(page);
  for (const path of ['/cardapio', '/produto/pizza-calabresa', '/produto/lasanha-mista', '/carrinho', '/']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test('administrador define preços e fotos pelo painel, sem mexer no código', async ({ page }) => {
  await login(page, USERS.manager);
  await page.goto('/admin/precos');
  // Confirmar em lote não libera item sem valor (nunca R$ 0,00 por engano).
  await page.getByLabel('Selecionar Fanta Laranja').check();
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Confirmar os selecionados sem alterar valores' }).click();
  await expect(page.getByText(/Sem valor cadastrado: Fanta Laranja/).first()).toBeVisible();
  // Valor zero é recusado; valores reais liberam o item.
  const coca = page.getByTestId('pending-product').filter({ hasText: 'Coca-Cola' });
  const values: [string, string][] = [['Lata', '0,00'], ['600 ml', '8,00'], ['1 litro', '10,00'], ['2 litros', '14,00']];
  for (const [size, price] of values) {
    await coca.getByLabel(size, { exact: true }).fill(price);
  }
  await coca.getByRole('button', { name: 'Salvar e confirmar valores' }).click();
  await expect(page.getByText('O valor precisa ser maior que zero.').first()).toBeVisible();
  await coca.getByLabel('Lata', { exact: true }).fill('6,00');
  await coca.getByRole('button', { name: 'Salvar e confirmar valores' }).click();
  await expect(page.getByText('Valores conferidos e liberados para pedido.')).toBeVisible();
  // Borda: novo valor na tabela única vale para todas as pizzas.
  await page.goto('/admin/opcoes');
  await page.getByLabel('Valor de Cheddar no tamanho Grande (G)').fill('9,00');
  await page.getByRole('button', { name: 'Salvar valores por tamanho' }).first().click();
  await expect(page.getByText('Valores por tamanho salvos.')).toBeVisible();
  // Fotos: página própria, com a situação de cada produto.
  await page.goto('/admin/fotos');
  await expect(page.getByRole('heading', { name: /Fotos dos produtos \(0 de \d+ com foto real\)/ })).toBeVisible();
  const item = page.getByTestId('photo-item').filter({ hasText: 'Beirute' });
  await expect(item).toContainText('Ilustração provisória');
  await item.getByRole('button', { name: 'Salvar foto' }).click();
  await expect(page.getByText('Foto de Beirute salva.')).toBeVisible();

  const [audit] = await sql<{ actor_role: string; by: string | null }>(
    `select a.actor_role, p.price_confirmed_by::text as by from public.audit_logs a join public.products p on p.id = a.record_id::uuid
      where a.table_name = 'products' and p.slug = 'coca-cola' order by a.id desc limit 1`,
  );
  expect(audit?.actor_role).toBe('manager');
  expect(audit?.by).not.toBeNull();
  const [beirute] = await sql<{ image_url: string; image_alt: string }>(`select image_url, image_alt from public.products where slug = 'beirute'`);
  expect(beirute).toEqual({ image_url: '/images/products/beirute.svg', image_alt: 'Imagem ilustrativa provisória de Beirute (foto oficial em breve)' });

  await openProduct(page, 'coca-cola');
  await page.getByText('2 litros', { exact: true }).click();
  await expect(addButton(page)).toBeEnabled();
  await expect(addButton(page)).toContainText('R$ 14,00');
  await openProduct(page, 'pizza-quatro-queijos');
  await page.getByText('Grande (G)').click();
  await page.getByText('Cheddar').click();
  await expect(addButton(page)).toContainText('R$ 64,00');
});

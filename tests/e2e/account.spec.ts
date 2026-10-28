import { expect, test } from '@playwright/test';
import { openAllDay, sql } from './db';
import { addDrink, clearClientState } from './helpers';

test.beforeEach(async () => {
  await openAllDay();
});

test('cliente cria conta, salva endereço, compra com dados preenchidos, vê histórico e pede novamente', async ({ page }) => {
  const email = `novo-${Date.now()}@alcinao.test`;
  await clearClientState(page);
  await page.goto('/conta');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome').fill('Carla Cliente');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Olá, Carla!' })).toBeVisible();
  const [user] = await sql<{ id: string }>('select id from auth.users where email = $1', [email]);
  // A senha nunca fica em texto puro.
  const [pw] = await sql<{ encrypted_password: string }>('select encrypted_password from auth.users where email = $1', [email]);
  expect(pw?.encrypted_password).toMatch(/^\$2[aby]\$/);

  await page.getByLabel('Telefone (WhatsApp)').fill('(83) 99000-1122');
  await page.getByRole('button', { name: 'Salvar dados' }).click();
  await expect(page.getByText('Dados atualizados.')).toBeVisible();
  await page.getByLabel('Rua').fill('Rua do Cliente');
  await page.getByLabel('Nº').fill('45');
  await page.getByLabel('Bairro').fill('Centro');
  await page.getByRole('button', { name: 'Adicionar endereço' }).click();
  await expect(page.getByText('Rua do Cliente, 45')).toBeVisible();

  await addDrink(page);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await page.getByText('Entrega', { exact: true }).click();
  await page.getByTestId('next-step').click();
  await expect(page.getByLabel('Nome')).toHaveValue('Carla Cliente');
  await expect(page.getByLabel('Telefone (WhatsApp)')).toHaveValue('(83) 99000-1122');
  await page.getByTestId('next-step').click();
  await expect(page.getByLabel('Rua ou avenida')).toHaveValue('Rua do Cliente');
  await page.getByTestId('next-step').click();
  await page.getByText('Pix').click();
  await page.getByTestId('next-step').click();
  await page.getByText('Confirmo que os itens').click();
  await page.getByTestId('submit-order').click();
  await expect(page).toHaveURL(/\/pedido\/ALC-/);
  const code = /ALC-[0-9A-Z]{6}/.exec(page.url())?.[0] as string;
  const [order] = await sql<{ customer_id: string }>('select customer_id from public.orders where code = $1', [code]);
  expect(order?.customer_id).toBe(user?.id);

  // Histórico: o dono abre o pedido sem token.
  await page.goto('/conta');
  await page.getByRole('link', { name: 'Detalhes e pedir novamente' }).first().click();
  await expect(page.getByText(`Pedido #${code}`)).toBeVisible();

  // Pedir novamente com preço ATUAL (o preço do produto mudou depois do pedido).
  await sql(`update public.product_variants set price = 16.00 where id = '00000000-0000-4000-8000-000000000014'`);
  await sql(`update public.promotions set is_active = false`);
  await page.getByRole('button', { name: 'Pedir novamente' }).click();
  await expect(page.getByLabel('Seu carrinho').getByTestId('cart-subtotal')).toHaveText('R$ 16,00');
  await sql(`update public.product_variants set price = 14.00 where id = '00000000-0000-4000-8000-000000000014'`);
  await sql(`update public.promotions set is_active = true`);

  // Outro usuário não acessa o pedido.
  await page.context().clearCookies();
  await page.goto(`/pedido/${code}`);
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado' }).filter({ visible: true })).toBeVisible();
});

test('cliente exclui a conta e os pedidos ficam anonimizados', async ({ page }) => {
  const email = `apagar-${Date.now()}@alcinao.test`;
  await clearClientState(page);
  await page.goto('/conta');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome').fill('Pedro Apagar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Olá, Pedro!' })).toBeVisible();
  const [user] = await sql<{ id: string }>('select id from auth.users where email = $1', [email]);
  await addDrink(page);
  const res = await page.request.post('/api/orders', {
    data: {
      idempotencyKey: crypto.randomUUID(),
      fulfillment: 'pickup',
      customer: { name: 'Pedro Apagar', phone: '83977001100' },
      payment: { method: 'pix' },
      items: [{ productId: '00000000-0000-4000-8000-000000000005', variantId: null, options: {}, quantity: 1 }],
      expectedItemsTotalCents: 1200,
      confirmed: true,
    },
  });
  expect(res.status()).toBe(201);
  await page.goto('/conta');
  await page.getByRole('button', { name: 'Excluir minha conta' }).click();
  await page.getByRole('button', { name: 'Sim, excluir definitivamente' }).click();
  await expect(page).toHaveURL(/conta=excluida/);
  expect(await sql('select id from auth.users where id = $1', [user?.id])).toHaveLength(0);
  const orders = await sql<{ customer_name: string | null; total: string }>(
    `select customer_name, total from public.orders where customer_phone is null and anonymized_at is not null`,
  );
  expect(orders.some((o) => o.total === '12.00' && o.customer_name === null)).toBe(true);
});

import { expect, test, type Page } from '@playwright/test';
import { openAllDay, sql } from './db';
import { PASSWORD, USERS } from './global-setup';
import { addDrink, clearClientState, fillAddress, fillCustomer } from './helpers';

async function login(page: Page, email: string) {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/admin/login'));
}

async function placeDeliveryOrder(page: Page, name: string) {
  await clearClientState(page);
  await addDrink(page);
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await page.getByText('Entrega', { exact: true }).click();
  await page.getByTestId('next-step').click();
  await fillCustomer(page, name, '83911223344');
  await page.getByTestId('next-step').click();
  await fillAddress(page);
  await page.getByTestId('next-step').click();
  await page.getByText('Pix').click();
  await page.getByTestId('next-step').click();
  await page.getByText('Confirmo que os itens').click();
  await page.getByTestId('submit-order').click();
  await expect(page).toHaveURL(/\/pedido\/ALC-/);
  return /ALC-[0-9A-Z]{6}/.exec(page.url())?.[0] as string;
}

test.beforeEach(async () => {
  await openAllDay();
});

test('painel exige login e autorização', async ({ page }) => {
  await page.goto('/admin/pedidos');
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fpedidos/);
  await login(page, USERS.customer);
  await expect(page).toHaveURL(/\/admin\/sem-permissao/);
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
});

test('atendente: fluxo do pedido com taxa auditável; sem acesso a cardápio e relatórios', async ({ page }) => {
  const code = await placeDeliveryOrder(page, 'Cliente Painel');
  await login(page, USERS.attendant);
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Relatórios' })).toHaveCount(0);

  await page.goto('/admin/pedidos?status=abertos');
  await page.getByTestId('admin-order-row').filter({ hasText: code }).click();
  await expect(page.getByRole('heading', { name: `Pedido #${code}` })).toBeVisible();
  // Não pode aceitar antes de confirmar a taxa.
  await page.getByRole('button', { name: 'Aceitar pedido' }).click();
  await expect(page.getByText('Confirme a taxa de entrega antes de aceitar o pedido.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Cliente confirmou no WhatsApp' }).click();
  await expect(page.getByText('Cliente confirmou no WhatsApp').first()).toBeVisible();
  await page.getByLabel('Taxa (R$)').fill('5,00');
  await page.getByRole('button', { name: 'Registrar taxa' }).click();
  await expect(page.getByText('Total alterado: aguardando aprovação do cliente')).toBeVisible();
  await page.getByRole('button', { name: 'Cliente aprovou o novo total' }).click();
  await expect(page.getByText('Total alterado: aguardando aprovação do cliente')).toHaveCount(0);
  await page.getByRole('button', { name: 'Aceitar pedido' }).click();
  await page.getByRole('button', { name: 'Iniciar preparo' }).click();
  await page.getByRole('button', { name: 'Marcar como pronto' }).click();
  await page.getByRole('button', { name: 'Saiu para entrega' }).click();
  await page.getByRole('button', { name: 'Concluir pedido' }).click();
  await expect(page.getByText('Concluído').first()).toBeVisible();

  const [row] = await sql<{ status: string; total: string; delivery_fee_status: string }>('select status, total, delivery_fee_status from public.orders where code = $1', [code]);
  expect(row).toEqual({ status: 'completed', total: '17.00', delivery_fee_status: 'confirmed' });
  const history = await sql<{ changed_by_role: string | null }>(`select h.changed_by_role from public.order_status_history h join public.orders o on o.id = h.order_id where o.code = $1 order by h.id`, [code]);
  expect(history.map((h) => h.changed_by_role)).toEqual([null, 'attendant', 'attendant', 'attendant', 'attendant', 'attendant', 'attendant']);
  const adjustments = await sql(`select a.kind from public.order_adjustments a join public.orders o on o.id = a.order_id where o.code = $1`, [code]);
  expect(adjustments).toHaveLength(2);

  // O cliente vê o total atualizado na página de acompanhamento (via link com token).
  await page.goto('/admin/relatorios');
  await expect(page).toHaveURL(/sem-permissao/);
  await page.goto('/admin/cardapio');
  await expect(page).toHaveURL(/sem-permissao/);
});

test('gerente cadastra produto, publica, vê no site e marca como esgotado', async ({ page }) => {
  await login(page, USERS.manager);
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await page.goto('/admin/cardapio/novo');
  await page.getByLabel('Nome').fill('Suco Teste E2E');
  // Petiscos: bebidas não aparecem no cardápio (são oferecidas no carrinho).
  await page.getByLabel('Categoria').selectOption({ label: 'Petiscos' });
  await page.getByLabel('Preço (R$)').fill('8,50');
  await page.getByLabel('Descrição curta').fill('Suco criado pelo teste automatizado.');
  await page.getByRole('button', { name: 'Criar produto' }).click();
  await expect(page).toHaveURL(/\/admin\/cardapio\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Rascunho (não aparece no site).')).toBeVisible();

  // Rascunho não aparece no site.
  const draft = await page.request.get('/cardapio');
  expect(await draft.text()).not.toContain('Suco Teste E2E');

  // O Next 16 mantém a página anterior oculta (Activity); usamos só o campo visível.
  await page.getByLabel('Publicado no site').filter({ visible: true }).check();
  await page.getByRole('button', { name: 'Salvar produto' }).filter({ visible: true }).click();
  await expect(page.getByText('Publicado no site.')).toBeVisible();
  const [audit] = await sql<{ n: number }>(`select count(*)::int as n from public.audit_logs where table_name = 'products' and new_data->>'name' = 'Suco Teste E2E'`);
  expect(audit?.n).toBeGreaterThanOrEqual(2);

  // Produto novo entra com "preço em conferência": aparece, mas não pode ser pedido.
  await page.goto('/cardapio?q=suco');
  await page.waitForLoadState('networkidle');
  const card = page.getByTestId('product-card').filter({ hasText: 'Suco Teste E2E', visible: true });
  await expect(card).toContainText('R$ 8,50');
  await expect(card).toContainText('Preço em conferência');

  await page.goto('/admin/precos');
  const pending = page.getByTestId('pending-product').filter({ hasText: 'Suco Teste E2E' });
  await pending.getByRole('button', { name: 'Salvar e confirmar valores' }).click();
  await expect(page.getByText('Valores conferidos e liberados para pedido.')).toBeVisible();
  await page.goto('/cardapio?q=suco');
  await page.waitForLoadState('networkidle');
  await expect(card).not.toContainText('Preço em conferência');
  await expect(card.getByRole('button', { name: /Adicionar/ })).toBeEnabled();

  await page.goto('/admin/operacao');
  await page.getByRole('switch', { name: /Suco Teste E2E: disponível/ }).click();
  await expect(page.getByRole('switch', { name: /Suco Teste E2E: esgotado/ })).toBeVisible();
  await expect(page.getByText('Suco Teste E2E: marcado como esgotado.')).toBeVisible();
  await page.goto('/cardapio?q=suco');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('product-card').filter({ hasText: 'Suco Teste E2E', visible: true })).toContainText('Esgotado');
});

test('operação: pausar pedidos e encerrar almoço refletem no site', async ({ page }) => {
  await login(page, USERS.attendant);
  await page.goto('/admin/operacao');
  await page.getByRole('button', { name: 'Pausar 15 min' }).click();
  await expect(page.getByText('Pedidos pausados por 15 minutos.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('store-status').first()).toContainText('Pausado');
  await page.goto('/admin/operacao');
  await page.getByRole('button', { name: 'Encerrar pausa' }).click();
  await expect(page.getByText('Pausa encerrada.')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Encerrar almoço de hoje' }).click();
  await expect(page.getByText('Almoço de hoje encerrado.')).toBeVisible();
  const [s] = await sql<{ closed: boolean }>(`select lunch_closed_on = (now() at time zone 'America/Fortaleza')::date as closed from public.business_settings`);
  expect(s?.closed).toBe(true);
});

test('relatórios mostram dados reais e exportam CSV', async ({ page }) => {
  await login(page, USERS.manager);
  await page.goto('/admin/relatorios?periodo=30');
  await expect(page.getByRole('heading', { name: 'Relatórios' })).toBeVisible();
  const [o] = await sql<{ revenue: string }>(`select coalesce(sum(total), 0)::text as revenue from public.orders where status = 'completed' and created_at > now() - interval '30 days'`);
  const reais = Number(o?.revenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  await expect(page.getByText('Faturamento (concluídos)').locator('..')).toContainText(reais);
  const csv = await page.request.get('/admin/relatorios/exportar?tipo=produtos&periodo=30');
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain('produto;categoria;quantidade;valor');
  // Atendente não exporta.
  await page.context().clearCookies();
  await login(page, USERS.attendant);
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  const denied = await page.request.get('/admin/relatorios/exportar?tipo=produtos');
  expect(denied.status()).toBe(403);
});

test('admin gerencia equipe e altera o WhatsApp centralizado', async ({ page }) => {
  await login(page, USERS.admin);
  await page.goto('/admin/equipe');
  await page.getByLabel('E-mail da conta').fill(USERS.customer);
  await page.getByLabel('Papel').selectOption('attendant');
  await page.getByRole('button', { name: 'Salvar acesso' }).click();
  await expect(page.getByText(`${USERS.customer} · Atendente`)).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('listitem').filter({ hasText: USERS.customer }).getByRole('button', { name: 'Remover acesso' }).click();
  await expect(page.getByText(`${USERS.customer} · Atendente`)).toHaveCount(0);

  await page.goto('/admin/configuracoes');
  await page.getByLabel('WhatsApp que recebe os pedidos').fill('(83) 98765-4321');
  await page.getByRole('button', { name: 'Salvar configurações' }).click();
  await expect(page.getByText('Configurações salvas.')).toBeVisible();
  const code = await placeDeliveryOrder(page, 'Cliente Novo Numero');
  const href = await page.getByTestId('open-whatsapp').getAttribute('href');
  expect(href).toContain('https://wa.me/5583987654321?text=');
  expect(decodeURIComponent(href ?? '')).toContain(code);
  // Volta ao número oficial pelo painel (invalida o cache do site).
  await page.goto('/admin/configuracoes');
  await page.getByLabel('WhatsApp que recebe os pedidos').fill('(83) 99921-6691');
  await page.getByRole('button', { name: 'Salvar configurações' }).click();
  await expect(page.getByText('Configurações salvas.')).toBeVisible();
});

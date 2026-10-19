import { expect, type Page } from '@playwright/test';

export async function clearClientState(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/** Monta uma pizza Grande meio a meio (Sabor A + Sabor B especial) com borda. */
export async function addHalfAndHalfPizza(page: Page) {
  await page.goto('/produto/exemplo-pizza');
  await page.waitForLoadState('networkidle');
  await page.getByText('Grande (exemplo)').click();
  await page.getByText('Sabor exemplo A', { exact: true }).click();
  await page.getByText('Sabor exemplo B (especial)').click();
  await page.getByText('Borda exemplo').click();
  const add = page.getByTestId('add-to-cart').filter({ visible: true });
  await expect(add).toContainText('R$ 69,00');
  await add.click();
}

export async function addDrink(page: Page) {
  await page.goto('/produto/exemplo-refrigerante');
  await page.waitForLoadState('networkidle');
  await page.getByText('2 litros (exemplo)').click();
  await page.getByTestId('add-to-cart').filter({ visible: true }).click();
}

export async function fillCustomer(page: Page, name = 'Maria Teste', phone = '(83) 98888-7777') {
  await page.getByLabel('Nome').fill(name);
  await page.getByLabel('Telefone (WhatsApp)').fill(phone);
}

export async function fillAddress(page: Page) {
  await page.getByLabel('Rua ou avenida').fill('Rua das Flores');
  await page.getByLabel('Número').fill('123');
  await page.getByLabel('Bairro').fill('Centro');
  await page.getByLabel('Ponto de referência').fill('Perto da praça');
}

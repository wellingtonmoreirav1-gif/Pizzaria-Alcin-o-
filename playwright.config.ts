import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta. Requer o Supabase local (scripts/local-supabase/start.sh)
 * e as variáveis do .env.local apontando para ele. Veja docs/TESTES.md.
 */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'pt-BR',
    timezoneId: 'America/Fortaleza',
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: process.env.E2E_SERVER_COMMAND ?? `npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { NEXT_PUBLIC_SITE_URL: `http://localhost:${port}` },
  },
});

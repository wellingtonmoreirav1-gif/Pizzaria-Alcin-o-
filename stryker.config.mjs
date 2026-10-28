// @ts-check
/**
 * Teste de mutação (Stryker): altera pedaços da lógica de negócio (ex.: troca `>` por `>=`)
 * e confere se algum teste unitário falha. Mutante que "sobrevive" = trecho sem teste de verdade.
 * Rode: npm run test:mutation (demora alguns minutos). Relatório: reports/mutation/index.html.
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
const config = {
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.unit.config.ts', related: false },
  plugins: ['@stryker-mutator/vitest-runner'],
  // Regras de negócio puras (camada "dominio" do arch-contract.yaml) e o cálculo do pedido.
  mutate: [
    'lib/pricing/**/*.ts',
    'lib/money.ts',
    'lib/phone.ts',
    'lib/business-hours/**/*.ts',
    'lib/whatsapp/**/*.ts',
    'lib/validation/**/*.ts',
    'lib/observability/scrub.ts',
    'lib/observability/config.ts',
  ],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  // Nota mínima (% de mutantes mortos). Abaixo de "break", o comando falha.
  thresholds: { high: 85, low: 70, break: 60 },
  concurrency: 4,
  tempDirName: '.stryker-tmp',
};

export default config;

# Qualidade de código

Ferramentas que conferem o código sozinhas, no computador e em cada Pull Request (workflow **CI**). Issues: #5 e #6.

## Comandos

```bash
npm run check          # tudo de uma vez (Biome, ESLint, TypeScript, Knip, Arch-Contract, unitários)
npm run format         # formata o código com o Biome
npm run biome:fix      # formata e corrige o que o Biome sabe corrigir sozinho
npm run lint           # ESLint (regras do Next.js e dos hooks do React)
npm run typecheck      # TypeScript
npm run knip           # arquivos, exports e dependências sem uso
npm run arch           # contrato de arquitetura
npm run test:coverage  # testes unitários com cobertura (pasta coverage/)
npm run test:mutation  # teste de mutação (Stryker), alguns minutos
```

## Ferramentas

| Ferramenta | O que faz | Configuração |
|---|---|---|
| **Biome** | formatação (aspas simples, ponto e vírgula, 160 colunas) e lint. Regras de hooks e de Next.js ficam com o ESLint; acessibilidade aparece como aviso | `biome.json` |
| **ESLint** | regras oficiais do Next.js e do React (hooks, pureza, Core Web Vitals) | `eslint.config.mjs` |
| **Commitlint** | mensagem de commit no padrão *Conventional Commits*: `tipo: descrição` | `commitlint.config.mjs`, hook `.husky/commit-msg` |
| **Knip** | aponta arquivos, exports e dependências que ninguém usa | `knip.json` |
| **Arch-Contract** | contrato de arquitetura: quem pode importar quem | `arch-contract.yaml` |
| **Stryker** | teste de mutação: muda a lógica de propósito e confere se algum teste falha | `stryker.config.mjs`, workflow semanal `mutacao.yml` |
| **Codecov** | mostra a cobertura dos testes em cada PR | `codecov.yml`, segredo `CODECOV_TOKEN` |

### Commits

Formato: `tipo: descrição em português`. Tipos: `feat` (nova função), `fix` (correção), `docs`, `style` (formatação), `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Ex.: `fix: taxa de entrega some no resumo`. Mencione a Issue no corpo (`Closes #12`).

O hook do Husky confere a mensagem ao fazer commit (instalado sozinho pelo `npm install`) e formata os arquivos do commit com o Biome. No CI, o job **commits** confere todos os commits do PR.

### Contrato de arquitetura (`arch-contract.yaml`)

| Camada | Pastas | Pode importar |
|---|---|---|
| `dominio` | `lib/pricing`, `lib/money.ts`, `lib/phone.ts`, `lib/business-hours`, `lib/validation`, `lib/whatsapp`, `lib/orders/labels.ts`, `lib/utils.ts`, `types/`, `config/` | só `dominio`, sem Next.js, React ou Supabase |
| `segredos` | `lib/supabase/admin.ts`, `lib/env.ts` (chave secreta, ignora RLS) | `dominio`, `servidor` |
| `servidor` | demais arquivos de `lib/` | `dominio`, `segredos`, `servidor` |
| `acoes` | `app/**/actions.ts` (server actions) | `dominio`, `servidor`, `segredos` |
| `componentes` | `components/` | `componentes`, `acoes`, `dominio`, `servidor` — **nunca** `segredos` |
| `rotas` | demais arquivos de `app/` | tudo acima |

Também proíbe ciclos de importação entre arquivos.

### Teste de mutação (Stryker)

Roda nas regras de negócio puras (preço, dinheiro, telefone, horários, validação, WhatsApp, limpeza de dados da observabilidade). Nota inicial: **66%** dos mutantes mortos. O comando falha abaixo de 60% (`thresholds.break`). Relatório: `reports/mutation/index.html` (local) ou o artefato `relatorio-mutacao` do workflow.

## Configurar o Codecov (uma vez)

1. Entre em https://app.codecov.io com a conta do GitHub e ative o repositório.
2. Copie o *upload token* e cadastre em GitHub → Settings → Secrets and variables → Actions → `CODECOV_TOKEN`.
3. A cobertura passa a aparecer nos PRs. No começo ela é só informativa e não bloqueia o merge.

Sem o token, o CI continua passando. Só o envio ao Codecov é pulado.

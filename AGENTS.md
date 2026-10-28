<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Instruções para agentes (qualquer modelo ou ferramenta)

Este arquivo vale para **todo agente** que trabalhar neste repositório (Claude Code, Codex, Cursor, Gemini, Copilot etc.). O `CLAUDE.md` apenas importa este arquivo. Em caso de conflito, as decisões do dono registradas em `docs/` prevalecem sobre recomendações gerais.

Idioma: escreva Issues, PRs, commits, comentários e documentação em **português do Brasil**, em linguagem simples (o dono acompanha pelo celular).

## 1. Fluxo obrigatório: Issue → branch → Pull Request → deploy

Toda tarefa — **correção, melhoria ou nova função** — segue este fluxo. Não há exceção para mudanças "pequenas".

1. **Issue primeiro.** Antes de alterar código, procure uma Issue aberta sobre o assunto; se não houver, crie uma com:
   - título curto e claro;
   - tipo: `correção`, `melhoria` ou `nova função` (use os modelos em `.github/ISSUE_TEMPLATE/`);
   - o que, por quê e uma lista de tarefas (`- [ ]`) com critério de aceite.
2. **Branch própria** a partir da branch padrão, com nome descritivo (ex.: `fix/taxa-entrega-arredondamento`, `feat/cupom-desconto`). Nunca faça commit direto na branch padrão.
3. **Pull Request** para a branch padrão, seguindo `.github/pull_request_template.md`. A descrição **deve mencionar a Issue** com `Closes #N` (ou `Refs #N` quando o PR resolve só parte dela). Um PR pode fechar várias Issues relacionadas.
4. **Deploy pelo PR.** A Vercel publica uma prévia (preview) de cada PR; o deploy de produção acontece **somente quando o PR é aceito (merge)** na branch padrão. Migrations de banco continuam manuais (workflow "Supabase migrations").
5. Antes de abrir ou atualizar o PR, rode as verificações locais (seção 4) e corrija o que falhar. CI vermelho não é "aguardando revisão": é trabalho pendente.
6. Ao terminar, marque as tarefas concluídas na Issue. Trabalho fora do escopo descoberto no caminho vira **nova Issue**, não cresce o PR.

## 2. Skills de design (pasta `.claude/skills/`)

Use-as ao criar ou alterar qualquer interface. Origem, licenças e restrições: `.claude/skills/README.md`.

| Comando | Para quê |
|---|---|
| `/impeccable` | direção de design, crítica, auditoria e polimento de telas |
| `/emil-design-eng` | filosofia de polimento de UI e decisões de animação (Emil Kowalski) |
| `/taste-skill` | direção de arte "anti-cara de IA" para páginas públicas e telas do painel |
| `/design-motion-principles` | movimento: modo *Create* (construir) e *Audit* (revisar) |
| `/animate`, `/review-animations`, `/improve-animations`, `/animation-performance`, `/mobile-native`, `/break-ui` | apoio específico de animação, desempenho, celular e casos extremos |

Fotos de produtos são **sempre as reais** enviadas pelo painel; não substitua por imagens de banco de fotos.

## 3. Regras de interface (toda tela, nova ou alterada)

Base: skill **Design Motion Principles**. Uma tela só está pronta quando tem:

- **Skeleton loading** — enquanto carrega, mostrar um esqueleto com o formato do conteúdo final (`loading.tsx` na rota ou `<Suspense fallback={<Skeleton…/>}>`), nunca tela em branco ou só um spinner.
- **Lazy loading** — imagens com `next/image` (lazy por padrão; `priority` só na imagem principal acima da dobra), vídeos com `preload="none"`/`metadata`, mapa e componentes pesados com `next/dynamic` ou carregados ao entrar na tela.
- **Animação suave de entrada, saída e carregamento** — animar só `transform`, `opacity` e `filter`; curvas próprias (`cubic-bezier`) ou springs, nunca `ease` genérico; saída mais discreta que a entrada; nada começa de `scale(0)`; sem animação em ações muito frequentes ou iniciadas pelo teclado; sem loops chamativos (pulsar, piscar).
- **Progresso em todos os elementos que esperam algo** — navegação entre páginas, botões de envio (estado "enviando…" e bloqueio de clique duplo), envio de fotos, etapas do checkout, carregamento de listas.
- **`prefers-reduced-motion`** respeitado em toda animação, no mesmo código (não fica para depois).
- Acessibilidade (os testes e2e usam axe) e funcionamento no celular (perfil Pixel 7 dos testes).

## 4. Verificações antes de abrir o PR

```bash
npm run lint        # ESLint (regras do Next.js)
npm run typecheck   # TypeScript
npm test            # testes unitários (Vitest)
```

Testes de banco e ponta a ponta: veja `docs/TESTES.md`. Quando o PR mexer em fluxo de pedido, preço, login ou painel, rode também `npm run test:db` e `npm run test:e2e`.

## 5. Observabilidade

Sentry, Datadog, New Relic e OpenTelemetry já estão integrados e ligam só por variável de ambiente (`docs/OBSERVABILIDADE.md`). Ao escrever código:

- Erro capturado em `try/catch` para mostrar mensagem amigável → registre com `reportError('escopo', erro)` de `lib/observability/report.ts` (não use só `console.error`).
- Nunca envie dados pessoais (telefone, nome, endereço, e-mail) ou tokens para atributos de span, tags ou mensagens de erro. A limpeza automática (`lib/observability/scrub.ts`) é uma rede de segurança, não um convite.

## 6. Documentação do projeto

- `README.md` — visão geral, publicação e uso.
- `docs/ARQUITETURA.md`, `docs/PERMISSOES.md`, `docs/REGRAS-DE-PRECO.md`, `docs/LGPD.md`, `docs/TESTES.md`, `docs/CUSTOS.md`, `docs/OBSERVABILIDADE.md`, `docs/PENDENCIAS.md`.

Mantenha a documentação atualizada no mesmo PR da mudança.

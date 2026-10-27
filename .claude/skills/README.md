# Skills de design e animação

Skills de Emil Kowalski (https://github.com/emilkowalski/skills, commit 2d22863, licença MIT — ver LICENSE em cada pasta).
São só textos de orientação para o assistente (Claude Code) ao mexer em visual e animações. Não fazem parte do site e não são publicadas.

Instaladas: emil-design-eng, animate, review-animations, animation-performance, mobile-native,
find-animation-opportunities, improve-animations, break-ui, animation-vocabulary, apple-design.

Para atualizar: copie de novo as pastas do repositório original.

## Impeccable (só os textos)

Skill `impeccable` de Paul Bakaus (https://github.com/pbakaus/impeccable, commit dad8dbb, skill 4.7.0, licença Apache 2.0 — ver LICENSE e NOTICE.md na pasta).
Use com `/impeccable <comando> <alvo>` (ex.: `/impeccable critique página inicial`, `/impeccable polish cardápio`).

- Foram instalados **só os textos de orientação** (SKILL.md e reference/). A pasta `scripts/` do original (programa que baixa e executa um verificador) foi deixada de fora por decisão do dono. Quando a skill mandar rodar `scripts/impeccable`, siga o caminho "Launcher unavailable" descrito no próprio SKILL.md.
- As escolhas do restaurante prevalecem sobre as recomendações gerais da skill (ex.: fontes Playfair Display + Inter, fundo vermelho do vídeo, chamada verde do WhatsApp).

## Taste Skill

Skill `design-taste-frontend` (pasta `taste-skill`) de Leonxlnx (https://github.com/Leonxlnx/taste-skill, commit 6010f91, v2, licença MIT — ver LICENSE na pasta). Sem a pasta `evals/` do original.

- Direção de arte para páginas públicas e telas do painel, com biblioteca de referências e regras "anti-cara de IA".
- Os scripts (`scripts/*.mjs`) são código-fonte legível, rodados com Node só quando o assistente precisar: `inspect.mjs` abre o Chromium local para tirar prints e checar a página; `assets.mjs` busca imagens de domínio público em acervos (Openverse, Wikimedia, museus). Nada é baixado para executar.
- **No Alcinão, fotos de produtos são sempre as reais enviadas pelo painel** — não usar imagens de acervo ou banco de fotos no lugar delas.
- O ESLint do projeto ignora `.claude/**`.

## Design Motion Principles

Skill `design-motion-principles` de Kyle Zantos (https://github.com/kylezantos/design-motion-principles, commit 4a9ca87, licença MIT — ver LICENSE na pasta). Só textos (SKILL.md, workflows/, references/).

- Dois modos: **Create** (criar componentes com movimento) e **Audit** (revisar o movimento existente e gerar relatório HTML em `motion-audits/`, ignorado pelo git).
- Base das regras de interface do `AGENTS.md`: skeleton loading, lazy loading, entrada/saída suaves, progresso e `prefers-reduced-motion`.
- Uso: `/design-motion-principles audit cardápio` ou `/design-motion-principles criar gaveta do carrinho`.

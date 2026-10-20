# Pizzaria e Churrascaria Alcinão — site e sistema de pedidos

Sistema completo de pedidos online da **Pizzaria e Churrascaria Alcinão** (Avenida Pedro Eulâmpio, São Bento – PB, ao lado do Hospital Dr. Jarques).

O cliente monta o pedido no site (celular ou computador), o pedido é **registrado no banco de dados** e o site abre o **WhatsApp** com a mensagem pronta para a equipe confirmar. A equipe administra tudo pelo painel em `/admin`.

> **Situação:** código completo e testado em ambiente local. **Ainda não foi publicado.** Para publicar, siga o [passo a passo](#publicação-passo-a-passo). O cardápio real, a logo e as fotos ainda precisam ser cadastrados (veja [docs/PENDENCIAS.md](docs/PENDENCIAS.md)).

---

## Sumário

1. [O que o sistema faz](#o-que-o-sistema-faz)
2. [Tecnologias e arquitetura](#tecnologias-e-arquitetura)
3. [Estrutura de pastas](#estrutura-de-pastas)
4. [Rodar no computador (desenvolvimento)](#rodar-no-computador-desenvolvimento)
5. [Publicação passo a passo](#publicação-passo-a-passo) (Supabase → GitHub → Vercel → domínio → verificação)
6. [Criar o primeiro administrador](#criar-o-primeiro-administrador)
7. [Remover os dados de exemplo](#remover-os-dados-de-exemplo)
8. [Testes](#testes)
9. [Custos e limites](#custos-e-limites)
10. [Documentação detalhada](#documentação-detalhada)

---

## O que o sistema faz

**Para o cliente (site público)**

- **Cardápio oficial cadastrado** (40 produtos): pizzas tradicionais, especiais, premium e doces (P/M/G/GG/F), bordas recheadas com valor por tamanho, lanches tradicionais e especiais, Beirute, petiscos, pratos da casa (servem 2), lasanhas (P/M/G) e molhos. Identidade visual: fundo preto, superfícies cinza, preços em dourado, ações e promoções em vermelho.
- Página inicial de vendas: chamada principal, atalhos por categoria, “Destaques do Alcinão” (escolhidos pela equipe + mais vendidos reais), promoções ativas, vitrines por categoria, avaliações aprovadas, entrega/retirada, localização e horários.
- Cardápio com busca (inclusive por ingrediente), abas de categoria, tabela de bordas, “Promoções” e “Mais vendidos” (só quando existem), “somente disponíveis” e características.
- **Montagem da pizza**: tamanho, borda opcional com o valor do tamanho, observações; combinações inválidas ficam bloqueadas; preço unitário e total antes de adicionar. (Pizza com 2+ sabores também é suportada, se configurada no painel.)
- Itens com **preço em conferência** ou opção sem valor definido aparecem, mas não podem ser pedidos até a equipe confirmar.
- Produtos com acompanhamentos, porções e horário de oferta; combos com itens incluídos.
- Carrinho salvo no aparelho, edição de itens, sugestões de complementos (sem adicionar nada sozinho) e **conferência de preços no servidor**.
- Checkout em etapas: modalidade (entrega, retirada, consumo no local) → dados → endereço + **localização opcional por GPS/mapa** → pagamento (Pix, dinheiro com troco, crédito, débito, pagamento na entrega) → revisão e confirmação.
- “Taxa de entrega **a confirmar**” enquanto a equipe não confirma; nada é apresentado como total definitivo antes disso.
- Página do pedido com código (ex.: `#ALC-7K3M9Q`), botão do WhatsApp, cópia da mensagem, andamento do status, avaliação (só após concluído) e “pedir novamente” (com preços atuais).
- Conta **opcional**: dados, endereços, favoritos, histórico, exclusão da conta (LGPD).
- Aviso de funcionamento em todo o site; fora do horário o carrinho continua salvo.

**Para a equipe (painel `/admin`)**

- Início com indicadores do dia (pedidos por status, taxas pendentes, aprovações pendentes; vendas só para gerente/admin).
- Pedidos: filtros, detalhes, avanço de status com histórico (quem e quando), **taxa de entrega auditável**, aprovação do cliente quando o total muda, cancelamento com motivo (inclusive “fora da área”), link para conversar no WhatsApp e ver a localização.
- Operação do dia: suspender/pausar pedidos, **encerrar o almoço com um toque** (sem afetar a noite), marcar itens/tamanhos/opções como esgotados.
- Cardápio: produtos, tamanhos (com código P/M/G/GG/F), sabores, adicionais com **preço por tamanho**, combos, fotos (envio direto pelo painel), rascunho, prévia, arquivamento sem perder histórico e **pedidos que incluem o produto**.
- **Bordas e molhos**: grupos cadastrados uma vez e usados por vários produtos (tabela de valores por tamanho, produtos ligados, disponível/esgotado).
- **Conferência de preços**: lista o que está “a confirmar”, permite corrigir e confirmar; quem confirmou e quando fica registrado.
- **Fotos e logo**: página só para envio da logo, da foto principal e das fotos de cada produto, com a situação de cada um e filtro “Sem foto real”.
- Categorias, promoções com período, banners com período, horários (turnos, feriados, horários especiais, tolerância), entrega e pagamento por modalidade, bairros com taxa prevista.
- Relatórios com dados reais (faturamento, vendas, ticket médio, produtos e categorias, sem vendas, vendidos juntos, recorrentes, modalidades, pagamentos, cancelamentos) e exportação CSV.
- Clientes (consulta por telefone, recorrentes, anonimização LGPD), avaliações (moderação), equipe (papéis) e auditoria das alterações.

**O que o sistema NÃO faz (de propósito)**

- Não envia mensagens de WhatsApp sozinho: o link `wa.me` abre a conversa e **o cliente toca em Enviar**. Confirmação automática exigiria a WhatsApp Business Platform (ver [docs/ARQUITETURA.md](docs/ARQUITETURA.md#whatsapp)).
- Não cobra online (sem gateway de pagamento).
- Não calcula taxa de entrega por distância.
- Não inventa cardápio, preços, avaliações ou popularidade.

## Tecnologias e arquitetura

| Camada | Tecnologia |
|---|---|
| Site e painel | Next.js 16 (App Router, Cache Components), React 19, TypeScript estrito, Tailwind CSS 4 |
| Banco, login e imagens | Supabase (PostgreSQL com RLS, Supabase Auth, Supabase Storage) |
| Validação | Zod 4 (no navegador e no servidor) |
| Mapa | Leaflet + OpenStreetMap (provedor configurável) |
| Ícones | Lucide |
| Testes | Vitest (unidade e banco) e Playwright (ponta a ponta + acessibilidade com axe) |
| Hospedagem | Vercel (site) + Supabase (backend) |

Detalhes, diagramas de fluxo e decisões: **[docs/ARQUITETURA.md](docs/ARQUITETURA.md)**.

## Estrutura de pastas

```
app/(site)/            páginas públicas (início, cardápio, produto, carrinho, checkout, pedido, conta…)
app/admin/             login e painel (/admin/...), com Server Actions por área
app/api/               rotas de servidor (registrar pedido, conferir carrinho, status, avaliação, exclusão de conta)
components/            componentes (ui/, storefront/, cart/, checkout/, order/, account/, admin/)
config/business.ts     dados padrão do estabelecimento (WhatsApp centralizado)
lib/pricing/           motor de preços (usado no navegador e no servidor)
lib/business-hours/    regras de funcionamento (fuso America/Fortaleza)
lib/orders/            registro do pedido, token de acesso, rótulos e status
lib/whatsapp/          mensagem e link do WhatsApp
lib/catalog/           leitura do cardápio com cache
lib/supabase/          clientes do Supabase (navegador, servidor, chave secreta)
lib/validation/        esquemas Zod
supabase/migrations/   SQL versionado (tabelas, RLS, funções, relatórios, storage)
supabase/seed.sql      dados OFICIAIS iniciais (sem produtos/preços)
supabase/seed-demo.sql produtos FICTÍCIOS só para testes ("[EXEMPLO]")
supabase/remove-demo.sql remove os dados de exemplo
scripts/local-supabase/ ambiente local de testes (Postgres + Auth + REST)
tests/                 unit/, db/, e2e/
docs/                  documentação detalhada
```

## Rodar no computador (desenvolvimento)

Requisitos: Node.js 20.9+ (recomendado 22), npm e um projeto Supabase (pode ser o mesmo de produção no início, ou um separado só para testes).

```bash
npm install
cp .env.example .env.local      # preencha com as chaves do Supabase (veja o passo 1 abaixo)
npm run dev                     # abre em http://localhost:3000
```

Para rodar **testes de banco e ponta a ponta sem nuvem**, existe um ambiente local que imita o Supabase (PostgreSQL + Supabase Auth + PostgREST). Veja [docs/TESTES.md](docs/TESTES.md).

---

## Publicação passo a passo

Siga na ordem. Não é preciso saber programar; é preciso atenção ao copiar valores. **Nunca** cole a chave secreta em lugar público (WhatsApp, e-mail, GitHub).

### Etapa A — Supabase (banco de dados, login e imagens)

1. Acesse <https://supabase.com>, crie uma conta e clique em **New project**.
   - Nome: `alcinao`; região: **South America (São Paulo)**; anote a senha do banco em local seguro.
2. Quando o projeto terminar de criar, vá em **SQL Editor → New query** e execute, **um por vez e nesta ordem**, o conteúdo de cada arquivo da pasta `supabase/migrations/` (copie, cole e clique em **Run**):
   1. `20261019000100_base.sql`
   2. `20261019000200_catalog.sql`
   3. `20261019000300_operations.sql`
   4. `20261019000400_customers.sql`
   5. `20261019000500_orders.sql`
   6. `20261019000600_audit.sql`
   7. `20261019000700_rls.sql`
   8. `20261019000800_order_functions.sql`
   9. `20261019000900_admin_functions.sql`
   10. `20261019001000_reports.sql`
   11. `20261019001100_storage.sql`

   Depois execute `supabase/seed.sql` (dados oficiais: nome, endereço, WhatsApp, horários, categorias).
   *Alternativa para quem usa terminal:* `npx supabase link` e `npx supabase db push` aplicam as migrations automaticamente.
3. **Segurança (RLS):** em **Table Editor**, confira que todas as tabelas aparecem com o selo *RLS enabled*. As políticas já foram criadas pelo passo 2.
4. **Imagens:** em **Storage** deve existir o bucket público `catalog` (criado pela migration `...001100_storage.sql`), com limite de 5 MB e tipos JPG/PNG/WebP/AVIF.
5. **Login (Authentication):**
   - **Authentication → URL Configuration**: *Site URL* = endereço do site (ex.: `https://alcinao.com.br`; antes do domínio, use o endereço `https://SEU-PROJETO.vercel.app`). Em *Redirect URLs* adicione `https://SEU-ENDERECO/auth/callback` (e `http://localhost:3000/auth/callback` para testes).
   - **Authentication → Providers → Email**: deixe *Confirm email* **ligado** (recomendado). Ative a proteção contra senhas vazadas se estiver disponível no seu plano.
   - Os limites de tentativas de login do Supabase Auth já ficam ativos por padrão.
   - Para e-mails em produção (confirmação/recuperação de senha), o envio padrão do Supabase tem limite baixo; configure um SMTP próprio em **Authentication → SMTP** quando o volume crescer.
6. **Chaves:** em **Project Settings → API Keys** copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_...`; ou a *anon key* legada) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** (`sb_secret_...`; ou a *service_role* legada) → `SUPABASE_SECRET_KEY` — **somente** na Vercel, nunca no navegador nem no GitHub.
7. **Limpeza automática de localização (LGPD):** em **Database → Extensions**, ative `pg_cron` e rode no SQL Editor:
   ```sql
   select cron.schedule('limpeza-dados-alcinao', '15 3 * * *', $$select public.purge_expired_personal_data()$$);
   ```
   Isso apaga diariamente as coordenadas de pedidos encerrados após o prazo configurado (padrão 90 dias) e o hash de IP após 2 dias.

### Etapa B — GitHub (guardar o código)

1. Crie uma conta em <https://github.com> e um repositório **privado** (ex.: `alcinao-pedidos`).
2. Envie este código para ele (quem estiver ajudando com o terminal: `git remote add origin ...` e `git push -u origin main`).
3. **Nunca envie arquivos `.env` ou `.env.local`**: eles já estão no `.gitignore`. Confira na página do repositório que esses arquivos **não aparecem**.
4. Para conferir que não há segredos no histórico, rode `git log -p | grep -iE "sb_secret|service_role|ORDER_ACCESS_SECRET="` — não deve aparecer nenhuma chave real (só os exemplos fictícios do `.env.example`). Ative também *Secret scanning* em **Settings → Code security** do repositório.

### Etapa C — Vercel (colocar o site no ar)

1. Crie uma conta em <https://vercel.com> usando o GitHub e clique em **Add New → Project → Import** no repositório.
2. Em **Environment Variables**, cadastre (para *Production* e *Preview*):

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | endereço do site, sem barra no final (ex.: `https://alcinao.com.br`) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável |
   | `SUPABASE_SECRET_KEY` | chave secreta (marque como *Sensitive*) |
   | `ORDER_ACCESS_SECRET` | texto aleatório com 32+ caracteres (gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`); marque como *Sensitive* |
   | `NEXT_PUBLIC_MAP_TILE_URL` | opcional — provedor de mapa (veja [docs/CUSTOS.md](docs/CUSTOS.md#mapas)) |

   > Atenção: se o `ORDER_ACCESS_SECRET` for trocado depois, os links de acompanhamento antigos deixam de funcionar.
3. Clique em **Deploy**. Ao terminar, abra o endereço `https://....vercel.app`.
4. **Logs:** em **Project → Logs** (ou *Deployments → Runtime Logs*) aparecem erros do servidor. Os logs não registram dados pessoais dos clientes.
5. **Teste o site publicado** com a lista da [Etapa F](#etapa-f--verificação-final).
6. **Atualizações futuras:** cada `git push` na branch principal gera um novo deploy automaticamente. Pull requests geram endereços de *Preview* para conferir antes.

> **Plano da Vercel:** os termos atuais do plano gratuito (*Hobby*) **não permitem uso comercial**. Para um restaurante, o adequado é o plano **Pro**. Detalhes e alternativas em [docs/CUSTOS.md](docs/CUSTOS.md).

### Etapa D — Primeiro administrador e configuração inicial

Veja [Criar o primeiro administrador](#criar-o-primeiro-administrador). Depois, no painel:

1. **Configurações**: confira nome, WhatsApp, endereço; envie a **logo oficial** e a foto principal; textos e SEO.
2. **Horários**: ajuste os dias da semana (hoje todos os dias estão ativos, pois os dias não foram informados), feriados e tolerância.
3. **Entrega e pagamento**: formas de pagamento por modalidade, bairros atendidos e taxas previstas (opcional), pedido mínimo.
4. **Conferência de preços**: informe os preços das bebidas (pizzas e molhos já foram confirmados). Até isso ser feito, as bebidas aparecem com “Preço a definir” e não podem ser pedidas. Veja [docs/PENDENCIAS.md](docs/PENDENCIAS.md#preços-que-precisam-ser-confirmados).
   **Fotos e logo**: envie a logo oficial e as fotos dos produtos.
   **Cardápio**: o cardápio oficial já vem cadastrado pelas migrations; use o painel para fotos, ajustes, novos produtos e a **Prévia** antes de publicar.
5. **Equipe**: libere o acesso de gerentes e atendentes.
6. Remova os [dados de exemplo](#remover-os-dados-de-exemplo) se tiver rodado o `seed-demo.sql`.

### Etapa E — Domínio próprio

1. **Escolha:** algo curto e fácil de falar no WhatsApp, por exemplo `alcinao.com.br`, `pizzariaalcinao.com.br` ou `alcinaosaobento.com.br`. Prefira `.com.br` (passa confiança local).
2. **Registro:** em <https://registro.br> (exige CPF ou CNPJ). O valor divulgado pelo NIC.br é de cerca de **R$ 40 por ano** — confira no site antes de pagar. *Nenhuma compra foi feita por este projeto.*
3. **Conectar à Vercel:** em **Project → Settings → Domains → Add**, digite o domínio. A Vercel mostra os registros DNS a criar (normalmente um registro **A** para o domínio raiz e um **CNAME** `www`). No Registro.br, em **DNS → Editar zona**, crie exatamente esses registros (ou use os servidores DNS da Vercel).
4. **HTTPS:** a Vercel emite o certificado automaticamente quando o DNS propaga (de minutos a algumas horas).
5. Atualize `NEXT_PUBLIC_SITE_URL` na Vercel e a *Site URL*/*Redirect URLs* no Supabase com o novo domínio, e faça um novo deploy.

### Etapa F — Verificação final

Use a lista em **[docs/PENDENCIAS.md](docs/PENDENCIAS.md#verificação-final-antes-de-divulgar)** e só marque um item depois de conferir de verdade no site publicado.

---

## Criar o primeiro administrador

Por segurança não existe usuário com senha fixa no código.

1. No site publicado, acesse **`/conta`**, clique em **Criar conta** e cadastre o e-mail do responsável com uma senha forte. Confirme o e-mail pelo link recebido.
2. No Supabase, abra **SQL Editor** e execute (trocando o e-mail):
   ```sql
   select public.bootstrap_first_admin('email-do-responsavel@exemplo.com');
   ```
   Essa função só funciona **enquanto não existe nenhum administrador** e não pode ser chamada pelo site.
3. Entre em **`/admin`** com esse e-mail. Os demais membros criam a própria conta em `/conta` e o administrador libera o papel em **Equipe**.

## Remover os dados de exemplo

O arquivo `supabase/seed-demo.sql` (opcional, usado nos testes) cria produtos **fictícios** com “[EXEMPLO]” no nome. Se ele foi executado, antes de divulgar o site rode no SQL Editor o conteúdo de `supabase/remove-demo.sql`. O painel mostra um aviso enquanto existirem produtos de demonstração.

## Testes

```bash
npm test            # testes de unidade (preços, horários, WhatsApp, validações, uploads, CSV)
npm run db:local    # sobe o ambiente local (Postgres + Supabase Auth + PostgREST)
npm run test:db     # testes de banco: RLS, permissões, pedidos, idempotência, relatórios
bash scripts/local-supabase/apply-migrations.sh && npm run build && npm run test:e2e   # ponta a ponta no build de produção (Playwright)
```

Resultado da última execução (detalhes e o que cada teste cobre em [docs/TESTES.md](docs/TESTES.md)):

- **Unidade + banco (Vitest):** 95 testes, todos passando.
- **Ponta a ponta (Playwright, celular Pixel 7, build de produção):** 31 testes, todos passando — incluindo acessibilidade (axe) e ausência de rolagem horizontal no celular.

O que **não** foi testado aqui e precisa ser conferido no ambiente publicado: envio real de imagens ao Supabase Storage (o ambiente local não tem o serviço Storage; as regras de acesso do Storage foram testadas no banco), imagens do mapa (o ambiente de testes não acessa a internet) e e-mails do Supabase Auth.

## Custos e limites

Resumo (valores de outubro/2026 de fontes públicas; confirme nas páginas oficiais antes de contratar):

| Serviço | Gratuito? | Observação |
|---|---|---|
| Vercel | Plano Hobby é gratuito, **mas não permite uso comercial** | Plano Pro ≈ US$ 20/mês |
| Supabase | Plano Free (500 MB de banco, projeto pausa após 1 semana sem uso, sem backups automáticos acessíveis) | Plano Pro ≈ US$ 25/mês (backups diários, sem pausa) |
| Domínio `.com.br` | Não | ≈ R$ 40/ano no Registro.br |
| Mapa | OpenStreetMap público só para baixo volume | Provedores com plano gratuito e chave de domínio |
| WhatsApp (link wa.me) | Sim | API oficial só se no futuro for necessária confirmação automática |

Não há promessa de custo zero. Análise completa, o que acontece ao atingir limites e backups: **[docs/CUSTOS.md](docs/CUSTOS.md)**.

## Documentação detalhada

- [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — arquitetura, fluxo do pedido, WhatsApp, banco de dados, segurança, cache.
- [docs/REGRAS-DE-PRECO.md](docs/REGRAS-DE-PRECO.md) — como os preços são calculados (pizzas, combos, promoções).
- [docs/PERMISSOES.md](docs/PERMISSOES.md) — o que cada papel pode fazer.
- [docs/RELATORIOS.md](docs/RELATORIOS.md) — definição de cada indicador.
- [docs/LGPD.md](docs/LGPD.md) — dados coletados, retenção, como atender pedidos dos titulares.
- [docs/LOGO-E-IMAGENS.md](docs/LOGO-E-IMAGENS.md) — logo oficial, direção de arte e produção das fotos.
- [docs/CUSTOS.md](docs/CUSTOS.md) — custos, limites e backups.
- [docs/TESTES.md](docs/TESTES.md) — como rodar e o que os testes cobrem.
- [docs/PENDENCIAS.md](docs/PENDENCIAS.md) — informações que faltam e checklist de publicação.

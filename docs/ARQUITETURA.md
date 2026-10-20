# Arquitetura

## Visão geral

```
Navegador (cliente / equipe)
   │  páginas e componentes React (Next.js 16)
   ▼
Vercel ── Next.js (Server Components, Route Handlers, Server Actions, proxy.ts)
   │        │
   │        ├─ leitura pública do cardápio (chave publicável + RLS, com cache por tags)
   │        ├─ operações do usuário logado (cookies de sessão + RLS)
   │        └─ registro do pedido / pedido de visitante (chave secreta, somente servidor)
   ▼
Supabase ── PostgreSQL (tabelas, RLS, funções SQL), Auth (login), Storage (imagens)
   │
WhatsApp ── link oficial https://wa.me/<número>?text=<mensagem> (o cliente toca em Enviar)
```

Separação de responsabilidades:

| Camada | Onde |
|---|---|
| Interface pública | `app/(site)`, `components/storefront`, `components/cart`, `components/checkout`, `components/order`, `components/account` |
| Painel | `app/admin`, `components/admin` |
| Lógica de negócio (pura, testável) | `lib/pricing`, `lib/business-hours`, `lib/whatsapp`, `lib/orders/labels.ts`, `lib/images/prompts.ts`, `lib/uploads.ts` |
| Acesso a dados | `lib/catalog` (leituras com cache), `lib/orders/snapshot.ts`, consultas nas Server Actions |
| APIs de servidor | `app/api/*` e `app/admin/**/actions.ts` (Server Actions) |
| Autenticação/autorização | `lib/auth/session.ts`, `proxy.ts`, RLS e funções SQL |
| Configuração | `config/business.ts`, tabela `business_settings`, variáveis de ambiente (`.env.example`) |
| Validação | `lib/validation` (Zod) + restrições no banco |
| Serviços externos | `lib/supabase/*`, `lib/whatsapp`, mapa (`components/checkout/map-picker.tsx`) |

## Fluxo do pedido

1. O cliente monta o carrinho (salvo no `localStorage`). Cada item guarda **apenas escolhas** (produto, tamanho, opções, quantidade, observação) e o último preço exibido.
2. Carrinho e checkout chamam `POST /api/cart/quote`, que recalcula tudo com os dados **atuais** do banco e aponta itens esgotados/alterados.
3. Ao confirmar, o navegador envia `POST /api/orders` com uma **chave de idempotência** (UUID guardado por sessão e por conteúdo do carrinho).
4. O servidor (`lib/orders/create.ts`):
   - valida o corpo com Zod;
   - se a chave já foi usada, devolve o mesmo pedido (clique duplo / rede instável não duplica);
   - verifica o funcionamento **no servidor** (`lib/business-hours`), modalidade e forma de pagamento permitidas;
   - busca os produtos no banco e **recalcula os preços** (`lib/pricing`); o total enviado pelo navegador só serve para detectar mudança de preço (`409 PRICE_CHANGED`);
   - aplica a taxa prevista do bairro, se cadastrada (status “estimada”), senão “a confirmar”;
   - limita pedidos por IP (hash) em 10 minutos;
   - grava tudo numa **única transação** pela função `public.create_order` (pedido, itens, opções, histórico), com código legível `ALC-XXXXXX`.
5. O servidor monta a mensagem do WhatsApp **a partir do pedido gravado** e devolve o código e um **token de acesso** (HMAC do id do pedido com `ORDER_ACCESS_SECRET`).
6. O cliente vai para `/pedido/ALC-XXXXXX?t=TOKEN`, toca em **Abrir WhatsApp** e **envia** a mensagem. O toque é registrado (`whatsapp_opened_at`), sem afirmar que a mensagem foi enviada.
7. A equipe trata o pedido no painel: “cliente confirmou no WhatsApp” → confirma a taxa → (se o total mudou) registra a aprovação do cliente → aceita → preparo → pronto → saiu para entrega → concluído (ou cancela com motivo).

### Status distinguidos

| Situação | Onde fica registrada |
|---|---|
| Pedido registrado no site | `status = registered` |
| Cliente tocou em “Abrir WhatsApp” | `whatsapp_opened_at` (não garante envio) |
| Cliente confirmou (a equipe recebeu a mensagem) | `customer_confirmed` |
| Aceito / em preparação / pronto / em entrega / concluído / cancelado | `accepted`, `preparing`, `ready`, `out_for_delivery`, `completed`, `cancelled` |

Transições permitidas ficam em `public.allowed_next_statuses` (espelhadas em `lib/orders/labels.ts`). Um pedido de entrega **não pode ser aceito** sem taxa confirmada nem com aprovação do cliente pendente. Todo avanço grava `order_status_history` com usuário e papel.

### Taxa de entrega

Nunca é calculada por distância. A equipe registra a taxa (`public.set_delivery_fee`), que:
- grava um ajuste auditável em `order_adjustments` (taxa e total antes/depois, quem, quando, justificativa);
- recalcula o total;
- marca `needs_customer_approval` se o total ficou diferente do que o cliente viu/aprovou;
- após o pedido aceito com taxa confirmada, só gerente/admin altera, **com justificativa**.

## WhatsApp

- Número central: tabela `business_settings.whatsapp_number` (editável em **/admin/configuracoes**). Padrão de instalação em `config/business.ts` e na variável `NEXT_PUBLIC_WHATSAPP_NUMBER`: `5583999216691`.
- O link `https://wa.me/<número>?text=<mensagem codificada>` é o mecanismo oficial; ele **não envia** nada sozinho.
- Se o WhatsApp não abrir, o pedido continua registrado e a página permite **copiar a mensagem**.
- **Confirmação automática no futuro:** exigiria a WhatsApp Business Platform (Cloud API da Meta): conta Business verificada, número dedicado (não pode estar em uso no app comum), webhooks HTTPS para receber mensagens, modelos de mensagem aprovados para iniciar conversas e cobrança por conversa/mensagem conforme a tabela da Meta. Não foi implementado porque não há necessidade confirmada e envolve custos.

## Banco de dados

Migrations em `supabase/migrations/` (aplicar em ordem). Principais tabelas:

| Tabela | Conteúdo |
|---|---|
| `profiles`, `user_roles` | perfil do cliente; papel da equipe (admin, manager, attendant) |
| `categories`, `products`, `product_images` | catálogo (exclusão lógica por `deleted_at`) |
| `product_variants` | tamanhos/porções; para pizza: preço-base, máx. de sabores, regra de preço, mistura de tipos |
| `option_groups`, `option_values`, `option_value_variant_prices` | sabores, bordas, adicionais, escolhas; preço e oferta por tamanho |
| `product_shared_groups`, `option_value_size_prices` | grupos compartilhados (bordas, molhos) ligados a vários produtos; valor por código de tamanho (P/M/G/GG/F) |
| `combo_items`, `promotions`, `banners` | combos, promoções e banners com período |
| `business_settings`, `business_hours`, `business_hour_exceptions`, `delivery_zones` | operação, horários, feriados, bairros |
| `customer_addresses`, `favorites`, `reviews` | dados do cliente e avaliações moderadas |
| `orders`, `order_items`, `order_item_options` | pedido com **fotografia** dos nomes/preços no momento da compra |
| `order_status_history`, `order_adjustments` | histórico de status e ajustes de valores |
| `audit_logs` | registro automático (gatilhos) das alterações administrativas |

Regras técnicas aplicadas: chaves estrangeiras, índices nas consultas frequentes, `CHECK` de integridade (inclusive soma de totais), dinheiro em `numeric(10,2)` (no código, centavos inteiros), exclusão lógica que preserva o histórico, transação única na criação do pedido, funções `security definer` com `search_path` vazio.

Diagrama simplificado:

```
categories 1─N products 1─N product_variants (size_code)
                   │ 1─N option_groups 1─N option_values N─N(product_variants) via option_value_variant_prices
                   │ N─N option_groups compartilhados (shared_key) via product_shared_groups
option_values 1─N option_value_size_prices (valor por código de tamanho)
categories ── section_type 'options' + shared_group_id → seção informativa (ex.: tabela de bordas)
                   │ 1─N promotions, combo_items
orders 1─N order_items 1─N order_item_options
orders 1─N order_status_history, order_adjustments ; orders N─1 auth.users (opcional)
auth.users 1─1 profiles, user_roles ; 1─N customer_addresses, favorites
```

## Segurança

- **RLS em todas as tabelas.** Visitante lê apenas catálogo ativo e configurações públicas. Cliente lê só os próprios pedidos/endereços/favoritos. Equipe lê pedidos; somente gerente/admin altera catálogo e configurações.
- **Pedidos** não podem ser criados nem alterados diretamente pelo navegador: criação só pelo servidor (chave secreta) e mudanças só por funções que conferem papel e regras.
- **Preços**: sempre recalculados no servidor; valores do navegador são ignorados.
- **Pedidos de visitantes**: código legível + token HMAC; sem o token o pedido não abre (o código sozinho não dá acesso).
- **Painel**: `proxy.ts` redireciona quem não está logado (otimista); cada página, Server Action e rota confere papel no servidor (`requireStaff`) e o banco confere de novo (RLS/funções).
- **Chave secreta** só em `lib/supabase/admin.ts` (marcado `server-only`), usada apenas após validação.
- **Uploads**: só gerente/admin (políticas do Storage), tipos e tamanho limitados no bucket, assinatura do arquivo conferida no navegador, URL salva somente se for do bucket do projeto.
- **Proteções extras**: verificação de origem nas rotas `POST`, limite de pedidos por IP (hash), cabeçalhos de segurança (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, HSTS), CSV com proteção contra fórmulas, mensagens de erro sem detalhes internos, logs sem dados pessoais.
- **Login**: Supabase Auth (senhas com hash bcrypt, limites de tentativas do próprio serviço).

## Horários (`lib/business-hours`)

- Fuso `America/Fortaleza`.
- Turnos almoço/noite por dia da semana; almoço sem horário de fim fica aberto até ser encerrado manualmente (e termina automaticamente quando o turno da noite começa).
- Exceções por data (feriado, folga, horário especial).
- “Encerrar almoço de hoje” grava a data em `lunch_closed_on`; no dia seguinte volta sozinho.
- Suspensão manual e pausa temporária bloqueiam novos pedidos mesmo dentro do horário.
- **Regra para pedido iniciado antes do fechamento e enviado depois:** vale o horário em que o **servidor recebe** o pedido. A tolerância (`order_grace_minutes`, padrão 0, máximo 60) permite aceitar envios até X minutos após o fechamento. Fora disso, o pedido é recusado com o próximo horário de abertura, e o carrinho continua salvo.
- Produtos podem ser restritos a um turno (`shift_restriction`), validado no servidor.

## Cache e desempenho

- Next.js 16 com **Cache Components**: cardápio, configurações, banners e avaliações são lidos com `'use cache'` (vida curta) e **invalidados por tag** sempre que o painel altera algo (`updateTag`).
- O status “aberto/fechado” é calculado a cada requisição (não fica em cache).
- Imagens via `next/image` (AVIF/WebP, tamanhos responsivos, `lazy` por padrão, espaço reservado com `aspect-ratio`). Fotos enviadas pelo painel são reduzidas para no máximo 1600 px em WebP.
- Mapa (Leaflet) carregado só quando o cliente escolhe entrega e abre o mapa.

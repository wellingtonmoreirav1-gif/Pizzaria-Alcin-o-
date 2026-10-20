# Testes

## Como rodar

```bash
npm test                 # unidade (Vitest)
npm run db:local         # ambiente local: PostgreSQL + Supabase Auth + PostgREST (porta 54321)
npm run test:db          # banco: RLS, papéis, pedidos, relatórios (recria o esquema local)
npm run build            # build de produção (com .env.local apontando para o ambiente local)
npm run test:e2e         # ponta a ponta (Playwright) no build de produção, porta 3100
```

### Ambiente local que imita o Supabase

`scripts/local-supabase/start.sh` sobe, sem Docker:

- PostgreSQL 15+ instalado na máquina (porta 54322) com os papéis do Supabase (`anon`, `authenticated`, `service_role`, `authenticator`) e esquemas mínimos de `auth`/`storage`;
- **Supabase Auth (GoTrue)** — binário oficial `supabase/auth` (variável `GOTRUE_BIN`, padrão `/opt/svc/auth/auth`);
- **PostgREST** — binário oficial (variável `POSTGREST_BIN`, padrão `/opt/svc/postgrest`);
- um gateway em Node que expõe `/auth/v1` e `/rest/v1` em `http://127.0.0.1:54321`, como o Supabase.

Gere as chaves locais com `node scripts/local-supabase/keys.mjs` e coloque no `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon gerada>
SUPABASE_SECRET_KEY=<service gerada>
ORDER_ACCESS_SECRET=qualquer-texto-local-com-32-ou-mais-caracteres
```

Os testes de ponta a ponta usam o Chromium do Playwright (ou `PW_CHROMIUM_PATH`). O *global setup* recria o banco com os dados de exemplo, cria usuários de teste (admin, gerente, atendente, cliente) e deixa a loja “aberta o dia todo” para não depender do relógio.

Limitações do ambiente local: não há serviço **Storage** (o envio real de imagens precisa ser verificado no Supabase da nuvem; as **políticas** do Storage são testadas no banco), nem e-mail real do Auth (confirmação automática ligada), e o ambiente de testes não acessa a internet (as imagens do mapa não carregam, mas a interação com o mapa é testada).

## Resultado da última execução

- Unidade + banco (Vitest): **80 testes, todos passando**.
- Ponta a ponta (Playwright, perfil Pixel 7, build de produção): **22 testes, todos passando**.

## Cobertura dos itens exigidos

| # | Item | Onde é testado |
|---|---|---|
| 1 | Cadastro e autenticação | `e2e/account.spec.ts` (cadastro, login, senha com hash bcrypt), `e2e/admin.spec.ts` (login da equipe) |
| 2 | Proteção das rotas administrativas | `e2e/admin.spec.ts` (sem login → /admin/login; cliente → sem permissão) |
| 3 | Permissões por função | `db/security.test.ts` (RLS, funções admin_*), `e2e/admin.spec.ts` (atendente sem cardápio/relatórios/CSV) |
| 4 | Cadastro e edição de produtos | `e2e/admin.spec.ts` (criar rascunho, publicar, aparece no site, auditoria) |
| 5 | Upload de imagens | `unit/uploads.test.ts` (tipo real do arquivo, tamanho, URL permitida, caminho seguro), `db/security.test.ts` (políticas do Storage). **Envio real: verificar na nuvem** |
| 6 | Personalização de pizzas | `unit/pricing.test.ts`, `e2e/storefront.spec.ts` (montagem) |
| 7 | Cálculo de preços | `unit/pricing.test.ts`, `unit/money-phone.test.ts` |
| 8 | Promoções | `unit/pricing.test.ts`, `e2e/storefront.spec.ts` (carrinho e filtro) |
| 9 | Carrinho | `e2e/storefront.spec.ts` (quantidade, remover, persistência) |
| 10 | Checkout | `e2e/storefront.spec.ts` (entrega, retirada), `unit/validation-token.test.ts` |
| 11 | Validação de preços no servidor | `e2e/storefront.spec.ts` (valores do navegador ignorados; PRICE_CHANGED) |
| 12 | Registro do pedido no banco | `db/orders.test.ts`, `e2e/storefront.spec.ts` |
| 13 | Prevenção de pedidos duplicados | `db/orders.test.ts` (mesma chave, concorrência), `e2e` (clique duplo, nova tentativa após falha) |
| 14 | Mensagem do WhatsApp | `unit/whatsapp.test.ts`, `e2e/storefront.spec.ts` (link e texto) |
| 15 | Falha ao abrir o WhatsApp | `e2e/storefront.spec.ts` (copiar mensagem; pedido já registrado) |
| 16 | Endereço manual | `e2e/storefront.spec.ts` (GPS negado) |
| 17 | Permissão e recusa do GPS | `e2e/storefront.spec.ts` |
| 18 | Ajuste manual do marcador | `e2e/storefront.spec.ts` (toque no mapa reposiciona; origem `map_pin`) |
| 19 | Taxa pendente | `e2e/storefront.spec.ts`, `db/orders.test.ts` |
| 20 | Confirmação da taxa | `db/orders.test.ts` (auditoria, aprovação, bloqueio pós-aceite), `e2e/admin.spec.ts` |
| 21 | Horários | `unit/business-hours.test.ts` |
| 22 | Encerramento antecipado do almoço | `unit/business-hours.test.ts`, `db/orders.test.ts`, `e2e` (painel e API) |
| 23 | Suspensão manual | `unit/business-hours.test.ts`, `e2e/storefront.spec.ts` (loja fechada), `e2e/admin.spec.ts` (pausa) |
| 24 | Histórico de pedidos | `e2e/account.spec.ts` |
| 25 | Repetição de pedidos | `e2e/account.spec.ts` (usa preço atual) |
| 26 | Relatórios | `db/reports.test.ts`, `unit/reports.test.ts`, `e2e/admin.spec.ts` (valores reais + CSV) |
| 27 | Acesso a dados de clientes | `db/security.test.ts` (pedidos, perfis, endereços, avaliações) |
| 28 | Layout móvel | `e2e/storefront.spec.ts` (sem rolagem horizontal em 5 páginas, perfil Pixel 7) |
| 29 | Acessibilidade essencial | `e2e/storefront.spec.ts` (axe WCAG 2 A/AA, sem violações graves) |
| 30 | Erros de rede e banco | `e2e/storefront.spec.ts` (sem conexão e 503: mensagem clara, carrinho mantido, sem duplicar) |

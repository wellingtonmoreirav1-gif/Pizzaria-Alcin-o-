# Testes

## No GitHub (CI)

Cada Pull Request roda o workflow **CI** (`.github/workflows/ci.yml`):

| Job | O que roda |
|---|---|
| Qualidade | Biome, ESLint, TypeScript, Knip, Arch-Contract (veja [QUALIDADE.md](QUALIDADE.md)) |
| Mensagens de commit | Commitlint nos commits do PR |
| Testes unitários + cobertura | `npm run test:coverage` → Codecov (flag `unitarios`) |
| Integração + ponta a ponta | sobe o mesmo ambiente local abaixo (PostgreSQL + Supabase Auth + PostgREST, binários copiados das imagens oficiais), roda `tests/db` com cobertura (Codecov, flag `integracao`), faz o build de produção e roda o Playwright. Se falhar, o relatório fica no artefato `playwright-report` |

O teste de mutação (Stryker) roda toda segunda-feira e sob demanda (workflow **Teste de mutação**).

## Como rodar

```bash
npm test                 # unidade (Vitest)
npm run db:local         # ambiente local: PostgreSQL + Supabase Auth + PostgREST (porta 54321)
npm run test:db          # banco: RLS, papéis, pedidos, relatórios (recria o esquema local)
bash scripts/local-supabase/apply-migrations.sh   # banco no estado inicial ANTES do build
npm run build            # build de produção (com .env.local apontando para o ambiente local)
npm run test:e2e         # ponta a ponta (Playwright) no build de produção, porta 3100
```

> O build guarda o cardápio em cache por alguns minutos (como em produção). Por isso o banco deve estar no estado inicial **antes** do `npm run build`: o *global setup* recria o banco, e o cardápio oficial usa ids estáveis (derivados do slug), então o cache do build continua válido.

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

- Unidade + banco (Vitest): **95 testes, todos passando**.
- Ponta a ponta (Playwright, perfil Pixel 7, build de produção): **31 testes, todos passando** (inclui os 9 do cardápio oficial).

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

## Cardápio oficial (15 verificações obrigatórias)

| # | Verificação | Onde é testado |
|---|---|---|
| 1 | Todos os produtos aparecem | `db/menu.test.ts` (40 produtos, 12 categorias, ordem), `e2e/menu.spec.ts` (cada seção do cardápio) |
| 2 | Preços corretos | `db/menu.test.ts` (todos os valores), `e2e/menu.spec.ts` (tamanhos da pizza) |
| 3 | Tamanhos alteram o preço | `unit/menu-pricing.test.ts`, `e2e/menu.spec.ts` (P, F, lasanha M/G) |
| 4 | Borda soma o valor do tamanho | `unit/menu-pricing.test.ts` (G + Catupiry = 66,00; P + Requeijão = 29,00; F + Catupiry = 95,00), `e2e/menu.spec.ts` |
| 5 | Carrinho calcula certo | `unit/menu-pricing.test.ts` ((50 + 16) × 2 = 132,00), `e2e/menu.spec.ts` (unitário, subtotal e total) |
| 6 | Alterar quantidade | `e2e/menu.spec.ts` |
| 7 | Remover item | `e2e/menu.spec.ts` |
| 8 | Beirute serve até 3 pessoas | `db/menu.test.ts`, `e2e/menu.spec.ts` |
| 9 | Pratos servem 2 pessoas | `db/menu.test.ts`, `e2e/menu.spec.ts` |
| 10 | Lasanha com 3 tamanhos e escolha obrigatória | `db/menu.test.ts`, `unit/menu-pricing.test.ts` (VARIANT_REQUIRED), `e2e/menu.spec.ts` |
| 11 | Carrinho mantido ao recarregar | `e2e/menu.spec.ts` |
| 12 | Telas pequenas | `e2e/menu.spec.ts` (320 px sem rolagem horizontal) |
| 13 | Pedido continua funcionando e resumo do WhatsApp correto | `e2e/menu.spec.ts` (retirada com pizza G + borda, total 132,00, texto da mensagem, opção gravada) |
| 14 | Sem duplicações | `db/menu.test.ts` (reaplicar o cardápio não duplica), `e2e/menu.spec.ts` (nomes únicos; clique duplo gera 1 pedido) |
| 15 | Administrador altera preço sem mexer no código | `e2e/menu.spec.ts` (Conferência de preços com recusa de R$ 0,00, tabela de bordas, página Fotos e logo), `db/menu.test.ts` (só gerente/admin; auditoria; quem confirmou gravado pelo banco) |

Também:
- Bebida sem preço não pode ser pedida — nem pela tela nem pela API — e aparece como “Preço a definir” (`e2e/menu.spec.ts`, `unit/menu-pricing.test.ts`).
- Pizzas especiais liberadas (G + Catupiry = 71,00) e molhos grátis selecionáveis (`e2e/menu.spec.ts`).
- Bebidas cadastradas sem duplicar e sem mexer em preço já conferido; limpeza dos dados de exemplo só remove itens de demonstração; reaplicar o cardápio não desfaz conferências (`db/menu.test.ts`).

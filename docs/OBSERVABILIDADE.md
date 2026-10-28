# Observabilidade

Como saber quando algo quebra no site ou no painel, e por quê. Issue: #4.

## Resumo

| Serviço | O que mostra | Como liga | Onde fica no código |
|---|---|---|---|
| **OpenTelemetry** | base de tudo: cada requisição vira um *trace* (tempo de cada página, consulta ao banco, chamada externa) | automático quando algum destino abaixo está configurado | `instrumentation.ts`, `lib/observability/otel.ts` |
| **Datadog** | traces no APM do Datadog | `DD_API_KEY` (+ `DD_SITE`) | `lib/observability/config.ts` |
| **New Relic** | traces no APM do New Relic | `NEW_RELIC_LICENSE_KEY` | `lib/observability/config.ts` |
| **Sentry** | erros do servidor e do navegador, com aviso por e-mail | `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` | `instrumentation.ts`, `instrumentation-client.ts`, `app/error.tsx`, `app/global-error.tsx` |

**Tudo vem desligado.** Sem as variáveis, nenhum desses pacotes é carregado e nenhuma chamada externa é feita. Liga-se um, dois ou todos, independentemente.

## Como ligar (Vercel → Project → Settings → Environment Variables)

1. **Sentry** (plano gratuito atende o início): crie um projeto *Next.js* em sentry.io, copie o DSN e cadastre `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` com o mesmo valor. Opcional: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` para enviar os *source maps* no build.
2. **New Relic** (plano gratuito com cota mensal de dados): em *API Keys*, copie uma *License key* e cadastre `NEW_RELIC_LICENSE_KEY`. Conta na Europa: `NEW_RELIC_OTLP_ENDPOINT=https://otlp.eu01.nr-data.net`.
3. **Datadog** (APM é pago): em *Organization Settings → API Keys*, copie a chave e cadastre `DD_API_KEY`. Se a conta não for do site US1, informe `DD_SITE` (ex.: `us5.datadoghq.com`). O envio usa o endpoint OTLP do Datadog para Vercel (`vercel.integrations.otlp.<site>`), sem instalar agente.
4. **Outro coletor OpenTelemetry** (Grafana Cloud, Honeycomb, Collector próprio): `OTEL_EXPORTER_OTLP_ENDPOINT` e `OTEL_EXPORTER_OTLP_HEADERS`.
5. Faça um novo deploy (as variáveis `NEXT_PUBLIC_*` entram no build).

Para reduzir volume (e custo) com muito acesso: `OTEL_TRACES_SAMPLE_RATIO=0.2` rastreia 20% das requisições.

## Privacidade (LGPD)

Antes de qualquer envio, `lib/observability/scrub.ts`:

- troca toda *query string* de URLs por `?[removido]` — o link do pedido leva o token de acesso em `?t=…`, e consultas ao banco podem levar telefone;
- apaga campos com nome de dado pessoal ou segredo (telefone, e-mail, nome, endereço, CPF, token, senha, cookie, authorization);
- no Sentry: `sendDefaultPii: false`, sem cookies, sem corpo das requisições, sem dados do usuário, sem gravação de sessão (*Replay*).

Testes: `tests/unit/observability.test.ts`.

## Erros tratados

Erros que o sistema captura para mostrar uma mensagem amigável (falha ao gravar pedido, falha ao carregar o cardápio, falha em ação do painel) passam por `reportError()` (`lib/observability/report.ts`): vão para o log da Vercel e, com Sentry ligado, também para o Sentry.

## Custos

Veja `docs/CUSTOS.md` → Observabilidade.

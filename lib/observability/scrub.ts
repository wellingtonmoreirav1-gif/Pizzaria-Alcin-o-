/**
 * Limpeza de dados antes de enviar qualquer coisa a Sentry, Datadog ou New Relic.
 *
 * URLs do sistema podem levar dados sensíveis na query string: o token de
 * acompanhamento do pedido (`/pedido/ALC-…?t=…`), filtros do PostgREST com telefone
 * (`?phone=eq.5583…`), códigos do login (`/auth/callback?code=…`). Por isso toda
 * query string é trocada por `?[removido]` e campos de contato são apagados.
 */

const REDACTED = '[removido]';

/** Chaves de atributos/campos que nunca saem do servidor, mesmo sem URL. */
const SENSITIVE_KEY = /(phone|telefone|whatsapp|email|e-mail|nome|name|address|endereco|cpf|token|secret|password|senha|authorization|cookie|apikey|api-key)/i;

/** Chaves que são nomes técnicos (não dados de pessoas), mesmo contendo "name". */
const SAFE_KEYS = new Set(['service.name', 'span.name', 'next.span_name', 'http.method', 'http.request.method', 'resource.name', 'operation.name', 'db.name', 'net.peer.name', 'server.address', 'next.route', 'http.route', 'next.span_type']);

export function stripQuery(value: string): string {
  const q = value.indexOf('?');
  if (q === -1) return value;
  const hash = value.indexOf('#', q);
  return `${value.slice(0, q)}?${REDACTED}${hash === -1 ? '' : value.slice(hash)}`;
}

/** Remove query strings de qualquer texto que contenha URLs (ex.: nome do span "fetch GET https://…?x=1"). */
export function stripQueriesInText(value: string): string {
  return value.replace(/\?[^\s#"']*/g, `?${REDACTED}`);
}

type AttrValue = string | number | boolean | Array<string | number | boolean | null | undefined> | null | undefined;

/** Limpa atributos de span (OpenTelemetry) no próprio objeto. */
export function scrubAttributes(attributes: Record<string, AttrValue>): Record<string, AttrValue> {
  for (const key of Object.keys(attributes)) {
    const value = attributes[key];
    if (!SAFE_KEYS.has(key) && SENSITIVE_KEY.test(key)) {
      attributes[key] = REDACTED;
    } else if (typeof value === 'string' && value.includes('?')) {
      attributes[key] = stripQueriesInText(value);
    }
  }
  return attributes;
}

interface SentryLikeEvent {
  request?: { url?: string; query_string?: unknown; cookies?: unknown; headers?: Record<string, string>; data?: unknown };
  user?: unknown;
  breadcrumbs?: Array<SentryLikeBreadcrumb>;
}

interface SentryLikeBreadcrumb {
  message?: string;
  data?: Record<string, unknown>;
}

/** Limpa um evento do Sentry (erro) antes do envio. */
export function scrubSentryEvent<E extends SentryLikeEvent>(event: E): E {
  if (event.request) {
    if (event.request.url) event.request.url = stripQuery(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (SENSITIVE_KEY.test(key)) event.request.headers[key] = REDACTED;
        else if (key.toLowerCase() === 'referer') event.request.headers[key] = stripQuery(event.request.headers[key] ?? '');
      }
    }
  }
  delete event.user;
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  return event;
}

/** Limpa um "rastro" do Sentry (navegação, fetch, console) antes do envio. */
export function scrubBreadcrumb<B extends SentryLikeBreadcrumb>(breadcrumb: B): B {
  if (breadcrumb.message) breadcrumb.message = stripQueriesInText(breadcrumb.message);
  if (breadcrumb.data) {
    for (const key of Object.keys(breadcrumb.data)) {
      const value = breadcrumb.data[key];
      if (SENSITIVE_KEY.test(key)) breadcrumb.data[key] = REDACTED;
      else if (typeof value === 'string' && value.includes('?')) breadcrumb.data[key] = stripQueriesInText(value);
    }
  }
  return breadcrumb;
}

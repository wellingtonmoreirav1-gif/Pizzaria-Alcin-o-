/**
 * Quais serviços de observabilidade estão ligados, a partir das variáveis de ambiente.
 * Sem variável = serviço desligado (nenhuma chamada externa, custo zero).
 * Veja docs/OBSERVABILIDADE.md.
 */

export const SERVICE_NAME = 'alcinao-pedidos';

type Env = Record<string, string | undefined>;

export interface TraceDestination {
  name: 'datadog' | 'newrelic' | 'otlp';
  url: string;
  headers: Record<string, string>;
}

function trimmed(env: Env, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

/** `chave=valor,chave2=valor2` (formato do OTEL_EXPORTER_OTLP_HEADERS). */
export function parseHeaders(raw: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!raw) return headers;
  for (const pair of raw.split(',')) {
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const key = pair.slice(0, eq).trim();
    const encoded = pair.slice(eq + 1).trim();
    let value = encoded;
    try {
      value = decodeURIComponent(encoded);
    } catch {
      // valor sem codificação: usa como veio
    }
    if (key && value) headers[key] = value;
  }
  return headers;
}

function withTracesPath(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return base.endsWith('/v1/traces') ? base : `${base}/v1/traces`;
}

/**
 * Destinos dos traces (OpenTelemetry → OTLP/HTTP protobuf).
 * - Datadog: endpoint OTLP para Vercel (`vercel.integrations.otlp.<site>`), header `dd-api-key`.
 * - New Relic: `otlp.nr-data.net` (ou `otlp.eu01.nr-data.net` na UE), header `api-key`.
 * - OTLP genérico: qualquer coletor (Grafana, Honeycomb, Collector próprio…).
 */
export function traceDestinations(env: Env): TraceDestination[] {
  const destinations: TraceDestination[] = [];

  const ddKey = trimmed(env, 'DD_API_KEY');
  if (ddKey) {
    const site = trimmed(env, 'DD_SITE') ?? 'datadoghq.com';
    const url = trimmed(env, 'DD_OTLP_TRACES_ENDPOINT') ?? `https://vercel.integrations.otlp.${site}/v1/traces`;
    destinations.push({ name: 'datadog', url, headers: { 'dd-api-key': ddKey } });
  }

  const nrKey = trimmed(env, 'NEW_RELIC_LICENSE_KEY');
  if (nrKey) {
    const endpoint = trimmed(env, 'NEW_RELIC_OTLP_ENDPOINT') ?? 'https://otlp.nr-data.net';
    destinations.push({ name: 'newrelic', url: withTracesPath(endpoint), headers: { 'api-key': nrKey } });
  }

  const otlpTraces = trimmed(env, 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT');
  const otlpBase = trimmed(env, 'OTEL_EXPORTER_OTLP_ENDPOINT');
  if (otlpTraces || otlpBase) {
    destinations.push({
      name: 'otlp',
      url: otlpTraces ?? withTracesPath(otlpBase!),
      headers: parseHeaders(trimmed(env, 'OTEL_EXPORTER_OTLP_TRACES_HEADERS') ?? trimmed(env, 'OTEL_EXPORTER_OTLP_HEADERS')),
    });
  }

  return destinations;
}

/** Fração das requisições rastreadas (0 a 1). Padrão: todas. */
export function traceSampleRatio(env: Env): number {
  const raw = Number(trimmed(env, 'OTEL_TRACES_SAMPLE_RATIO') ?? '1');
  if (!Number.isFinite(raw)) return 1;
  return Math.min(1, Math.max(0, raw));
}

export function deploymentEnvironment(env: Env): string {
  return trimmed(env, 'VERCEL_ENV') ?? trimmed(env, 'NEXT_PUBLIC_VERCEL_ENV') ?? env.NODE_ENV ?? 'development';
}

export function release(env: Env): string | undefined {
  return trimmed(env, 'VERCEL_GIT_COMMIT_SHA') ?? trimmed(env, 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA');
}

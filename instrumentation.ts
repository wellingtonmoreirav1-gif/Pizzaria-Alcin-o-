import type { Instrumentation } from 'next';

/**
 * Observabilidade do servidor (veja docs/OBSERVABILIDADE.md). Cada serviço só liga com
 * a variável de ambiente dele: SENTRY_DSN, DD_API_KEY, NEW_RELIC_LICENSE_KEY ou
 * OTEL_EXPORTER_OTLP_ENDPOINT. Sem nenhuma, nada é carregado.
 */
export async function register() {
  const { registerTracing } = await import('./lib/observability/otel');
  registerTracing();

  const dsn = process.env.SENTRY_DSN?.trim();
  if (dsn) {
    const Sentry = await import('@sentry/nextjs');
    const { sentryBaseOptions } = await import('./lib/observability/sentry-options');
    // O OpenTelemetry fica com o @vercel/otel; o Sentry não registra outro provedor.
    Sentry.init({ ...sentryBaseOptions(dsn, process.env), enableOpenTelemetrySetup: false });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN?.trim()) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};

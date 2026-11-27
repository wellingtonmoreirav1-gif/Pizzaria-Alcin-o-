import { deploymentEnvironment, release } from './config';
import { scrubBreadcrumb, scrubSentryEvent } from './scrub';

/**
 * Opções comuns do Sentry (servidor e navegador). Só erros: os traces de desempenho
 * vão para Datadog/New Relic pelo OpenTelemetry. Nada de dados pessoais.
 */
export function sentryBaseOptions(dsn: string, env: Record<string, string | undefined>) {
  return {
    dsn,
    environment: deploymentEnvironment(env),
    release: release(env),
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}

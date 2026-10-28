/**
 * Registra um erro tratado (que não chega ao onRequestError porque foi capturado
 * para mostrar uma mensagem amigável). Sem SENTRY_DSN, só escreve no log.
 */
export function reportError(scope: string, error: unknown, extra?: Record<string, string | number | undefined>): void {
  const message = error instanceof Error ? error.message : error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);
  console.error(`[${scope}]`, message.slice(0, 300), extra ?? '');
  const dsn = typeof window === 'undefined' ? process.env.SENTRY_DSN : process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn?.trim()) return;
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.captureException(error instanceof Error ? error : new Error(message), { tags: { scope }, extra });
  });
}

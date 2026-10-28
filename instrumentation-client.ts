/**
 * Erros do navegador no Sentry, só quando NEXT_PUBLIC_SENTRY_DSN está definida no build.
 * O SDK é carregado depois da página (import dinâmico) para não pesar no primeiro acesso.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  void Promise.all([import('@sentry/nextjs'), import('./lib/observability/sentry-options')]).then(([Sentry, { sentryBaseOptions }]) => {
    Sentry.init({
      ...sentryBaseOptions(dsn, {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      }),
      // Sem gravação de sessão (privacidade e custo) e sem traces de desempenho no navegador.
      integrations: (defaults) => defaults.filter((i) => i.name !== 'Replay'),
    });
  });
}

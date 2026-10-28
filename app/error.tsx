'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/observability/report';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError('pagina', error, { digest: error.digest });
  }, [error]);
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="font-display text-3xl font-semibold">Algo deu errado</h1>
        <p className="text-muted">Tivemos um problema para carregar esta página. Seu carrinho continua salvo neste aparelho.</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center rounded-2xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}

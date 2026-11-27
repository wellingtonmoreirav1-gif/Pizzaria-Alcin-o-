'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/observability/report';

/** Erro no layout raiz: substitui a página inteira (sem os estilos globais). */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const digest = typeof error === 'object' && error !== null && 'digest' in error ? String(error.digest) : undefined;
    reportError('layout', error, { digest });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#380507', color: '#fff', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '0 16px' }}>
        <title>Algo deu errado — Alcinão</title>
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>Algo deu errado</h1>
          <p style={{ margin: '0 0 24px', opacity: 0.85 }}>Tivemos um problema para carregar o site. Seu carrinho continua salvo neste aparelho.</p>
          <button type="button" onClick={() => retry()} style={{ height: 48, padding: '0 24px', borderRadius: 16, border: 0, background: '#FFC72C', color: '#1a1a1a', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}

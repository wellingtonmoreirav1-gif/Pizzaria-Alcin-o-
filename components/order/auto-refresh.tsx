'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Atualiza o status do pedido periodicamente enquanto ele não foi encerrado. */
export function AutoRefresh({ seconds = 45 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

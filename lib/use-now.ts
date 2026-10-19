'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}
const getMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

/**
 * Hora atual (atualizada a cada minuto) no navegador. Durante a renderização no
 * servidor usa o instante em que os dados foram carregados, evitando diferenças
 * de hidratação.
 */
export function useNow(serverFallbackIso: string): Date {
  const ms = useSyncExternalStore(subscribe, getMinute, () => Date.parse(serverFallbackIso));
  return new Date(ms);
}

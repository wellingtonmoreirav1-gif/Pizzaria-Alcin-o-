'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/** Pedidos feitos como visitante neste aparelho (links de acompanhamento salvos localmente). */
export function RecentGuestOrders() {
  const [orders, setOrders] = useState<{ code: string; token: string; createdAt: string }[]>([]);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lido do localStorage após hidratar
      setOrders(JSON.parse(localStorage.getItem('alcinao:orders') ?? '[]'));
    } catch {
      setOrders([]);
    }
  }, []);
  if (orders.length === 0) return null;
  return (
    <section className="rounded-[var(--radius-card)] border border-line p-6">
      <h2 className="font-display text-xl font-semibold">Pedidos feitos neste aparelho</h2>
      <ul className="mt-3 divide-y divide-line">
        {orders.map((o) => (
          <li key={o.code} className="flex items-center justify-between py-3 text-sm">
            <span>
              <strong>#{o.code}</strong>{' '}
              <span className="text-muted">{new Date(o.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </span>
            <Link href={`/pedido/${o.code}?t=${encodeURIComponent(o.token)}`} className="font-semibold text-danger underline">
              Acompanhar
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

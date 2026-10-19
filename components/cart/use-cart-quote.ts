'use client';

import { useEffect, useRef, useState } from 'react';
import type { Cents } from '@/lib/money';
import type { PricedLine, PricingError } from '@/lib/pricing';
import type { StoreStatus } from '@/lib/business-hours';
import { toSelection, useCart } from './cart-context';

export interface QuoteState {
  loading: boolean;
  error: string | null;
  lineErrors: Record<string, PricingError>;
  totals: { grossSubtotal: Cents; discountTotal: Cents; itemsSubtotal: Cents } | null;
  status: StoreStatus | null;
  pricesChanged: boolean;
}

/**
 * Confere o carrinho no servidor (preços, disponibilidade, turno) sempre que ele
 * muda. Atualiza os preços exibidos e aponta itens que precisam de revisão.
 */
export function useCartQuote(enabled = true) {
  const { lines, hydrated, applyPrices } = useCart();
  const [state, setState] = useState<QuoteState>({
    loading: false,
    error: null,
    lineErrors: {},
    totals: null,
    status: null,
    pricesChanged: false,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const signature = JSON.stringify(lines.map((l) => [l.lineId, l.productId, l.variantId, l.options, l.quantity, l.notes ?? '']));
  const linesRef = useRef(lines);
  linesRef.current = lines;

  useEffect(() => {
    if (!enabled || !hydrated) return;
    const current = linesRef.current;
    if (current.length === 0) {
      setState((s) => ({ ...s, loading: false, lineErrors: {}, totals: { grossSubtotal: 0, discountTotal: 0, itemsSubtotal: 0 } }));
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: current.map(toSelection) }),
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          ok: boolean;
          message?: string;
          lines?: { index: number; ok: boolean; line?: PricedLine; error?: PricingError }[];
          totals?: QuoteState['totals'];
          status?: StoreStatus;
        };
        if (!res.ok || !data.ok || !data.lines) throw new Error(data.message ?? 'Falha ao conferir o carrinho.');
        const lineErrors: Record<string, PricingError> = {};
        const prices: Record<string, { unitPrice: Cents; unitRegular: Cents; summary: string[] }> = {};
        let changed = false;
        for (const q of data.lines) {
          const cartLine = current[q.index];
          if (!cartLine) continue;
          if (q.ok && q.line) {
            if (q.line.unitPrice !== cartLine.unitPrice) changed = true;
            prices[cartLine.lineId] = { unitPrice: q.line.unitPrice, unitRegular: q.line.unitRegular, summary: q.line.summary };
          } else if (q.error) {
            lineErrors[cartLine.lineId] = q.error;
          }
        }
        applyPrices(prices);
        setState({ loading: false, error: null, lineErrors, totals: data.totals ?? null, status: data.status ?? null, pricesChanged: changed });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: error instanceof Error && error.message !== 'Failed to fetch' ? error.message : 'Sem conexão. Os valores serão conferidos novamente.',
        }));
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, hydrated, enabled, reloadKey]);

  return { ...state, reload: () => setReloadKey((k) => k + 1) };
}

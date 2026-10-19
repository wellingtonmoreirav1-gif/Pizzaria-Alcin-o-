'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { Cents } from '@/lib/money';
import type { LineSelection } from '@/types/catalog';

export interface CartLine extends LineSelection {
  lineId: string;
  slug: string;
  name: string;
  variantName: string | null;
  summary: string[];
  imageUrl: string | null;
  /** Último preço conhecido (atualizado pelo servidor sempre que o carrinho é conferido). */
  unitPrice: Cents;
  unitRegular: Cents;
  maxQuantity: number;
}

interface CartState {
  lines: CartLine[];
}

type Action =
  | { type: 'hydrate'; lines: CartLine[] }
  | { type: 'add'; line: CartLine }
  | { type: 'replace'; lineId: string; line: CartLine }
  | { type: 'quantity'; lineId: string; quantity: number }
  | { type: 'remove'; lineId: string }
  | { type: 'prices'; prices: Record<string, { unitPrice: Cents; unitRegular: Cents; summary: string[] }> }
  | { type: 'clear' };

const STORAGE_KEY = 'alcinao:cart:v1';

/** Dois itens são "iguais" quando produto, tamanho, opções e observação coincidem. */
export function sameSelection(a: LineSelection, b: LineSelection): boolean {
  if (a.productId !== b.productId || a.variantId !== b.variantId || (a.notes ?? '') !== (b.notes ?? '')) return false;
  const keys = new Set([...Object.keys(a.options), ...Object.keys(b.options)]);
  for (const key of keys) {
    const x = a.options[key] ?? [];
    const y = b.options[key] ?? [];
    if (x.length !== y.length || x.some((v, i) => v !== y[i])) return false;
  }
  return true;
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'hydrate':
      return { lines: action.lines };
    case 'add': {
      const existing = state.lines.find((l) => sameSelection(l, action.line));
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId
              ? { ...l, quantity: Math.min(l.maxQuantity, l.quantity + action.line.quantity), unitPrice: action.line.unitPrice, unitRegular: action.line.unitRegular }
              : l,
          ),
        };
      }
      return { lines: [...state.lines, action.line] };
    }
    case 'replace':
      return { lines: state.lines.map((l) => (l.lineId === action.lineId ? { ...action.line, lineId: action.lineId } : l)) };
    case 'quantity':
      return {
        lines: state.lines.map((l) =>
          l.lineId === action.lineId ? { ...l, quantity: Math.max(1, Math.min(l.maxQuantity, action.quantity)) } : l,
        ),
      };
    case 'remove':
      return { lines: state.lines.filter((l) => l.lineId !== action.lineId) };
    case 'prices':
      return {
        lines: state.lines.map((l) => {
          const p = action.prices[l.lineId];
          return p ? { ...l, ...p } : l;
        }),
      };
    case 'clear':
      return { lines: [] };
  }
}

interface CartContextValue {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  estimatedTotal: Cents;
  add: (line: Omit<CartLine, 'lineId'>) => void;
  replace: (lineId: string, line: Omit<CartLine, 'lineId'>) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  applyPrices: (prices: Record<string, { unitPrice: Cents; unitRegular: Cents; summary: string[] }>) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  lastAddedAt: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [] });
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAddedAt, setLastAddedAt] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { lines?: CartLine[] };
        if (Array.isArray(parsed.lines)) dispatch({ type: 'hydrate', lines: parsed.lines.slice(0, 50) });
      }
    } catch {
      // Armazenamento indisponível (modo privado): o carrinho funciona só nesta aba.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines: state.lines }));
    } catch {
      // ignorado
    }
  }, [state.lines, hydrated]);

  const add = useCallback((line: Omit<CartLine, 'lineId'>) => {
    dispatch({ type: 'add', line: { ...line, lineId: newId() } });
    setLastAddedAt(Date.now());
  }, []);
  const replace = useCallback((lineId: string, line: Omit<CartLine, 'lineId'>) => {
    dispatch({ type: 'replace', lineId, line: { ...line, lineId } });
  }, []);
  const setQuantity = useCallback((lineId: string, quantity: number) => dispatch({ type: 'quantity', lineId, quantity }), []);
  const remove = useCallback((lineId: string) => dispatch({ type: 'remove', lineId }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const applyPrices = useCallback(
    (prices: Record<string, { unitPrice: Cents; unitRegular: Cents; summary: string[] }>) => dispatch({ type: 'prices', prices }),
    [],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      hydrated,
      count: state.lines.reduce((n, l) => n + l.quantity, 0),
      estimatedTotal: state.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0),
      add,
      replace,
      setQuantity,
      remove,
      clear,
      applyPrices,
      drawerOpen,
      setDrawerOpen,
      lastAddedAt,
    }),
    [state.lines, hydrated, add, replace, setQuantity, remove, clear, applyPrices, drawerOpen, lastAddedAt],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de CartProvider');
  return ctx;
}

export function toSelection(line: CartLine): LineSelection {
  return { productId: line.productId, variantId: line.variantId, options: line.options, quantity: line.quantity, notes: line.notes ?? undefined };
}

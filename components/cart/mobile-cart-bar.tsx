'use client';

import { usePathname } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { formatBRL } from '@/lib/money';
import { useCart } from './cart-context';

/** Barra fixa no celular para o carrinho ficar sempre ao alcance do polegar. */
export function MobileCartBar() {
  const { count, estimatedTotal, hydrated, setDrawerOpen } = useCart();
  const pathname = usePathname();
  if (!hydrated || count === 0 || pathname.startsWith('/checkout') || pathname.startsWith('/carrinho') || pathname.startsWith('/pedido')) {
    return null;
  }
  return (
    <div data-mobile-cart-bar className="fixed inset-x-0 bottom-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex h-14 w-full animate-[var(--animate-rise)] items-center gap-3 rounded-2xl bg-wine px-5 text-white shadow-[var(--shadow-float)] ring-1 ring-gold/30"
      >
        <ShoppingBag className="size-5" aria-hidden />
        <span className="font-semibold">Ver carrinho</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{count}</span>
        <span className="ml-auto font-bold tabular-nums text-gold">{formatBRL(estimatedTotal)}</span>
      </button>
    </div>
  );
}

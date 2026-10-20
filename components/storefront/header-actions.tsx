'use client';

import Link from 'next/link';
import { Heart, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/cart/cart-context';
import { useFavorites } from './favorites-context';

export function HeaderActions() {
  const { count, hydrated, setDrawerOpen, lastAddedAt } = useCart();
  const favorites = useFavorites();
  const icon = 'grid size-11 place-items-center rounded-full text-fg transition-colors hover:bg-mist';
  return (
    <div className="flex items-center gap-0.5">
      <Link href="/cardapio?buscar=1" className={icon} aria-label="Buscar no cardápio">
        <Search className="size-5" aria-hidden />
      </Link>
      <Link href="/favoritos" className={cn(icon, 'relative hidden sm:grid')} aria-label={`Favoritos (${favorites.ids.size})`}>
        <Heart className="size-5" aria-hidden />
        {favorites.ids.size > 0 ? <span className="absolute right-2 top-2 size-2 rounded-full bg-brand-600" /> : null}
      </Link>
      <Link href="/conta" className={cn(icon, 'hidden sm:grid')} aria-label="Minha conta">
        <User className="size-5" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="relative ml-1 inline-flex h-11 items-center gap-2 rounded-full bg-brand-600 pl-3.5 pr-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        aria-label={`Abrir carrinho, ${hydrated ? count : 0} ${count === 1 ? 'item' : 'itens'}`}
        data-testid="cart-button"
      >
        <ShoppingBag className="size-5" aria-hidden />
        <span key={lastAddedAt} className={cn('tabular-nums', lastAddedAt > 0 && 'animate-[var(--animate-pop)]')}>
          {hydrated ? count : 0}
        </span>
      </button>
    </div>
  );
}

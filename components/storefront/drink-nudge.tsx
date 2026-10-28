'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import type { CatalogProduct } from '@/types/catalog';
import { formatBRL } from '@/lib/money';
import { isProductOrderable, startingPrice } from '@/lib/pricing';

/** Quanto tempo a sugestão fica na tela (some antes se a pessoa fechar ou escolher). */
const VISIBLE_MS = 10_000;

/**
 * Logo depois de adicionar um lanche ou uma pizza: "Vai uma bebida gelada?" com até 3
 * bebidas que dá para pedir agora. Nunca adiciona nada sem o toque do cliente.
 */
export function DrinkNudge({ drinks, onPick, onClose }: { drinks: CatalogProduct[]; onPick: (drink: CatalogProduct) => void; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [onClose]);

  return (
    <section
      aria-labelledby="sugestao-bebida"
      className="fixed inset-x-3 bottom-[9.5rem] z-[55] animate-[var(--animate-rise)] rounded-2xl bg-surface p-4 text-fg shadow-[var(--shadow-float)] ring-1 ring-gold/40 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[24rem]"
      data-testid="drink-nudge"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="sugestao-bebida" className="font-display text-lg font-semibold">
          Vai uma bebida <span className="italic text-gold">gelada?</span>
        </h2>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-mist" aria-label="Agora não">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {drinks.map((d) => {
          const price = startingPrice(d, new Date());
          return (
            <li key={d.id} className="flex items-center gap-3 rounded-xl bg-mist p-2">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-ink-900">
                {d.imageUrl ? <Image src={d.imageUrl} alt="" fill sizes="48px" unoptimized={d.imageUrl.endsWith('.svg')} className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.name}</p>
                {price ? (
                  <p className="text-xs text-muted">
                    {d.variants.length > 1 ? 'a partir de ' : ''}
                    <span className="font-semibold tabular-nums text-gold">{formatBRL(price.current)}</span>
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onPick(d)}
                className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700"
                aria-label={`Adicionar ${d.name}`}
              >
                <Plus className="size-4" aria-hidden /> Adicionar
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Bebidas que dá para pedir agora e que ainda não estão no carrinho. */
export function availableDrinks(drinks: CatalogProduct[], inCart: Set<string>, limit: number) {
  const now = new Date();
  return drinks.filter((d) => !inCart.has(d.id) && isProductOrderable(d, now)).slice(0, limit);
}

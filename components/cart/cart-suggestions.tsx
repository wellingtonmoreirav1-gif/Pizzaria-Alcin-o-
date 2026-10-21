'use client';

import Image from 'next/image';
import { Plus } from 'lucide-react';
import type { CatalogProduct } from '@/types/catalog';
import { formatBRL } from '@/lib/money';
import { isProductOrderable, startingPrice } from '@/lib/pricing';
import { useNow } from '@/lib/use-now';
import { useProductDialog } from '@/components/storefront/product-dialog';
import { useCart } from './cart-context';

/** Bebidas sugeridas no carrinho. Nunca adiciona nada sem o cliente tocar no botão. */
export function CartSuggestions({ products, fetchedAt }: { products: CatalogProduct[]; fetchedAt: string }) {
  const now = useNow(fetchedAt);
  const { lines } = useCart();
  const dialog = useProductDialog();
  const inCart = new Set(lines.map((l) => l.productId));
  const items = products.filter((p) => !inCart.has(p.id) && isProductOrderable(p, now)).slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="sugestoes" className="rounded-2xl bg-mist p-4">
      <h3 id="sugestoes" className="font-display text-base font-semibold">
        Vai uma bebida <span className="italic text-gold">gelada?</span>
      </h3>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {items.map((p) => {
          const price = startingPrice(p, now);
          return (
            <li key={p.id} className="w-40 shrink-0 rounded-xl bg-surface p-3 shadow-sm">
              <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-lg bg-ink-900">
                {p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="160px" unoptimized={p.imageUrl.endsWith('.svg')} className="object-cover" /> : null}
              </div>
              <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
              <p className="mt-1 text-xs text-muted">
                {price ? (
                  <>
                    {p.variants.length > 1 ? 'a partir de ' : ''}
                    <span className="font-semibold tabular-nums text-gold">{formatBRL(price.current)}</span>
                  </>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => dialog.quickAdd(p, fetchedAt)}
                className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-fg text-xs font-semibold text-canvas hover:opacity-90"
                aria-label={`Adicionar ${p.name}`}
              >
                <Plus className="size-3.5" aria-hidden /> Adicionar
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

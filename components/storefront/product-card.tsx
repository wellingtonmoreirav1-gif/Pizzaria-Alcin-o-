'use client';

import Link from 'next/link';
import { Heart, Plus } from 'lucide-react';
import type { CatalogProduct } from '@/types/catalog';
import { hasActivePromotion, isProductOrderable, startingPrice, unavailableReason } from '@/lib/pricing';
import { formatBRL } from '@/lib/money';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/feedback';
import { ProductImage } from '@/components/ui/product-image';
import { useToast } from '@/components/ui/toast';
import { useFavorites } from './favorites-context';
import { needsCustomization, useProductDialog } from './product-dialog';

export function ProductCard({
  product,
  fetchedAt,
  priority,
  badge,
  className,
  headingAs: Heading = 'h3',
}: {
  product: CatalogProduct;
  fetchedAt: string;
  priority?: boolean;
  badge?: string;
  className?: string;
  /** Nível do título conforme a página (h4/h5 dentro dos catálogos da página inicial). */
  headingAs?: 'h2' | 'h3' | 'h4' | 'h5';
}) {
  const now = useNow(fetchedAt);
  const dialog = useProductDialog();
  const favorites = useFavorites();
  const toast = useToast();
  const orderable = isProductOrderable(product, now);
  const reason = unavailableReason(product, now);
  const houseSpecial = product.tags.includes('especial-da-casa');
  const starting = startingPrice(product, now);
  // Sem valor cadastrado e ainda em conferência (ex.: bebida nova): "Preço a definir", nunca "R$ 0,00".
  const price = starting && !product.priceConfirmed && starting.current === 0 ? null : starting;
  const onSale = price !== null && price.current < price.regular;
  const promo = hasActivePromotion(product, now);
  const fav = favorites.isFavorite(product.id);
  const fromLabel = product.variants.length > 1 || product.kind === 'pizza' ? 'a partir de' : null;

  return (
    <article
      className={cn(
        'group @container relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)] ring-1 ring-line transition-shadow hover:shadow-[var(--shadow-float)]',
        houseSpecial && 'ring-2 ring-gold/70',
        className,
      )}
      data-testid="product-card"
    >
      <div className="relative">
        <ProductImage src={product.imageUrl} alt={product.imageAlt} name={product.name} priority={priority} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {reason === 'soldout' ? <Badge tone="dark">Esgotado</Badge> : null}
          {reason === 'period' ? <Badge tone="dark">Fora do período</Badge> : null}
          {/* Sem valor nenhum, o "Preço a definir" embaixo já diz tudo; o selo fica para o valor de referência. */}
          {reason === 'price' && price ? <Badge className="bg-ink-950/90 text-gold-bright ring-1 ring-gold/40">Preço em conferência</Badge> : null}
          {houseSpecial ? <Badge className="bg-gold-bright text-ink-950">Especial da casa</Badge> : null}
          {orderable && promo ? <Badge tone="brand">Promoção</Badge> : null}
          {badge && orderable ? <Badge className="bg-white/95 text-ink-900">{badge}</Badge> : null}
        </div>
        <button
          type="button"
          onClick={async () => {
            const added = await favorites.toggle(product.id);
            toast(added ? 'Salvo nos favoritos' : 'Removido dos favoritos');
          }}
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-white/95 text-ink-900 shadow-sm transition-transform hover:scale-105"
          aria-pressed={fav}
          aria-label={fav ? `Remover ${product.name} dos favoritos` : `Salvar ${product.name} nos favoritos`}
        >
          <Heart className={cn('size-5', fav && 'fill-brand-600 text-brand-600')} aria-hidden />
        </button>
      </div>
      {/* Cartão estreito (2 por linha no celular): preço em cima e botão inteiro embaixo. */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 @[15rem]:p-4">
        <Heading className="font-display text-base font-semibold leading-snug @[15rem]:text-lg">
          <Link href={`/produto/${product.slug}`} className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-[''] focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:-outline-offset-3 focus-visible:after:outline-gold">
            {product.name}
          </Link>
        </Heading>
        {product.shortDescription ? <p className="line-clamp-3 text-sm text-muted">{product.shortDescription}</p> : null}
        {product.serves ? <p className="text-xs font-semibold text-gold">{product.serves}</p> : null}
        <div className="mt-auto flex flex-col gap-2 pt-3 @[15rem]:flex-row @[15rem]:items-end @[15rem]:justify-between">
          <div className="leading-tight">
            {price ? (
              <>
                {fromLabel ? <span className="block text-[0.7rem] uppercase tracking-wide text-muted">{fromLabel}</span> : null}
                {onSale ? <s className="mr-1.5 text-sm text-muted">{formatBRL(price.regular)}</s> : null}
                <span className="text-lg font-bold tabular-nums text-gold">{formatBRL(price.current)}</span>
                {reason === 'price' ? <span className="block text-[0.7rem] text-muted">valor de referência</span> : null}
              </>
            ) : (
              <span className="text-sm text-muted">Preço a definir</span>
            )}
          </div>
          <button
            type="button"
            disabled={!orderable || !price}
            onClick={() => dialog.quickAdd(product, fetchedAt)}
            // Contorno: com vários cartões, o vermelho cheio fica só para as ações principais (Pedir agora, Adicionar ao pedido, carrinho).
            className="relative z-10 inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-brand-600 px-4 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-600 hover:text-white disabled:border-line disabled:text-muted disabled:hover:bg-transparent [.on-dark_&]:border-gold-bright [.on-dark_&]:text-gold-bright [.on-dark_&]:hover:bg-gold-bright [.on-dark_&]:hover:text-ink-950"
            aria-label={
              reason === 'price' ? `Em breve: ${product.name}` : `${needsCustomization(product) ? 'Escolher opções de' : 'Adicionar'} ${product.name}`
            }
          >
            <Plus className="size-4" aria-hidden />
            {reason === 'price' ? 'Em breve' : needsCustomization(product) ? 'Escolher' : 'Adicionar'}
          </button>
        </div>
      </div>
    </article>
  );
}

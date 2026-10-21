'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogProduct } from '@/types/catalog';
import { ProductCard } from './product-card';

export function ProductRail({
  id,
  title,
  eyebrow,
  description,
  products,
  fetchedAt,
  href,
  badges,
  priority,
  tone = 'default',
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  description?: string;
  products: CatalogProduct[];
  fetchedAt: string;
  href?: string;
  badges?: Record<string, string>;
  priority?: boolean;
  /** "wine": faixa com o fundo vermelho da marca (destaques e promoções). */
  tone?: 'default' | 'wine';
}) {
  if (products.length === 0) return null;
  return (
    <section id={id} aria-labelledby={`${id ?? title}-titulo`} className={cn('scroll-mt-28 py-10 sm:py-14', tone === 'wine' && 'bg-wine text-white')}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</p> : null}
            <h2 id={`${id ?? title}-titulo`} className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            {description ? <p className="mt-1 max-w-xl text-muted">{description}</p> : null}
          </div>
          {href ? (
            <Link href={href} className={cn('hidden shrink-0 items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold sm:inline-flex', tone === 'wine' ? 'hover:bg-white/10' : 'hover:bg-mist')}>
              Ver todos <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
      <ul className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 scrollbar-none sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <li key={p.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <ProductCard product={p} fetchedAt={fetchedAt} badge={badges?.[p.id]} priority={priority && i < 2} className="h-full" />
          </li>
        ))}
      </ul>
      {href ? (
        <div className="mt-2 px-4 sm:hidden">
          <Link href={href} className={cn('inline-flex items-center gap-1 text-sm font-semibold', 'text-gold')}>
            Ver todos <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

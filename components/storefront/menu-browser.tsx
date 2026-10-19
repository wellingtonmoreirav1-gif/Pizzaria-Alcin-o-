'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Catalog } from '@/types/catalog';
import { hasActivePromotion, isProductOrderable } from '@/lib/pricing';
import { normalizeSearch, cn } from '@/lib/utils';
import { useNow } from '@/lib/use-now';
import { EmptyState } from '@/components/ui/feedback';
import { ProductCard } from './product-card';

type Collection = 'promocoes' | 'mais-vendidos' | null;

export function MenuBrowser({ catalog, bestSellerIds }: { catalog: Catalog; bestSellerIds: string[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const now = useNow(catalog.fetchedAt);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const category = params.get('categoria');
  const collection = (params.get('colecao') as Collection) ?? null;
  const [onlyAvailable, setOnlyAvailable] = useState(params.get('disponiveis') === '1');
  const [tag, setTag] = useState<string | null>(params.get('tag'));

  useEffect(() => {
    if (params.get('buscar') === '1') searchRef.current?.focus();
  }, [params]);

  function setParam(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    next.delete('buscar');
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    router.replace(`/cardapio${next.size ? `?${next}` : ''}`, { scroll: false });
  }

  const categories = catalog.categories.filter((c) => catalog.products.some((p) => p.categoryId === c.id));
  const tags = [...new Set(catalog.products.flatMap((p) => p.tags))].sort();
  const best = useMemo(() => new Set(bestSellerIds), [bestSellerIds]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return catalog.products.filter((p) => {
      if (category && p.categorySlug !== category) return false;
      if (collection === 'promocoes' && !hasActivePromotion(p, now)) return false;
      if (collection === 'mais-vendidos' && !best.has(p.id) && !p.isFeatured) return false;
      if (onlyAvailable && !isProductOrderable(p, now)) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (q) {
        const haystack = normalizeSearch(
          [p.name, p.shortDescription, p.description, p.categoryName, ...p.tags, ...p.groups.flatMap((g) => (g.kind === 'flavor' ? g.values.map((v) => v.name) : []))]
            .filter(Boolean)
            .join(' '),
        );
        if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
      }
      return true;
    });
  }, [catalog.products, category, collection, onlyAvailable, tag, query, now, best]);

  const grouped = categories
    .map((c) => ({ category: c, products: filtered.filter((p) => p.categoryId === c.id).sort((a, b) => Number(isProductOrderable(b, now)) - Number(isProductOrderable(a, now)) || a.sortOrder - b.sortOrder) }))
    .filter((g) => g.products.length > 0);

  const chip = (active: boolean) =>
    cn('shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors', active ? 'bg-ink-900 text-white' : 'bg-mist text-ink-800 hover:bg-line');

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <div className="sticky top-[6.6rem] z-20 -mx-4 bg-white/95 px-4 pb-3 pt-4 backdrop-blur sm:top-[4.5rem] sm:-mx-6 sm:px-6 md:top-[4.5rem]">
        <form role="search" onSubmit={(e) => { e.preventDefault(); setParam({ q: query }); }} className="relative">
          <label htmlFor="busca" className="sr-only">
            Buscar no cardápio
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={searchRef}
            id="busca"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setParam({ q: query })}
            placeholder="Buscar pizza, prato, bebida, sabor…"
            className="h-13 w-full rounded-2xl border border-line bg-white pl-12 pr-12 text-base focus:border-ink-900 focus:outline-none"
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => { setQuery(''); setParam({ q: null }); }} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-mist" aria-label="Limpar busca">
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Filtrar por categoria">
          <button type="button" className={chip(!category && !collection)} aria-pressed={!category && !collection} onClick={() => setParam({ categoria: null, colecao: null })}>
            Tudo
          </button>
          <button type="button" className={chip(collection === 'promocoes')} aria-pressed={collection === 'promocoes'} onClick={() => setParam({ colecao: collection === 'promocoes' ? null : 'promocoes', categoria: null })}>
            Promoções
          </button>
          <button type="button" className={chip(collection === 'mais-vendidos')} aria-pressed={collection === 'mais-vendidos'} onClick={() => setParam({ colecao: collection === 'mais-vendidos' ? null : 'mais-vendidos', categoria: null })}>
            Mais vendidos
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => setParam({ categoria: category === c.slug ? null : c.slug, colecao: null })}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <SlidersHorizontal className="size-4 text-muted" aria-hidden />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => {
                setOnlyAvailable(e.target.checked);
                setParam({ disponiveis: e.target.checked ? '1' : null });
              }}
              className="size-4 accent-brand-600"
            />
            Somente disponíveis
          </label>
          {tags.length > 0 ? (
            <select
              value={tag ?? ''}
              onChange={(e) => {
                setTag(e.target.value || null);
                setParam({ tag: e.target.value || null });
              }}
              className="h-9 rounded-full border border-line bg-white px-3"
              aria-label="Filtrar por característica"
            >
              <option value="">Todas as características</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : null}
          <span className="ml-auto text-muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<Search className="size-6" aria-hidden />} title="Nada encontrado">
            Tente outra palavra ou limpe os filtros.
          </EmptyState>
        </div>
      ) : (
        grouped.map(({ category: c, products }) => (
          <section key={c.id} id={c.slug} aria-labelledby={`cat-${c.slug}`} className="mt-8 scroll-mt-48">
            <h2 id={`cat-${c.slug}`} className="font-display text-2xl font-semibold sm:text-3xl">
              {c.name}
            </h2>
            {c.description ? <p className="mt-1 text-muted">{c.description}</p> : null}
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} fetchedAt={catalog.fetchedAt} badge={best.has(p.id) ? 'Mais pedido' : undefined} className="h-full" />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

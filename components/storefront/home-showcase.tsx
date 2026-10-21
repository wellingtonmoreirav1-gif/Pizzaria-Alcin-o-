'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Layers } from 'lucide-react';
import type { Catalog, CatalogCategory, CatalogProduct } from '@/types/catalog';
import type { PublicBanner } from '@/types/settings';
import { hasActivePromotion, isProductOrderable } from '@/lib/pricing';
import { useNow } from '@/lib/use-now';
import { ProductRail } from './product-rail';
import { BannerStrip } from './banner-strip';

/** Vitrines da página inicial: categorias agrupadas para a página não ficar longa. */
const RAIL_GROUPS: { title: string; eyebrow: string; slugs: string[] }[] = [
  { title: 'Pizzas', eyebrow: 'Do forno', slugs: ['pizzas-tradicionais', 'pizzas-especiais', 'pizzas-premium', 'pizzas-doces'] },
  { title: 'Lanches', eyebrow: 'Na chapa', slugs: ['lanches-tradicionais', 'lanches-especiais', 'beirute'] },
  { title: 'Petiscos e pratos da casa', eyebrow: 'Para dividir', slugs: ['petiscos', 'pratos-da-casa'] },
  { title: 'Lasanhas', eyebrow: 'Gratinadas', slugs: ['lasanhas'] },
];

export function HomeShowcase({ catalog, bestSellerIds, banners }: { catalog: Catalog; bestSellerIds: string[]; banners: PublicBanner[] }) {
  const now = useNow(catalog.fetchedAt);
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const sortForSale = (list: CatalogProduct[]) =>
    [...list].sort((a, b) => Number(isProductOrderable(b, now)) - Number(isProductOrderable(a, now)));

  // Destaques escolhidos pela equipe (na ordem definida) + mais vendidos reais.
  const featured = catalog.products.filter((p) => p.isFeatured).sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));
  const best = bestSellerIds.map((id) => byId.get(id)).filter((p): p is CatalogProduct => Boolean(p));
  const trending: CatalogProduct[] = [];
  for (const p of [...featured, ...best]) if (!trending.some((t) => t.id === p.id)) trending.push(p);
  const trendingAvailable = trending.filter((p) => isProductOrderable(p, now)).slice(0, 8);
  const badges: Record<string, string> = {};
  for (const p of best) badges[p.id] = 'Mais pedido';

  const promos = catalog.products.filter((p) => isProductOrderable(p, now) && hasActivePromotion(p, now));
  const categoryOrder = new Map(catalog.categories.map((c, i) => [c.id, i]));
  const homeCategories = catalog.categories.filter((c) => c.showOnHome);
  const covered = new Set(RAIL_GROUPS.flatMap((g) => g.slugs));
  const rails = [
    ...RAIL_GROUPS.map((g) => ({ ...g, slugs: g.slugs.filter((s) => homeCategories.some((c) => c.slug === s)) })),
    // Categorias novas criadas no painel ganham a própria vitrine automaticamente.
    ...homeCategories
      .filter((c) => c.sectionType === 'products' && !covered.has(c.slug))
      .map((c) => ({ title: c.name, eyebrow: 'Cardápio', slugs: [c.slug] })),
  ];

  return (
    <>
      <CategoryTiles catalog={catalog} />
      <ProductRail
        id="em-alta"
        eyebrow="Escolha da casa"
        title={trendingAvailable.length > 1 ? 'Destaques do Alcinão' : 'Destaque do Alcinão'}
        products={trendingAvailable}
        fetchedAt={catalog.fetchedAt}
        badges={badges}
        priority
        tone="wine"
      />
      <BannerStrip banners={banners} now={now} />
      <ProductRail id="promocoes" eyebrow="Por tempo limitado" title="Promoções" products={promos.slice(0, 8)} fetchedAt={catalog.fetchedAt} href="/cardapio?colecao=promocoes" tone="wine" />
      {rails.map((rail) => {
        const list = sortForSale(
          catalog.products
            .filter((p) => rail.slugs.includes(p.categorySlug))
            .sort((a, b) => (categoryOrder.get(a.categoryId) ?? 0) - (categoryOrder.get(b.categoryId) ?? 0) || a.sortOrder - b.sortOrder),
        ).slice(0, 8);
        return <ProductRail key={rail.title} id={rail.slugs[0]} title={rail.title} eyebrow={rail.eyebrow} products={list} fetchedAt={catalog.fetchedAt} href={`/cardapio?categoria=${rail.slugs[0]}`} />;
      })}
    </>
  );
}

/** Grade de navegação pelas categorias do cardápio. */
function CategoryTiles({ catalog }: { catalog: Catalog }) {
  const groups = new Map(catalog.sharedGroups.map((g) => [g.id, g]));
  const tiles = catalog.categories
    .map((c: CatalogCategory) => {
      const products = catalog.products.filter((p) => p.categoryId === c.id);
      const count = c.sectionType === 'options' ? groups.get(c.sharedGroupId ?? '')?.values.length ?? 0 : products.length;
      return { category: c, count, image: products.find((p) => p.imageUrl)?.imageUrl ?? null, isOptions: c.sectionType === 'options' };
    })
    .filter((t) => t.count > 0);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="categorias-titulo" className="py-10 sm:py-14" id="categorias">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Cardápio</p>
            <h2 id="categorias-titulo" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">O que você quer hoje?</h2>
          </div>
          <Link href="/cardapio" className="hidden shrink-0 items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold hover:bg-mist sm:inline-flex">
            Ver cardápio completo <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map(({ category, count, image, isOptions }) => (
            <li key={category.id}>
              <Link
                href={`/cardapio?categoria=${category.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line transition-colors hover:ring-gold/60"
              >
                <span className="relative grid h-24 place-items-center overflow-hidden bg-mist sm:h-28" aria-hidden>
                  {image ? (
                    <Image src={image} alt="" fill sizes="(max-width: 640px) 50vw, 16vw" unoptimized={image.endsWith('.svg')} className="object-cover object-top transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <Layers className="size-8 text-gold" />
                  )}
                </span>
                <span className="flex flex-1 flex-col justify-center px-3 py-2.5">
                  <span className="font-display text-base font-semibold leading-tight">{category.name}</span>
                  <span className="mt-0.5 text-xs text-gold">{isOptions ? `${count} opções` : `${count} ${count === 1 ? 'item' : 'itens'}`}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

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
      <ProductRail
        id="em-alta"
        eyebrow="Escolha da casa"
        title={trendingAvailable.length > 1 ? 'Destaques do Alcinão' : 'Destaque do Alcinão'}
        products={trendingAvailable}
        fetchedAt={catalog.fetchedAt}
        badges={badges}
        tone="wine"
      />
      <CategoryTiles catalog={catalog} />
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

/**
 * Categorias em faixas largas (de ponta a ponta da tela), uma embaixo da outra.
 * Foto: a da categoria (Painel → Fotos e logo) ou, sem ela, a do primeiro produto.
 * Grupos de adicionais (bordas, molhos) não se pedem sozinhos: ficam só no cardápio.
 */
function CategoryTiles({ catalog }: { catalog: Catalog }) {
  const tiles = catalog.categories
    .filter((c: CatalogCategory) => c.sectionType === 'products')
    .map((c) => {
      const products = catalog.products.filter((p) => p.categoryId === c.id);
      const image = c.imageUrl ?? products.find((p) => p.imageUrl)?.imageUrl ?? null;
      return { category: c, count: products.length, image };
    })
    .filter((t) => t.count > 0);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="categorias-titulo" className="pb-4 pt-10 sm:pt-14" id="categorias">
      <div className="mx-auto mb-6 flex max-w-7xl items-end justify-between gap-4 px-4 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Cardápio</p>
          <h2 id="categorias-titulo" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">O que você quer hoje?</h2>
        </div>
        <Link href="/cardapio" className="hidden shrink-0 items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold hover:bg-mist sm:inline-flex">
          Ver cardápio completo <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="flex flex-col gap-1.5" data-testid="category-bands">
        {tiles.map(({ category, count, image }) => (
          <li key={category.id}>
            <Link
              href={`/cardapio?categoria=${category.slug}`}
              className="group relative flex h-24 w-full items-center overflow-hidden bg-wine sm:h-36 lg:h-40"
            >
              {image ? (
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="100vw"
                  unoptimized={image.endsWith('.svg')}
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <Layers className="absolute right-[12%] size-16 text-gold/40 sm:size-24" aria-hidden />
              )}
              {/* Escurece o lado do texto para o nome ficar sempre legível sobre a foto. */}
              <span className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/55 to-transparent" aria-hidden />
              <span className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
                <span>
                  <span className="block font-display text-[1.6rem] font-bold leading-tight text-white drop-shadow sm:text-4xl lg:text-5xl">{category.name}</span>
                  <span className="mt-0.5 block text-sm font-semibold text-gold sm:mt-1 sm:text-base">
                    {count} {count === 1 ? 'item' : 'itens'}
                  </span>
                </span>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-black/40 text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors group-hover:bg-brand-600 sm:size-12" aria-hidden>
                  <ArrowRight className="size-5" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

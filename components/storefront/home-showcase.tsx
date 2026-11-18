'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Catalog, CatalogCategory, CatalogProduct } from '@/types/catalog';
import type { PublicBanner } from '@/types/settings';
import { hasActivePromotion, isProductOrderable } from '@/lib/pricing';
import { useNow } from '@/lib/use-now';
import { ProductCard } from './product-card';
import { ProductRail } from './product-rail';
import { BannerStrip } from './banner-strip';
import { WeeklyFeature, type WeeklyFeatureConfig } from './weekly-feature';
import { HOME_HIDDEN_CATEGORIES, MENU_GROUPS, groupOfCategory } from '@/lib/catalog/groups';

/** Destaque da semana (troque aqui o lanche, o nome e a foto em public/destaques/). */
const WEEKLY_FEATURE: WeeklyFeatureConfig = {
  title: 'X Frango Assado',
  productSlug: 'x-frango',
  image: '/destaques/x-frango-poster.webp',
  video: { mp4: '/destaques/x-frango-loop-v2.mp4', webm: '/destaques/x-frango-loop-v2.webm' },
  imageAlt: 'Lanche de frango grelhado com queijo derretido, alface, tomate e cebola roxa no pão com gergelim',
};

/**
 * Miolo da página inicial: destaque da semana, os catálogos com os produtos e, quando houver,
 * banners e promoções. A história e o fechamento vêm depois (app/(site)/page.tsx).
 */
export function HomeShowcase({ catalog, banners }: { catalog: Catalog; banners: PublicBanner[] }) {
  const now = useNow(catalog.fetchedAt);
  const weeklyProduct = catalog.products.find((p) => p.slug === WEEKLY_FEATURE.productSlug);
  const promos = catalog.products.filter((p) => isProductOrderable(p, now) && hasActivePromotion(p, now));

  return (
    <>
      <WeeklyFeature config={WEEKLY_FEATURE} product={weeklyProduct} fetchedAt={catalog.fetchedAt} />
      <HomeCatalogs catalog={catalog} />
      <BannerStrip banners={banners} now={now} />
      <ProductRail id="promocoes" eyebrow="Por tempo limitado" title="Promoções" products={promos.slice(0, 8)} fetchedAt={catalog.fetchedAt} href="/cardapio?colecao=promocoes" tone="wine" />
    </>
  );
}

interface CatalogSection {
  id: string;
  title: string;
  /** Página do pedido passo a passo (pizzas, lanches, petiscos, pratos). */
  path?: string;
  categories: { category: CatalogCategory; products: CatalogProduct[] }[];
}

/**
 * Catálogos (pizzas, lanches, petiscos, pratos e categorias novas do painel) com os produtos
 * de cada tipo, na ordem do cardápio. Um atalho no topo leva a cada catálogo. Bebidas ficam
 * fora (são oferecidas no carrinho); bordas e molhos não se pedem sozinhos.
 */
function HomeCatalogs({ catalog }: { catalog: Catalog }) {
  const productsOf = (c: CatalogCategory) => catalog.products.filter((p) => p.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const withProducts = (cats: CatalogCategory[]) => cats.map((category) => ({ category, products: productsOf(category) })).filter((c) => c.products.length > 0);
  const sections: CatalogSection[] = [
    ...MENU_GROUPS.map((g) => ({
      id: `catalogo-${g.key}`,
      title: g.title,
      path: g.path,
      categories: withProducts(g.slugs.map((slug) => catalog.categories.find((c) => c.slug === slug)).filter((c): c is CatalogCategory => Boolean(c))),
    })),
    ...withProducts(
      catalog.categories.filter((c) => c.sectionType === 'products' && !groupOfCategory(c.slug) && !HOME_HIDDEN_CATEGORIES.includes(c.slug)),
    ).map((c) => ({ id: `catalogo-categoria-${c.category.slug}`, title: c.category.name, categories: [c] })), // id próprio: não colide com os grupos (ex.: categoria "pizzas")
  ].filter((s) => s.categories.length > 0);
  if (sections.length === 0) return null;

  return (
    <section id="cardapio" aria-labelledby="cardapio-titulo" className="scroll-mt-32 pb-6 pt-10 sm:pt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Cardápio</p>
        <h2 id="cardapio-titulo" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          O que você quer hoje?
        </h2>
        <nav aria-label="Catálogos" className="-mx-4 mt-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} className="inline-flex h-11 items-center rounded-full border border-line bg-mist px-5 text-base font-semibold text-fg transition-colors hover:border-gold hover:text-gold">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {sections.map((s) => (
        <div key={s.id} id={s.id} className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-10 sm:px-6 sm:pt-14" data-testid="home-catalog">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b-2 border-gold/60 pb-2">
            <h3 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{s.title}</h3>
            {/* Para quem prefere uma pergunta por vez (tipo → tamanho → sabor). */}
            {s.path ? (
              <Link href={s.path} className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-gold underline-offset-4 hover:underline">
                Pedir passo a passo <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : null}
          </div>
          {s.categories.map(({ category, products }) => (
            <div key={category.id} className="mt-6">
              {/* Com um tipo só (ex.: Petiscos), o nome do catálogo já basta. */}
              {s.categories.length > 1 ? <h4 className="mb-3 text-xl font-semibold text-gold sm:text-2xl">{category.name}</h4> : null}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {products.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} fetchedAt={catalog.fetchedAt} className="h-full" headingAs={s.categories.length > 1 ? 'h5' : 'h4'} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

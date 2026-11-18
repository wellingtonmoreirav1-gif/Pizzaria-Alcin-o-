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
  /** Página do catálogo inteiro (pizzas, lanches, petiscos, pratos) ou a categoria no cardápio. */
  href: string;
  /** Total de produtos do catálogo (para o "Ver tudo"). */
  total: number;
  /** Os poucos produtos mostrados na página inicial. */
  featured: CatalogProduct[];
}

/** Quantos produtos cada catálogo mostra na página inicial (o resto fica no "Ver tudo"). */
const HOME_PER_CATALOG = 2;

/**
 * Catálogos (pizzas, lanches, petiscos, pratos e categorias novas do painel): só 2 produtos de
 * cada um, mais o "Ver tudo". Os dois vêm primeiro dos marcados como destaque no painel e,
 * depois, na ordem do cardápio. Um atalho no topo leva a cada catálogo. Bebidas ficam fora
 * (são oferecidas no carrinho); bordas e molhos não se pedem sozinhos.
 */
function HomeCatalogs({ catalog }: { catalog: Catalog }) {
  const productsOf = (c: CatalogCategory) => catalog.products.filter((p) => p.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const pick = (list: CatalogProduct[]) =>
    [...list]
      .map((p, i) => ({ p, i }))
      .sort((a, b) => Number(b.p.isFeatured) - Number(a.p.isFeatured) || (a.p.featuredOrder ?? 999) - (b.p.featuredOrder ?? 999) || a.i - b.i)
      .slice(0, HOME_PER_CATALOG)
      .map((x) => x.p);
  const sections: CatalogSection[] = [
    ...MENU_GROUPS.map((g) => {
      // Na ordem do cardápio: tradicionais, especiais, premium, doces…
      const all = g.slugs.flatMap((slug) => {
        const c = catalog.categories.find((x) => x.slug === slug);
        return c ? productsOf(c) : [];
      });
      return { id: `catalogo-${g.key}`, title: g.title, href: g.path, total: all.length, featured: pick(all) };
    }),
    ...catalog.categories
      .filter((c) => c.sectionType === 'products' && !groupOfCategory(c.slug) && !HOME_HIDDEN_CATEGORIES.includes(c.slug))
      .map((c) => {
        const all = productsOf(c);
        // id próprio: não colide com os grupos (ex.: categoria "pizzas").
        return { id: `catalogo-categoria-${c.slug}`, title: c.name, href: `/cardapio?categoria=${c.slug}`, total: all.length, featured: pick(all) };
      }),
  ].filter((s) => s.total > 0);
  if (sections.length === 0) return null;

  return (
    <section id="cardapio" aria-labelledby="cardapio-titulo" className="scroll-mt-32 pb-10 pt-10 sm:pt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Cardápio</p>
        <h2 id="cardapio-titulo" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          O que você quer hoje?
        </h2>
        <nav aria-label="Catálogos" className="-mx-4 mt-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} className="inline-flex h-11 items-center rounded-full border border-line bg-mist px-5 text-base font-semibold text-fg transition-colors hover:border-brand-600 hover:text-brand-600">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {sections.map((s) => (
        <div key={s.id} id={s.id} className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-10 sm:px-6 sm:pt-14" data-testid="home-catalog">
          <h3 className="border-b-2 border-brand-600 pb-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">{s.title}</h3>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {s.featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} fetchedAt={catalog.fetchedAt} className="h-full" headingAs="h4" />
              </li>
            ))}
            {/* "Ver tudo": no celular uma faixa larga embaixo dos 2 produtos; no computador, um cartão ao lado. */}
            <li className="col-span-2 sm:col-span-1 lg:col-span-2">
              <Link
                href={s.href}
                className="group/all flex min-h-16 items-center justify-between gap-3 rounded-[var(--radius-card)] border-2 border-brand-600 bg-surface px-6 py-4 text-brand-600 transition-colors hover:bg-brand-600 hover:text-white sm:h-full sm:flex-col sm:justify-center sm:text-center"
              >
                <span className="font-display text-2xl font-bold sm:text-3xl">Ver tudo</span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {s.total} {s.total === 1 ? 'produto' : 'produtos'}
                  <ArrowRight className="size-5 transition-transform group-hover/all:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          </ul>
        </div>
      ))}
    </section>
  );
}

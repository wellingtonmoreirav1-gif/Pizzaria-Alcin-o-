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
import { WeeklyFeature, type WeeklyFeatureConfig } from './weekly-feature';
import { StoryTimeline } from './story-timeline';
import { HOME_HIDDEN_CATEGORIES, MENU_GROUPS, groupOfCategory, type MenuGroup } from '@/lib/catalog/groups';

/** Vitrines da página inicial: categorias agrupadas para a página não ficar longa. */
const RAIL_GROUPS: { title: string; eyebrow: string; slugs: string[] }[] = [
  { title: 'Pizzas', eyebrow: 'Do forno', slugs: ['pizzas-tradicionais', 'pizzas-especiais', 'pizzas-premium', 'pizzas-doces'] },
  { title: 'Pratos da casa', eyebrow: 'Na chapa, para dividir', slugs: ['pratos-da-casa'] },
  { title: 'Lanches', eyebrow: 'Na chapa', slugs: ['lanches-tradicionais', 'lanches-especiais', 'beirute'] },
  { title: 'Petiscos', eyebrow: 'Para acompanhar', slugs: ['petiscos'] },
  { title: 'Lasanhas', eyebrow: 'Gratinadas', slugs: ['lasanhas'] },
];
/** Sem foto própria da categoria, cada faixa mostra um recorte diferente do desenho do 1º produto. */
const BAND_CROPS = [
  { origin: '50% 40%', zoom: 1.1 },
  { origin: '25% 65%', zoom: 1.7 },
  { origin: '75% 35%', zoom: 1.4 },
  { origin: '50% 80%', zoom: 2 },
  { origin: '20% 30%', zoom: 1.25 },
  { origin: '80% 70%', zoom: 1.55 },
];
/** Destaque da semana (troque aqui o lanche, o nome e a foto em public/destaques/). */
const WEEKLY_FEATURE: WeeklyFeatureConfig = {
  title: 'X Frango Assado',
  productSlug: 'x-frango',
  image: '/destaques/x-frango-assado.webp',
  imageAlt: 'Lanche de frango grelhado com queijo derretido, alface, tomate e cebola roxa no pão com gergelim',
};

export function HomeShowcase({ catalog, banners }: { catalog: Catalog; banners: PublicBanner[] }) {
  const now = useNow(catalog.fetchedAt);
  const sortForSale = (list: CatalogProduct[]) =>
    [...list].sort((a, b) => Number(isProductOrderable(b, now)) - Number(isProductOrderable(a, now)));
  const weeklyProduct = catalog.products.find((p) => p.slug === WEEKLY_FEATURE.productSlug);

  const promos = catalog.products.filter((p) => isProductOrderable(p, now) && hasActivePromotion(p, now));
  const categoryOrder = new Map(catalog.categories.map((c, i) => [c.id, i]));
  const homeCategories = catalog.categories.filter((c) => c.showOnHome);
  const covered = new Set(RAIL_GROUPS.flatMap((g) => g.slugs));
  const rails = [
    ...RAIL_GROUPS.map((g) => ({ ...g, slugs: g.slugs.filter((s) => homeCategories.some((c) => c.slug === s)) })),
    // Categorias novas criadas no painel ganham a própria vitrine automaticamente.
    ...homeCategories
      .filter((c) => c.sectionType === 'products' && !covered.has(c.slug))
      .map((c) => ({ title: c.name, eyebrow: c.slug === 'bebidas' ? 'Para acompanhar' : 'Cardápio', slugs: [c.slug] })),
  ];

  return (
    <>
      <WeeklyFeature config={WEEKLY_FEATURE} product={weeklyProduct} fetchedAt={catalog.fetchedAt} />
      <CategoryTiles catalog={catalog} />
      <StoryTimeline />
      <BannerStrip banners={banners} now={now} />
      <ProductRail id="promocoes" eyebrow="Por tempo limitado" title="Promoções" products={promos.slice(0, 8)} fetchedAt={catalog.fetchedAt} href="/cardapio?colecao=promocoes" tone="wine" />
      {rails.map((rail) => {
        const list = sortForSale(
          catalog.products
            .filter((p) => rail.slugs.includes(p.categorySlug))
            .sort((a, b) => (categoryOrder.get(a.categoryId) ?? 0) - (categoryOrder.get(b.categoryId) ?? 0) || a.sortOrder - b.sortOrder),
        ).slice(0, 8);
        // Sem nada que dê para pedir agora (ex.: bebidas ainda sem preço): fica só no cardápio.
        if (!list.some((p) => isProductOrderable(p, now))) return null;
        const href = groupOfCategory(rail.slugs[0]!)?.path ?? `/cardapio?categoria=${rail.slugs[0]}`;
        return <ProductRail key={rail.title} id={rail.slugs[0]} title={rail.title} eyebrow={rail.eyebrow} products={list} fetchedAt={catalog.fetchedAt} href={href} />;
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
  // Pizzas, lanches, petiscos e pratos ganham um bloco próprio ("Pedir …", com foto); as faixas
  // ficam só para categorias novas criadas no painel. Bebidas não aparecem aqui.
  const groups = MENU_GROUPS.filter((g) => catalog.products.some((p) => g.slugs.includes(p.categorySlug)));
  const tiles = catalog.categories
    .filter((c: CatalogCategory) => c.sectionType === 'products' && !groupOfCategory(c.slug) && !HOME_HIDDEN_CATEGORIES.includes(c.slug))
    .map((c) => {
      const products = catalog.products.filter((p) => p.categoryId === c.id);
      const image = c.imageUrl ?? products.find((p) => p.imageUrl)?.imageUrl ?? null;
      return { category: c, count: products.length, image, ownPhoto: Boolean(c.imageUrl) };
    })
    .filter((t) => t.count > 0);
  if (tiles.length === 0 && groups.length === 0) return null;
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
      <div className="flex flex-col gap-1.5">
        {groups.map((g) => (
          <MenuCallout key={g.key} group={g} />
        ))}
      </div>
      {tiles.length > 0 ? (
      <ul className="mt-1.5 flex flex-col gap-1.5" data-testid="category-bands">
        {tiles.map(({ category, count, image, ownPhoto }, i) => {
          const crop = ownPhoto ? null : BAND_CROPS[i % BAND_CROPS.length]!;
          return (
          <li key={category.id}>
            <Link
              href={`/cardapio?categoria=${category.slug}`}
              className="group relative flex h-24 w-full items-center overflow-hidden bg-wine sm:h-36 lg:h-40"
            >
              {image ? (
                <span className="absolute inset-0" style={crop ? { transform: `scale(${crop.zoom})`, transformOrigin: crop.origin } : undefined}>
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="100vw"
                    unoptimized={image.endsWith('.svg')}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </span>
              ) : (
                <Layers className="absolute right-[12%] size-16 text-gold/40 sm:size-24" aria-hidden />
              )}
              {/* Escurece o lado do texto para o nome ficar sempre legível sobre a foto. */}
              <span className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/70 to-ink-950/10" aria-hidden />
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
          );
        })}
      </ul>
      ) : null}
    </section>
  );
}

/** Bloco de um grupo do cardápio: o texto (que é o próprio botão) à esquerda e a foto à direita. */
function MenuCallout({ group }: { group: MenuGroup }) {
  return (
    <div
      className="relative overflow-hidden bg-[radial-gradient(ellipse_55%_80%_at_72%_55%,var(--color-wine-500)_0%,var(--color-wine-700)_45%,var(--color-wine-900)_100%)]"
      data-testid="menu-callout"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-2 px-4 pb-10 pt-6 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:py-14">
        <div className="relative order-1 aspect-[3/2] w-full lg:order-2">
          <Image src={group.image} alt={group.imageAlt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]" />
        </div>
        <div className="order-2 lg:order-1">
          <Link
            href={group.path}
            className="group/callout inline-flex items-center gap-4 rounded-full bg-brand-600 py-3 pl-8 pr-3 font-display text-[2rem] font-bold leading-tight text-white shadow-[var(--shadow-float)] transition-colors hover:bg-brand-700 sm:text-5xl lg:py-4 lg:pl-10 lg:text-[3.25rem]"
          >
            {group.cta}
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 transition-transform group-hover/callout:translate-x-1 sm:size-14 lg:size-16" aria-hidden>
              <ArrowRight className="size-6 lg:size-7" />
            </span>
          </Link>
          <p className="mt-5 text-lg text-white/80 sm:text-xl">{group.line}</p>
        </div>
      </div>
    </div>
  );
}

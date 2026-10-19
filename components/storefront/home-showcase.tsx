'use client';

import type { Catalog, CatalogProduct } from '@/types/catalog';
import type { PublicBanner } from '@/types/settings';
import { hasActivePromotion, isProductOrderable } from '@/lib/pricing';
import { useNow } from '@/lib/use-now';
import { ProductRail } from './product-rail';
import { BannerStrip } from './banner-strip';

const RAILS: { slug: string | string[]; title: string; eyebrow: string; href: string }[] = [
  { slug: 'pizzas', title: 'Pizzas', eyebrow: 'Do forno', href: '/cardapio?categoria=pizzas' },
  { slug: 'almoco', title: 'Almoço', eyebrow: 'Feito no dia', href: '/cardapio?categoria=almoco' },
  { slug: 'churrasco', title: 'Churrasco', eyebrow: 'Na brasa', href: '/cardapio?categoria=churrasco' },
  { slug: 'combos', title: 'Combos', eyebrow: 'Para dividir', href: '/cardapio?categoria=combos' },
  { slug: 'bebidas', title: 'Bebidas', eyebrow: 'Para acompanhar', href: '/cardapio?categoria=bebidas' },
  { slug: ['porcoes', 'sobremesas'], title: 'Porções e sobremesas', eyebrow: 'Extras', href: '/cardapio?categoria=porcoes' },
];

export function HomeShowcase({ catalog, bestSellerIds, banners }: { catalog: Catalog; bestSellerIds: string[]; banners: PublicBanner[] }) {
  const now = useNow(catalog.fetchedAt);
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const sortForSale = (list: CatalogProduct[]) =>
    [...list].sort((a, b) => Number(isProductOrderable(b, now)) - Number(isProductOrderable(a, now)) || a.sortOrder - b.sortOrder);

  // "Em alta": destaques escolhidos pela equipe (na ordem definida) + mais vendidos reais.
  const featured = catalog.products
    .filter((p) => p.isFeatured)
    .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));
  const best = bestSellerIds.map((id) => byId.get(id)).filter((p): p is CatalogProduct => Boolean(p));
  const trending: CatalogProduct[] = [];
  for (const p of [...featured, ...best]) if (!trending.some((t) => t.id === p.id)) trending.push(p);
  const trendingAvailable = trending.filter((p) => isProductOrderable(p, now)).slice(0, 8);
  const badges: Record<string, string> = {};
  for (const p of best) badges[p.id] = 'Mais pedido';

  const promos = catalog.products.filter((p) => isProductOrderable(p, now) && hasActivePromotion(p, now));

  return (
    <>
      <ProductRail
        id="em-alta"
        eyebrow="Os queridinhos"
        title="Em alta no Alcinão"
        description="Seleção da casa para você pedir sem pensar duas vezes."
        products={trendingAvailable.length ? trendingAvailable : sortForSale(catalog.products).slice(0, 8)}
        fetchedAt={catalog.fetchedAt}
        badges={badges}
        href="/cardapio"
        priority
      />
      <BannerStrip banners={banners} now={now} />
      <ProductRail id="promocoes" eyebrow="Por tempo limitado" title="Promoções" products={promos.slice(0, 8)} fetchedAt={catalog.fetchedAt} href="/cardapio?colecao=promocoes" />
      {RAILS.map((rail) => {
        const slugs = Array.isArray(rail.slug) ? rail.slug : [rail.slug];
        const list = sortForSale(catalog.products.filter((p) => slugs.includes(p.categorySlug))).slice(0, 8);
        return <ProductRail key={rail.title} id={slugs[0]} title={rail.title} eyebrow={rail.eyebrow} products={list} fetchedAt={catalog.fetchedAt} href={rail.href} />;
      })}
    </>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getBestSellerIds, getCatalog } from '@/lib/catalog/queries';
import { MenuBrowser } from '@/components/storefront/menu-browser';
import { Notice, Skeleton } from '@/components/ui/feedback';
import { PIZZA_CATEGORY_SLUGS } from '@/lib/catalog/groups';

export const metadata: Metadata = {
  title: 'Pizzas',
  description: 'Pizzas do Alcinão em São Bento (PB): tradicionais, especiais, premium e doces. Monte seu pedido e envie pelo WhatsApp.',
  alternates: { canonical: '/pizzas' },
};

/** Cardápio só de pizzas, separado por categoria (tradicionais, especiais, premium e doces). */
export default async function PizzasPage() {
  const [{ data: catalog, error }, bestSellerIds] = await Promise.all([getCatalog(), getBestSellerIds()]);
  return (
    <>
      <div className="border-b border-line bg-[#080706] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Pizzas</h1>
          <p className="mt-2 max-w-xl text-white/70">Tradicionais, especiais, premium e doces. Escolha o tamanho e os sabores de cada pizza.</p>
        </div>
      </div>
      {error ? (
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <Notice tone="warning">{error}</Notice>
        </div>
      ) : null}
      <Suspense fallback={<Skeleton className="mx-auto mt-6 h-80 max-w-7xl" />}>
        <MenuBrowser catalog={catalog} bestSellerIds={bestSellerIds} scope={PIZZA_CATEGORY_SLUGS} basePath="/pizzas" />
      </Suspense>
    </>
  );
}

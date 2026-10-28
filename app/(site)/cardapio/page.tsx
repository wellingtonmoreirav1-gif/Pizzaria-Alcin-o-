import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getBestSellerIds, getCatalog } from '@/lib/catalog/queries';
import { MenuBrowser } from '@/components/storefront/menu-browser';
import { Notice, Skeleton } from '@/components/ui/feedback';

export const metadata: Metadata = {
  title: 'Cardápio',
  description:
    'Cardápio completo do Alcinão em São Bento (PB): pizzas tradicionais, especiais, premium e doces, bordas recheadas, lanches, Beirute, petiscos, pratos da casa e lasanhas.',
  alternates: { canonical: '/cardapio' },
};

export default async function MenuPage() {
  const [{ data: catalog, error }, bestSellerIds] = await Promise.all([getCatalog(), getBestSellerIds()]);
  return (
    <>
      <div className="bg-wine border-b border-line text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Alcinão</p>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Cardápio</h1>
          <p className="mt-2 max-w-xl text-white/70">Busque, filtre e monte seu pedido. Os preços são conferidos de novo na finalização.</p>
        </div>
      </div>
      {error ? (
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <Notice tone="warning">{error}</Notice>
        </div>
      ) : null}
      <Suspense fallback={<MenuSkeleton />}>
        <MenuBrowser catalog={catalog} bestSellerIds={bestSellerIds} />
      </Suspense>
    </>
  );
}

function MenuSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <Skeleton className="h-13 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getBestSellerIds, getCatalog } from '@/lib/catalog/queries';
import { menuGroup, type MenuGroup } from '@/lib/catalog/groups';
import { Notice, Skeleton } from '@/components/ui/feedback';
import { MenuBrowser } from './menu-browser';

export function groupMetadata(key: MenuGroup['key']): Metadata {
  const g = menuGroup(key);
  return {
    title: g.title,
    description: `${g.title} do Alcinão em São Bento (PB). ${g.description} Monte seu pedido e envie pelo WhatsApp.`,
    alternates: { canonical: g.path },
  };
}

/** Página de um grupo do cardápio (ex.: /pizzas): só as categorias do grupo, cada uma na sua seção. */
export async function GroupMenuPage({ groupKey }: { groupKey: MenuGroup['key'] }) {
  const group = menuGroup(groupKey);
  const [{ data: catalog, error }, bestSellerIds] = await Promise.all([getCatalog(), getBestSellerIds()]);
  return (
    <>
      <div className="border-b border-line bg-[#080706] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">{group.title}</h1>
          <p className="mt-2 max-w-xl text-white/70">{group.description}</p>
        </div>
      </div>
      {error ? (
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <Notice tone="warning">{error}</Notice>
        </div>
      ) : null}
      <Suspense fallback={<Skeleton className="mx-auto mt-6 h-80 max-w-7xl" />}>
        <MenuBrowser catalog={catalog} bestSellerIds={bestSellerIds} scope={group.slugs} basePath={group.path} />
      </Suspense>
    </>
  );
}

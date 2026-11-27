import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCatalog } from '@/lib/catalog/queries';
import { menuGroup, type MenuGroup } from '@/lib/catalog/groups';
import { Notice, Skeleton } from '@/components/ui/feedback';
import Link from 'next/link';
import { EasyOrder } from './easy-order';

export function groupMetadata(key: MenuGroup['key']): Metadata {
  const g = menuGroup(key);
  return {
    title: g.title,
    description: `${g.title} do Alcinão em São Bento (PB). ${g.description} Monte seu pedido e envie pelo WhatsApp.`,
    alternates: { canonical: g.path },
  };
}

/** Página de um grupo do cardápio (ex.: /pizzas): pedido passo a passo (tipo → tamanho → sabor). */
export async function GroupMenuPage({ groupKey }: { groupKey: MenuGroup['key'] }) {
  const group = menuGroup(groupKey);
  const { data: catalog, error } = await getCatalog();
  return (
    <>
      <div className="bg-wine border-b border-line text-white">
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
        <EasyOrder catalog={catalog} group={group} />
      </Suspense>
      <p className="mx-auto max-w-3xl px-4 pb-12 text-center text-sm text-muted sm:px-6">
        Prefere ver tudo de uma vez?{' '}
        <Link href={`/cardapio?categoria=${group.slugs[0]}`} className="font-semibold text-gold underline underline-offset-4">
          Ver o cardápio completo
        </Link>
      </p>
    </>
  );
}

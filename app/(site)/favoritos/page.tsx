import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog/queries';
import { FavoritesView } from '@/components/storefront/favorites-view';

export const metadata: Metadata = { title: 'Favoritos', robots: { index: false } };

export default async function FavoritesPage() {
  const { data } = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 font-display text-3xl font-semibold sm:text-4xl">Seus favoritos</h1>
      <FavoritesView catalog={data} />
    </div>
  );
}

'use client';

import { Heart } from 'lucide-react';
import type { Catalog } from '@/types/catalog';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { useFavorites } from './favorites-context';
import { ProductCard } from './product-card';

export function FavoritesView({ catalog }: { catalog: Catalog }) {
  const { ids, signedIn } = useFavorites();
  const products = catalog.products.filter((p) => ids.has(p.id));
  if (products.length === 0) {
    return (
      <EmptyState icon={<Heart className="size-6" aria-hidden />} title="Nenhum favorito ainda" action={<ButtonLink href="/cardapio">Explorar cardápio</ButtonLink>}>
        Toque no coração dos produtos para salvá-los aqui.{signedIn ? '' : ' Entre na sua conta para guardar os favoritos em qualquer aparelho.'}
      </EmptyState>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} fetchedAt={catalog.fetchedAt} className="h-full" />
        </li>
      ))}
    </ul>
  );
}

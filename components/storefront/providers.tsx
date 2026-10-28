'use client';

import type { ReactNode } from 'react';
import type { CatalogProduct } from '@/types/catalog';
import { ToastProvider } from '@/components/ui/toast';
import { CartProvider } from '@/components/cart/cart-context';
import { FavoritesProvider } from './favorites-context';
import { ProductDialogProvider } from './product-dialog';

/**
 * `drinks`: bebidas oferecidas no carrinho e depois de adicionar um item (ver DrinkNudge).
 * `pizzas`: sabores para a segunda metade da pizza metade/metade.
 */
export function StoreProviders({ children, drinks, pizzas }: { children: ReactNode; drinks?: CatalogProduct[]; pizzas?: CatalogProduct[] }) {
  return (
    <ToastProvider>
      <CartProvider>
        <FavoritesProvider>
          <ProductDialogProvider drinks={drinks} pizzas={pizzas}>
            {children}
          </ProductDialogProvider>
        </FavoritesProvider>
      </CartProvider>
    </ToastProvider>
  );
}

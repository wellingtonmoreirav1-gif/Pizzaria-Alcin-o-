'use client';

import type { ReactNode } from 'react';
import type { CatalogProduct } from '@/types/catalog';
import { ToastProvider } from '@/components/ui/toast';
import { CartProvider } from '@/components/cart/cart-context';
import { FavoritesProvider } from './favorites-context';
import { ProductDialogProvider } from './product-dialog';

/** `drinks`: bebidas oferecidas no carrinho e depois de adicionar um item (ver DrinkNudge). */
export function StoreProviders({ children, drinks }: { children: ReactNode; drinks?: CatalogProduct[] }) {
  return (
    <ToastProvider>
      <CartProvider>
        <FavoritesProvider>
          <ProductDialogProvider drinks={drinks}>{children}</ProductDialogProvider>
        </FavoritesProvider>
      </CartProvider>
    </ToastProvider>
  );
}

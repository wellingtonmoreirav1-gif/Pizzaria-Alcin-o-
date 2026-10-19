'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { CartProvider } from '@/components/cart/cart-context';
import { FavoritesProvider } from './favorites-context';
import { ProductDialogProvider } from './product-dialog';

export function StoreProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        <FavoritesProvider>
          <ProductDialogProvider>{children}</ProductDialogProvider>
        </FavoritesProvider>
      </CartProvider>
    </ToastProvider>
  );
}

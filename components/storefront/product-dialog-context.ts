'use client';

import { createContext, useContext } from 'react';
import type { CatalogProduct } from '@/types/catalog';
import type { CartLine } from '@/components/cart/cart-context';

/*
 * Contexto do montador de produto, separado de product-dialog.tsx para que o
 * montador (product-customizer) use o contexto sem importar o diálogo que o renderiza.
 */

interface ProductDialogValue {
  open: (product: CatalogProduct, fetchedAt: string, editLine?: CartLine | null, variantId?: string | null, halfProductId?: string | null) => void;
  /** Adiciona direto quando o produto não precisa de escolhas; senão abre o montador. */
  quickAdd: (product: CatalogProduct, fetchedAt: string) => void;
  /** Adiciona com o tamanho escolhido, sem adicionais (pedido passo a passo). */
  addDirect: (product: CatalogProduct, variantId: string | null, quantity?: number, opts?: AddDirectOptions) => boolean;
  /** Sabores de pizza para a segunda metade (metade/metade). */
  pizzas: CatalogProduct[];
  /** Depois de adicionar um item que não é bebida: sugere uma bebida (se houver). */
  suggestDrink: (added: CatalogProduct) => void;
}

export interface AddDirectOptions {
  silent?: boolean;
  suggest?: boolean;
  /** Pizza metade/metade: o outro sabor. */
  half?: CatalogProduct | null;
}

export const ProductDialogContext = createContext<ProductDialogValue | null>(null);

export function useProductDialog() {
  const ctx = useContext(ProductDialogContext);
  if (!ctx) throw new Error('useProductDialog precisa estar dentro de ProductDialogProvider');
  return ctx;
}

'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CatalogProduct, LineSelection } from '@/types/catalog';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { priceLine } from '@/lib/pricing';
import { useCart, type CartLine } from '@/components/cart/cart-context';
import { ProductCustomizer } from './product-customizer';

interface DialogState {
  product: CatalogProduct;
  fetchedAt: string;
  editLine?: CartLine | null;
}

interface ProductDialogValue {
  open: (product: CatalogProduct, fetchedAt: string, editLine?: CartLine | null) => void;
  /** Adiciona direto quando o produto não precisa de escolhas; senão abre o montador. */
  quickAdd: (product: CatalogProduct, fetchedAt: string) => void;
}

const ProductDialogContext = createContext<ProductDialogValue | null>(null);

export function needsCustomization(product: CatalogProduct): boolean {
  if (product.kind === 'pizza') return true;
  if (product.variants.length > 1) return true;
  return product.groups.some((g) => g.values.length > 0);
}

export function ProductDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const cart = useCart();
  const toast = useToast();

  const open = useCallback((product: CatalogProduct, fetchedAt: string, editLine?: CartLine | null) => {
    setState({ product, fetchedAt, editLine });
  }, []);

  const quickAdd = useCallback(
    (product: CatalogProduct, fetchedAt: string) => {
      if (needsCustomization(product)) {
        setState({ product, fetchedAt });
        return;
      }
      const selection: LineSelection = { productId: product.id, variantId: product.variants[0]?.id ?? null, options: {}, quantity: 1 };
      const result = priceLine(product, selection, { now: new Date(), openShifts: null });
      if (!result.ok) {
        toast(result.error.message, 'error');
        return;
      }
      cart.add({
        ...selection,
        notes: null,
        slug: product.slug,
        name: product.name,
        variantName: result.line.variantName,
        summary: result.line.summary,
        imageUrl: product.imageUrl,
        unitPrice: result.line.unitPrice,
        unitRegular: result.line.unitRegular,
        maxQuantity: product.maxQuantity,
      });
      toast(`${product.name} adicionado ao carrinho`);
    },
    [cart, toast],
  );

  const value = useMemo(() => ({ open, quickAdd }), [open, quickAdd]);

  return (
    <ProductDialogContext value={value}>
      {children}
      {state ? (
        <Dialog open onClose={() => setState(null)} title={state.product.name} description={state.product.categoryName} side="bottom">
          <ProductCustomizer
            key={`${state.product.id}-${state.editLine?.lineId ?? 'new'}`}
            product={state.product}
            fetchedAt={state.fetchedAt}
            editLine={state.editLine}
            onDone={() => setState(null)}
          />
        </Dialog>
      ) : null}
    </ProductDialogContext>
  );
}

export function useProductDialog() {
  const ctx = useContext(ProductDialogContext);
  if (!ctx) throw new Error('useProductDialog precisa estar dentro de ProductDialogProvider');
  return ctx;
}

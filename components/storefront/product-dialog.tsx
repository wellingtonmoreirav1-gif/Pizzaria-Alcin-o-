'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CatalogProduct, LineSelection } from '@/types/catalog';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { priceLine } from '@/lib/pricing';
import { useCart, type CartLine } from '@/components/cart/cart-context';
import { ProductCustomizer } from './product-customizer';
import { DrinkNudge, availableDrinks } from './drink-nudge';
import { DRINK_CATEGORY } from '@/lib/catalog/groups';

interface DialogState {
  product: CatalogProduct;
  fetchedAt: string;
  editLine?: CartLine | null;
  /** Tamanho já escolhido (ex.: no pedido passo a passo). */
  variantId?: string | null;
  /** Segundo sabor já escolhido (pizza metade/metade). */
  halfProductId?: string | null;
}

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

interface AddDirectOptions {
  silent?: boolean;
  suggest?: boolean;
  /** Pizza metade/metade: o outro sabor. */
  half?: CatalogProduct | null;
}

const ProductDialogContext = createContext<ProductDialogValue | null>(null);

/** Abre o montador quando há escolhas a fazer (tamanho, opções disponíveis ou obrigatórias). */
export function needsCustomization(product: CatalogProduct): boolean {
  if (product.kind === 'pizza') return true;
  if (product.variants.length > 1) return true;
  return product.groups.some((g) => g.minSelect > 0 || g.values.some((v) => v.isAvailable && v.priceConfirmed));
}

export function ProductDialogProvider({ children, drinks = [], pizzas = [] }: { children: ReactNode; drinks?: CatalogProduct[]; pizzas?: CatalogProduct[] }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [nudge, setNudge] = useState<CatalogProduct[] | null>(null);
  const cart = useCart();
  const toast = useToast();

  // Depois de adicionar um lanche, pizza etc. (não uma bebida), sugere uma bebida —
  // só se ainda não houver bebida no carrinho.
  const suggestDrink = useCallback(
    (added: CatalogProduct) => {
      if (added.categorySlug === DRINK_CATEGORY) return;
      const inCart = new Set(cart.lines.map((l) => l.productId));
      if (drinks.some((d) => inCart.has(d.id))) return;
      const options = availableDrinks(drinks, inCart, 3);
      if (options.length) setNudge(options);
    },
    [drinks, cart.lines],
  );
  const closeNudge = useCallback(() => setNudge(null), []);

  const open = useCallback(
    (product: CatalogProduct, fetchedAt: string, editLine?: CartLine | null, variantId?: string | null, halfProductId?: string | null) => {
      setState({ product, fetchedAt, editLine, variantId, halfProductId });
    },
    [],
  );

  /** Adiciona direto ao carrinho (tamanho já escolhido, sem adicionais). Retorna false se não deu. */
  const addDirect = useCallback(
    (product: CatalogProduct, variantId: string | null, quantity = 1, opts: AddDirectOptions = {}) => {
      const selection: LineSelection = { productId: product.id, variantId, options: {}, quantity, halfProductId: opts.half?.id ?? null };
      const result = priceLine(product, selection, { now: new Date(), openShifts: null }, opts.half ?? undefined);
      if (!result.ok) {
        toast(result.error.message, 'error');
        return false;
      }
      cart.add({
        ...selection,
        notes: null,
        slug: product.slug,
        name: result.line.productName,
        variantName: result.line.variantName,
        summary: result.line.summary,
        imageUrl: product.imageUrl,
        unitPrice: result.line.unitPrice,
        unitRegular: result.line.unitRegular,
        maxQuantity: product.maxQuantity,
      });
      if (!opts.silent) toast(`${result.line.productName} adicionado ao carrinho`);
      if (opts.suggest !== false) suggestDrink(product);
      return true;
    },
    [cart, toast, suggestDrink],
  );

  const quickAdd = useCallback(
    (product: CatalogProduct, fetchedAt: string) => {
      if (needsCustomization(product)) {
        setState({ product, fetchedAt });
        return;
      }
      addDirect(product, product.variants[0]?.id ?? null);
    },
    [addDirect],
  );

  const value = useMemo(() => ({ open, quickAdd, addDirect, suggestDrink, pizzas }), [open, quickAdd, addDirect, suggestDrink, pizzas]);

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
            initialVariantId={state.variantId}
            initialHalfProductId={state.halfProductId}
            onDone={() => setState(null)}
          />
        </Dialog>
      ) : null}
      {nudge ? (
        <DrinkNudge
          drinks={nudge}
          onClose={closeNudge}
          onPick={(d) => {
            setNudge(null);
            quickAdd(d, new Date().toISOString());
          }}
        />
      ) : null}
    </ProductDialogContext>
  );
}

export function useProductDialog() {
  const ctx = useContext(ProductDialogContext);
  if (!ctx) throw new Error('useProductDialog precisa estar dentro de ProductDialogProvider');
  return ctx;
}

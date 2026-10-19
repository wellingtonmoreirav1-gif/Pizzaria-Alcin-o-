'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { CatalogProduct } from '@/types/catalog';
import { useCart } from '@/components/cart/cart-context';
import { Notice } from '@/components/ui/feedback';
import { ProductCustomizer } from './product-customizer';

export function ProductPageClient({ product, fetchedAt }: { product: CatalogProduct; fetchedAt: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const cart = useCart();
  const editId = params.get('editar');
  const editLine = editId ? cart.lines.find((l) => l.lineId === editId && l.productId === product.id) ?? null : null;
  if (editId && !cart.hydrated) return null;
  return (
    <div className="space-y-4">
      {editId && !editLine ? <Notice tone="warning">Este item não está mais no carrinho. Você pode adicioná-lo novamente.</Notice> : null}
      <ProductCustomizer
        key={editLine?.lineId ?? 'new'}
        product={product}
        fetchedAt={fetchedAt}
        editLine={editLine}
        layout="page"
        onDone={() => {
          if (editLine) router.push('/carrinho');
          else cart.setDrawerOpen(true);
        }}
      />
    </div>
  );
}

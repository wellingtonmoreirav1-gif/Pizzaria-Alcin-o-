import type { Metadata } from 'next';
import { CartPageView } from '@/components/cart/cart-page';

export const metadata: Metadata = { title: 'Carrinho', robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 font-display text-3xl font-semibold sm:text-4xl">Carrinho</h1>
      <CartPageView />
    </div>
  );
}

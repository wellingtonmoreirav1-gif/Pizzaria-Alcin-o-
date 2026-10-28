'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import type { CatalogProduct } from '@/types/catalog';
import { formatBRL } from '@/lib/money';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { useCart } from './cart-context';
import { CartLines } from './cart-lines';
import { useCartQuote } from './use-cart-quote';
import { CartSuggestions } from './cart-suggestions';

export function CartDrawer({ suggestions, fetchedAt }: { suggestions: CatalogProduct[]; fetchedAt: string }) {
  const cart = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const quote = useCartQuote(cart.drawerOpen);
  const hasErrors = Object.keys(quote.lineErrors).length > 0;
  const total = quote.totals?.itemsSubtotal ?? cart.estimatedTotal;

  useEffect(() => {
    cart.setDrawerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Dialog
      open={cart.drawerOpen}
      onClose={() => cart.setDrawerOpen(false)}
      title="Seu carrinho"
      description={cart.count ? `${cart.count} ${cart.count === 1 ? 'item' : 'itens'}` : undefined}
      side="right"
      footer={
        cart.lines.length ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Subtotal dos itens</span>
              <span className="text-xl font-bold tabular-nums text-gold" data-testid="cart-subtotal">
                {formatBRL(total)}
              </span>
            </div>
            <p className="text-xs text-muted">Taxa de entrega, se houver, é confirmada pela equipe no WhatsApp.</p>
            <Button
              size="lg"
              className="w-full"
              disabled={hasErrors || quote.loading}
              onClick={() => {
                cart.setDrawerOpen(false);
                router.push('/checkout');
              }}
            >
              Finalizar pedido
            </Button>
          </div>
        ) : null
      }
    >
      {cart.lines.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-6" aria-hidden />} title="Carrinho vazio">
          Escolha suas pizzas, pratos e bebidas no cardápio.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {quote.error ? <Notice tone="warning">{quote.error}</Notice> : null}
          {hasErrors ? (
            <Notice tone="danger" title="Revise os itens destacados">
              Alguns itens mudaram ou ficaram indisponíveis.
            </Notice>
          ) : null}
          {quote.pricesChanged ? <Notice tone="info">Os preços foram atualizados com os valores atuais do cardápio.</Notice> : null}
          <CartLines lineErrors={quote.lineErrors} onNavigate={() => cart.setDrawerOpen(false)} compact />
          <CartSuggestions products={suggestions} fetchedAt={fetchedAt} />
        </div>
      )}
    </Dialog>
  );
}

'use client';

import { ShoppingBag } from 'lucide-react';
import { formatBRL } from '@/lib/money';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, Notice, Skeleton } from '@/components/ui/feedback';
import { useCart } from './cart-context';
import { CartLines } from './cart-lines';
import { useCartQuote } from './use-cart-quote';

export function CartPageView() {
  const cart = useCart();
  const quote = useCartQuote(true);
  if (!cart.hydrated) return <Skeleton className="h-64" />;
  if (cart.lines.length === 0) {
    return (
      <EmptyState icon={<ShoppingBag className="size-6" aria-hidden />} title="Seu carrinho está vazio" action={<ButtonLink href="/cardapio">Ver cardápio</ButtonLink>}>
        Escolha seus pratos favoritos.
      </EmptyState>
    );
  }
  const hasErrors = Object.keys(quote.lineErrors).length > 0;
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        {quote.error ? <Notice tone="warning">{quote.error}</Notice> : null}
        {quote.pricesChanged ? <Notice>Os preços foram atualizados com os valores atuais do cardápio.</Notice> : null}
        {quote.status && !quote.status.acceptingOrders ? <Notice tone="warning" title="Fora do horário">{quote.status.message}</Notice> : null}
        <CartLines lineErrors={quote.lineErrors} />
      </div>
      <aside className="h-fit space-y-3 rounded-[var(--radius-card)] bg-mist p-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="tabular-nums">{formatBRL(quote.totals?.grossSubtotal ?? cart.estimatedTotal)}</span>
        </div>
        {quote.totals && quote.totals.discountTotal > 0 ? (
          <div className="flex justify-between text-sm text-success-600">
            <span>Descontos</span>
            <span className="tabular-nums">-{formatBRL(quote.totals.discountTotal)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
          <span>Total dos itens</span>
          <span className="tabular-nums">{formatBRL(quote.totals?.itemsSubtotal ?? cart.estimatedTotal)}</span>
        </div>
        <p className="text-xs text-muted">Taxa de entrega, quando houver, é confirmada pela equipe.</p>
        <ButtonLink href="/checkout" size="lg" className="w-full" aria-disabled={hasErrors} onClick={(e) => hasErrors && e.preventDefault()}>
          Continuar
        </ButtonLink>
        <ButtonLink href="/cardapio" variant="ghost" className="w-full">
          Adicionar mais itens
        </ButtonLink>
      </aside>
    </div>
  );
}

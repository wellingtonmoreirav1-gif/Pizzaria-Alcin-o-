'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { PricedLine, PricingError } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { useCart } from '@/components/cart/cart-context';

export interface RepeatItem {
  productId: string | null;
  halfProductId?: string | null;
  variantId: string | null;
  quantity: number;
  notes: string | null;
  options: { groupId: string | null; valueId: string | null }[];
}

/**
 * "Pedir novamente": recupera itens e opções do pedido anterior, mas confere
 * preços, disponibilidade e regras ATUAIS antes de colocar no carrinho.
 */
export function RepeatOrderButton({ items }: { items: RepeatItem[] }) {
  const cart = useCart();
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState<string[] | null>(null);

  async function repeat() {
    setLoading(true);
    setProblems(null);
    const usable = items.filter((i) => i.productId);
    const selections = usable.map((i) => {
      const options: Record<string, string[]> = {};
      for (const o of i.options) {
        if (!o.groupId || !o.valueId) continue;
        (options[o.groupId] ??= []).push(o.valueId);
      }
      return { productId: i.productId as string, halfProductId: i.halfProductId ?? null, variantId: i.variantId, options, quantity: i.quantity, notes: i.notes };
    });
    try {
      const res = await fetch('/api/cart/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: selections }) });
      const data = (await res.json()) as {
        ok: boolean;
        lines: { index: number; ok: boolean; line?: PricedLine; error?: PricingError }[];
        meta: Record<string, { slug: string; imageUrl: string | null; maxQuantity: number; name: string }>;
      };
      if (!data.ok) throw new Error();
      const issues: string[] = [];
      if (usable.length < items.length) issues.push('Alguns produtos não existem mais no cardápio.');
      for (const q of data.lines) {
        const sel = selections[q.index];
        if (!sel) continue;
        if (!q.ok || !q.line) {
          issues.push(q.error?.message ?? 'Um item não está disponível.');
          continue;
        }
        const meta = data.meta[sel.productId];
        cart.add({
          ...sel,
          slug: meta?.slug ?? '',
          name: q.line.productName,
          variantName: q.line.variantName,
          summary: q.line.summary,
          imageUrl: meta?.imageUrl ?? null,
          unitPrice: q.line.unitPrice,
          unitRegular: q.line.unitRegular,
          maxQuantity: meta?.maxQuantity ?? 30,
        });
      }
      setProblems(issues);
      if (data.lines.some((l) => l.ok)) cart.setDrawerOpen(true);
    } catch {
      setProblems(['Não foi possível consultar o cardápio agora. Tente novamente.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={repeat} loading={loading}>
        <RotateCcw className="size-4" aria-hidden /> Pedir novamente
      </Button>
      {problems && problems.length > 0 ? (
        <Notice tone="warning" live title="Alguns itens não foram adicionados">
          {problems.join(' ')}
        </Notice>
      ) : null}
    </div>
  );
}

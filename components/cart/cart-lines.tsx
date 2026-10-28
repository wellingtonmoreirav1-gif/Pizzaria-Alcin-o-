'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { PricingError } from '@/lib/pricing';
import { QuantityStepper } from '@/components/ui/quantity';
import { useCart } from './cart-context';

export function CartLines({ lineErrors, onNavigate, compact }: { lineErrors: Record<string, PricingError>; onNavigate?: () => void; compact?: boolean }) {
  const { lines, setQuantity, remove } = useCart();
  return (
    <ul className="divide-y divide-line" data-testid="cart-lines">
      {lines.map((line) => {
        const error = lineErrors[line.lineId];
        return (
          <li key={line.lineId} className={cn('py-4', error && 'rounded-xl bg-brand-50/60 px-3')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold leading-snug">
                  {line.name}
                  {line.variantName ? <span className="font-normal text-muted"> — {line.variantName}</span> : null}
                </p>
                {line.summary.length ? (
                  <ul className="mt-1 space-y-0.5 text-xs text-muted">
                    {line.summary.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : null}
                {line.notes ? <p className="mt-1 text-xs italic text-muted">Obs.: {line.notes}</p> : null}
                {error ? (
                  <p className="mt-2 text-sm font-medium text-danger" role="alert">
                    {error.message}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-right tabular-nums">
                {line.unitRegular > line.unitPrice ? <s className="block text-xs text-muted">{formatBRL(line.unitRegular * line.quantity)}</s> : null}
                <span className="block font-semibold text-gold" data-testid="line-subtotal">
                  {formatBRL(line.unitPrice * line.quantity)}
                </span>
                <span className="block text-xs text-muted" data-testid="line-unit">
                  {line.quantity > 1 ? `${formatBRL(line.unitPrice)} cada` : 'preço unitário'}
                </span>
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <QuantityStepper
                size="sm"
                value={line.quantity}
                max={line.maxQuantity}
                onChange={(q) => setQuantity(line.lineId, q)}
                label={`Quantidade de ${line.name}`}
              />
              <div className="flex items-center gap-1">
                {!compact || line.summary.length || line.variantName ? (
                  <Link
                    href={`/produto/${line.slug}?editar=${line.lineId}`}
                    onClick={onNavigate}
                    className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium hover:bg-mist"
                    aria-label={`Editar ${line.name}`}
                  >
                    <Pencil className="size-4" aria-hidden /> Editar
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(line.lineId)}
                  className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium text-danger hover:bg-brand-50"
                  aria-label={`Remover ${line.name}`}
                >
                  <Trash2 className="size-4" aria-hidden /> Remover
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

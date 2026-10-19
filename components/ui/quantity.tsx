'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  label = 'Quantidade',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const btn = size === 'sm' ? 'size-8' : 'size-11';
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-white" role="group" aria-label={label}>
      <button
        type="button"
        className={cn(btn, 'grid place-items-center rounded-full text-ink-900 hover:bg-mist disabled:opacity-30')}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Diminuir quantidade"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <output className={cn('min-w-8 text-center font-semibold tabular-nums', size === 'sm' ? 'text-sm' : 'text-base')} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={cn(btn, 'grid place-items-center rounded-full text-ink-900 hover:bg-mist disabled:opacity-30')}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

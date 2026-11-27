'use client';

import { useOptimistic, useTransition } from 'react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { toggleAvailability } from '@/app/admin/(painel)/operacao/actions';

/** Interruptor rápido "disponível / esgotado". */
export function AvailabilityToggle({
  entity,
  id,
  available,
  label,
}: {
  entity: 'product' | 'variant' | 'option_value';
  id: string;
  available: boolean;
  label: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(available);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={`${label}: ${optimistic ? 'disponível' : 'esgotado'}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const res = await toggleAvailability(entity, id, !optimistic);
          toast(res.ok ? `${label}: ${res.message.toLowerCase()}` : res.message, res.ok ? 'success' : 'error');
        })
      }
      className={cn(
        'inline-flex h-8 min-w-28 items-center justify-center rounded-full px-3 text-xs font-bold transition-colors',
        optimistic ? 'bg-success-50 text-success-600 hover:bg-success-600/15' : 'bg-ink-900 text-white hover:bg-ink-700',
      )}
    >
      {optimistic ? 'Disponível' : 'Esgotado'}
    </button>
  );
}

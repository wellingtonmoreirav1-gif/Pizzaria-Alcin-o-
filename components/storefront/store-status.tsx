import { connection } from 'next/server';
import { computeStoreStatus } from '@/lib/business-hours';
import { getOperation } from '@/lib/catalog/queries';
import { cn } from '@/lib/utils';

/** Indicador de funcionamento calculado no servidor no momento da requisição. */
export async function StoreStatusPill({ className, showMessage }: { className?: string; showMessage?: boolean }) {
  await connection();
  const { data } = await getOperation();
  const status = computeStoreStatus(data.hours, new Date());
  const open = status.acceptingOrders;
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs font-semibold', className)} role="status" data-testid="store-status">
      <span className={cn('relative flex size-2.5')} aria-hidden>
        {open ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-60" /> : null}
        <span className={cn('relative inline-flex size-2.5 rounded-full', open ? 'bg-[#22c55e]' : 'bg-brand-600')} />
      </span>
      <span>{open ? (status.closesAtLabel ? `Aberto · ${status.closesAtLabel}` : 'Aberto agora') : status.reason === 'paused' ? 'Pausado' : 'Fechado'}</span>
      {showMessage && !open ? <span className="font-normal opacity-80">— {status.message}</span> : null}
    </span>
  );
}

export function StoreStatusFallback({ className }: { className?: string }) {
  return <span className={cn('skeleton inline-block h-4 w-24 rounded-full', className)} aria-hidden />;
}

/** Faixa de aviso exibida quando a loja não está aceitando pedidos. */
export async function ClosedBanner() {
  await connection();
  const { data, error } = await getOperation();
  const status = computeStoreStatus(data.hours, new Date());
  if (status.acceptingOrders && !error) return null;
  return (
    <div className="bg-ink-900 px-4 py-2.5 text-center text-sm text-white" role="status">
      <strong className="font-semibold">{status.reason === 'open' ? 'Aviso:' : 'Não estamos recebendo pedidos agora.'}</strong>{' '}
      <span className="text-white/80">
        {error ? 'Alguns dados podem estar desatualizados.' : status.message} Você pode montar o carrinho — ele fica salvo neste aparelho.
      </span>
    </div>
  );
}

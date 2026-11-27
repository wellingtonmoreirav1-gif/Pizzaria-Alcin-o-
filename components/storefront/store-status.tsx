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
        {open ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-success-600 opacity-60" /> : null}
        <span className={cn('relative inline-flex size-2.5 rounded-full', open ? 'bg-success-600' : 'bg-brand-600')} />
      </span>
      <span>{open ? (status.closesAtLabel ? `Aberto · ${status.closesAtLabel}` : 'Aberto agora') : status.reason === 'paused' ? 'Pausado' : 'Fechado'}</span>
      {showMessage && !open ? <span className="font-normal opacity-80">— {status.message}</span> : null}
    </span>
  );
}

export function StoreStatusFallback({ className }: { className?: string }) {
  return <span className={cn('skeleton inline-block h-4 w-24 rounded-full', className)} aria-hidden />;
}

/** "Estamos fechados agora. Abrimos hoje às 10h30 (almoço)." → "Abrimos hoje às 10h30 (almoço)." */
const shortMessage = (message: string) =>
  message.replace(/estamos fechados agora\.\s*/i, '').replace(/^pedidos pausados por alguns minutos\.\s*/i, '').trim();

/** Faixa de aviso exibida quando a loja não está aceitando pedidos. */
export async function ClosedBanner() {
  await connection();
  const { data, error } = await getOperation();
  const status = computeStoreStatus(data.hours, new Date());
  if (status.acceptingOrders && !error) return null;
  return (
    // Curta (uma linha no celular): a página pula menos quando a faixa aparece. Na finalização
    // do pedido ela some, porque o aviso já está na própria página (ver globals.css).
    <div className="border-b border-line bg-mist px-4 py-2 text-center text-sm text-fg" role="status" data-closed-banner>
      <strong className="font-semibold">{error ? 'Aviso:' : status.reason === 'paused' ? 'Pedidos pausados.' : 'Fechado agora.'}</strong>{' '}
      <span className="text-muted-strong">
        {error ? 'Alguns dados podem estar desatualizados.' : shortMessage(status.message)} Seu carrinho fica salvo.
      </span>
    </div>
  );
}

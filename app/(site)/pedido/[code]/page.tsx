import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { getOrderIdByCode, getOrderSnapshot, type OrderView } from '@/lib/orders/snapshot';
import { verifyOrderAccessToken } from '@/lib/orders/token';
import { getSessionUser } from '@/lib/auth/session';
import { getOperation } from '@/lib/catalog/queries';
import { buildOrderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';
import { formatBrazilPhone } from '@/lib/phone';
import { CANCEL_REASON_LABEL, ORDER_STATUS_CUSTOMER_TEXT, ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/orders/labels';
import { SITE_URL } from '@/config/business';
import { cn } from '@/lib/utils';
import { EmptyState, Notice, Skeleton } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { OrderSummary } from '@/components/order/order-summary';
import { WhatsAppActions } from '@/components/order/whatsapp-actions';
import { ReviewForm } from '@/components/order/review-form';
import { AutoRefresh } from '@/components/order/auto-refresh';
import { RepeatOrderButton } from '@/components/order/repeat-order';

export const metadata: Metadata = { title: 'Seu pedido', robots: { index: false, follow: false } };

export default function OrderPage({ params, searchParams }: PageProps<'/pedido/[code]'>) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<Skeleton className="h-[32rem]" />}>
        <OrderContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const FLOW: OrderStatus[] = ['registered', 'customer_confirmed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'];

async function OrderContent({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === 'string' ? sp.t : null;
  const isNew = sp.novo === '1';

  const orderId = await getOrderIdByCode(code.toUpperCase());
  let order: OrderView | null = null;
  if (orderId) {
    const tokenOk = token ? verifyOrderAccessToken(orderId, token) : false;
    const candidate = await getOrderSnapshot(orderId);
    if (candidate && !tokenOk) {
      const user = await getSessionUser().catch(() => null);
      if (user && candidate.customerId === user.id) order = candidate;
    } else if (tokenOk) {
      order = candidate;
    }
  }
  if (!order) {
    return (
      <EmptyState title="Pedido não encontrado" action={<ButtonLink href="/">Voltar ao início</ButtonLink>}>
        Confira o link recebido. Por segurança, o acompanhamento só abre com o link completo gerado no envio do pedido ou entrando na sua conta.
      </EmptyState>
    );
  }

  const { data: operation } = await getOperation();
  const whatsappNumber = operation.settings.whatsappNumber;
  const trackingUrl = token ? `${SITE_URL}/pedido/${order.code}?t=${token}` : null;
  const message = buildOrderMessage({ ...order.whatsapp, trackingUrl });
  const waUrl = buildWhatsAppUrl(whatsappNumber, message);
  const phoneDisplay = formatBrazilPhone(whatsappNumber.slice(2));
  const final = order.status === 'completed' || order.status === 'cancelled';
  const steps = FLOW.filter((s) => s !== 'out_for_delivery' || order.fulfillment === 'delivery');
  const reachedIndex = steps.indexOf(order.status);

  return (
    <div className="space-y-6">
      {!final ? <AutoRefresh /> : null}
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Pedido #{order.code}</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          {isNew && order.status === 'registered' ? 'Falta só enviar no WhatsApp!' : ORDER_STATUS_LABEL[order.status]}
        </h1>
        <p className="text-muted">{ORDER_STATUS_CUSTOMER_TEXT[order.status]}</p>
      </header>

      {order.status === 'registered' ? (
        <section className="space-y-4 rounded-[var(--radius-card)] border-2 border-[#1f8f4e]/50 bg-success-50 p-5 sm:p-6" aria-labelledby="enviar">
          <h2 id="enviar" className="font-display text-xl font-semibold">
            1 passo para confirmar
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>
              Toque em <strong>Abrir WhatsApp com o pedido</strong>.
            </li>
            <li>
              No WhatsApp, toque em <strong>Enviar</strong>. A mensagem não é enviada automaticamente.
            </li>
            <li>Aguarde a equipe confirmar disponibilidade{order.fulfillment === 'delivery' ? ', taxa de entrega' : ''} e o pedido.</li>
          </ol>
          <WhatsAppActions code={order.code} token={token} url={waUrl} message={message} phoneDisplay={phoneDisplay} />
        </section>
      ) : null}

      {order.needsCustomerApproval && !final ? (
        <Notice tone="warning" title="O total do pedido foi atualizado">
          A equipe confirmou a taxa de entrega. Confira o novo total abaixo e responda no WhatsApp para confirmar.
        </Notice>
      ) : null}

      {order.status === 'cancelled' ? (
        <Notice tone="danger" title="Pedido cancelado">
          {order.cancelReason ? CANCEL_REASON_LABEL[order.cancelReason] : null}
          {order.cancelNote ? ` — ${order.cancelNote}` : ''}
        </Notice>
      ) : (
        <section aria-label="Andamento" className="rounded-[var(--radius-card)] border border-line p-5">
          <ol className="space-y-3">
            {steps.map((s, i) => {
              const done = i <= reachedIndex;
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  {done ? <CheckCircle2 className="size-5 text-success-600" aria-hidden /> : <Circle className="size-5 text-line" aria-hidden />}
                  <span className={cn(done ? 'font-semibold' : 'text-muted')}>{ORDER_STATUS_LABEL[s]}</span>
                  {s === 'registered' && order.whatsappOpenedAt ? <span className="text-xs text-muted">· WhatsApp aberto</span> : null}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section aria-labelledby="itens" className="rounded-[var(--radius-card)] border border-line p-5 sm:p-6">
        <h2 id="itens" className="mb-2 font-display text-xl font-semibold">
          Itens e valores
        </h2>
        <OrderSummary order={order} />
      </section>

      {order.status !== 'registered' && !final ? (
        <section className="rounded-[var(--radius-card)] border border-line p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Falar com a equipe</h2>
          <WhatsAppActions
            code={order.code}
            token={token}
            url={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Sobre o pedido #${order.code}:`)}`}
            message={message}
            phoneDisplay={phoneDisplay}
            primary={false}
          />
        </section>
      ) : null}

      {order.status === 'completed' && token ? (
        <section className="rounded-[var(--radius-card)] border border-line p-5" aria-labelledby="avaliar">
          <h2 id="avaliar" className="mb-3 font-display text-lg font-semibold">
            Como foi seu pedido?
          </h2>
          <ReviewForm code={order.code} token={token} defaultName={(order.customerName ?? '').split(' ')[0] ?? ''} />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <RepeatOrderButton
          items={order.items.map((i) => ({
            productId: i.productId,
            halfProductId: i.halfProductId,
            variantId: i.variantId,
            quantity: i.quantity,
            notes: i.notes,
            options: i.options.map((o) => ({ groupId: o.groupId, valueId: o.valueId })),
          }))}
        />
        <ButtonLink href="/cardapio" variant="ghost">
          Voltar ao cardápio
        </ButtonLink>
        {final ? null : <p className="w-full text-xs text-muted">Esta página atualiza o status sozinha.</p>}
      </div>
    </div>
  );
}

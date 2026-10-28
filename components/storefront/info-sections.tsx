import { Bike, Clock, MapPin, ShoppingBag, Star, Utensils } from 'lucide-react';
import type { PublicReview, SiteSettings } from '@/types/settings';
import type { BusinessHourRow } from '@/lib/business-hours';
import { HoursList } from './hours-list';

export function ReviewsSection({ reviews }: { reviews: PublicReview[] }) {
  // Só exibe avaliações reais aprovadas pela equipe. Sem avaliações, a seção não aparece.
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="avaliacoes" className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Quem pediu, contou</p>
        <h2 id="avaliacoes" className="font-display text-3xl font-semibold sm:text-4xl">
          Avaliações de clientes
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 6).map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line">
              <div className="flex gap-0.5" aria-label={`${r.rating} de 5 estrelas`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={i < r.rating ? 'size-4 fill-brand-600 text-brand-600' : 'size-4 text-line'} aria-hidden />
                ))}
              </div>
              {r.comment ? <p className="text-[0.95rem] leading-relaxed">“{r.comment}”</p> : null}
              <p className="mt-auto text-sm font-semibold">
                {r.authorName}
                {r.isVerified ? <span className="ml-2 text-xs font-normal text-muted">· pedido verificado</span> : null}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * @public Fora da página inicial desde que ela passou a terminar em "Bom saber"; mantida para reuso.
 */
export function InfoSections({ settings, hours }: { settings: SiteSettings; hours: BusinessHourRow[] }) {
  const address = [settings.addressLine, settings.city, settings.state].filter(Boolean).join(', ');
  const mapsQuery = encodeURIComponent(`${settings.businessName}, ${address}`);
  const modes = [
    settings.deliveryEnabled && {
      icon: <Bike className="size-5" aria-hidden />,
      title: 'Entrega',
      text: 'Informe o endereço e, se quiser, marque o local no mapa. A taxa é confirmada pela equipe no WhatsApp.',
    },
    settings.pickupEnabled && {
      icon: <ShoppingBag className="size-5" aria-hidden />,
      title: 'Retirada',
      text: 'Faça o pedido pelo site e retire no restaurante quando a equipe avisar que está pronto.',
    },
    settings.dineInEnabled && {
      icon: <Utensils className="size-5" aria-hidden />,
      title: 'Consumo no local',
      text: 'Já está no Alcinão? Faça o pedido pelo celular e informe a mesa.',
    },
  ].filter(Boolean) as { icon: React.ReactNode; title: string; text: string }[];

  return (
    <section aria-labelledby="como-funciona" className="py-12">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
        <div className="rounded-[var(--radius-card)] bg-surface p-7 ring-1 ring-line lg:col-span-1">
          <h2 id="como-funciona" className="font-display text-2xl font-semibold">
            Entrega e retirada
          </h2>
          {settings.deliveryInfoText ? <p className="mt-2 text-sm text-muted">{settings.deliveryInfoText}</p> : null}
          <ul className="mt-5 space-y-4">
            {modes.map((m) => (
              <li key={m.title} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600">{m.icon}</span>
                <span>
                  <span className="block font-semibold">{m.title}</span>
                  <span className="block text-sm text-muted">{m.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-7" id="localizacao">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <MapPin className="size-5 text-gold" aria-hidden /> Onde estamos
          </h2>
          <address className="mt-3 not-italic leading-relaxed">
            {settings.addressLine}
            <br />
            {settings.city}
            {settings.state ? ` – ${settings.state}` : ''}
            {settings.referencePoint ? (
              <>
                <br />
                <span className="text-muted">{settings.referencePoint}</span>
              </>
            ) : null}
          </address>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-mist px-4 text-sm font-semibold hover:bg-line"
          >
            Abrir no mapa
          </a>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-7" id="horarios">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Clock className="size-5 text-gold" aria-hidden /> Horários
          </h2>
          <HoursList hours={hours} />
          <p className="mt-4 text-xs text-muted">O almoço vai até acabar a comida. Fique de olho no aviso de funcionamento no topo do site.</p>
        </div>
      </div>
    </section>
  );
}

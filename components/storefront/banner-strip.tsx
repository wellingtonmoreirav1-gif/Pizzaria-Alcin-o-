'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { PublicBanner } from '@/types/settings';

/** Banners ativos dentro do período configurado (ofertas vencidas não aparecem). */
export function BannerStrip({ banners, now }: { banners: PublicBanner[]; now: Date }) {
  const active = banners.filter((b) => (!b.startsAt || new Date(b.startsAt) <= now) && (!b.endsAt || new Date(b.endsAt) > now));
  if (active.length === 0) return null;
  return (
    <section aria-label="Ofertas" className="bg-wine py-8 sm:py-10">
      <ul className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:px-6">
        {active.map((b) => {
          const content = (
            <div className="relative isolate flex min-h-44 flex-col justify-end overflow-hidden rounded-[var(--radius-card)] bg-ink-900 p-6 text-white">
              {b.imageUrl ? (
                <Image src={b.imageUrl} alt={b.imageAlt ?? ''} fill sizes="(max-width: 768px) 90vw, 50vw" className="-z-10 object-cover opacity-70" />
              ) : null}
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/90 to-transparent" aria-hidden />
              <h3 className="font-display text-2xl font-semibold">{b.title}</h3>
              {b.body ? <p className="mt-1 max-w-md text-sm text-white/80">{b.body}</p> : null}
              {b.ctaLabel ? <span className="mt-3 inline-flex w-fit rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold">{b.ctaLabel}</span> : null}
            </div>
          );
          return (
            <li key={b.id} className="w-[88%] shrink-0 snap-start md:w-[calc(50%-0.5rem)]">
              {b.ctaHref ? (
                <Link href={b.ctaHref} className="block">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

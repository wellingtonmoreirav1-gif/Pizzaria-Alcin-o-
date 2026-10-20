import Image from 'next/image';
import { ArrowRight, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import type { SiteSettings } from '@/types/settings';

/**
 * Primeira dobra. A foto principal é enviada em /admin/configuracoes; até lá
 * mostramos uma composição gráfica (sem fingir ser fotografia).
 */
export function Hero({ settings }: { settings: SiteSettings }) {
  const title = settings.heroTitle ?? 'Seu próximo sabor favorito está aqui.';
  const accent = 'Pizzas, lanches, petiscos e pratos da casa';
  const subtitle =
    settings.heroSubtitle ?? `${accent} do Alcinão em ${settings.city ?? 'São Bento'}. Monte seu pedido em poucos toques e envie pelo WhatsApp.`;
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      {settings.heroImageUrl ? (
        <>
          <Image src={settings.heroImageUrl} alt="" fill priority sizes="100vw" className="-z-10 object-cover object-center opacity-80" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/75 to-ink-950/10" aria-hidden />
        </>
      ) : (
        <HeroArt />
      )}
      <div className="grain absolute inset-0 -z-10" aria-hidden />
      {settings.logoUrl ? (
        // Logo oficial em destaque no topo (enviada em Painel → Fotos e logo).
        <div className="pointer-events-none absolute right-[4%] top-1/2 hidden -translate-y-1/2 lg:block" aria-hidden>
          <Image src={settings.logoUrl} alt="" width={480} height={480} sizes="24rem" className="h-80 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] xl:h-96" />
        </div>
      ) : null}
      <div className="mx-auto flex min-h-[min(78svh,44rem)] max-w-7xl flex-col justify-center gap-7 px-4 py-16 sm:px-6 md:py-24">
        {settings.logoUrl ? (
          <Image src={settings.logoUrl} alt="" width={480} height={480} sizes="8rem" className="-mb-2 h-32 w-auto self-start animate-[var(--animate-rise)] object-contain lg:hidden" />
        ) : null}
        <p className="inline-flex w-fit animate-[var(--animate-rise)] items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          <UtensilsCrossed className="size-3.5 text-gold" aria-hidden /> {settings.city ?? 'São Bento'} · {settings.state ?? 'PB'}
        </p>
        <h1 className="max-w-2xl animate-[var(--animate-rise)] text-balance font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        <p className="max-w-xl animate-[var(--animate-rise)] text-pretty text-lg leading-relaxed text-white/75 [animation-delay:160ms]">{subtitle}</p>
        <div className="flex animate-[var(--animate-rise)] flex-wrap gap-3 [animation-delay:240ms]">
          <ButtonLink href="/cardapio" size="lg">
            Pedir agora <ArrowRight className="size-5" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/cardapio" size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:border-white hover:bg-white/10">
            Ver cardápio
          </ButtonLink>
        </div>
        <p className="flex items-center gap-2 text-sm text-white/60">
          <MessageCircle className="size-4" aria-hidden /> Pedido confirmado pela equipe no WhatsApp
        </p>
      </div>
    </section>
  );
}

function HeroArt() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div className="absolute -right-40 top-1/2 size-[46rem] -translate-y-1/2 rounded-full bg-brand-700/25 blur-3xl md:-right-24" />
      <svg viewBox="0 0 600 600" className="absolute -right-48 top-1/2 w-[38rem] -translate-y-1/2 opacity-90 motion-safe:animate-[spin_120s_linear_infinite] sm:-right-24 md:w-[44rem] lg:right-0">
        <defs>
          <radialGradient id="crust" cx="50%" cy="50%" r="50%">
            <stop offset="86%" stopColor="#3a2a1f" />
            <stop offset="100%" stopColor="#1b1410" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="280" fill="url(#crust)" />
        <circle cx="300" cy="300" r="244" fill="#241a15" stroke="#c8102e" strokeOpacity=".5" strokeWidth="2" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <line key={i} x1="300" y1="300" x2={300 + 244 * Math.cos(a)} y2={300 + 244 * Math.sin(a)} stroke="#0c0a09" strokeWidth="5" />;
        })}
        {[[220, 210, 26], [370, 190, 22], [420, 330, 28], [300, 420, 24], [190, 360, 20], [300, 290, 18], [250, 140, 14], [450, 240, 12], [150, 260, 14], [360, 460, 12]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#c8102e" fillOpacity={0.75} />
        ))}
        {[[270, 250], [340, 360], [230, 300], [400, 280], [320, 200]].map(([x, y], i) => (
          <circle key={`w${i}`} cx={x} cy={y} r="7" fill="#fff" fillOpacity=".25" />
        ))}
      </svg>
    </div>
  );
}

import Image from 'next/image';
import { ArrowRight, ChevronDown, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { ButtonLink, buttonClasses } from '@/components/ui/button';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import type { SiteSettings } from '@/types/settings';
import { HeroLoop } from './hero-loop';

/** Título que vinha do cadastro inicial; trocado pelo letreiro "Sabor irresistível no Alcinão". */
const LEGACY_TITLE = 'Seu próximo sabor favorito está aqui.';

const GLASS_BUTTON = 'border-white/30 bg-black/25 text-white backdrop-blur-sm hover:border-white hover:bg-white/10';

/**
 * Primeira dobra: pizza que desmonta em loop (HeroLoop) e a apresentação da casa. Um título próprio cadastrado em /admin/configuracoes substitui o padrão.
 */
export function Hero({ settings }: { settings: SiteSettings }) {
  const customTitle = settings.heroTitle && settings.heroTitle !== LEGACY_TITLE ? settings.heroTitle : null;
  const subtitle =
    settings.heroSubtitle ?? `Pizzas, lanches, petiscos e pratos da casa em ${settings.city ?? 'São Bento'}. Monte seu pedido e envie pelo WhatsApp.`;
  return (
    <HeroLoop>
      <div className="max-w-xl">
        <p className="hidden w-fit items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-sm lg:inline-flex">
          <UtensilsCrossed className="size-3.5 text-gold" aria-hidden /> {settings.city ?? 'São Bento'} · {settings.state ?? 'PB'}
        </p>
        {customTitle ? (
          <h1 className="mt-4 text-balance font-display text-[2.4rem] font-bold leading-[1.05] tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] sm:text-6xl">
            {customTitle}
          </h1>
        ) : (
          // Letreiro "Sabor irresistível no Alcinão" (arte do restaurante, fundo recortado), com fade-in.
          <h1 className="lg:mt-4">
            <Image
              src="/hero/sabor-irresistivel.webp"
              alt="Sabor irresistível no Alcinão"
              width={1200}
              height={793}
              loading="eager"
              sizes="(max-width: 640px) 92vw, 560px"
              className="mx-auto h-auto w-full max-w-[19rem] drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)] motion-safe:animate-title-in sm:max-w-[30rem] lg:mx-0 lg:max-w-[35rem]"
            />
            <span className="sr-only">
              {' '}
              — pizzaria e churrascaria em {settings.city ?? 'São Bento'} ({settings.state ?? 'PB'})
            </span>
          </h1>
        )}
        {customTitle ? <p className="mt-5 hidden max-w-md text-pretty text-lg leading-relaxed text-white/80 sm:block">{subtitle}</p> : null}
      </div>

      <div className="mt-6 lg:mt-8">
        <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
          <ButtonLink href="/cardapio" size="lg">
            Pedir agora <ArrowRight className="size-5" aria-hidden />
          </ButtonLink>
          <a
            href={buildWhatsAppUrl(settings.whatsappNumber, 'Olá! Vim pelo site do Alcinão.')}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('outline', 'lg', GLASS_BUTTON)}
          >
            <MessageCircle className="size-5" aria-hidden /> Falar no WhatsApp
          </a>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70 lg:justify-start">
          <MessageCircle className="size-4" aria-hidden /> Pedido confirmado pela equipe no WhatsApp
        </p>
        <p className="mt-5 hidden items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 lg:flex motion-reduce:hidden" aria-hidden>
          <ChevronDown className="size-4 motion-safe:animate-bounce" /> Role para ver
        </p>
      </div>
    </HeroLoop>
  );
}

import { ArrowRight, ChevronDown, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { ButtonLink, buttonClasses } from '@/components/ui/button';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import type { SiteSettings } from '@/types/settings';
import { HeroScroll } from './hero-scroll';

/** Título que vinha do cadastro inicial; trocado pela apresentação "Conheça a ALCINÃO". */
const LEGACY_TITLE = 'Seu próximo sabor favorito está aqui.';

const CAPTION = 'max-w-md font-display lg:max-w-2xl lg:text-7xl text-[2.6rem] font-bold italic leading-[1.02] tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] sm:text-6xl';
const GLASS_BUTTON = 'border-white/30 bg-black/25 text-white backdrop-blur-sm hover:border-white hover:bg-white/10';

/**
 * Primeira dobra: pizza que desmonta conforme a rolagem (HeroScroll) e a apresentação
 * da casa. Um título próprio cadastrado em /admin/configuracoes substitui o padrão.
 */
export function Hero({ settings }: { settings: SiteSettings }) {
  const customTitle = settings.heroTitle && settings.heroTitle !== LEGACY_TITLE ? settings.heroTitle : null;
  const subtitle =
    settings.heroSubtitle ?? `Pizzas, lanches, petiscos e pratos da casa em ${settings.city ?? 'São Bento'}. Monte seu pedido e envie pelo WhatsApp.`;
  return (
    <HeroScroll
      captions={[
        <p key="queijo" className={CAPTION}>
          Muçarela <span className="text-gold">que puxa.</span>
        </p>,
        <p key="camadas" className={CAPTION}>
          Camada <span className="text-gold">por camada.</span>
        </p>,
      ]}
      pinned={
        <ButtonLink href="/cardapio" size="lg" className="shadow-[var(--shadow-float)]">
          Pedir agora <ArrowRight className="size-5" aria-hidden />
        </ButtonLink>
      }
      outro={
        <div className="max-w-md lg:max-w-xl">
          <h2 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
            Agora é <span className="italic text-gold">a sua vez.</span>
          </h2>
          <p className="mt-3 text-pretty text-white/85 sm:text-lg">Escolha o sabor e o tamanho. A equipe confirma o pedido no WhatsApp.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/cardapio?categoria=pizzas-tradicionais" size="lg">
              Escolher minha pizza <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/cardapio" size="lg" variant="outline" className={GLASS_BUTTON}>
              Ver cardápio
            </ButtonLink>
          </div>
        </div>
      }
    >
      <div className="max-w-xl">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-sm">
          <UtensilsCrossed className="size-3.5 text-gold" aria-hidden /> {settings.city ?? 'São Bento'} · {settings.state ?? 'PB'}
        </p>
        {customTitle ? (
          <h1 className="mt-4 text-balance font-display text-[2.4rem] font-bold leading-[1.05] tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] sm:text-6xl">
            {customTitle}
          </h1>
        ) : (
          <h1 className="mt-4 font-display leading-none drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
            <span className="block text-2xl font-semibold sm:text-3xl">Conheça a</span>
            <span className="mt-1 block text-[3.4rem] font-black uppercase tracking-tight sm:text-7xl lg:text-8xl">Alcinão</span>
            <span className="mt-2 block text-[1.7rem] font-semibold italic text-gold sm:text-4xl">pizzaria e churrascaria</span>
          </h1>
        )}
        <p className="mt-5 hidden max-w-md text-pretty text-lg leading-relaxed text-white/80 sm:block">{subtitle}</p>
      </div>

      <div className="mt-auto lg:mt-8">
        <div className="flex flex-wrap gap-3">
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
        <p className="mt-4 flex items-center gap-2 text-sm text-white/70">
          <MessageCircle className="size-4" aria-hidden /> Pedido confirmado pela equipe no WhatsApp
        </p>
        <p className="mt-5 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 motion-reduce:hidden" aria-hidden>
          <ChevronDown className="size-4 motion-safe:animate-bounce" /> Role para ver
        </p>
      </div>
    </HeroScroll>
  );
}

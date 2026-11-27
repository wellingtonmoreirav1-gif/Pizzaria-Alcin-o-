import Image from 'next/image';
import { ArrowDown, MessageCircle } from 'lucide-react';
import { ButtonLink, buttonClasses } from '@/components/ui/button';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import type { SiteSettings } from '@/types/settings';
import { HeroCover } from './hero-cover';

/** Título que vinha do cadastro inicial (não é mostrado). */
const LEGACY_TITLE = 'Seu próximo sabor favorito está aqui.';

const GLASS_BUTTON = 'border-white/30 bg-black/25 text-white backdrop-blur-sm hover:border-white hover:bg-white/10';

/**
 * Capa: o logo "Pizzaria Alcinão" à esquerda e o personagem à direita, apontando para ele,
 * sobre o fundo preto. "Pedir agora" desce até os catálogos da própria página inicial.
 * Uma frase própria cadastrada em /admin/configuracoes aparece embaixo do logo.
 */
export function Hero({ settings }: { settings: SiteSettings }) {
  const customTitle = settings.heroTitle && settings.heroTitle !== LEGACY_TITLE ? settings.heroTitle : null;
  const city = `${settings.city ?? 'São Bento'} (${settings.state ?? 'PB'})`;
  return (
    <HeroCover>
      {/* Celular: logo e personagem lado a lado, botões embaixo. Computador: logo e botões à esquerda, personagem à direita. */}
      <div className="grid grid-cols-[1.25fr_1fr] items-center gap-x-1 lg:grid-cols-[1.05fr_1fr] lg:gap-x-10">
        <h1 className="col-start-1 row-start-1 lg:self-end">
          <Image
            src="/hero/logo-alcinao.webp"
            alt="Pizzaria Alcinão"
            width={1200}
            height={719}
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 1024px) 55vw, 600px"
            className="h-auto w-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.6)] motion-safe:animate-title-in lg:max-w-[38rem]"
          />
          <span className="sr-only"> — pizzaria e churrascaria em {city}</span>
        </h1>
        <div className="col-start-2 row-start-1 self-end lg:row-span-2">
          <Image
            src="/hero/personagem.webp"
            alt=""
            width={1016}
            height={1100}
            loading="eager"
            sizes="(max-width: 1024px) 45vw, 520px"
            className="ml-auto h-auto w-full [mask-image:linear-gradient(to_bottom,black_82%,transparent)] lg:max-w-[34rem] lg:[mask-image:none]"
          />
        </div>

        <div className="col-span-2 row-start-2 pb-8 pt-5 lg:col-span-1 lg:col-start-1 lg:self-start lg:pb-16 lg:pt-8">
          {customTitle ? <p className="mb-5 text-center text-lg font-semibold text-white/90 lg:text-left lg:text-xl">{customTitle}</p> : null}
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <ButtonLink href="#cardapio" size="lg">
              Pedir agora <ArrowDown className="size-5" aria-hidden />
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
        </div>
      </div>
    </HeroCover>
  );
}

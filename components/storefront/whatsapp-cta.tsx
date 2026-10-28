import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { SiteSettings } from '@/types/settings';

/** Chamada final da página inicial, nas cores do WhatsApp. */
export function WhatsAppCta({ settings }: { settings: SiteSettings }) {
  const chat = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent('Olá! Vim pelo site do Alcinão.')}`;
  return (
    <section aria-labelledby="cta-whatsapp-titulo" className="bg-[radial-gradient(ellipse_80%_90%_at_50%_0%,#1a7a45_0%,#0f4d2c_55%,#0a3520_100%)] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between md:py-14">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9ff0c0]">Pedido rápido</p>
          <h2 id="cta-whatsapp-titulo" className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Peça agora pelo <span className="italic">WhatsApp</span>
          </h2>
          <p className="mt-2 text-white/85">Monte seu pedido no site e envie para a equipe em poucos toques. Ficou com alguma dúvida? Chame a gente.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cardapio"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 font-semibold text-[#0a3520] transition-colors hover:bg-white/90"
          >
            Montar meu pedido <ArrowRight className="size-5" aria-hidden />
          </Link>
          <a
            href={chat}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#25d366] px-5 font-semibold text-[#062b16] transition-colors hover:bg-[#3ee07a]"
          >
            <MessageCircle className="size-5" aria-hidden /> Falar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

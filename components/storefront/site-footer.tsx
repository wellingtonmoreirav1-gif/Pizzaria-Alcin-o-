import Link from 'next/link';
import { MapPin, MessageCircle } from 'lucide-react';
import { getOperation } from '@/lib/catalog/queries';
import { formatBrazilPhone } from '@/lib/phone';
import { BrandLogo } from './brand-logo';
import { HoursList } from './hours-list';

export async function SiteFooter() {
  const { data } = await getOperation();
  const s = data.settings;
  const phone = s.whatsappNumber.startsWith('55') ? s.whatsappNumber.slice(2) : s.whatsappNumber;
  return (
    <footer className="mt-20 bg-ink-950 text-white">
      <div className="grain">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr]">
          <div className="space-y-4">
            <BrandLogo logoUrl={s.logoUrl} name={s.businessName} tone="light" />
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              {s.businessName}. Pizzas, almoço e churrasco em {s.city ?? 'São Bento'}
              {s.state ? `/${s.state}` : ''}.
            </p>
            <p className="flex items-start gap-2 text-sm text-white/80">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
              <span>
                {s.addressLine}
                {s.city ? `, ${s.city}` : ''}
                {s.state ? ` – ${s.state}` : ''}
                {s.referencePoint ? (
                  <>
                    <br />
                    <span className="text-white/60">{s.referencePoint}</span>
                  </>
                ) : null}
              </span>
            </p>
            <a href={`https://wa.me/${s.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-brand-500">
              <MessageCircle className="size-4" aria-hidden /> WhatsApp {formatBrazilPhone(phone)}
            </a>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Horários</h2>
            <HoursList hours={data.hours.hours} tone="light" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Links</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li><Link href="/cardapio" className="hover:text-white">Cardápio completo</Link></li>
              <li><Link href="/favoritos" className="hover:text-white">Favoritos</Link></li>
              <li><Link href="/conta" className="hover:text-white">Minha conta e pedidos</Link></li>
              <li><Link href="/privacidade" className="hover:text-white">Política de privacidade</Link></li>
              <li><Link href="/termos" className="hover:text-white">Termos de uso</Link></li>
              <li><Link href="/admin" className="text-white/50 hover:text-white">Área da equipe</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/50">
          © {s.businessName}. Pedidos confirmados pela equipe via WhatsApp.
        </div>
      </div>
    </footer>
  );
}

import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Espaço da logo oficial. Enquanto a logo não for enviada em /admin/configuracoes,
 * exibe apenas o NOME em texto (não é uma nova logo). Veja docs/LOGO-E-IMAGENS.md.
 */
export function BrandLogo({ logoUrl, name, tone = 'dark', className }: { logoUrl: string | null; name: string; tone?: 'dark' | 'light'; className?: string }) {
  if (logoUrl) {
    return (
      <span className={cn('relative block h-11 w-28', className)}>
        <Image src={logoUrl} alt={name} fill sizes="112px" className="object-contain object-left" priority />
      </span>
    );
  }
  return (
    <span className={cn('flex flex-col leading-none', className)} aria-label={name}>
      <span className={cn('text-[0.58rem] font-semibold uppercase tracking-[0.22em]', tone === 'dark' ? 'text-muted' : 'text-white/60')}>
        Pizzaria &amp; Churrascaria
      </span>
      <span className={cn('font-display text-[1.6rem] font-bold italic tracking-tight', tone === 'dark' ? 'text-ink-950' : 'text-white')}>
        Alcinão<span className="text-brand-600">.</span>
      </span>
    </span>
  );
}

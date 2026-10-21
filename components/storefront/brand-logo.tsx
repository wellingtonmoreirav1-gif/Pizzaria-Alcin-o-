import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Espaço da logo oficial. Enquanto a logo não for enviada no painel (Fotos e logo),
 * exibe apenas o NOME em texto (não é uma nova logo). Veja docs/LOGO-E-IMAGENS.md.
 * A logo mantém a proporção original (redonda, quadrada ou horizontal): a altura é
 * fixa e a largura acompanha o arquivo.
 */
export function BrandLogo({
  logoUrl,
  name,
  tone = 'dark',
  size = 'sm',
  className,
}: {
  logoUrl: string | null;
  name: string;
  tone?: 'dark' | 'light';
  size?: 'sm' | 'lg';
  className?: string;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={480}
        height={480}
        sizes={size === 'lg' ? '240px' : '120px'}
        loading={size === 'sm' ? 'eager' : undefined}
        className={cn('w-auto object-contain', size === 'lg' ? 'h-24 max-w-60' : 'h-12 max-w-36 sm:h-14', className)}
      />
    );
  }
  return (
    <span className={cn('flex flex-col leading-none', className)} aria-label={name}>
      <span className={cn('text-[0.58rem] font-semibold uppercase tracking-[0.22em]', tone === 'dark' ? 'text-muted' : 'text-white/60')}>
        Pizzaria &amp; Churrascaria
      </span>
      <span className={cn('font-display text-[1.6rem] font-bold italic tracking-tight', tone === 'dark' ? 'text-fg' : 'text-white')}>
        Alcinão<span className="text-brand-600">.</span>
      </span>
    </span>
  );
}

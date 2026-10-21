import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Foto do produto com espaço reservado (sem saltos de layout). Quando ainda não há
 * foto cadastrada, mostra uma arte neutra — NUNCA uma foto de outro produto.
 */
export function ProductImage({
  src,
  alt,
  name,
  sizes = '(max-width: 640px) 50vw, 25vw',
  priority,
  className,
}: {
  src: string | null;
  alt: string | null;
  name: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative aspect-[4/3] overflow-hidden bg-ink-900', className)}>
      {src ? (
        <Image
          src={src}
          alt={alt ?? name}
          fill
          sizes={sizes}
          loading={priority ? 'eager' : undefined}
          // Ilustrações provisórias em SVG (public/images/products) não passam pela otimização.
          unoptimized={src.endsWith('.svg')}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="grain absolute inset-0 grid place-items-center" role="img" aria-label={`Foto de ${name} em breve`}>
          <svg viewBox="0 0 120 120" className="w-1/3 text-brand-600/80" aria-hidden>
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="5" />
            <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="3" strokeDasharray="4 7" />
            <path d="M60 60 L60 10 A50 50 0 0 1 103 35 Z" fill="currentColor" fillOpacity=".9" />
            <circle cx="45" cy="70" r="5" fill="currentColor" fillOpacity=".5" />
            <circle cx="72" cy="78" r="4" fill="currentColor" fillOpacity=".5" />
            <circle cx="62" cy="44" r="3.5" fill="#fff" fillOpacity=".5" />
          </svg>
          <span className="absolute bottom-2 left-0 right-0 text-center text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/75">
            Foto em breve
          </span>
        </div>
      )}
    </div>
  );
}

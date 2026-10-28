'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CatalogProduct } from '@/types/catalog';
import { formatBRL } from '@/lib/money';
import { isProductOrderable, startingPrice } from '@/lib/pricing';
import { useNow } from '@/lib/use-now';
import { buttonClasses } from '@/components/ui/button';
import { useProductDialog } from './product-dialog';

export interface WeeklyFeatureConfig {
  /** Nome em destaque (pode ser diferente do nome no cardápio). */
  title: string;
  /** Produto do cardápio que o botão abre. */
  productSlug: string;
  /** Imagem parada: aparece na hora e fica no lugar do vídeo para quem pede menos movimento. */
  image: string;
  imageAlt: string;
  /** Vídeo em loop, sem som (opcional). MP4 primeiro (mais leve); WebM para navegadores sem H.264. */
  video?: { mp4: string; webm: string };
}

/**
 * Destaque da semana: foto grande do lanche ocupando a metade direita da tela e, à
 * esquerda, o nome e o botão de pedido (abre a janela do produto para escolher a quantidade).
 * Sem o produto no cardápio (ou indisponível), o botão leva à lista de lanches.
 */
export function WeeklyFeature({ config, product, fetchedAt }: { config: WeeklyFeatureConfig; product?: CatalogProduct; fetchedAt: string }) {
  const now = useNow(fetchedAt);
  const dialog = useProductDialog();
  const orderable = product ? isProductOrderable(product, now) : false;
  const price = product && orderable ? startingPrice(product, now) : null;
  const titleId = 'destaque-semana-titulo';
  const videoRef = useRef<HTMLVideoElement>(null);

  // O vídeo só baixa perto da tela e pausa fora dela; com "menos movimento" ou economia
  // de dados fica só a imagem parada.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduce || saveData) return;
    const onPlaying = () => (video.dataset.ready = 'true');
    video.addEventListener('playing', onPlaying);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (video.preload !== 'auto') {
            video.preload = 'auto';
            video.load();
          }
          video.play().catch(() => {});
        } else video.pause();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(video);
    return () => {
      io.disconnect();
      video.removeEventListener('playing', onPlaying);
    };
  }, []);
  const media = config.video
    ? 'object-cover [mask-image:linear-gradient(to_bottom,black_75%,transparent)] lg:[mask-image:radial-gradient(closest-side,black_62%,transparent_100%)]'
    : 'object-cover [mask-image:linear-gradient(to_bottom,black_75%,transparent)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_18%)]';

  return (
    <section
      id="em-alta"
      aria-labelledby={titleId}
      className="relative overflow-hidden border-y-2 border-gold/70 bg-[linear-gradient(90deg,var(--color-wine-900)_0%,var(--color-wine-700)_45%,#450001_100%)] text-white"
    >
      <div className="lg:grid lg:min-h-[36rem] lg:grid-cols-2 lg:items-center xl:min-h-[40rem]">
        {/* Foto: em cima no celular; metade direita da tela no computador, sangrando até a borda. */}
        <div className="relative aspect-[1600/1038] w-full lg:order-2 lg:aspect-auto lg:h-full lg:min-h-[36rem] xl:min-h-[40rem]">
          {/* Com vídeo (16:9): no computador fica numa caixa 16:9 centralizada, com todas as bordas
              sumindo no fundo; no celular, igual à foto. */}
          <div className={config.video ? 'absolute inset-0 lg:inset-y-auto lg:top-1/2 lg:aspect-video lg:-translate-y-1/2' : 'absolute inset-0'}>
            <Image src={config.image} alt={config.imageAlt} fill sizes="(max-width: 1024px) 100vw, 50vw" className={media} />
            {config.video ? (
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="none"
                disablePictureInPicture
                aria-hidden
                className={`absolute inset-0 size-full opacity-0 transition-opacity duration-500 data-[ready=true]:opacity-100 ${media}`}
                data-testid="weekly-video"
              >
                <source src={config.video.mp4} type="video/mp4" />
                <source src={config.video.webm} type="video/webm" />
              </video>
            ) : null}
          </div>
        </div>

        <div className="relative px-4 pb-12 pt-2 sm:px-6 lg:order-1 lg:py-16 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-10">
          <h2 id={titleId} className="font-display leading-[0.95] tracking-tight">
            <span className="block text-2xl font-semibold italic text-gold sm:text-3xl lg:text-4xl">Destaque da semana:</span>
            <span className="mt-2 block text-balance text-[3.2rem] font-black sm:text-7xl xl:text-8xl">{config.title}</span>
          </h2>
          {price ? (
            <p className="mt-5 text-xl text-white/85 sm:text-2xl lg:text-3xl">
              <span className="font-bold tabular-nums text-gold">{formatBRL(price.current)}</span>
            </p>
          ) : null}
          <div className="mt-8">
            {product && orderable ? (
              // Link para a página do lanche (funciona antes de a página carregar); depois, abre a janela de pedido.
              <Link
                href={`/produto/${product.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  dialog.open(product, fetchedAt);
                }}
                className={buttonClasses('primary', 'lg', 'shadow-[var(--shadow-float)] lg:h-16 lg:px-9 lg:text-lg')}
              >
                Pedir agora <ArrowRight className="size-5" aria-hidden />
              </Link>
            ) : (
              <Link
                href="/cardapio?categoria=lanches-tradicionais"
                className={buttonClasses('primary', 'lg', 'shadow-[var(--shadow-float)] lg:h-16 lg:px-9 lg:text-lg')}
              >
                Pedir agora <ArrowRight className="size-5" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

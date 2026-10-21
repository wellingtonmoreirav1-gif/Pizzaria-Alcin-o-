'use client';

import Image from 'next/image';
import Link from 'next/link';
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
  image: string;
  imageAlt: string;
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

  return (
    <section
      id="em-alta"
      aria-labelledby={titleId}
      className="relative overflow-hidden border-y-2 border-gold/70 bg-[linear-gradient(90deg,var(--color-wine-900)_0%,var(--color-wine-700)_45%,#450001_100%)] text-white"
    >
      <div className="lg:grid lg:min-h-[36rem] lg:grid-cols-2 lg:items-center xl:min-h-[40rem]">
        {/* Foto: em cima no celular; metade direita da tela no computador, sangrando até a borda. */}
        <div className="relative aspect-[1600/1038] w-full lg:order-2 lg:aspect-auto lg:h-full lg:min-h-[36rem] xl:min-h-[40rem]">
          <Image
            src={config.image}
            alt={config.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover [mask-image:linear-gradient(to_bottom,black_75%,transparent)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_18%)]"
          />
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
              <Link href="/cardapio?categoria=lanches-tradicionais" className={buttonClasses('primary', 'lg', 'shadow-[var(--shadow-float)] lg:h-16 lg:px-9 lg:text-lg')}>
                Pedir agora <ArrowRight className="size-5" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

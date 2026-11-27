import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronLeft } from 'lucide-react';
import { getCatalog } from '@/lib/catalog/queries';
import { ProductPageClient } from '@/components/storefront/product-page-client';
import { Skeleton } from '@/components/ui/feedback';
import { SITE_URL } from '@/config/business';
import { startingPrice } from '@/lib/pricing';
import { centsToDecimal } from '@/lib/money';

export async function generateStaticParams() {
  const { data } = await getCatalog();
  const slugs = data.products.map((p) => ({ slug: p.slug }));
  return slugs.length ? slugs : [{ slug: 'exemplo' }];
}

export async function generateMetadata({ params }: PageProps<'/produto/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getCatalog();
  const product = data.products.find((p) => p.slug === slug);
  if (!product) return { title: 'Produto não encontrado' };
  const description = product.shortDescription ?? product.description ?? `${product.name} no cardápio do Alcinão em São Bento (PB).`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: { title: product.name, description, images: product.imageUrl ? [{ url: product.imageUrl, alt: product.imageAlt ?? product.name }] : undefined },
  };
}

export default function ProductPage({ params }: PageProps<'/produto/[slug]'>) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/cardapio" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-strong hover:text-fg">
        <ChevronLeft className="size-4" aria-hidden /> Voltar ao cardápio
      </Link>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await getCatalog();
  const product = data.products.find((p) => p.slug === slug);
  if (!product) notFound();
  const price = startingPrice(product, new Date(data.fetchedAt));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: product.name,
    description: product.description ?? product.shortDescription ?? undefined,
    image: product.imageUrl ?? undefined,
    url: `${SITE_URL}/produto/${product.slug}`,
    // Só publica oferta (Google) quando o preço foi conferido pelo restaurante.
    offers:
      price && product.priceConfirmed
        ? {
            '@type': 'Offer',
            price: centsToDecimal(price.current),
            priceCurrency: 'BRL',
            availability: product.isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          }
        : undefined,
  };
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD gerado no servidor, com '<' escapado. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ProductPageClient product={product} fetchedAt={data.fetchedAt} />
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Skeleton className="aspect-[4/3]" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

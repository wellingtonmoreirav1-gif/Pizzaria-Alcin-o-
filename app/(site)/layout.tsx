import { Suspense } from 'react';
import { getCatalog } from '@/lib/catalog/queries';
import { StoreProviders } from '@/components/storefront/providers';
import { SiteHeader } from '@/components/storefront/site-header';
import { SiteFooter } from '@/components/storefront/site-footer';
import { ClosedBanner } from '@/components/storefront/store-status';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { MobileCartBar } from '@/components/cart/mobile-cart-bar';

const SUGGESTION_CATEGORIES = new Set(['bebidas', 'sobremesas', 'porcoes']);

export default async function SiteLayout({ children }: LayoutProps<'/'>) {
  const { data: catalog } = await getCatalog();
  const suggestions = catalog.products.filter((p) => SUGGESTION_CATEGORIES.has(p.categorySlug)).slice(0, 12);
  return (
    <StoreProviders>
      <div className="theme-dark flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <ClosedBanner />
      </Suspense>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {/* Leem a URL atual (usePathname): ficam fora do HTML estático e carregam no cliente. */}
      <Suspense fallback={null}>
        <CartDrawer suggestions={suggestions} fetchedAt={catalog.fetchedAt} />
        <MobileCartBar />
      </Suspense>
      </div>
    </StoreProviders>
  );
}

import { Suspense } from 'react';
import { getCatalog } from '@/lib/catalog/queries';
import { StoreProviders } from '@/components/storefront/providers';
import { SiteHeader } from '@/components/storefront/site-header';
import { SiteFooter } from '@/components/storefront/site-footer';
import { ClosedBanner } from '@/components/storefront/store-status';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { MobileCartBar } from '@/components/cart/mobile-cart-bar';
import { DRINK_CATEGORY } from '@/lib/catalog/groups';


export default async function SiteLayout({ children }: LayoutProps<'/'>) {
  const { data: catalog } = await getCatalog();
  // Bebidas saem do cardápio e são oferecidas no carrinho e depois de adicionar um item.
  const drinks = catalog.products.filter((p) => p.categorySlug === DRINK_CATEGORY);
  return (
    // O tema escuro envolve também as janelas (escolher produto), que ficam no provedor.
    <div className="theme-dark flex min-h-screen flex-col">
      <StoreProviders drinks={drinks}>
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
        <CartDrawer suggestions={drinks} fetchedAt={catalog.fetchedAt} />
        <MobileCartBar />
      </Suspense>
      </StoreProviders>
    </div>
  );
}

import Link from 'next/link';
import { Suspense } from 'react';
import { getCatalog, getOperation } from '@/lib/catalog/queries';
import { BrandLogo } from './brand-logo';
import { HeaderActions } from './header-actions';
import { StoreStatusFallback, StoreStatusPill } from './store-status';

export async function SiteHeader() {
  const [{ data: catalog }, { data: operation }] = await Promise.all([getCatalog(), getOperation()]);
  const categories = catalog.categories.filter(
    (c) => catalog.products.some((p) => p.categoryId === c.id) || (c.sectionType === 'options' && c.sharedGroupId),
  );
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:h-[4.5rem] sm:px-6">
        <Link href="/" className="shrink-0" aria-label={`${operation.settings.businessName} — página inicial`}>
          <BrandLogo logoUrl={operation.settings.logoUrl} name={operation.settings.businessName} />
        </Link>
        <div className="hidden lg:block">
          <Suspense fallback={<StoreStatusFallback />}>
            <StoreStatusPill className="rounded-full bg-mist px-3 py-1.5" />
          </Suspense>
        </div>
        <nav aria-label="Categorias" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-medium">
            <li>
              <Link href="/cardapio" className="rounded-full px-3 py-2 hover:bg-mist">
                Cardápio
              </Link>
            </li>
            {categories.filter((c) => c.sectionType === 'products').slice(0, 4).map((c) => (
              <li key={c.id} className="hidden xl:block">
                <Link href={`/cardapio?categoria=${c.slug}`} className="rounded-full px-3 py-2 text-muted-strong hover:bg-mist hover:text-fg">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto md:ml-2">
          <HeaderActions />
        </div>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto border-t border-line/60 px-4 py-2 scrollbar-none md:hidden">
        <Suspense fallback={<StoreStatusFallback />}>
          <StoreStatusPill className="shrink-0" />
        </Suspense>
        <span className="h-4 w-px shrink-0 bg-line" aria-hidden />
        <nav aria-label="Categorias (celular)" className="shrink-0">
          <ul className="flex gap-1.5 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/cardapio?categoria=${c.slug}`} className="block whitespace-nowrap rounded-full bg-mist px-3 py-1.5 font-medium">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

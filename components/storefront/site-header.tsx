import Link from 'next/link';
import { Suspense } from 'react';
import { getCatalog, getOperation } from '@/lib/catalog/queries';
import { BrandLogo } from './brand-logo';
import { HeaderActions } from './header-actions';
import { MENU_HIDDEN_CATEGORIES } from '@/lib/catalog/groups';
import { StoreStatusFallback, StoreStatusPill } from './store-status';

/** Atalhos do menu no computador: um por tipo de prato (leva à primeira categoria do grupo). */
const NAV_GROUPS: { label: string; slug: string; href?: string }[] = [
  { label: 'Pizzas', slug: 'pizzas-tradicionais', href: '/pizzas' },
  { label: 'Lanches', slug: 'lanches-tradicionais', href: '/lanches' },
  { label: 'Petiscos', slug: 'petiscos', href: '/petiscos' },
  { label: 'Pratos', slug: 'pratos-da-casa', href: '/pratos' },
];

export async function SiteHeader() {
  const [{ data: catalog }, { data: operation }] = await Promise.all([getCatalog(), getOperation()]);
  const categories = catalog.categories.filter(
    (c) =>
      !MENU_HIDDEN_CATEGORIES.includes(c.slug) && (catalog.products.some((p) => p.categoryId === c.id) || (c.sectionType === 'options' && c.sharedGroupId)),
  );
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md transition-[background-color,border-color] duration-300 over-hero:border-transparent over-hero:bg-transparent over-hero:bg-gradient-to-b over-hero:from-black/60 over-hero:to-transparent over-hero:backdrop-blur-none">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 min-[360px]:gap-4 sm:h-[4.5rem] sm:px-6">
        <Link href="/" className="shrink-0">
          <BrandLogo logoUrl={operation.settings.logoUrl} name={operation.settings.businessName} />
          <span className="sr-only">, página inicial</span>
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
            {NAV_GROUPS.filter((g) => categories.some((c) => c.slug === g.slug)).map((g) => (
              <li key={g.slug} className="hidden xl:block">
                <Link
                  href={g.href ?? `/cardapio?categoria=${g.slug}`}
                  className="rounded-full px-3 py-2 text-muted-strong hover:bg-mist hover:text-fg over-hero:text-white/85 over-hero:hover:bg-white/10"
                >
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto md:ml-2">
          <HeaderActions />
        </div>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto border-t border-line/60 px-4 py-2 scrollbar-none over-hero:border-transparent md:hidden">
        <Suspense fallback={<StoreStatusFallback />}>
          <StoreStatusPill className="shrink-0" />
        </Suspense>
        <span className="h-4 w-px shrink-0 bg-line" aria-hidden />
        <nav aria-label="Categorias (celular)" className="shrink-0">
          <ul className="flex gap-1.5 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cardapio?categoria=${c.slug}`}
                  className="block whitespace-nowrap rounded-full bg-mist px-3 py-1.5 font-medium over-hero:bg-black/35 over-hero:backdrop-blur-sm"
                >
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

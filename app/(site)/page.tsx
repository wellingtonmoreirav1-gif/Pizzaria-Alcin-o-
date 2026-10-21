import { getActiveBanners, getApprovedReviews, getCatalog, getOperation } from '@/lib/catalog/queries';
import { Hero } from '@/components/storefront/hero';
import { HomeShowcase } from '@/components/storefront/home-showcase';
import { InfoSections, ReviewsSection } from '@/components/storefront/info-sections';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { RestaurantJsonLd } from '@/components/storefront/json-ld';
import { WhatsAppCta } from '@/components/storefront/whatsapp-cta';

export default async function HomePage() {
  const [{ data: catalog, error }, { data: operation }, banners, reviews] = await Promise.all([
    getCatalog(),
    getOperation(),
    getActiveBanners(),
    getApprovedReviews(),
  ]);
  return (
    <>
      <RestaurantJsonLd settings={operation.settings} hours={operation.hours.hours} />
      <Hero settings={operation.settings} />
      {error ? (
        <div className="mx-auto max-w-3xl px-4 pt-8">
          <Notice tone="warning" title="Cardápio temporariamente indisponível">
            {error}
          </Notice>
        </div>
      ) : null}
      {catalog.products.length === 0 && !error ? (
        <div className="mx-auto max-w-3xl px-4 py-16">
          <EmptyState title="Cardápio em preparação">O cardápio completo será publicado em breve.</EmptyState>
        </div>
      ) : (
        <HomeShowcase catalog={catalog} banners={banners} />
      )}
      <ReviewsSection reviews={reviews} />
      <InfoSections settings={operation.settings} hours={operation.hours.hours} />
      <WhatsAppCta settings={operation.settings} />
    </>
  );
}

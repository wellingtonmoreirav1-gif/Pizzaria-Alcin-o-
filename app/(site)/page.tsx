import { getActiveBanners, getApprovedReviews, getCatalog, getOperation } from '@/lib/catalog/queries';
import { Hero } from '@/components/storefront/hero';
import { VoiceOrderButton } from '@/components/storefront/voice-order';
import { buttonClasses } from '@/components/ui/button';
import { HomeShowcase } from '@/components/storefront/home-showcase';
import { ReviewsSection } from '@/components/storefront/info-sections';
import { StoryTimeline } from '@/components/storefront/story-timeline';
import { ClosingInfo } from '@/components/storefront/closing-info';
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
      <Hero
        settings={operation.settings}
        voice={
          <VoiceOrderButton
            products={catalog.products}
            whatsappNumber={operation.settings.whatsappNumber}
            className={buttonClasses('outline', 'lg', 'border-gold/70 bg-black/25 text-white backdrop-blur-sm hover:border-gold hover:bg-white/10')}
          />
        }
      />
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
      {/* Fim da página: história → o que é bom saber → WhatsApp. */}
      <StoryTimeline />
      <ClosingInfo delivery={operation.settings.deliveryEnabled} />
      <WhatsAppCta settings={operation.settings} />
    </>
  );
}

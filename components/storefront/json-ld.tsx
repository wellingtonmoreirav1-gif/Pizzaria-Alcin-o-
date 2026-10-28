import { SITE_URL } from '@/config/business';
import type { SiteSettings } from '@/types/settings';
import type { BusinessHourRow } from '@/lib/business-hours';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Dados estruturados (schema.org) apenas com informações reais cadastradas. */
export function RestaurantJsonLd({ settings, hours }: { settings: SiteSettings; hours: BusinessHourRow[] }) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: settings.businessName,
    url: SITE_URL,
    servesCuisine: ['Pizza', 'Churrasco', 'Comida brasileira'],
    telephone: `+${settings.whatsappNumber}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.addressLine ?? undefined,
      addressLocality: settings.city ?? undefined,
      addressRegion: settings.state ?? undefined,
      addressCountry: 'BR',
    },
    hasMenu: `${SITE_URL}/cardapio`,
    acceptsReservations: false,
  };
  if (settings.logoUrl) data.logo = settings.logoUrl;
  if (settings.latitude !== null && settings.longitude !== null) {
    data.geo = { '@type': 'GeoCoordinates', latitude: settings.latitude, longitude: settings.longitude };
  }
  const spec = hours
    .filter((h) => h.isActive && h.closesAt)
    .map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAYS[h.weekday], opens: h.opensAt.slice(0, 5), closes: h.closesAt?.slice(0, 5) }));
  if (spec.length) data.openingHoursSpecification = spec;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD gerado no servidor, com '<' escapado.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

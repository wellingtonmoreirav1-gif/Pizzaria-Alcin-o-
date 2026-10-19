import type { Cents } from '@/lib/money';
import type { Fulfillment, PaymentMethod } from '@/lib/orders/labels';

export interface SiteSettings {
  businessName: string;
  whatsappNumber: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  referencePoint: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  timezone: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
  paymentMethods: Record<Fulfillment, PaymentMethod[]>;
  minOrderValue: Cents | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  promoText: string | null;
  deliveryInfoText: string | null;
  cancellationPolicy: string | null;
  privacyContactEmail: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  instagramUrl: string | null;
}

export interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  fee: Cents | null;
}

export interface PublicBanner {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface PublicReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  createdAt: string;
}

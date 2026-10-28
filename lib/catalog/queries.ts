/**
 * Leituras públicas com cache (Cache Components). Os dados são invalidados por tag
 * sempre que o painel altera catálogo, configurações, banners ou avaliações.
 */
import { cacheLife, cacheTag } from 'next/cache';
import { reportError } from '@/lib/observability/report';
import { BUSINESS_DEFAULTS } from '@/config/business';
import { createPublicClient, isSupabaseConfigured } from '@/lib/supabase/public';
import { toCentsOrNull } from '@/lib/money';
import type { Catalog } from '@/types/catalog';
import type { DeliveryZone, PublicBanner, PublicReview, SiteSettings } from '@/types/settings';
import type { HoursConfig } from '@/lib/business-hours';
import type { Fulfillment, PaymentMethod } from '@/lib/orders/labels';
import { GROUP_SELECT, mapCategory, mapGroups, mapProduct, PRODUCT_SELECT, type CategoryRow, type OptionGroupRow, type ProductRow } from './mappers';

export const CACHE_TAGS = {
  catalog: 'catalog',
  settings: 'settings',
  banners: 'banners',
  reviews: 'reviews',
} as const;

const SHORT = { stale: 30, revalidate: 60, expire: 600 };

export type Loaded<T> = { data: T; error: null } | { data: T; error: string };

function failure<T>(data: T, error: unknown): Loaded<T> {
  reportError('catalogo', error);
  cacheLife('seconds');
  return { data, error: 'Não foi possível carregar os dados agora. Tente novamente em instantes.' };
}

export async function getCatalog(): Promise<Loaded<Catalog>> {
  'use cache';
  cacheTag(CACHE_TAGS.catalog);
  cacheLife(SHORT);
  const empty: Catalog = { categories: [], products: [], sharedGroups: [], fetchedAt: new Date().toISOString() };
  if (!isSupabaseConfigured()) return failure(empty, 'Supabase não configurado');
  try {
    const supabase = createPublicClient();
    const [categories, products, shared] = await Promise.all([
      supabase.from('categories').select('id, slug, name, description, image_url, sort_order, show_on_home, section_type, shared_group_id').order('sort_order'),
      supabase.from('products').select(PRODUCT_SELECT).order('sort_order').order('name'),
      supabase.from('option_groups').select(GROUP_SELECT).not('shared_key', 'is', null),
    ]);
    if (categories.error) throw categories.error;
    if (products.error) throw products.error;
    if (shared.error) throw shared.error;
    const cats = (categories.data as CategoryRow[]).map(mapCategory);
    const activeCategoryIds = new Set(cats.map((c) => c.id));
    return {
      data: {
        fetchedAt: new Date().toISOString(),
        sharedGroups: mapGroups(shared.data as unknown as OptionGroupRow[]),
        categories: cats,
        products: (products.data as unknown as ProductRow[])
          .filter((p) => !p.deleted_at && p.is_active && activeCategoryIds.has(p.category_id))
          .map(mapProduct),
      },
      error: null,
    };
  } catch (error) {
    return failure(empty, error);
  }
}

interface SettingsRow {
  business_name: string;
  whatsapp_number: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  reference_point: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  hero_image_url: string | null;
  timezone: string;
  accepting_orders: boolean;
  pause_message: string | null;
  paused_until: string | null;
  lunch_closed_on: string | null;
  order_grace_minutes: number;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  dine_in_enabled: boolean;
  payment_methods: Record<Fulfillment, PaymentMethod[]>;
  min_order_value: number | string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  promo_text: string | null;
  delivery_info_text: string | null;
  cancellation_policy: string | null;
  privacy_contact_email: string | null;
  seo_title: string | null;
  seo_description: string | null;
  instagram_url: string | null;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: BUSINESS_DEFAULTS.name,
  whatsappNumber: BUSINESS_DEFAULTS.whatsappNumber,
  addressLine: BUSINESS_DEFAULTS.addressLine,
  city: BUSINESS_DEFAULTS.city,
  state: BUSINESS_DEFAULTS.state,
  referencePoint: BUSINESS_DEFAULTS.referencePoint,
  latitude: null,
  longitude: null,
  logoUrl: null,
  heroImageUrl: null,
  timezone: BUSINESS_DEFAULTS.timezone,
  deliveryEnabled: true,
  pickupEnabled: true,
  dineInEnabled: true,
  paymentMethods: {
    delivery: ['pix', 'cash', 'credit_card', 'debit_card', 'on_delivery'],
    pickup: ['pix', 'cash', 'credit_card', 'debit_card'],
    dine_in: ['pix', 'cash', 'credit_card', 'debit_card'],
  },
  minOrderValue: null,
  heroTitle: null,
  heroSubtitle: null,
  promoText: null,
  deliveryInfoText: null,
  cancellationPolicy: null,
  privacyContactEmail: null,
  seoTitle: null,
  seoDescription: null,
  instagramUrl: null,
};

function mapSettings(row: SettingsRow): SiteSettings {
  return {
    businessName: row.business_name,
    whatsappNumber: row.whatsapp_number,
    addressLine: row.address_line,
    city: row.city,
    state: row.state,
    referencePoint: row.reference_point,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    logoUrl: row.logo_url,
    heroImageUrl: row.hero_image_url,
    timezone: row.timezone,
    deliveryEnabled: row.delivery_enabled,
    pickupEnabled: row.pickup_enabled,
    dineInEnabled: row.dine_in_enabled,
    paymentMethods: { ...DEFAULT_SETTINGS.paymentMethods, ...row.payment_methods },
    minOrderValue: toCentsOrNull(row.min_order_value),
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    promoText: row.promo_text,
    deliveryInfoText: row.delivery_info_text,
    cancellationPolicy: row.cancellation_policy,
    privacyContactEmail: row.privacy_contact_email,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    instagramUrl: row.instagram_url,
  };
}

export interface OperationSnapshot {
  settings: SiteSettings;
  hours: HoursConfig;
  zones: DeliveryZone[];
}

function fallbackOperation(): OperationSnapshot {
  return {
    settings: DEFAULT_SETTINGS,
    hours: {
      hours: [],
      exceptions: [],
      settings: {
        timezone: DEFAULT_SETTINGS.timezone,
        acceptingOrders: false,
        pausedUntil: null,
        pauseMessage: 'Sistema em configuração. Pedidos pelo site ainda não estão disponíveis.',
        lunchClosedOn: null,
        orderGraceMinutes: 0,
      },
    },
    zones: [],
  };
}

async function loadOperation(): Promise<Loaded<OperationSnapshot>> {
  const fallback = fallbackOperation();
  if (!isSupabaseConfigured()) return { data: fallback, error: 'Supabase não configurado' };
  const supabase = createPublicClient();
  const [settings, hours, exceptions, zones] = await Promise.all([
    supabase.from('business_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('business_hours').select('weekday, shift, opens_at, closes_at, is_active'),
    supabase.from('business_hour_exceptions').select('date, shift, is_closed, opens_at, closes_at, note'),
    supabase.from('delivery_zones').select('id, name, city, fee').eq('is_active', true).order('sort_order').order('name'),
  ]);
  const error = settings.error ?? hours.error ?? exceptions.error ?? zones.error;
  if (error) throw error;
  const row = settings.data as SettingsRow | null;
  const mapped = row ? mapSettings(row) : DEFAULT_SETTINGS;
  return {
    data: {
      settings: mapped,
      hours: {
        hours: (hours.data ?? []).map((h) => ({
          weekday: h.weekday,
          shift: h.shift,
          opensAt: h.opens_at,
          closesAt: h.closes_at,
          isActive: h.is_active,
        })),
        exceptions: (exceptions.data ?? []).map((e) => ({
          date: e.date,
          shift: e.shift,
          isClosed: e.is_closed,
          opensAt: e.opens_at,
          closesAt: e.closes_at,
          note: e.note,
        })),
        settings: {
          timezone: mapped.timezone,
          acceptingOrders: row?.accepting_orders ?? false,
          pausedUntil: row?.paused_until ?? null,
          pauseMessage: row?.pause_message ?? null,
          lunchClosedOn: row?.lunch_closed_on ?? null,
          orderGraceMinutes: row?.order_grace_minutes ?? 0,
        },
      },
      zones: (zones.data ?? []).map((z) => ({ id: z.id, name: z.name, city: z.city, fee: toCentsOrNull(z.fee) })),
    },
    error: null,
  };
}

/** Configurações + horários (com cache curto). Para validar pedidos use getOperationFresh. */
export async function getOperation(): Promise<Loaded<OperationSnapshot>> {
  'use cache';
  cacheTag(CACHE_TAGS.settings);
  cacheLife(SHORT);
  try {
    return await loadOperation();
  } catch (error) {
    return failure(fallbackOperation(), error);
  }
}

/** Sem cache: usado no servidor ao registrar pedidos. */
export async function getOperationFresh(): Promise<OperationSnapshot> {
  const result = await loadOperation();
  return result.data;
}

export async function getActiveBanners(): Promise<PublicBanner[]> {
  'use cache';
  cacheTag(CACHE_TAGS.banners);
  cacheLife(SHORT);
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from('banners')
    .select('id, title, body, image_url, image_alt, cta_label, cta_href, starts_at, ends_at')
    .order('sort_order');
  if (error) {
    cacheLife('seconds');
    return [];
  }
  return data.map((b) => ({
    id: b.id,
    title: b.title,
    body: b.body,
    imageUrl: b.image_url,
    imageAlt: b.image_alt,
    ctaLabel: b.cta_label,
    ctaHref: b.cta_href,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
  }));
}

export async function getBestSellerIds(): Promise<string[]> {
  'use cache';
  cacheTag(CACHE_TAGS.catalog);
  cacheLife('hours');
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient().rpc('public_best_sellers', { p_limit: 8 });
  if (error) {
    cacheLife('seconds');
    return [];
  }
  return (data as { product_id: string; rank: number }[]).map((r) => r.product_id);
}

export async function getApprovedReviews(): Promise<PublicReview[]> {
  'use cache';
  cacheTag(CACHE_TAGS.reviews);
  cacheLife('hours');
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from('reviews')
    .select('id, author_name, rating, comment, is_verified, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) {
    cacheLife('seconds');
    return [];
  }
  return data.map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    isVerified: r.is_verified,
    createdAt: r.created_at,
  }));
}

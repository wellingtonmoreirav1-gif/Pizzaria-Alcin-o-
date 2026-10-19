'use server';

import { ActionError, check, int, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';
import { isAllowedImageUrl } from '@/lib/uploads';
import { normalizeBrazilPhone } from '@/lib/phone';

export async function saveSettings(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    [...PERMISSIONS.settings],
    async (_ctx, db) => {
      const businessName = str(form, 'businessName');
      if (!businessName) throw new ActionError('Informe o nome comercial.');
      const phone = normalizeBrazilPhone(str(form, 'whatsapp') ?? '');
      if (!phone) throw new ActionError('WhatsApp inválido. Use DDD + número, ex.: (83) 99921-6691.');
      const logoUrl = str(form, 'logoUrl');
      const heroUrl = str(form, 'heroImageUrl');
      for (const url of [logoUrl, heroUrl]) {
        if (!isAllowedImageUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL)) throw new ActionError('Imagem não permitida.');
      }
      const email = str(form, 'privacyEmail');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ActionError('E-mail de privacidade inválido.');
      const instagram = str(form, 'instagramUrl');
      if (instagram && !/^https:\/\/(www\.)?instagram\.com\//.test(instagram)) throw new ActionError('Link do Instagram deve começar com https://instagram.com/');
      const lat = str(form, 'latitude');
      const lng = str(form, 'longitude');
      const latitude = lat === null ? null : Number(lat.replace(',', '.'));
      const longitude = lng === null ? null : Number(lng.replace(',', '.'));
      if ((latitude === null) !== (longitude === null) || (latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) || (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180))) {
        throw new ActionError('Coordenadas inválidas (informe latitude e longitude).');
      }
      check(
        await db
          .from('business_settings')
          .update({
            business_name: businessName,
            whatsapp_number: `55${phone}`,
            address_line: str(form, 'addressLine'),
            city: str(form, 'city'),
            state: str(form, 'state')?.toUpperCase().slice(0, 2) ?? null,
            reference_point: str(form, 'referencePoint'),
            latitude,
            longitude,
            logo_url: logoUrl,
            hero_image_url: heroUrl,
            hero_title: str(form, 'heroTitle'),
            hero_subtitle: str(form, 'heroSubtitle'),
            promo_text: str(form, 'promoText'),
            cancellation_policy: str(form, 'cancellationPolicy'),
            privacy_contact_email: email,
            seo_title: str(form, 'seoTitle'),
            seo_description: str(form, 'seoDescription'),
            instagram_url: instagram,
            best_sellers_days: Math.min(365, Math.max(1, int(form, 'bestDays', 30))),
            best_sellers_min_orders: Math.max(1, int(form, 'bestMin', 10)),
            location_retention_days: Math.min(3650, Math.max(1, int(form, 'retentionDays', 90))),
          })
          .eq('id', 1),
      );
      return 'Configurações salvas.';
    },
    ['settings', 'catalog'],
  );
}

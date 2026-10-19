import type { CatalogProduct, CatalogPromotion } from '@/types/catalog';
import type { Cents } from '@/lib/money';

export function isPromotionActive(promo: CatalogPromotion, now: Date): boolean {
  if (promo.startsAt && new Date(promo.startsAt) > now) return false;
  if (promo.endsAt && new Date(promo.endsAt) <= now) return false;
  return true;
}

/**
 * Melhor promoção válida para o produto/tamanho. Uma promoção só é considerada
 * quando o preço promocional é MENOR que o preço normal (evita "promoções" falsas).
 */
export function findBestPromotion(
  product: CatalogProduct,
  variantId: string | null,
  regularBase: Cents,
  now: Date,
): CatalogPromotion | null {
  let best: CatalogPromotion | null = null;
  for (const promo of product.promotions) {
    if (!isPromotionActive(promo, now)) continue;
    if (promo.variantId !== null && promo.variantId !== variantId) continue;
    if (promo.promoPrice >= regularBase) continue;
    if (!best || promo.promoPrice < best.promoPrice) best = promo;
  }
  return best;
}

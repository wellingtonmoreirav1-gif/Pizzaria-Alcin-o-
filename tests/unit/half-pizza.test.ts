import { describe, expect, it } from 'vitest';
import { priceLine } from '@/lib/pricing';
import { cartLineSchema } from '@/lib/validation/checkout';
import type { CatalogProduct, CatalogPromotion, CatalogVariant } from '@/types/catalog';

// Como no cardápio oficial: cada sabor é um produto, com tamanhos P, M, G, GG e F.
const CODES = ['P', 'M', 'G', 'GG', 'F'];
const sizes = (id: string, prices: number[]): CatalogVariant[] =>
  CODES.map((code, i) => ({
    id: `${id}-${code}`,
    sizeCode: code,
    name: code,
    description: null,
    price: prices[i]!,
    maxFlavors: 1,
    flavorPriceRule: 'highest',
    allowMixedFlavorTags: true,
    sortOrder: i,
    isAvailable: true,
  }));

function pizza(id: string, name: string, prices: number[], overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id,
    categoryId: 'cat',
    categorySlug: 'pizzas-tradicionais',
    categoryName: 'Pizzas tradicionais',
    kind: 'pizza',
    slug: id,
    name,
    shortDescription: null,
    description: null,
    imageUrl: null,
    imageAlt: null,
    images: [],
    basePrice: null,
    isAvailable: true,
    isFeatured: false,
    featuredOrder: null,
    sortOrder: 0,
    shiftRestriction: 'any',
    availableFrom: null,
    availableUntil: null,
    tags: [],
    serves: null,
    maxQuantity: 30,
    isDemo: false,
    priceConfirmed: true,
    variants: sizes(id, prices),
    groups: [],
    promotions: [],
    comboItems: [],
    ...overrides,
  };
}

const CALABRESA = pizza('calabresa', 'Pizza Calabresa', [2500, 3500, 5000, 6000, 7000]);
const CAMARAO = pizza('camarao', 'Pizza Camarão com Catupiry', [3500, 4500, 7000, 8000, 9000]);
const ctx = { now: new Date('2026-10-21T20:00:00Z'), openShifts: null };
const half = (product: CatalogProduct, code: string, other: CatalogProduct | undefined, quantity = 1) =>
  priceLine(product, { productId: product.id, variantId: `${product.id}-${code}`, options: {}, quantity, halfProductId: other?.id ?? null }, ctx, other);

describe('pizza metade/metade', () => {
  it('vale o preço do sabor mais caro, nos dois sentidos', () => {
    for (const [a, b] of [
      [CALABRESA, CAMARAO],
      [CAMARAO, CALABRESA],
    ] as const) {
      const r = half(a, 'G', b, 2);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.line.unitPrice).toBe(7000);
      expect(r.line.lineTotal).toBe(14000);
      expect(r.line.detail.halves?.map((h) => h.price)).toEqual(a === CALABRESA ? [5000, 7000] : [7000, 5000]);
    }
    const r = half(CALABRESA, 'G', CAMARAO);
    expect(r.ok && r.line.productName).toBe('Pizza ½ Calabresa + ½ Camarão com Catupiry');
    expect(r.ok && r.line.summary[0]).toBe('Metade/metade · vale o preço do sabor mais caro');
  });

  it('só nos tamanhos G, GG e F', () => {
    expect(half(CALABRESA, 'GG', CAMARAO).ok).toBe(true);
    expect(half(CALABRESA, 'F', CAMARAO).ok).toBe(true);
    for (const code of ['P', 'M']) {
      const r = half(CALABRESA, code, CAMARAO);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('HALF_NOT_ALLOWED');
    }
  });

  it('recusa o mesmo sabor, sabor que sumiu, esgotado ou sem preço confirmado', () => {
    const code = (r: ReturnType<typeof half>) => (r.ok ? 'ok' : r.error.code);
    expect(code(half(CALABRESA, 'G', CALABRESA))).toBe('HALF_UNAVAILABLE');
    expect(code(priceLine(CALABRESA, { productId: 'calabresa', variantId: 'calabresa-G', options: {}, quantity: 1, halfProductId: 'x' }, ctx))).toBe(
      'HALF_UNAVAILABLE',
    );
    expect(code(half(CALABRESA, 'G', { ...CAMARAO, isAvailable: false }))).toBe('HALF_UNAVAILABLE');
    expect(code(half(CALABRESA, 'G', { ...CAMARAO, priceConfirmed: false }))).toBe('PRICE_NOT_CONFIRMED');
    const noG = { ...CAMARAO, variants: CAMARAO.variants.map((v) => (v.sizeCode === 'G' ? { ...v, isAvailable: false } : v)) };
    expect(code(half(CALABRESA, 'G', noG))).toBe('HALF_UNAVAILABLE');
    const notPizza = { ...CAMARAO, kind: 'simple' as const };
    expect(code(half(CALABRESA, 'G', notPizza))).toBe('HALF_UNAVAILABLE');
  });

  it('promoção de uma metade só conta se ela continuar sendo a mais cara', () => {
    const promo = (productId: string, variantId: string, promoPrice: number): CatalogPromotion => ({
      id: `promo-${productId}`,
      title: 'Promo',
      description: null,
      variantId,
      promoPrice,
      startsAt: null,
      endsAt: null,
    });
    // Camarão G em promoção por R$ 60: metade/metade com calabresa (R$ 50) sai R$ 60.
    const onSale = { ...CAMARAO, promotions: [promo('camarao', 'camarao-G', 6000)] };
    const r = half(CALABRESA, 'G', onSale);
    expect(r.ok && [r.line.unitRegular, r.line.unitPrice, r.line.promotionId]).toEqual([7000, 6000, 'promo-camarao']);
    // Calabresa em promoção não baixa o preço quando o camarão é o mais caro.
    const cheap = { ...CALABRESA, promotions: [promo('calabresa', 'calabresa-G', 4000)] };
    const r2 = half(cheap, 'G', CAMARAO);
    expect(r2.ok && [r2.line.unitPrice, r2.line.promotionId]).toEqual([7000, null]);
  });

  it('sem segunda metade continua igual (pizza inteira)', () => {
    const r = half(CALABRESA, 'P', undefined);
    expect(r.ok && [r.line.unitPrice, r.line.productName, r.line.detail.halves]).toEqual([2500, 'Pizza Calabresa', undefined]);
  });

  it('o carrinho aceita o campo do 2º sabor (e linhas antigas sem ele)', () => {
    const base = { productId: '10000000-0000-4000-8000-000000000001', variantId: null, quantity: 1 };
    expect(cartLineSchema.safeParse({ ...base, halfProductId: '10000000-0000-4000-8000-000000000002' }).success).toBe(true);
    expect(cartLineSchema.safeParse(base).success).toBe(true);
    expect(cartLineSchema.safeParse({ ...base, halfProductId: 'calabresa' }).success).toBe(false);
  });
});

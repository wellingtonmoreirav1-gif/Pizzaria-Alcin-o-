import { describe, expect, it } from 'vitest';
import { priceLine, startingPrice, sumLines, computePizzaBase, isProductOrderable } from '@/lib/pricing';
import { comboProduct, drinkProduct, IDS, lunchProduct, pizzaProduct } from '../fixtures/catalog';
import type { CatalogVariant } from '@/types/catalog';

const now = new Date('2026-10-19T15:00:00Z');
const ctx = { now, openShifts: null };

function ok<T extends { ok: boolean }>(r: T) {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return (r as unknown as { line: import('@/lib/pricing').PricedLine }).line;
}

describe('pizza pricing', () => {
  it('uses size base price for regular flavor', () => {
    const line = ok(priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.small, options: { [IDS.flavorGroup]: [IDS.flavorA] }, quantity: 1 }, ctx));
    expect(line.unitPrice).toBe(3000);
    expect(line.summary[0]).toBe('Sabor: Sabor A');
  });

  it('applies "highest" rule for two flavors, plus crust and extra priced per size', () => {
    const line = ok(
      priceLine(
        pizzaProduct(),
        {
          productId: IDS.pizza,
          variantId: IDS.large,
          options: { [IDS.flavorGroup]: [IDS.flavorA, IDS.flavorB], [IDS.crustGroup]: [IDS.crust], [IDS.extraGroup]: [IDS.extra] },
          quantity: 2,
        },
        ctx,
      ),
    );
    expect(line.detail.base).toBe(6000);
    expect(line.unitRegular).toBe(6000 + 900 + 400);
    expect(line.lineTotal).toBe(2 * 7300);
    expect(line.summary[0]).toBe('Sabores: 1/2 Sabor A, 1/2 Sabor B');
  });

  it('applies "average" rule with half-up rounding in cents', () => {
    const v: CatalogVariant = { id: 'x', name: 'G', description: null, price: 5000, maxFlavors: 3, flavorPriceRule: 'average', allowMixedFlavorTags: true, sortOrder: 1, isAvailable: true };
    expect(computePizzaBase(v, [5000, 6000])).toBe(5500);
    expect(computePizzaBase(v, [5000, 5000, 5001])).toBe(5000);
    expect(computePizzaBase(v, [1000, 1001])).toBe(1001);
    expect(computePizzaBase({ ...v, flavorPriceRule: 'fixed' }, [9000])).toBe(5000);
  });

  it('rejects more flavors than the size allows', () => {
    const r = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.small, options: { [IDS.flavorGroup]: [IDS.flavorA, IDS.flavorB] }, quantity: 1 }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('TOO_MANY_OPTIONS');
  });

  it('requires at least one flavor and a size', () => {
    const noFlavor = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.small, options: {}, quantity: 1 }, ctx);
    expect(!noFlavor.ok && noFlavor.error.code).toBe('TOO_FEW_OPTIONS');
    const noSize = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: null, options: { [IDS.flavorGroup]: [IDS.flavorA] }, quantity: 1 }, ctx);
    expect(!noSize.ok && noSize.error.code).toBe('VARIANT_REQUIRED');
  });

  it('blocks flavor not offered for the size', () => {
    const r = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.small, options: { [IDS.flavorGroup]: [IDS.flavorSweet] }, quantity: 1 }, ctx);
    expect(!r.ok && r.error.code).toBe('OPTION_NOT_OFFERED_FOR_SIZE');
  });

  it('blocks mixing combination tags when the size forbids it', () => {
    const r = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.large, options: { [IDS.flavorGroup]: [IDS.flavorA, IDS.flavorSweet] }, quantity: 1 }, ctx);
    expect(!r.ok && r.error.code).toBe('FLAVOR_MIX_NOT_ALLOWED');
  });

  it('rejects unavailable extras, duplicates and unknown groups', () => {
    const unavailable = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.small, options: { [IDS.flavorGroup]: [IDS.flavorA], [IDS.extraGroup]: [IDS.extra2] }, quantity: 1 }, ctx);
    expect(!unavailable.ok && unavailable.error.code).toBe('OPTION_UNAVAILABLE');
    const dup = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.large, options: { [IDS.flavorGroup]: [IDS.flavorA, IDS.flavorA] }, quantity: 1 }, ctx);
    expect(!dup.ok && dup.error.code).toBe('DUPLICATE_OPTION');
    const unknown = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.small, options: { [IDS.flavorGroup]: [IDS.flavorA], [IDS.category]: [IDS.extra] }, quantity: 1 }, ctx);
    expect(!unknown.ok && unknown.error.code).toBe('UNKNOWN_GROUP');
  });

  it('only allows one crust', () => {
    const r = priceLine(pizzaProduct(), { productId: IDS.pizza, variantId: IDS.small, options: { [IDS.flavorGroup]: [IDS.flavorA], [IDS.crustGroup]: [IDS.crust, IDS.extra] }, quantity: 1 }, ctx);
    expect(!r.ok && r.error.code).toBe('TOO_MANY_OPTIONS');
  });
});

describe('promotions', () => {
  const promo = (o: Partial<import('@/types/catalog').CatalogPromotion> = {}) => ({
    id: 'p1', title: 'Promo', description: null, variantId: IDS.bottle, promoPrice: 1200, startsAt: null, endsAt: null, ...o,
  });

  it('applies an active promotion and reports the discount', () => {
    const line = ok(priceLine(drinkProduct({ promotions: [promo()] }), { productId: IDS.drink, variantId: IDS.bottle, options: {}, quantity: 3 }, ctx));
    expect(line.unitRegular).toBe(1400);
    expect(line.unitDiscount).toBe(200);
    expect(line.unitPrice).toBe(1200);
    expect(line.promotionId).toBe('p1');
    expect(sumLines([line])).toEqual({ grossSubtotal: 4200, discountTotal: 600, itemsSubtotal: 3600 });
  });

  it('ignores expired, future, other-variant and non-discount promotions', () => {
    const cases = [
      promo({ endsAt: '2026-10-19T14:00:00Z' }),
      promo({ startsAt: '2026-10-20T00:00:00Z' }),
      promo({ variantId: IDS.can }),
      promo({ promoPrice: 1500 }),
    ];
    for (const p of cases) {
      const line = ok(priceLine(drinkProduct({ promotions: [p] }), { productId: IDS.drink, variantId: IDS.bottle, options: {}, quantity: 1 }, ctx));
      expect(line.unitPrice).toBe(1400);
      expect(line.unitDiscount).toBe(0);
    }
  });

  it('starting price considers promotions and cheapest flavor', () => {
    expect(startingPrice(drinkProduct({ promotions: [promo({ variantId: IDS.can, promoPrice: 500 })] }), now)).toEqual({ regular: 600, current: 500 });
    expect(startingPrice(pizzaProduct(), now)).toEqual({ regular: 3000, current: 3000 });
  });
});

describe('simple products, lunch and combos', () => {
  it('validates required choices and adds option prices', () => {
    const missing = priceLine(lunchProduct(), { productId: IDS.lunch, variantId: null, options: {}, quantity: 1 }, ctx);
    expect(!missing.ok && missing.error.code).toBe('TOO_FEW_OPTIONS');
    const line = ok(priceLine(lunchProduct(), { productId: IDS.lunch, variantId: null, options: { [IDS.sidesGroup]: [IDS.side1, IDS.side3] }, quantity: 1 }, ctx));
    expect(line.unitPrice).toBe(2500);
  });

  it('enforces shift restriction only when shifts are provided', () => {
    const sel = { productId: IDS.lunch, variantId: null, options: { [IDS.sidesGroup]: [IDS.side1] }, quantity: 1 };
    const atNight = priceLine(lunchProduct(), sel, { now, openShifts: ['dinner'] });
    expect(!atNight.ok && atNight.error.code).toBe('SHIFT_NOT_OPEN');
    expect(priceLine(lunchProduct(), sel, { now, openShifts: ['lunch'] }).ok).toBe(true);
  });

  it('blocks sold out products and variants, invalid quantity and long notes', () => {
    const soldOut = priceLine(drinkProduct({ isAvailable: false }), { productId: IDS.drink, variantId: IDS.can, options: {}, quantity: 1 }, ctx);
    expect(!soldOut.ok && soldOut.error.code).toBe('PRODUCT_UNAVAILABLE');
    const variants = drinkProduct().variants.map((v) => ({ ...v, isAvailable: v.id !== IDS.can }));
    const soldVariant = priceLine(drinkProduct({ variants }), { productId: IDS.drink, variantId: IDS.can, options: {}, quantity: 1 }, ctx);
    expect(!soldVariant.ok && soldVariant.error.code).toBe('VARIANT_UNAVAILABLE');
    const qty = priceLine(drinkProduct(), { productId: IDS.drink, variantId: IDS.can, options: {}, quantity: 0 }, ctx);
    expect(!qty.ok && qty.error.code).toBe('INVALID_QUANTITY');
    const notes = priceLine(drinkProduct(), { productId: IDS.drink, variantId: IDS.can, options: {}, quantity: 1, notes: 'x'.repeat(201) }, ctx);
    expect(!notes.ok && notes.error.code).toBe('NOTES_TOO_LONG');
    expect(priceLine(undefined, { productId: IDS.drink, variantId: null, options: {}, quantity: 1 }, ctx).ok).toBe(false);
  });

  it('respects validity window', () => {
    const r = priceLine(comboProduct({ availableUntil: '2026-10-19T00:00:00Z' }), { productId: IDS.combo, variantId: null, options: {}, quantity: 1 }, ctx);
    expect(!r.ok && r.error.code).toBe('OUTSIDE_VALIDITY');
  });

  it('prices combos with fixed price and blocks when an included item is sold out', () => {
    const line = ok(priceLine(comboProduct(), { productId: IDS.combo, variantId: null, options: {}, quantity: 1 }, ctx));
    expect(line.unitPrice).toBe(5800);
    expect(line.summary).toContain('Inclui: 1x Refri 2L');
    const items = comboProduct().comboItems.map((i, idx) => ({ ...i, isAvailable: idx !== 1 }));
    const blocked = priceLine(comboProduct({ comboItems: items }), { productId: IDS.combo, variantId: null, options: {}, quantity: 1 }, ctx);
    expect(!blocked.ok && blocked.error.code).toBe('COMBO_ITEM_UNAVAILABLE');
    expect(isProductOrderable(comboProduct({ comboItems: items }), now)).toBe(false);
  });

  it('fails clearly when a product has no price', () => {
    const r = priceLine(lunchProduct({ basePrice: null, groups: [] }), { productId: IDS.lunch, variantId: null, options: {}, quantity: 1 }, ctx);
    expect(!r.ok && r.error.code).toBe('MISSING_PRICE');
  });
});

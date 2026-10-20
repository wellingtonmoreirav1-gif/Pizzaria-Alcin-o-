import { describe, expect, it } from 'vitest';
import { priceLine, sumLines, isProductOrderable, startingPrice, type PricedLine } from '@/lib/pricing';
import type { CatalogOptionGroup, CatalogProduct, CatalogVariant } from '@/types/catalog';

const now = new Date('2026-10-20T20:00:00Z');
const ctx = { now, openShifts: null };
const SIZES: [string, string, number][] = [['P', 'Pequena (P)', 2500], ['M', 'Média (M)', 3900], ['G', 'Grande (G)', 5000], ['GG', 'Gigante (GG)', 6000], ['F', 'Família (F)', 7500]];

const variants: CatalogVariant[] = SIZES.map(([code, name, price], i) => ({
  id: `v-${code}`, sizeCode: code, name, description: null, price, maxFlavors: 1, flavorPriceRule: 'fixed', allowMixedFlavorTags: true, sortOrder: i, isAvailable: true,
}));

const crustTable: Record<string, number[]> = {
  Requeijão: [400, 600, 800, 800, 1000],
  'Catupiry Original': [800, 1000, 1600, 1800, 2000],
};
const crusts: CatalogOptionGroup = {
  id: 'g-bordas', kind: 'crust', name: 'Bordas recheadas', description: null, minSelect: 0, maxSelect: 1, sortOrder: 10, sharedKey: 'bordas-recheadas',
  values: Object.entries(crustTable).map(([name, prices], i) => ({
    id: `c-${i}`, groupId: 'g-bordas', name, description: null, imageUrl: null, price: 0, combinationTag: null, sortOrder: i, isAvailable: true, priceConfirmed: true,
    variantRules: {}, sizeRules: Object.fromEntries(SIZES.map(([code], j) => [code, { price: prices[j] ?? 0, isOffered: true }])),
  })),
};
const sauces: CatalogOptionGroup = {
  id: 'g-molhos', kind: 'extra', name: 'Molhos', description: null, minSelect: 0, maxSelect: 4, sortOrder: 20, sharedKey: 'molhos',
  values: [{ id: 'm-1', groupId: 'g-molhos', name: 'Maionese verde', description: null, imageUrl: null, price: 0, combinationTag: null, sortOrder: 1, isAvailable: true, priceConfirmed: false, variantRules: {}, sizeRules: {} }],
};

function pizza(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'p-calabresa', categoryId: 'c', categorySlug: 'pizzas-tradicionais', categoryName: 'Pizzas tradicionais', kind: 'pizza', slug: 'pizza-calabresa', name: 'Pizza Calabresa',
    shortDescription: null, description: 'Molho, calabresa e orégano.', imageUrl: null, imageAlt: null, images: [], basePrice: null, isAvailable: true, isFeatured: false, featuredOrder: null,
    sortOrder: 0, shiftRestriction: 'any', availableFrom: null, availableUntil: null, tags: [], serves: null, maxQuantity: 30, isDemo: false, priceConfirmed: true,
    variants, groups: [crusts], promotions: [], comboItems: [], ...overrides,
  };
}

const sel = (variantId: string | null, crustId?: string, quantity = 1) => ({ productId: 'p-calabresa', variantId, options: (crustId ? { 'g-bordas': [crustId] } : {}) as Record<string, string[]>, quantity });
const ok = (r: ReturnType<typeof priceLine>): PricedLine => {
  if (!r.ok) throw new Error(r.error.message);
  return r.line;
};

describe('pizzas do cardápio oficial', () => {
  it('cada tamanho tem seu preço', () => {
    for (const [code, , price] of SIZES) expect(ok(priceLine(pizza(), sel(`v-${code}`), ctx)).unitPrice).toBe(price);
    expect(startingPrice(pizza(), now)).toEqual({ regular: 2500, current: 2500 });
  });

  it('borda compartilhada cobra pelo código do tamanho: G + Catupiry = R$ 66,00; x2 = R$ 132,00', () => {
    const line = ok(priceLine(pizza(), sel('v-G', 'c-1', 2), ctx));
    expect(line.unitPrice).toBe(6600);
    expect(line.lineTotal).toBe(13200);
    expect(line.summary).toContain('Bordas recheadas: Catupiry Original');
    expect(sumLines([line]).itemsSubtotal).toBe(13200);
    expect(ok(priceLine(pizza(), sel('v-P', 'c-0'), ctx)).unitPrice).toBe(2900);
    expect(ok(priceLine(pizza(), sel('v-F', 'c-1'), ctx)).unitPrice).toBe(9500);
  });

  it('sem borda e com tamanho obrigatório', () => {
    expect(ok(priceLine(pizza(), sel('v-M'), ctx)).unitPrice).toBe(3900);
    const noSize = priceLine(pizza(), sel(null), ctx);
    expect(!noSize.ok && noSize.error.code).toBe('VARIANT_REQUIRED');
  });

  it('preço a confirmar bloqueia o pedido', () => {
    const p = pizza({ priceConfirmed: false });
    expect(isProductOrderable(p, now)).toBe(false);
    const r = priceLine(p, sel('v-G'), ctx);
    expect(!r.ok && r.error.code).toBe('PRICE_NOT_CONFIRMED');
  });

  it('molho sem preço definido não pode ser cobrado nem escolhido', () => {
    const lanche = pizza({ kind: 'simple', variants: [], basePrice: 1500, groups: [sauces] });
    expect(ok(priceLine(lanche, { productId: 'p-calabresa', variantId: null, options: {}, quantity: 1 }, ctx)).unitPrice).toBe(1500);
    const r = priceLine(lanche, { productId: 'p-calabresa', variantId: null, options: { 'g-molhos': ['m-1'] }, quantity: 1 }, ctx);
    expect(!r.ok && r.error.code).toBe('OPTION_PRICE_PENDING');
  });

  it('regra específica do produto tem prioridade sobre a regra por código de tamanho', () => {
    const custom = structuredClone(crusts);
    custom.values[1]!.variantRules = { 'v-G': { price: 1200, isOffered: true } };
    expect(ok(priceLine(pizza({ groups: [custom] }), sel('v-G', 'c-1'), ctx)).unitPrice).toBe(6200);
    custom.values[1]!.sizeRules.P = { price: null, isOffered: false };
    const r = priceLine(pizza({ groups: [custom] }), sel('v-P', 'c-1'), ctx);
    expect(!r.ok && r.error.code).toBe('OPTION_NOT_OFFERED_FOR_SIZE');
  });
});

import { describe, expect, it } from 'vitest';
import { normalizeSpeech, parseVoiceOrder } from '@/lib/voice/parse-order';
import type { CatalogProduct, CatalogVariant } from '@/types/catalog';

const sizes = (id: string, list: [string | null, string][]): CatalogVariant[] =>
  list.map(([code, name], i) => ({
    id: `${id}-${code ?? name}`, sizeCode: code, name, description: null, price: 1000 + i, maxFlavors: 1, flavorPriceRule: 'fixed', allowMixedFlavorTags: true, sortOrder: i, isAvailable: true,
  }));
const PIZZA: [string, string][] = [['P', 'Pequena (P)'], ['M', 'Média (M)'], ['G', 'Grande (G)'], ['GG', 'Gigante (GG)'], ['F', 'Família (F)']];

function product(id: string, name: string, category: string, variants: CatalogVariant[] = []): CatalogProduct {
  return {
    id, categoryId: category, categorySlug: category, categoryName: category, kind: category.startsWith('pizzas') ? 'pizza' : 'simple', slug: id, name,
    shortDescription: null, description: null, imageUrl: null, imageAlt: null, images: [], basePrice: 1000, isAvailable: true, isFeatured: false, featuredOrder: null,
    sortOrder: 0, shiftRestriction: 'any', availableFrom: null, availableUntil: null, tags: [], serves: null, maxQuantity: 30, isDemo: false, priceConfirmed: true,
    variants: variants.length ? variants : [{ id: `${id}-u`, sizeCode: null, name: 'Único', description: null, price: 1000, maxFlavors: 1, flavorPriceRule: 'fixed', allowMixedFlavorTags: true, sortOrder: 0, isAvailable: true }],
    groups: [], promotions: [], comboItems: [],
  };
}

const MENU = [
  product('pz-calabresa', 'Pizza Calabresa', 'pizzas-tradicionais', sizes('pz-calabresa', PIZZA)),
  product('pz-frango', 'Pizza Frango', 'pizzas-tradicionais', sizes('pz-frango', PIZZA)),
  product('pz-mucarela', 'Pizza Muçarela', 'pizzas-tradicionais', sizes('pz-mucarela', PIZZA)),
  product('pz-frango-cat', 'Pizza Frango com Catupiry', 'pizzas-especiais', sizes('pz-frango-cat', PIZZA)),
  product('pz-4q', 'Pizza Quatro Queijos', 'pizzas-especiais', sizes('pz-4q', PIZZA)),
  product('x-frango', 'X-Frango', 'lanches'),
  product('x-calabresa', 'X-Calabresa', 'lanches'),
  product('calabresa-chef', 'Calabresa do Chef', 'petiscos'),
  product('lasanha-frango', 'Lasanha de Frango', 'lasanhas', sizes('lasanha-frango', [['P', 'Pequena'], ['M', 'Média'], ['G', 'Grande']])),
  product('coca', 'Coca-Cola', 'bebidas', sizes('coca', [[null, 'Lata'], [null, '600 ml'], [null, '1 litro'], [null, '2 litros']])),
  product('fanta', 'Fanta Laranja', 'bebidas', sizes('fanta', [[null, 'Lata'], [null, '2 litros']])),
  product('agua', 'Água mineral 500 ml', 'bebidas'),
];

const parse = (text: string) => parseVoiceOrder(text, MENU);

describe('pedido por áudio', () => {
  it('normaliza acentos, pontuação e grafias comuns', () => {
    expect(normalizeSpeech('Quero uma Mussarela, e uma Coca-Cola!')).toBe('quero uma mucarela e uma coca');
  });

  it('pizza com tamanho e refrigerante com medida', () => {
    const r = parse('quero uma pizza grande de calabresa e duas coca lata');
    expect(r.items).toEqual([
      { productId: 'pz-calabresa', variantId: 'pz-calabresa-G', quantity: 1, needsSize: false, halfProductId: null },
      { productId: 'coca', variantId: 'coca-Lata', quantity: 2, needsSize: false, halfProductId: null },
    ]);
    expect(r.unmatched).toEqual([]);
  });

  it('nome mais longo vence: "frango com catupiry" não vira "frango"; "x frango" é o lanche', () => {
    const r = parse('uma família de frango com catupiry, um xis frango e uma calabresa do chef');
    expect(r.items.map((i) => [i.productId, i.variantId, i.quantity])).toEqual([
      ['pz-frango-cat', 'pz-frango-cat-F', 1],
      ['x-frango', 'x-frango-u', 1],
      ['calabresa-chef', 'calabresa-chef-u', 1],
    ]);
  });

  it('sem tamanho: pede para escolher; plural e números por extenso', () => {
    const r = parse('duas pizzas de mussarela e três cocas de dois litros');
    expect(r.items).toEqual([
      { productId: 'pz-mucarela', variantId: null, quantity: 2, needsSize: true, halfProductId: null },
      { productId: 'coca', variantId: 'coca-2 litros', quantity: 3, needsSize: false, halfProductId: null },
    ]);
  });

  it('"dois litros" antes do nome é tamanho, não quantidade', () => {
    const r = parse('quero uma de dois litros de coca');
    expect(r.items).toEqual([{ productId: 'coca', variantId: 'coca-2 litros', quantity: 1, needsSize: false, halfProductId: null }]);
  });

  it('lasanha com tamanho, pizza "tamanho gg" e água', () => {
    const r = parse('uma lasanha de frango média, uma pizza quatro queijos tamanho gg e uma água');
    expect(r.items.map((i) => [i.productId, i.variantId])).toEqual([
      ['lasanha-frango', 'lasanha-frango-M'],
      ['pz-4q', 'pz-4q-GG'],
      ['agua', 'agua-u'],
    ]);
  });

  it('o que não reconhece volta para o cliente ver (sem inventar)', () => {
    const r = parse('uma pizza grande de calabresa e um refrigerante');
    expect(r.items).toHaveLength(1);
    expect(r.unmatched).toEqual(['refrigerante']);
  });

  it('metade/metade: junta os dois sabores num item só', () => {
    const r = parse('quero uma pizza grande metade calabresa e metade frango com catupiry e uma coca lata');
    expect(r.items).toEqual([
      { productId: 'pz-calabresa', variantId: 'pz-calabresa-G', quantity: 1, needsSize: false, halfProductId: 'pz-frango-cat' },
      { productId: 'coca', variantId: 'coca-Lata', quantity: 1, needsSize: false, halfProductId: null },
    ]);
    expect(r.unmatched).toEqual([]);
  });

  it('meio a meio, tamanho no fim; P e M não valem para metade/metade', () => {
    expect(parse('duas meio a meio de mussarela com frango família').items).toEqual([
      { productId: 'pz-mucarela', variantId: 'pz-mucarela-F', quantity: 2, needsSize: false, halfProductId: 'pz-frango' },
    ]);
    expect(parse('uma pizza pequena metade calabresa metade frango').items).toEqual([
      { productId: 'pz-calabresa', variantId: null, quantity: 1, needsSize: true, halfProductId: 'pz-frango' },
    ]);
  });

  it('repetições somam a quantidade', () => {
    const r = parse('uma coca lata e mais uma coca lata');
    expect(r.items).toEqual([{ productId: 'coca', variantId: 'coca-Lata', quantity: 2, needsSize: false, halfProductId: null }]);
  });
});

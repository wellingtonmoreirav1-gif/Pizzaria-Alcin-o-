/**
 * Motor de preços do Alcinão.
 *
 * Usado no navegador (prévia) E no servidor (fonte da verdade). O servidor sempre
 * recalcula a partir do banco; o valor enviado pelo navegador nunca é aceito.
 * Regras documentadas em docs/REGRAS-DE-PRECO.md.
 */
import type {
  CatalogOptionGroup,
  CatalogOptionValue,
  CatalogProduct,
  CatalogVariant,
  LineSelection,
  OptionGroupKind,
  ServiceShift,
} from '@/types/catalog';
import type { Cents } from '@/lib/money';
import { findBestPromotion } from './promotions';

export interface PricingContext {
  now: Date;
  /** Turnos abertos agora. `null` ignora a verificação (ex.: navegação no cardápio). */
  openShifts: ServiceShift[] | null;
}

export type PricingErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_UNAVAILABLE'
  | 'OUTSIDE_VALIDITY'
  | 'SHIFT_NOT_OPEN'
  | 'INVALID_QUANTITY'
  | 'VARIANT_REQUIRED'
  | 'VARIANT_UNAVAILABLE'
  | 'UNKNOWN_GROUP'
  | 'OPTION_UNAVAILABLE'
  | 'OPTION_NOT_OFFERED_FOR_SIZE'
  | 'TOO_FEW_OPTIONS'
  | 'TOO_MANY_OPTIONS'
  | 'DUPLICATE_OPTION'
  | 'FLAVOR_MIX_NOT_ALLOWED'
  | 'MISSING_PRICE'
  | 'NOTES_TOO_LONG'
  | 'COMBO_ITEM_UNAVAILABLE'
  | 'PRICE_NOT_CONFIRMED'
  | 'OPTION_PRICE_PENDING';

export interface PricingError {
  code: PricingErrorCode;
  message: string;
}

export interface PricedOption {
  groupId: string;
  groupKind: OptionGroupKind;
  groupName: string;
  valueId: string;
  valueName: string;
  /** Contribuição deste item no preço unitário (sabores entram no preço-base). */
  price: Cents;
}

export interface PricedLine {
  productId: string;
  variantId: string | null;
  kind: CatalogProduct['kind'];
  productName: string;
  variantName: string | null;
  categoryId: string;
  categoryName: string;
  quantity: number;
  notes: string | null;
  unitRegular: Cents;
  unitDiscount: Cents;
  unitPrice: Cents;
  lineTotal: Cents;
  promotionId: string | null;
  options: PricedOption[];
  /** Linhas descritivas para carrinho, WhatsApp e painel. */
  summary: string[];
  detail: {
    rule?: string;
    base: Cents;
    flavorPrices?: { name: string; price: Cents }[];
    optionsTotal: Cents;
    promotion?: { id: string; title: string; promoPrice: Cents };
  };
}

export type PricingResult = { ok: true; line: PricedLine } | { ok: false; error: PricingError };

const MAX_NOTES = 200;

const fail = (code: PricingErrorCode, message: string): PricingResult => ({ ok: false, error: { code, message } });

/**
 * Regra da opção para o tamanho: primeiro a regra específica do produto (id da
 * variante), depois a regra por código de tamanho (grupos compartilhados).
 */
export function optionRuleFor(value: CatalogOptionValue, variant: Pick<CatalogVariant, 'id' | 'sizeCode'> | null) {
  if (!variant) return undefined;
  return value.variantRules[variant.id] ?? (variant.sizeCode ? value.sizeRules[variant.sizeCode] : undefined);
}

export function optionPriceFor(value: CatalogOptionValue, variant: Pick<CatalogVariant, 'id' | 'sizeCode'> | null): Cents {
  const rule = optionRuleFor(value, variant);
  return rule && rule.price !== null ? rule.price : value.price;
}

export function isOptionOfferedFor(value: CatalogOptionValue, variant: Pick<CatalogVariant, 'id' | 'sizeCode'> | null): boolean {
  const rule = optionRuleFor(value, variant);
  return !rule || rule.isOffered;
}

/** Preço de um sabor em determinado tamanho: preço específico ou o preço-base do tamanho. */
export function flavorPriceFor(value: CatalogOptionValue, variant: CatalogVariant): Cents {
  const rule = optionRuleFor(value, variant);
  if (rule && rule.price !== null) return rule.price;
  return variant.price;
}

export function computePizzaBase(variant: CatalogVariant, flavorPrices: Cents[]): Cents {
  if (variant.flavorPriceRule === 'fixed' || flavorPrices.length === 0) return variant.price;
  if (variant.flavorPriceRule === 'highest') return Math.max(...flavorPrices);
  const sum = flavorPrices.reduce((a, b) => a + b, 0);
  return Math.round(sum / flavorPrices.length);
}

export function flavorLimitsFor(group: CatalogOptionGroup, variant: CatalogVariant | null) {
  const max = variant ? variant.maxFlavors : group.maxSelect;
  return { min: Math.max(1, Math.min(group.minSelect, max)), max };
}

function fractionLabel(count: number): string {
  if (count <= 1) return '';
  return `1/${count} `;
}

export function isWithinValidity(product: CatalogProduct, now: Date): boolean {
  if (product.availableFrom && new Date(product.availableFrom) > now) return false;
  if (product.availableUntil && new Date(product.availableUntil) <= now) return false;
  return true;
}

/** Motivo de o produto não poder ser pedido agora (para o selo do cartão), ou null. */
export function unavailableReason(product: CatalogProduct, now: Date): 'price' | 'soldout' | 'period' | null {
  if (!product.priceConfirmed) return 'price';
  if (!isWithinValidity(product, now)) return 'period';
  if (!isProductOrderable(product, now)) return 'soldout';
  return null;
}

export function isProductOrderable(product: CatalogProduct, now: Date): boolean {
  if (!product.priceConfirmed) return false;
  if (!product.isAvailable || !isWithinValidity(product, now)) return false;
  if (product.kind === 'combo' && product.comboItems.some((item) => !item.isAvailable)) return false;
  if (product.kind === 'pizza' && !product.variants.some((v) => v.isAvailable)) return false;
  return true;
}

/** Existe alguma promoção válida (preço menor que o normal) em algum tamanho do produto? */
export function hasActivePromotion(product: CatalogProduct, now: Date): boolean {
  if (product.variants.length > 0) {
    return product.variants.some((v) => v.isAvailable && findBestPromotion(product, v.id, v.price, now) !== null);
  }
  return product.basePrice !== null && findBestPromotion(product, null, product.basePrice, now) !== null;
}

/** Menor preço "a partir de" para exibir no cartão do produto (considera promoções). */
export function startingPrice(product: CatalogProduct, now: Date): { regular: Cents; current: Cents } | null {
  const candidates: { regular: Cents; current: Cents }[] = [];
  const consider = (variantId: string | null, regular: Cents) => {
    const promo = findBestPromotion(product, variantId, regular, now);
    candidates.push({ regular, current: promo ? promo.promoPrice : regular });
  };
  if (product.variants.length > 0) {
    for (const variant of product.variants) {
      if (!variant.isAvailable) continue;
      let regular = variant.price;
      if (product.kind === 'pizza' && variant.flavorPriceRule !== 'fixed') {
        const flavorGroup = product.groups.find((g) => g.kind === 'flavor');
        const prices = (flavorGroup?.values ?? [])
          .filter((v) => v.isAvailable && isOptionOfferedFor(v, variant))
          .map((v) => flavorPriceFor(v, variant));
        if (prices.length > 0) regular = Math.min(...prices);
      }
      consider(variant.id, regular);
    }
  } else if (product.basePrice !== null) {
    consider(null, product.basePrice);
  }
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.current < a.current ? b : a));
}

export function priceLine(
  product: CatalogProduct | undefined,
  selection: LineSelection,
  ctx: PricingContext,
): PricingResult {
  if (!product) return fail('PRODUCT_NOT_FOUND', 'Produto não encontrado ou retirado do cardápio.');
  const name = product.name;

  if (!Number.isInteger(selection.quantity) || selection.quantity < 1 || selection.quantity > product.maxQuantity) {
    return fail('INVALID_QUANTITY', `Quantidade inválida para ${name} (máximo ${product.maxQuantity}).`);
  }
  if (!product.priceConfirmed) {
    return fail('PRICE_NOT_CONFIRMED', `${name}: preço em conferência pelo restaurante. Disponível em breve.`);
  }
  if (!product.isAvailable) return fail('PRODUCT_UNAVAILABLE', `${name} está esgotado no momento.`);
  if (!isWithinValidity(product, ctx.now)) {
    return fail('OUTSIDE_VALIDITY', `${name} não está disponível neste período.`);
  }
  if (ctx.openShifts && product.shiftRestriction !== 'any' && !ctx.openShifts.includes(product.shiftRestriction)) {
    const label = product.shiftRestriction === 'lunch' ? 'almoço' : 'noite';
    return fail('SHIFT_NOT_OPEN', `${name} é servido apenas no horário de ${label}.`);
  }
  const notes = selection.notes?.trim() ? selection.notes.trim() : null;
  if (notes && notes.length > MAX_NOTES) {
    return fail('NOTES_TOO_LONG', `A observação de ${name} pode ter no máximo ${MAX_NOTES} caracteres.`);
  }

  // ---------------------------------------------------------------- variante
  let variant: CatalogVariant | null = null;
  if (product.variants.length > 0) {
    variant = product.variants.find((v) => v.id === selection.variantId) ?? null;
    if (!variant) return fail('VARIANT_REQUIRED', `Escolha o tamanho de ${name}.`);
    if (!variant.isAvailable) return fail('VARIANT_UNAVAILABLE', `${name} (${variant.name}) está esgotado.`);
  } else if (selection.variantId) {
    return fail('VARIANT_UNAVAILABLE', `O tamanho escolhido para ${name} não existe mais.`);
  }
  if (product.kind === 'pizza' && !variant) return fail('VARIANT_REQUIRED', `Escolha o tamanho de ${name}.`);

  if (product.kind === 'combo') {
    const missing = product.comboItems.find((item) => !item.isAvailable);
    if (missing) {
      return fail('COMBO_ITEM_UNAVAILABLE', `${name}: o item "${missing.description ?? missing.productName}" está esgotado.`);
    }
  }

  // ---------------------------------------------------------------- opções
  for (const groupId of Object.keys(selection.options)) {
    if ((selection.options[groupId]?.length ?? 0) > 0 && !product.groups.some((g) => g.id === groupId)) {
      return fail('UNKNOWN_GROUP', `Uma opção escolhida para ${name} não existe mais. Revise o item.`);
    }
  }

  const options: PricedOption[] = [];
  const summary: string[] = [];
  let optionsTotal = 0;
  let flavorPrices: { name: string; price: Cents }[] | undefined;

  const groups = [...product.groups].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const group of groups) {
    if (group.kind === 'flavor' && product.kind !== 'pizza') continue;
    const chosenIds = selection.options[group.id] ?? [];
    if (new Set(chosenIds).size !== chosenIds.length) {
      return fail('DUPLICATE_OPTION', `${name}: a mesma opção foi escolhida mais de uma vez em "${group.name}".`);
    }
    const limits =
      group.kind === 'flavor'
        ? flavorLimitsFor(group, variant)
        : group.kind === 'crust'
          ? { min: Math.min(group.minSelect, 1), max: 1 }
          : { min: group.minSelect, max: group.maxSelect };

    if (chosenIds.length < limits.min) {
      return fail(
        'TOO_FEW_OPTIONS',
        limits.min === 1 ? `${name}: escolha uma opção em "${group.name}".` : `${name}: escolha pelo menos ${limits.min} opções em "${group.name}".`,
      );
    }
    if (chosenIds.length > limits.max) {
      return fail('TOO_MANY_OPTIONS', `${name}: escolha no máximo ${limits.max} em "${group.name}".`);
    }

    const chosen: CatalogOptionValue[] = [];
    for (const id of chosenIds) {
      const value = group.values.find((v) => v.id === id);
      if (!value || !value.isAvailable) {
        return fail('OPTION_UNAVAILABLE', `${name}: "${value?.name ?? 'opção'}" não está disponível.`);
      }
      if (!isOptionOfferedFor(value, variant)) {
        return fail('OPTION_NOT_OFFERED_FOR_SIZE', `${name}: "${value.name}" não é oferecido no tamanho ${variant?.name ?? ''}.`.trim());
      }
      if (!value.priceConfirmed) {
        return fail('OPTION_PRICE_PENDING', `${name}: o valor de "${value.name}" ainda não foi definido pelo restaurante.`);
      }
      chosen.push(value);
    }

    if (group.kind === 'flavor' && variant) {
      if (!variant.allowMixedFlavorTags) {
        const tags = new Set(chosen.map((v) => v.combinationTag ?? ''));
        if (tags.size > 1) {
          return fail('FLAVOR_MIX_NOT_ALLOWED', `${name}: neste tamanho não é permitido misturar sabores de tipos diferentes.`);
        }
      }
      flavorPrices = chosen.map((v) => ({ name: v.name, price: flavorPriceFor(v, variant) }));
      const fraction = fractionLabel(chosen.length);
      for (const value of chosen) {
        options.push({ groupId: group.id, groupKind: group.kind, groupName: group.name, valueId: value.id, valueName: value.name, price: 0 });
      }
      summary.push(`${chosen.length > 1 ? 'Sabores' : 'Sabor'}: ${chosen.map((v) => `${fraction}${v.name}`).join(', ')}`);
      continue;
    }

    if (chosen.length > 0) {
      const parts: string[] = [];
      for (const value of chosen) {
        const price = optionPriceFor(value, variant);
        optionsTotal += price;
        options.push({ groupId: group.id, groupKind: group.kind, groupName: group.name, valueId: value.id, valueName: value.name, price });
        parts.push(value.name);
      }
      summary.push(`${group.name}: ${parts.join(', ')}`);
    }
  }

  // ---------------------------------------------------------------- preço-base
  let base: Cents;
  let rule: string | undefined;
  if (product.kind === 'pizza' && variant) {
    base = computePizzaBase(variant, (flavorPrices ?? []).map((f) => f.price));
    rule = variant.flavorPriceRule;
  } else if (variant) {
    base = variant.price;
  } else if (product.basePrice !== null) {
    base = product.basePrice;
  } else {
    return fail('MISSING_PRICE', `${name} está sem preço cadastrado. Avise a equipe.`);
  }

  const promotion = findBestPromotion(product, variant?.id ?? null, base, ctx.now);
  const unitDiscount = promotion ? base - promotion.promoPrice : 0;
  const unitRegular = base + optionsTotal;
  const unitPrice = unitRegular - unitDiscount;

  if (product.kind === 'combo') {
    for (const item of product.comboItems) {
      summary.unshift(`Inclui: ${item.quantity}x ${item.description ?? item.productName}`);
    }
  }

  return {
    ok: true,
    line: {
      productId: product.id,
      variantId: variant?.id ?? null,
      kind: product.kind,
      productName: product.name,
      variantName: variant?.name ?? null,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      quantity: selection.quantity,
      notes,
      unitRegular,
      unitDiscount,
      unitPrice,
      lineTotal: unitPrice * selection.quantity,
      promotionId: promotion?.id ?? null,
      options,
      summary,
      detail: {
        rule,
        base,
        flavorPrices,
        optionsTotal,
        promotion: promotion ? { id: promotion.id, title: promotion.title, promoPrice: promotion.promoPrice } : undefined,
      },
    },
  };
}

export interface CartTotals {
  grossSubtotal: Cents;
  discountTotal: Cents;
  itemsSubtotal: Cents;
}

export function sumLines(lines: PricedLine[]): CartTotals {
  let gross = 0;
  let discount = 0;
  for (const line of lines) {
    gross += line.unitRegular * line.quantity;
    discount += line.unitDiscount * line.quantity;
  }
  return { grossSubtotal: gross, discountTotal: discount, itemsSubtotal: gross - discount };
}

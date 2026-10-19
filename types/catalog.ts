import type { Cents } from '@/lib/money';

export type ProductKind = 'simple' | 'pizza' | 'combo';
export type OptionGroupKind = 'flavor' | 'crust' | 'extra' | 'choice';
export type FlavorPriceRule = 'fixed' | 'highest' | 'average';
export type ServiceShift = 'lunch' | 'dinner';
export type ShiftRestriction = 'any' | ServiceShift;

export interface VariantRule {
  price: Cents | null;
  isOffered: boolean;
}

export interface CatalogOptionValue {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: Cents;
  combinationTag: string | null;
  sortOrder: number;
  isAvailable: boolean;
  /** Regras por tamanho: preço específico e se a opção é oferecida naquele tamanho. */
  variantRules: Record<string, VariantRule>;
}

export interface CatalogOptionGroup {
  id: string;
  kind: OptionGroupKind;
  name: string;
  description: string | null;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  values: CatalogOptionValue[];
}

export interface CatalogVariant {
  id: string;
  name: string;
  description: string | null;
  price: Cents;
  maxFlavors: number;
  flavorPriceRule: FlavorPriceRule;
  allowMixedFlavorTags: boolean;
  sortOrder: number;
  isAvailable: boolean;
}

export interface CatalogPromotion {
  id: string;
  title: string;
  description: string | null;
  variantId: string | null;
  promoPrice: Cents;
  startsAt: string | null;
  endsAt: string | null;
}

export interface CatalogComboItem {
  productId: string;
  variantId: string | null;
  quantity: number;
  description: string | null;
  productName: string;
  isAvailable: boolean;
}

export interface CatalogProduct {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  kind: ProductKind;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  images: { url: string; alt: string | null }[];
  basePrice: Cents | null;
  isAvailable: boolean;
  isFeatured: boolean;
  featuredOrder: number | null;
  sortOrder: number;
  shiftRestriction: ShiftRestriction;
  availableFrom: string | null;
  availableUntil: string | null;
  tags: string[];
  serves: string | null;
  maxQuantity: number;
  isDemo: boolean;
  variants: CatalogVariant[];
  groups: CatalogOptionGroup[];
  promotions: CatalogPromotion[];
  comboItems: CatalogComboItem[];
}

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  showOnHome: boolean;
}

export interface Catalog {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  /** Momento em que os dados foram lidos do banco (ISO). */
  fetchedAt: string;
}

/** Escolhas do cliente para um item do carrinho. */
export interface LineSelection {
  productId: string;
  variantId: string | null;
  /** groupId -> ids das opções escolhidas (ordem preservada para sabores). */
  options: Record<string, string[]>;
  quantity: number;
  notes?: string | null;
}

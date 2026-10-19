import { toCents, toCentsOrNull } from '@/lib/money';
import type {
  CatalogCategory,
  CatalogOptionGroup,
  CatalogProduct,
  FlavorPriceRule,
  OptionGroupKind,
  ProductKind,
  ShiftRestriction,
} from '@/types/catalog';

/* Tipos das linhas retornadas pelo PostgREST (somente o que usamos). */
export interface VariantRow {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  max_flavors: number;
  flavor_price_rule: FlavorPriceRule;
  allow_mixed_flavor_tags: boolean;
  sort_order: number;
  is_active: boolean;
  is_available: boolean;
  deleted_at: string | null;
}
export interface OptionValueRow {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | string;
  combination_tag: string | null;
  sort_order: number;
  is_active: boolean;
  is_available: boolean;
  deleted_at: string | null;
  option_value_variant_prices: { variant_id: string; price: number | string | null; is_offered: boolean }[];
}
export interface OptionGroupRow {
  id: string;
  kind: OptionGroupKind;
  name: string;
  description: string | null;
  min_select: number;
  max_select: number;
  sort_order: number;
  is_active: boolean;
  deleted_at: string | null;
  option_values: OptionValueRow[];
}
export interface ProductRow {
  id: string;
  category_id: string;
  kind: ProductKind;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  image_alt: string | null;
  base_price: number | string | null;
  is_active: boolean;
  is_available: boolean;
  is_featured: boolean;
  featured_order: number | null;
  sort_order: number;
  shift_restriction: ShiftRestriction;
  available_from: string | null;
  available_until: string | null;
  tags: string[];
  serves: string | null;
  max_quantity: number;
  is_demo: boolean;
  deleted_at: string | null;
  categories: { id: string; slug: string; name: string } | null;
  product_images: { url: string; alt: string | null; sort_order: number }[];
  product_variants: VariantRow[];
  option_groups: OptionGroupRow[];
  promotions: {
    id: string;
    title: string;
    description: string | null;
    variant_id: string | null;
    promo_price: number | string;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
  }[];
  combo_items: {
    item_product_id: string;
    item_variant_id: string | null;
    quantity: number;
    description: string | null;
    sort_order: number;
    item: { name: string; is_available: boolean; is_active: boolean; deleted_at: string | null } | null;
    variant: { is_available: boolean; is_active: boolean; deleted_at: string | null } | null;
  }[];
}

export const PRODUCT_SELECT = `
  id, category_id, kind, slug, name, short_description, description, image_url, image_alt, base_price,
  is_active, is_available, is_featured, featured_order, sort_order, shift_restriction, available_from,
  available_until, tags, serves, max_quantity, is_demo, deleted_at,
  categories ( id, slug, name ),
  product_images ( url, alt, sort_order ),
  product_variants ( id, name, description, price, max_flavors, flavor_price_rule, allow_mixed_flavor_tags,
                     sort_order, is_active, is_available, deleted_at ),
  option_groups ( id, kind, name, description, min_select, max_select, sort_order, is_active, deleted_at,
    option_values ( id, group_id, name, description, image_url, price, combination_tag, sort_order, is_active,
                    is_available, deleted_at,
      option_value_variant_prices ( variant_id, price, is_offered ) ) ),
  promotions ( id, title, description, variant_id, promo_price, starts_at, ends_at, is_active ),
  combo_items!combo_items_combo_product_id_fkey ( item_product_id, item_variant_id, quantity, description, sort_order,
    item:products!combo_items_item_product_id_fkey ( name, is_available, is_active, deleted_at ),
    variant:product_variants ( is_available, is_active, deleted_at ) )
`;

const live = <T extends { is_active: boolean; deleted_at: string | null }>(row: T) => row.is_active && !row.deleted_at;
const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

function mapGroups(groups: OptionGroupRow[]): CatalogOptionGroup[] {
  return groups
    .filter(live)
    .sort(bySort)
    .map((g) => ({
      id: g.id,
      kind: g.kind,
      name: g.name,
      description: g.description,
      minSelect: g.min_select,
      maxSelect: g.max_select,
      sortOrder: g.sort_order,
      values: g.option_values
        .filter(live)
        .sort(bySort)
        .map((v) => ({
          id: v.id,
          groupId: v.group_id,
          name: v.name,
          description: v.description,
          imageUrl: v.image_url,
          price: toCents(v.price),
          combinationTag: v.combination_tag,
          sortOrder: v.sort_order,
          isAvailable: v.is_available,
          variantRules: Object.fromEntries(
            v.option_value_variant_prices.map((r) => [r.variant_id, { price: toCentsOrNull(r.price), isOffered: r.is_offered }]),
          ),
        })),
    }));
}

/** Converte a linha do banco no formato usado pelo site e pelo motor de preços. */
export function mapProduct(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    categoryId: row.category_id,
    categorySlug: row.categories?.slug ?? '',
    categoryName: row.categories?.name ?? '',
    kind: row.kind,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    images: [...row.product_images].sort(bySort).map((i) => ({ url: i.url, alt: i.alt })),
    basePrice: toCentsOrNull(row.base_price),
    isAvailable: row.is_available,
    isFeatured: row.is_featured,
    featuredOrder: row.featured_order,
    sortOrder: row.sort_order,
    shiftRestriction: row.shift_restriction,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    tags: row.tags ?? [],
    serves: row.serves,
    maxQuantity: row.max_quantity,
    isDemo: row.is_demo,
    variants: row.product_variants
      .filter(live)
      .sort(bySort)
      .map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        price: toCents(v.price),
        maxFlavors: v.max_flavors,
        flavorPriceRule: v.flavor_price_rule,
        allowMixedFlavorTags: v.allow_mixed_flavor_tags,
        sortOrder: v.sort_order,
        isAvailable: v.is_available,
      })),
    groups: mapGroups(row.option_groups),
    promotions: row.promotions
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        variantId: p.variant_id,
        promoPrice: toCents(p.promo_price),
        startsAt: p.starts_at,
        endsAt: p.ends_at,
      })),
    comboItems: [...row.combo_items].sort(bySort).map((c) => ({
      productId: c.item_product_id,
      variantId: c.item_variant_id,
      quantity: c.quantity,
      description: c.description,
      productName: c.item?.name ?? 'Item',
      isAvailable:
        Boolean(c.item && c.item.is_available && c.item.is_active && !c.item.deleted_at) &&
        (c.item_variant_id === null || Boolean(c.variant && c.variant.is_available && c.variant.is_active && !c.variant.deleted_at)),
    })),
  };
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  show_on_home: boolean;
}

export function mapCategory(row: CategoryRow): CatalogCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    showOnHome: row.show_on_home,
  };
}

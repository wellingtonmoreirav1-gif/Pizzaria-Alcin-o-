'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, bool, check, int, localDateTime, money, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';
import { slugify } from '@/lib/utils';
import { isAllowedImageUrl } from '@/lib/uploads';

const roles = [...PERMISSIONS.catalog];
const uuid = z.uuid();

function requireId(id: string) {
  if (!uuid.safeParse(id).success) throw new ActionError('Registro inválido.');
}

function imageUrl(form: FormData, key: string): string | null {
  const url = str(form, key);
  if (!isAllowedImageUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL)) throw new ActionError('Endereço de imagem não permitido.');
  return url;
}

function productFields(form: FormData) {
  const name = str(form, 'name');
  if (!name || name.length > 120) throw new ActionError('Informe o nome do produto (até 120 caracteres).');
  const categoryId = str(form, 'categoryId');
  if (!categoryId || !uuid.safeParse(categoryId).success) throw new ActionError('Escolha a categoria.');
  const kind = str(form, 'kind') ?? 'simple';
  if (!['simple', 'pizza', 'combo'].includes(kind)) throw new ActionError('Tipo inválido.');
  const shift = str(form, 'shiftRestriction') ?? 'any';
  if (!['any', 'lunch', 'dinner'].includes(shift)) throw new ActionError('Turno inválido.');
  const slug = slugify(str(form, 'slug') ?? name);
  if (!slug) throw new ActionError('Slug inválido.');
  const featuredOrder = str(form, 'featuredOrder');
  return {
    name,
    slug,
    category_id: categoryId,
    kind,
    short_description: str(form, 'shortDescription'),
    description: str(form, 'description'),
    base_price: money(form, 'basePrice'),
    tags: (str(form, 'tags') ?? '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12),
    serves: str(form, 'serves'),
    max_quantity: Math.min(99, Math.max(1, int(form, 'maxQuantity', 30))),
    shift_restriction: shift,
    available_from: localDateTime(form, 'availableFrom'),
    available_until: localDateTime(form, 'availableUntil'),
    is_active: bool(form, 'isActive'),
    is_available: bool(form, 'isAvailable'),
    is_featured: bool(form, 'isFeatured'),
    featured_order: featuredOrder ? int(form, 'featuredOrder') : null,
    sort_order: int(form, 'sortOrder'),
    image_url: imageUrl(form, 'imageUrl'),
    image_alt: str(form, 'imageAlt'),
  };
}

export async function createProduct(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const fields = productFields(form);
      const { data } = check(await db.from('products').insert(fields).select('id').single());
      if (fields.kind === 'pizza') {
        check(
          await db.from('option_groups').insert([
            { product_id: data!.id, kind: 'flavor', name: 'Sabores', min_select: 1, max_select: 1, sort_order: 1 },
            { product_id: data!.id, kind: 'crust', name: 'Borda', min_select: 0, max_select: 1, sort_order: 2 },
            { product_id: data!.id, kind: 'extra', name: 'Adicionais', min_select: 0, max_select: 5, sort_order: 3 },
          ]),
        );
      }
      return { ok: true, message: 'Produto criado. Complete tamanhos e opções.', id: data!.id };
    },
    ['catalog'],
  );
}

export async function updateProduct(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(id);
      check(await db.from('products').update(productFields(form)).eq('id', id));
      revalidatePath(`/admin/cardapio/${id}`);
      return 'Produto salvo.';
    },
    ['catalog'],
  );
}

export async function archiveProduct(id: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(id);
      check(await db.from('products').update({ deleted_at: new Date().toISOString(), is_active: false, is_featured: false }).eq('id', id));
      revalidatePath('/admin/cardapio');
      return 'Produto arquivado. O histórico de vendas foi preservado.';
    },
    ['catalog'],
  );
}

export async function restoreProduct(id: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(id);
      check(await db.from('products').update({ deleted_at: null }).eq('id', id));
      revalidatePath('/admin/cardapio');
      return 'Produto restaurado (continua inativo até você ativar).';
    },
    ['catalog'],
  );
}

/* ------------------------------------------------------------ variantes */
function variantFields(form: FormData) {
  const name = str(form, 'name');
  if (!name) throw new ActionError('Informe o nome do tamanho/variante.');
  const price = money(form, 'price');
  if (price === null) throw new ActionError('Informe o preço.');
  const rule = str(form, 'flavorPriceRule') ?? 'highest';
  if (!['fixed', 'highest', 'average'].includes(rule)) throw new ActionError('Regra de preço inválida.');
  return {
    name,
    description: str(form, 'description'),
    price,
    max_flavors: Math.min(8, Math.max(1, int(form, 'maxFlavors', 1))),
    flavor_price_rule: rule,
    allow_mixed_flavor_tags: bool(form, 'allowMixed'),
    sort_order: int(form, 'sortOrder'),
    is_active: bool(form, 'isActive'),
  };
}

export async function saveVariant(productId: string, variantId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      const fields = variantFields(form);
      if (variantId) {
        requireId(variantId);
        check(await db.from('product_variants').update(fields).eq('id', variantId).eq('product_id', productId));
      } else {
        check(await db.from('product_variants').insert({ ...fields, product_id: productId }));
      }
      revalidatePath(`/admin/cardapio/${productId}`);
      return variantId ? 'Tamanho salvo.' : 'Tamanho adicionado.';
    },
    ['catalog'],
  );
}

export async function archiveVariant(productId: string, variantId: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      requireId(variantId);
      check(await db.from('product_variants').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', variantId).eq('product_id', productId));
      revalidatePath(`/admin/cardapio/${productId}`);
      return 'Tamanho removido.';
    },
    ['catalog'],
  );
}

/* ------------------------------------------------------------ grupos e opções */
export async function saveGroup(productId: string, groupId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      const name = str(form, 'name');
      if (!name) throw new ActionError('Informe o nome do grupo.');
      const kind = str(form, 'kind') ?? 'choice';
      if (!['flavor', 'crust', 'extra', 'choice'].includes(kind)) throw new ActionError('Tipo de grupo inválido.');
      const min = Math.max(0, int(form, 'minSelect'));
      const max = Math.max(1, int(form, 'maxSelect', 1));
      if (max < min) throw new ActionError('O máximo deve ser maior ou igual ao mínimo.');
      const fields = { name, kind, description: str(form, 'description'), min_select: min, max_select: max, sort_order: int(form, 'sortOrder'), is_active: bool(form, 'isActive') };
      if (groupId) {
        requireId(groupId);
        check(await db.from('option_groups').update(fields).eq('id', groupId).eq('product_id', productId));
      } else {
        check(await db.from('option_groups').insert({ ...fields, product_id: productId }));
      }
      revalidatePath(`/admin/cardapio/${productId}`);
      return 'Grupo salvo.';
    },
    ['catalog'],
  );
}

export async function archiveGroup(productId: string, groupId: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      requireId(groupId);
      check(await db.from('option_groups').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', groupId).eq('product_id', productId));
      revalidatePath(`/admin/cardapio/${productId}`);
      return 'Grupo removido.';
    },
    ['catalog'],
  );
}

export async function saveOptionValue(productId: string, groupId: string, valueId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      requireId(groupId);
      const name = str(form, 'name');
      if (!name) throw new ActionError('Informe o nome da opção.');
      const fields = {
        name,
        description: str(form, 'description'),
        price: money(form, 'price') ?? '0',
        combination_tag: str(form, 'combinationTag')?.toLowerCase() ?? null,
        sort_order: int(form, 'sortOrder'),
        is_active: bool(form, 'isActive'),
      };
      if (valueId) {
        requireId(valueId);
        check(await db.from('option_values').update(fields).eq('id', valueId).eq('group_id', groupId));
      } else {
        check(await db.from('option_values').insert({ ...fields, group_id: groupId }));
      }
      revalidatePath(`/admin/cardapio/${productId}`);
      return 'Opção salva.';
    },
    ['catalog'],
  );
}

export async function archiveOptionValue(productId: string, valueId: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      requireId(valueId);
      check(await db.from('option_values').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', valueId));
      revalidatePath(`/admin/cardapio/${productId}`);
      return 'Opção removida.';
    },
    ['catalog'],
  );
}

/**
 * Salva a matriz "opção × tamanho": preço específico (vazio = usa o padrão) e se a
 * opção é oferecida naquele tamanho. Campos: price:<valueId>:<variantId>, offered:<valueId>:<variantId>.
 */
export async function saveSizeMatrix(productId: string, groupId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      requireId(groupId);
      const cells = new Map<string, { option_value_id: string; variant_id: string; price: string | null; is_offered: boolean }>();
      for (const key of form.keys()) {
        const m = /^(price|cell):([0-9a-f-]{36}):([0-9a-f-]{36})$/.exec(key);
        if (!m) continue;
        const [, , valueId, variantId] = m as unknown as [string, string, string, string];
        const id = `${valueId}:${variantId}`;
        if (!cells.has(id)) {
          cells.set(id, { option_value_id: valueId, variant_id: variantId, price: money(form, `price:${id}`), is_offered: bool(form, `offered:${id}`) });
        }
      }
      const rows = [...cells.values()];
      const custom = rows.filter((r) => r.price !== null || !r.is_offered);
      const defaults = rows.filter((r) => r.price === null && r.is_offered);
      if (custom.length) check(await db.from('option_value_variant_prices').upsert(custom, { onConflict: 'option_value_id,variant_id' }));
      for (const r of defaults) {
        check(await db.from('option_value_variant_prices').delete().eq('option_value_id', r.option_value_id).eq('variant_id', r.variant_id));
      }
      revalidatePath(`/admin/cardapio/${productId}`);
      return 'Preços por tamanho salvos.';
    },
    ['catalog'],
  );
}

/* ------------------------------------------------------------ combos */
export async function addComboItem(comboId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(comboId);
      const itemProductId = str(form, 'itemProductId');
      if (!itemProductId || !uuid.safeParse(itemProductId).success) throw new ActionError('Escolha o produto incluído.');
      if (itemProductId === comboId) throw new ActionError('Um combo não pode conter ele mesmo.');
      const variantId = str(form, 'itemVariantId');
      if (variantId && !uuid.safeParse(variantId).success) throw new ActionError('Tamanho inválido.');
      check(
        await db.from('combo_items').insert({
          combo_product_id: comboId,
          item_product_id: itemProductId,
          item_variant_id: variantId,
          quantity: Math.min(20, Math.max(1, int(form, 'quantity', 1))),
          description: str(form, 'description'),
          sort_order: int(form, 'sortOrder'),
        }),
      );
      revalidatePath(`/admin/cardapio/${comboId}`);
      return 'Item incluído no combo.';
    },
    ['catalog'],
  );
}

export async function removeComboItem(comboId: string, itemId: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(comboId);
      requireId(itemId);
      check(await db.from('combo_items').delete().eq('id', itemId).eq('combo_product_id', comboId));
      revalidatePath(`/admin/cardapio/${comboId}`);
      return 'Item removido do combo.';
    },
    ['catalog'],
  );
}

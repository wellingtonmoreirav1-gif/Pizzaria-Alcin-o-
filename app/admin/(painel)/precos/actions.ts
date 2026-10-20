'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, check, money, runAdminAction, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';

const roles = [...PERMISSIONS.catalog];
const uuid = z.uuid();

function requireId(id: string) {
  if (!uuid.safeParse(id).success) throw new ActionError('Registro inválido.');
}

function done(message: string, productId?: string) {
  revalidatePath('/admin/precos');
  revalidatePath('/admin');
  if (productId) revalidatePath(`/admin/cardapio/${productId}`);
  return message;
}

/**
 * Salva os valores digitados (campos variant:<id> e basePrice) e marca o produto
 * como conferido. Quem confirmou e quando são gravados pelo banco.
 */
export async function confirmProductPrices(productId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      const { data: product } = check(await db.from('products').select('id, base_price, product_variants(id, deleted_at)').eq('id', productId).maybeSingle());
      if (!product) throw new ActionError('Produto não encontrado.');
      const variants = (product.product_variants ?? []).filter((v: { deleted_at: string | null }) => !v.deleted_at) as { id: string }[];
      for (const v of variants) {
        const price = money(form, `variant:${v.id}`);
        if (price === null) throw new ActionError('Informe o valor de todos os tamanhos antes de confirmar.');
        check(await db.from('product_variants').update({ price }).eq('id', v.id).eq('product_id', productId));
      }
      const update: { price_confirmed: boolean; base_price?: string } = { price_confirmed: true };
      if (variants.length === 0) {
        const base = money(form, 'basePrice');
        if (base === null) throw new ActionError('Informe o valor antes de confirmar.');
        update.base_price = base;
      }
      check(await db.from('products').update(update).eq('id', productId));
      return done('Valores conferidos e liberados para pedido.', productId);
    },
    ['catalog'],
  );
}

/** Confirma, sem alterar, os valores dos produtos marcados (campo "product" repetido). */
export async function confirmSelectedProducts(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const ids = [...new Set(form.getAll('product').map(String))];
      if (ids.length === 0) throw new ActionError('Marque pelo menos um produto.');
      ids.forEach(requireId);
      const { data } = check(await db.from('products').update({ price_confirmed: true }).in('id', ids).eq('price_confirmed', false).select('id'));
      return done(`${data?.length ?? 0} produto(s) conferido(s).`);
    },
    ['catalog'],
  );
}

/** Volta o produto para "preço em conferência" (some a opção de pedir). */
export async function unconfirmProductPrices(productId: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(productId);
      check(await db.from('products').update({ price_confirmed: false }).eq('id', productId));
      return done('Produto marcado como “preço em conferência”. Ele continua visível, mas não pode ser pedido.', productId);
    },
    ['catalog'],
  );
}

/** Define o valor de uma opção (ex.: molho) e libera. 0,00 = grátis. */
export async function confirmOptionPrice(valueId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      requireId(valueId);
      const price = money(form, 'price');
      if (price === null) throw new ActionError('Informe o valor (0,00 para grátis).');
      check(await db.from('option_values').update({ price, price_confirmed: true }).eq('id', valueId));
      revalidatePath('/admin/opcoes');
      return done(Number(price) === 0 ? 'Opção liberada como grátis.' : 'Valor da opção conferido.');
    },
    ['catalog'],
  );
}

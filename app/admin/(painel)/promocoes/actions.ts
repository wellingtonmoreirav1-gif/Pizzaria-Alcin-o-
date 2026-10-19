'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, bool, check, localDateTime, money, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';

const roles = [...PERMISSIONS.catalog];

export async function savePromotion(id: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const title = str(form, 'title');
      if (!title) throw new ActionError('Informe o título da promoção.');
      const target = str(form, 'target') ?? '';
      const [productId, variantId] = target.split(':');
      if (!productId || !z.uuid().safeParse(productId).success) throw new ActionError('Escolha o produto.');
      if (variantId && !z.uuid().safeParse(variantId).success) throw new ActionError('Tamanho inválido.');
      const promo = money(form, 'promoPrice');
      if (promo === null) throw new ActionError('Informe o preço promocional.');
      const fields = {
        title,
        description: str(form, 'description'),
        product_id: productId,
        variant_id: variantId || null,
        promo_price: promo,
        starts_at: localDateTime(form, 'startsAt'),
        ends_at: localDateTime(form, 'endsAt'),
        is_active: bool(form, 'isActive'),
      };
      if (id) {
        if (!z.uuid().safeParse(id).success) throw new ActionError('Registro inválido.');
        check(await db.from('promotions').update(fields).eq('id', id));
      } else {
        check(await db.from('promotions').insert(fields));
      }
      revalidatePath('/admin/promocoes');
      return 'Promoção salva. Ela só aparece se o preço promocional for menor que o normal.';
    },
    ['catalog'],
  );
}

export async function deletePromotion(id: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      if (!z.uuid().safeParse(id).success) throw new ActionError('Registro inválido.');
      check(await db.from('promotions').update({ is_active: false }).eq('id', id));
      revalidatePath('/admin/promocoes');
      return 'Promoção desativada.';
    },
    ['catalog'],
  );
}

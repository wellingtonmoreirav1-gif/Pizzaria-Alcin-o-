'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, check, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';
import { isAllowedImageUrl } from '@/lib/uploads';

const PROVISIONAL_ALT = /^Imagem ilustrativa provisória/i;

function allowedImage(form: FormData, key: string): string | null {
  const url = str(form, key);
  if (!isAllowedImageUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL)) throw new ActionError('Endereço de imagem não permitido.');
  return url;
}

/** Salva somente a logo (sem mexer nas demais configurações). */
export async function saveBrandImages(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    [...PERMISSIONS.settings],
    async (_ctx, db) => {
      const logo = allowedImage(form, 'logoUrl');
      check(await db.from('business_settings').update({ logo_url: logo }).eq('id', 1));
      revalidatePath('/admin/fotos');
      return 'Logo salva.';
    },
    ['settings'],
  );
}

/** Foto da faixa da categoria na página inicial (vazio = usa a foto do primeiro produto). */
export async function saveCategoryPhoto(categoryId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    [...PERMISSIONS.catalog],
    async (_ctx, db) => {
      if (!z.uuid().safeParse(categoryId).success) throw new ActionError('Categoria inválida.');
      const url = allowedImage(form, 'imageUrl');
      const { data } = check(await db.from('categories').update({ image_url: url }).eq('id', categoryId).select('name').maybeSingle());
      if (!data) throw new ActionError('Categoria não encontrada.');
      revalidatePath('/admin/fotos');
      return url ? `Foto de ${data.name} salva.` : `Foto de ${data.name} removida.`;
    },
    ['catalog'],
  );
}

/** Troca a foto de um produto. Ao enviar foto real, o texto "imagem ilustrativa" sai do texto alternativo. */
export async function saveProductPhoto(productId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    [...PERMISSIONS.catalog],
    async (_ctx, db) => {
      if (!z.uuid().safeParse(productId).success) throw new ActionError('Produto inválido.');
      const { data: product } = check(await db.from('products').select('name').eq('id', productId).maybeSingle());
      if (!product) throw new ActionError('Produto não encontrado.');
      const url = allowedImage(form, 'imageUrl');
      let alt = str(form, 'imageAlt');
      if (alt && alt.length > 200) throw new ActionError('Texto alternativo com até 200 caracteres.');
      const isProvisional = !url || url.startsWith('/images/products/');
      if (!isProvisional && (!alt || PROVISIONAL_ALT.test(alt))) alt = product.name;
      if (url && isProvisional && !alt) alt = `Imagem ilustrativa provisória de ${product.name} (foto oficial em breve)`;
      check(await db.from('products').update({ image_url: url, image_alt: alt }).eq('id', productId));
      revalidatePath('/admin/fotos');
      revalidatePath(`/admin/cardapio/${productId}`);
      return url ? `Foto de ${product.name} salva.` : `Foto de ${product.name} removida.`;
    },
    ['catalog'],
  );
}

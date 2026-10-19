'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, bool, check, int, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';
import { slugify } from '@/lib/utils';
import { isAllowedImageUrl } from '@/lib/uploads';

const roles = [...PERMISSIONS.catalog];

export async function saveCategory(id: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const name = str(form, 'name');
      if (!name) throw new ActionError('Informe o nome da categoria.');
      const imageUrl = str(form, 'imageUrl');
      if (!isAllowedImageUrl(imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL)) throw new ActionError('Imagem não permitida.');
      const fields = {
        name,
        slug: slugify(str(form, 'slug') ?? name),
        description: str(form, 'description'),
        image_url: imageUrl,
        sort_order: int(form, 'sortOrder'),
        is_active: bool(form, 'isActive'),
        show_on_home: bool(form, 'showOnHome'),
      };
      if (id) {
        if (!z.uuid().safeParse(id).success) throw new ActionError('Registro inválido.');
        check(await db.from('categories').update(fields).eq('id', id));
      } else {
        check(await db.from('categories').insert(fields));
      }
      revalidatePath('/admin/categorias');
      return 'Categoria salva.';
    },
    ['catalog'],
  );
}

export async function archiveCategory(id: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      if (!z.uuid().safeParse(id).success) throw new ActionError('Registro inválido.');
      const { count } = await db.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id).is('deleted_at', null);
      if ((count ?? 0) > 0) throw new ActionError('Mova ou arquive os produtos desta categoria antes.');
      check(await db.from('categories').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id));
      revalidatePath('/admin/categorias');
      return 'Categoria arquivada.';
    },
    ['catalog'],
  );
}

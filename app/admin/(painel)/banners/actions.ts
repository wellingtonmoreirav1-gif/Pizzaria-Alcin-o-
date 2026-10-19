'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, bool, check, int, localDateTime, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';
import { isAllowedImageUrl } from '@/lib/uploads';

const roles = [...PERMISSIONS.banners];

export async function saveBanner(id: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const title = str(form, 'title');
      if (!title) throw new ActionError('Informe o título.');
      const href = str(form, 'ctaHref');
      if (href && !/^(\/[^/\s][^\s]*|https:\/\/[^\s]+)$/.test(href)) throw new ActionError('Link deve começar com / (página do site) ou https://');
      const imageUrl = str(form, 'imageUrl');
      if (!isAllowedImageUrl(imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL)) throw new ActionError('Imagem não permitida.');
      const fields = {
        title,
        body: str(form, 'body'),
        image_url: imageUrl,
        image_alt: str(form, 'imageAlt'),
        cta_label: str(form, 'ctaLabel'),
        cta_href: href,
        starts_at: localDateTime(form, 'startsAt'),
        ends_at: localDateTime(form, 'endsAt'),
        is_active: bool(form, 'isActive'),
        sort_order: int(form, 'sortOrder'),
      };
      if (id) {
        if (!z.uuid().safeParse(id).success) throw new ActionError('Registro inválido.');
        check(await db.from('banners').update(fields).eq('id', id));
      } else {
        check(await db.from('banners').insert(fields));
      }
      revalidatePath('/admin/banners');
      return 'Banner salvo.';
    },
    ['banners'],
  );
}

export async function deleteBanner(id: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      if (!z.uuid().safeParse(id).success) throw new ActionError('Registro inválido.');
      check(await db.from('banners').delete().eq('id', id));
      revalidatePath('/admin/banners');
      return 'Banner excluído.';
    },
    ['banners'],
  );
}

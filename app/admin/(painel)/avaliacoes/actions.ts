'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, check, runAdminAction, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';

export async function moderateReview(id: string, status: 'approved' | 'rejected', _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    [...PERMISSIONS.reviews],
    async (ctx, db) => {
      if (!z.uuid().safeParse(id).success || !['approved', 'rejected'].includes(status)) throw new ActionError('Dados inválidos.');
      check(await db.from('reviews').update({ status, moderated_by: ctx.user.id, moderated_at: new Date().toISOString() }).eq('id', id));
      revalidatePath('/admin/avaliacoes');
      return status === 'approved' ? 'Avaliação publicada.' : 'Avaliação recusada.';
    },
    ['reviews'],
  );
}

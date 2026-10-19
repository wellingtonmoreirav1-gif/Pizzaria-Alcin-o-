'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, check, runAdminAction, str, type ActionResult } from '@/lib/admin/action';

export async function setRole(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(['admin'], async (_ctx, db) => {
    const email = str(form, 'email');
    const role = str(form, 'role');
    if (!email || !z.email().safeParse(email).success) throw new ActionError('Informe um e-mail válido.');
    if (!role || !['admin', 'manager', 'attendant'].includes(role)) throw new ActionError('Escolha o papel.');
    check(await db.rpc('admin_set_user_role', { p_email: email, p_role: role }));
    revalidatePath('/admin/equipe');
    return 'Acesso atualizado.';
  });
}

export async function removeRole(userId: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(['admin'], async (_ctx, db) => {
    if (!z.uuid().safeParse(userId).success) throw new ActionError('Registro inválido.');
    check(await db.rpc('admin_remove_user_role', { p_user_id: userId }));
    revalidatePath('/admin/equipe');
    return 'Acesso removido.';
  });
}

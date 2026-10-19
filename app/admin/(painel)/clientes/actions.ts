'use server';

import { revalidatePath } from 'next/cache';
import { ActionError, check, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { normalizeBrazilPhone } from '@/lib/phone';

/** Atende pedido de exclusão de dados (LGPD) de cliente sem conta: anonimiza pelo telefone. */
export async function anonymizeByPhone(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(['admin'], async (_ctx, db) => {
    const phone = normalizeBrazilPhone(str(form, 'phone') ?? '');
    if (!phone) throw new ActionError('Telefone inválido.');
    if (str(form, 'confirm') !== 'ANONIMIZAR') throw new ActionError('Digite ANONIMIZAR para confirmar.');
    const { data } = check(await db.rpc('anonymize_customer_orders', { p_user_id: null, p_phone: phone }));
    revalidatePath('/admin/clientes');
    return `${data ?? 0} pedido(s) anonimizado(s). Valores e itens foram mantidos para os relatórios.`;
  });
}

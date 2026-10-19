'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, check, money, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';
import { ORDER_STATUSES, type CancelReason, type OrderStatus } from '@/lib/orders/labels';

const roles = [...PERMISSIONS.orders];
const CANCEL_REASONS = ['out_of_area', 'unavailable', 'customer_request', 'no_customer_response', 'duplicate', 'other'] as const;

export async function changeStatus(orderId: string, to: OrderStatus, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!z.uuid().safeParse(orderId).success || !ORDER_STATUSES.includes(to)) return { ok: false, message: 'Dados inválidos.' };
  return runAdminAction(roles, async (_ctx, db) => {
    const reason = str(form, 'cancelReason');
    if (to === 'cancelled' && (!reason || !(CANCEL_REASONS as readonly string[]).includes(reason))) {
      throw new ActionError('Escolha o motivo do cancelamento.');
    }
    check(
      await db.rpc('update_order_status', {
        p_order_id: orderId,
        p_to: to,
        p_note: str(form, 'note'),
        p_cancel_reason: to === 'cancelled' ? (reason as CancelReason) : null,
      }),
    );
    revalidatePath(`/admin/pedidos/${orderId}`);
    return 'Status atualizado.';
  });
}

export async function setDeliveryFee(orderId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!z.uuid().safeParse(orderId).success) return { ok: false, message: 'Dados inválidos.' };
  return runAdminAction(roles, async (_ctx, db) => {
    const fee = money(form, 'fee');
    if (fee === null) throw new ActionError('Informe a taxa (use 0 para entrega grátis).');
    check(await db.rpc('set_delivery_fee', { p_order_id: orderId, p_fee: fee, p_confirm: str(form, 'mode') !== 'estimate', p_note: str(form, 'note') }));
    revalidatePath(`/admin/pedidos/${orderId}`);
    return 'Taxa registrada. Informe o cliente pelo WhatsApp.';
  });
}

export async function approveTotal(orderId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!z.uuid().safeParse(orderId).success) return { ok: false, message: 'Dados inválidos.' };
  return runAdminAction(roles, async (_ctx, db) => {
    check(await db.rpc('mark_customer_approved_total', { p_order_id: orderId, p_note: str(form, 'note') }));
    revalidatePath(`/admin/pedidos/${orderId}`);
    return 'Aprovação do cliente registrada.';
  });
}

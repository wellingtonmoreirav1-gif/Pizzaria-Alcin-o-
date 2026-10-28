'use server';

import { z } from 'zod';
import { check, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';

const roles = [...PERMISSIONS.operation];

export async function setAccepting(accepting: boolean, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      check(await db.rpc('set_operation_status', { p_accepting: accepting, p_pause_message: accepting ? '' : (str(form, 'message') ?? '') }));
      return accepting ? 'Pedidos pelo site reativados.' : 'Recebimento de pedidos suspenso.';
    },
    ['settings'],
  );
}

export async function pauseOrders(minutes: number, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      check(await db.rpc('set_operation_status', { p_pause_minutes: minutes }));
      return minutes === 0 ? 'Pausa encerrada.' : `Pedidos pausados por ${minutes} minutos.`;
    },
    ['settings'],
  );
}

export async function setLunchClosed(closed: boolean, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      check(await db.rpc('set_operation_status', { p_lunch_closed: closed }));
      return closed ? 'Almoço de hoje encerrado. O horário da noite continua normal.' : 'Almoço de hoje reaberto.';
    },
    ['settings'],
  );
}

const availabilitySchema = z.object({ entity: z.enum(['product', 'variant', 'option_value']), id: z.uuid(), available: z.boolean() });

export async function toggleAvailability(entity: string, id: string, available: boolean): Promise<ActionResult> {
  const parsed = availabilitySchema.safeParse({ entity, id, available });
  if (!parsed.success) return { ok: false, message: 'Dados inválidos.' };
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      check(await db.rpc('set_availability', { p_entity: parsed.data.entity, p_id: parsed.data.id, p_available: parsed.data.available }));
      return parsed.data.available ? 'Marcado como disponível.' : 'Marcado como esgotado.';
    },
    ['catalog'],
  );
}

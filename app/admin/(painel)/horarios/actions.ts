'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, bool, check, int, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';

const roles = [...PERMISSIONS.hours];
const time = (v: string | null) => {
  if (v === null) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new ActionError(`Horário inválido: ${v}. Use HH:MM.`);
  return v;
};

/** Salva a grade semanal. Campos: open:<dia>:<turno>, close:<dia>:<turno>, active:<dia>:<turno>. */
export async function saveWeek(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const rows = [];
      for (let day = 0; day < 7; day++) {
        for (const shift of ['lunch', 'dinner'] as const) {
          const opens = time(str(form, `open:${day}:${shift}`));
          const closes = time(str(form, `close:${day}:${shift}`));
          const active = bool(form, `active:${day}:${shift}`);
          if (active && !opens) throw new ActionError('Informe o horário de abertura dos turnos ativos.');
          if (opens && closes && closes <= opens) throw new ActionError('O fechamento deve ser depois da abertura (turnos não podem passar da meia-noite).');
          rows.push({ weekday: day, shift, opens_at: opens ?? (shift === 'lunch' ? '10:30' : '18:30'), closes_at: closes, is_active: active });
        }
      }
      check(await db.from('business_hours').upsert(rows, { onConflict: 'weekday,shift' }));
      const grace = Math.min(60, Math.max(0, int(form, 'grace')));
      check(await db.from('business_settings').update({ order_grace_minutes: grace }).eq('id', 1));
      revalidatePath('/admin/horarios');
      return 'Horários salvos.';
    },
    ['settings'],
  );
}

export async function addException(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const date = str(form, 'date');
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ActionError('Informe a data.');
      const shift = str(form, 'shift');
      if (shift && !['lunch', 'dinner'].includes(shift)) throw new ActionError('Turno inválido.');
      const closed = str(form, 'type') !== 'special';
      const opens = time(str(form, 'opensAt'));
      const closes = time(str(form, 'closesAt'));
      if (!closed && (!shift || !opens)) throw new ActionError('Horário especial precisa de turno e horário de abertura.');
      check(
        await db.from('business_hour_exceptions').upsert(
          { date, shift: shift || null, is_closed: closed, opens_at: closed ? null : opens, closes_at: closed ? null : closes, note: str(form, 'note') },
          { onConflict: 'date,shift' },
        ),
      );
      revalidatePath('/admin/horarios');
      return 'Exceção registrada.';
    },
    ['settings'],
  );
}

export async function removeException(id: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      if (!z.uuid().safeParse(id).success) throw new ActionError('Registro inválido.');
      check(await db.from('business_hour_exceptions').delete().eq('id', id));
      revalidatePath('/admin/horarios');
      return 'Exceção removida.';
    },
    ['settings'],
  );
}

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, bool, check, int, money, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';

const roles = [...PERMISSIONS.delivery];
const METHODS = ['pix', 'cash', 'credit_card', 'debit_card', 'on_delivery'] as const;
const MODES = ['delivery', 'pickup', 'dine_in'] as const;

export async function saveModes(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const paymentMethods = Object.fromEntries(
        MODES.map((mode) => [mode, METHODS.filter((m) => bool(form, `pay:${mode}:${m}`) && (m !== 'on_delivery' || mode === 'delivery'))]),
      );
      for (const mode of MODES) {
        if (bool(form, `enabled:${mode}`) && (paymentMethods[mode] as string[]).length === 0) {
          throw new ActionError('Cada modalidade ativa precisa de pelo menos uma forma de pagamento.');
        }
      }
      check(
        await db
          .from('business_settings')
          .update({
            delivery_enabled: bool(form, 'enabled:delivery'),
            pickup_enabled: bool(form, 'enabled:pickup'),
            dine_in_enabled: bool(form, 'enabled:dine_in'),
            payment_methods: paymentMethods,
            min_order_value: money(form, 'minOrder'),
            delivery_info_text: str(form, 'deliveryInfo'),
          })
          .eq('id', 1),
      );
      revalidatePath('/admin/entrega');
      return 'Modalidades e pagamentos salvos.';
    },
    ['settings'],
  );
}

export async function saveZone(id: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const name = str(form, 'name');
      if (!name) throw new ActionError('Informe o bairro.');
      const fields = { name, city: str(form, 'city') ?? 'São Bento', fee: money(form, 'fee'), notes: str(form, 'notes'), is_active: bool(form, 'isActive'), sort_order: int(form, 'sortOrder') };
      if (id) {
        if (!z.uuid().safeParse(id).success) throw new ActionError('Registro inválido.');
        check(await db.from('delivery_zones').update(fields).eq('id', id));
      } else {
        check(await db.from('delivery_zones').insert(fields));
      }
      revalidatePath('/admin/entrega');
      return 'Bairro salvo.';
    },
    ['settings'],
  );
}

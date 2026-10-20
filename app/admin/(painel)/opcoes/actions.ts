'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionError, bool, check, int, money, runAdminAction, str, type ActionResult } from '@/lib/admin/action';
import { PERMISSIONS } from '@/lib/auth/session';
import { slugify } from '@/lib/utils';
import { SIZE_CODE_PATTERN } from '@/lib/catalog/sizes';
import type { createSessionClient } from '@/lib/supabase/server';

const roles = [...PERMISSIONS.catalog];
const uuid = z.uuid();
type Db = Awaited<ReturnType<typeof createSessionClient>>;

function requireId(id: string) {
  if (!uuid.safeParse(id).success) throw new ActionError('Registro inválido.');
}

/** Garante que o grupo existe e é compartilhado (não pertence a um produto). */
async function requireSharedGroup(db: Db, groupId: string) {
  requireId(groupId);
  const { data } = check(await db.from('option_groups').select('id').eq('id', groupId).not('shared_key', 'is', null).maybeSingle());
  if (!data) throw new ActionError('Grupo compartilhado não encontrado.');
}

function done(message: string) {
  revalidatePath('/admin/opcoes');
  revalidatePath('/admin/precos');
  return message;
}

export async function saveSharedGroup(groupId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      const name = str(form, 'name');
      if (!name || name.length > 80) throw new ActionError('Informe o nome do grupo (até 80 caracteres).');
      const kind = str(form, 'kind') ?? 'extra';
      if (!['crust', 'extra', 'choice'].includes(kind)) throw new ActionError('Tipo de grupo inválido.');
      const min = Math.max(0, int(form, 'minSelect'));
      const max = Math.max(1, int(form, 'maxSelect', 1));
      if (max < min) throw new ActionError('O máximo deve ser maior ou igual ao mínimo.');
      const fields = { name, kind, description: str(form, 'description'), min_select: min, max_select: max, sort_order: int(form, 'sortOrder'), is_active: bool(form, 'isActive') };
      if (groupId) {
        await requireSharedGroup(db, groupId);
        check(await db.from('option_groups').update(fields).eq('id', groupId));
        return done('Grupo salvo.');
      }
      const key = slugify(str(form, 'sharedKey') ?? name);
      if (!key) throw new ActionError('Código do grupo inválido.');
      const { data } = check(await db.from('option_groups').insert({ ...fields, shared_key: key, product_id: null }).select('id').single());
      return { ok: true, message: done('Grupo criado. Cadastre as opções e ligue aos produtos.'), id: data!.id };
    },
    ['catalog'],
  );
}

export async function saveSharedValue(groupId: string, valueId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      await requireSharedGroup(db, groupId);
      const name = str(form, 'name');
      if (!name || name.length > 80) throw new ActionError('Informe o nome da opção (até 80 caracteres).');
      const price = money(form, 'price');
      const confirmed = bool(form, 'priceConfirmed');
      // Sem valor informado, a opção só pode ficar "a definir" (não confirmada).
      if (confirmed && price === null) throw new ActionError('Informe o valor (0,00 para grátis) antes de marcar como conferido.');
      const fields = {
        name,
        description: str(form, 'description'),
        price: price ?? '0',
        price_confirmed: confirmed,
        sort_order: int(form, 'sortOrder'),
        is_active: bool(form, 'isActive'),
        is_available: bool(form, 'isAvailable'),
      };
      if (valueId) {
        requireId(valueId);
        check(await db.from('option_values').update(fields).eq('id', valueId).eq('group_id', groupId));
      } else {
        check(await db.from('option_values').insert({ ...fields, group_id: groupId }));
      }
      return done(valueId ? 'Opção salva.' : 'Opção adicionada.');
    },
    ['catalog'],
  );
}

export async function archiveSharedValue(groupId: string, valueId: string, _prev: ActionResult | null, _form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      await requireSharedGroup(db, groupId);
      requireId(valueId);
      check(await db.from('option_values').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', valueId).eq('group_id', groupId));
      return done('Opção removida. Pedidos antigos continuam com o nome e o valor da época.');
    },
    ['catalog'],
  );
}

/**
 * Valores por CÓDIGO de tamanho (P, M, G, GG, F), válidos para todos os produtos ligados.
 * Campos: cell:<valueId>:<código>, size:<valueId>:<código> (valor; vazio = usa o valor padrão)
 * e offered:<valueId>:<código>.
 */
export async function saveSharedSizePrices(groupId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      await requireSharedGroup(db, groupId);
      const { data: values } = check(await db.from('option_values').select('id').eq('group_id', groupId).is('deleted_at', null));
      const allowed = new Set((values ?? []).map((v) => v.id));
      const rows: { option_value_id: string; size_code: string; price: string | null; is_offered: boolean }[] = [];
      for (const key of form.keys()) {
        const m = /^cell:([0-9a-f-]{36}):([A-Z]{1,3})$/.exec(key);
        if (!m) continue;
        const [, valueId, code] = m as unknown as [string, string, string];
        if (!allowed.has(valueId) || !SIZE_CODE_PATTERN.test(code)) throw new ActionError('Tabela de valores inválida.');
        rows.push({ option_value_id: valueId, size_code: code, price: money(form, `size:${valueId}:${code}`), is_offered: bool(form, `offered:${valueId}:${code}`) });
      }
      const custom = rows.filter((r) => r.price !== null || !r.is_offered);
      const defaults = rows.filter((r) => r.price === null && r.is_offered);
      if (custom.length) check(await db.from('option_value_size_prices').upsert(custom, { onConflict: 'option_value_id,size_code' }));
      for (const r of defaults) {
        check(await db.from('option_value_size_prices').delete().eq('option_value_id', r.option_value_id).eq('size_code', r.size_code));
      }
      return done('Valores por tamanho salvos.');
    },
    ['catalog'],
  );
}

/** Liga/desliga o grupo dos produtos marcados (campo "product" repetido). */
export async function saveSharedLinks(groupId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAdminAction(
    roles,
    async (_ctx, db) => {
      await requireSharedGroup(db, groupId);
      const wanted = new Set(form.getAll('product').map(String));
      for (const id of wanted) requireId(id);
      const sortOrder = int(form, 'sortOrder', 10);
      const { data: current } = check(await db.from('product_shared_groups').select('product_id').eq('group_id', groupId));
      const have = new Set((current ?? []).map((r) => r.product_id as string));
      const add = [...wanted].filter((id) => !have.has(id)).map((product_id) => ({ product_id, group_id: groupId, sort_order: sortOrder }));
      const remove = [...have].filter((id) => !wanted.has(id));
      if (add.length) check(await db.from('product_shared_groups').insert(add));
      if (remove.length) check(await db.from('product_shared_groups').delete().eq('group_id', groupId).in('product_id', remove));
      return done(`Produtos atualizados (${add.length} ligados, ${remove.length} desligados).`);
    },
    ['catalog'],
  );
}

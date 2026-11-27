import 'server-only';
import { updateTag } from 'next/cache';
import { requireStaff, type AppRole, type StaffContext } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/orders/labels';
import { reportError } from '@/lib/observability/report';
import { CACHE_TAGS } from '@/lib/catalog/queries';

export type ActionResult = { ok: boolean; message: string; id?: string };

type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;

export class ActionError extends Error {}

/**
 * Executa uma operação administrativa: confere papel no servidor, usa o cliente
 * com a sessão do usuário (a RLS do banco também valida) e invalida os caches.
 */
export async function runAdminAction(
  roles: AppRole[],
  fn: (ctx: StaffContext, supabase: SessionClient) => Promise<string | ActionResult>,
  tags: (keyof typeof CACHE_TAGS)[] = [],
): Promise<ActionResult> {
  const ctx = await requireStaff(roles);
  const supabase = await createSessionClient();
  try {
    const result = await fn(ctx, supabase);
    for (const tag of tags) updateTag(CACHE_TAGS[tag]);
    return typeof result === 'string' ? { ok: true, message: result } : result;
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, message: error.message };
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : '';
    reportError('admin', error instanceof Error ? error : new Error(message.slice(0, 200)));
    return { ok: false, message: friendlyDbError({ message }) };
  }
}

/** Lança o erro do Supabase para ser tratado por runAdminAction. */
export function check<T extends { error: { message: string; code?: string } | null }>(result: T): T {
  if (result.error) {
    if (result.error.code === '23505') throw new ActionError('Já existe um registro com esses dados (ex.: mesmo slug ou nome).');
    if (result.error.code === '23503') throw new ActionError('Este registro está em uso e não pode ser removido. Desative-o em vez de excluir.');
    if (result.error.code === '23514') throw new ActionError('Algum valor está fora do permitido. Revise os campos.');
    throw result.error;
  }
  return result;
}

export function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

export function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === 'on' || v === 'true' || v === '1';
}

export function int(form: FormData, key: string, fallback = 0): number {
  const v = str(form, key);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** Converte "12,50" em "12.50" (texto aceito pelo numeric do Postgres) ou null. */
export function money(form: FormData, key: string): string | null {
  const v = str(form, key);
  if (v === null) return null;
  const normalized = v
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new ActionError(`Valor inválido em "${key}". Use o formato 12,50.`);
  return normalized;
}

/** Data/hora digitada no fuso de Fortaleza (UTC-3) para ISO. */
export function localDateTime(form: FormData, key: string): string | null {
  const v = str(form, key);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) throw new ActionError('Data/hora inválida.');
  return new Date(`${v}:00-03:00`).toISOString();
}

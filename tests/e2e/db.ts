import pg from 'pg';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const DB_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54322/postgres';

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const res = await client.query(text, params);
    return res.rows as T[];
  } finally {
    await client.end();
  }
}

export function resetDatabase() {
  execFileSync('bash', [path.resolve(__dirname, '../../scripts/local-supabase/apply-migrations.sh')], { stdio: 'pipe' });
}

/** Deixa a loja aberta o dia todo (almoço e noite) para os testes não dependerem do relógio. */
export async function openAllDay() {
  await sql(`update public.business_hours set opens_at = '00:00', closes_at = '23:59', is_active = true`);
  await sql(`update public.business_settings set accepting_orders = true, paused_until = null, lunch_closed_on = null`);
}

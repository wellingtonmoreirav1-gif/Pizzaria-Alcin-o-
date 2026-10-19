import { openAllDay, resetDatabase, sql } from './db';

const AUTH_URL = process.env.E2E_AUTH_URL ?? 'http://127.0.0.1:54321/auth/v1';
export const PASSWORD = 'senha-de-teste-123';
export const USERS = {
  admin: 'admin@alcinao.test',
  manager: 'gerente@alcinao.test',
  attendant: 'atendente@alcinao.test',
  customer: 'cliente@alcinao.test',
} as const;

async function signUp(email: string, apikey: string) {
  const res = await fetch(`${AUTH_URL}/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey },
    body: JSON.stringify({ email, password: PASSWORD, data: { full_name: email.split('@')[0] } }),
  });
  if (!res.ok) throw new Error(`Falha ao criar ${email}: ${res.status} ${await res.text()}`);
}

export default async function globalSetup() {
  resetDatabase();
  await openAllDay();
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  for (const email of Object.values(USERS)) await signUp(email, apikey);
  // Primeiro administrador criado pela função segura (somente dono do banco).
  await sql(`select public.bootstrap_first_admin($1)`, [USERS.admin]);
  await sql(`insert into public.user_roles (user_id, role) select id, 'manager' from auth.users where email = $1`, [USERS.manager]);
  await sql(`insert into public.user_roles (user_id, role) select id, 'attendant' from auth.users where email = $1`, [USERS.attendant]);
}

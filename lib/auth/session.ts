import 'server-only';
import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';

export type AppRole = 'admin' | 'manager' | 'attendant';

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface StaffContext {
  user: SessionUser;
  role: AppRole;
}

/** Usuário autenticado (JWT verificado pelo Supabase) ou null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function getStaffContext(): Promise<StaffContext | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createSessionClient();
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (!data) return null;
  return { user, role: data.role as AppRole };
}

/**
 * Exige usuário da equipe com um dos papéis informados. Deve ser chamado em TODA
 * página, Server Action e Route Handler do painel (não basta esconder links).
 */
export async function requireStaff(roles: AppRole[] = ['admin', 'manager', 'attendant']): Promise<StaffContext> {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  const ctx = await getStaffContext();
  if (!ctx || !roles.includes(ctx.role)) redirect('/admin/sem-permissao');
  return ctx;
}

/** Variante para Route Handlers: retorna null em vez de redirecionar. */
export async function staffOrNull(roles: AppRole[] = ['admin', 'manager', 'attendant']): Promise<StaffContext | null> {
  const ctx = await getStaffContext();
  return ctx && roles.includes(ctx.role) ? ctx : null;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  attendant: 'Atendente',
};

/** Permissões por papel (documentadas em docs/PERMISSOES.md). */
export const PERMISSIONS = {
  orders: ['admin', 'manager', 'attendant'],
  operation: ['admin', 'manager', 'attendant'],
  catalog: ['admin', 'manager'],
  hours: ['admin', 'manager'],
  delivery: ['admin', 'manager'],
  banners: ['admin', 'manager'],
  reviews: ['admin', 'manager'],
  reports: ['admin', 'manager'],
  customers: ['admin', 'manager'],
  settings: ['admin', 'manager'],
  team: ['admin'],
  audit: ['admin', 'manager'],
} as const satisfies Record<string, AppRole[]>;

export function can(role: AppRole, area: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[area] as readonly AppRole[]).includes(role);
}

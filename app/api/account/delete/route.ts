import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser, getStaffContext } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { isSameOrigin, jsonError } from '@/lib/http/request';

/**
 * Exclusão de conta solicitada pelo próprio cliente (LGPD).
 * Pedidos são mantidos apenas com valores e itens (anonimizados) para o histórico
 * de vendas; perfil, endereços e favoritos são apagados junto com a conta.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'FORBIDDEN_ORIGIN', 'Origem não permitida.');
  const user = await getSessionUser();
  if (!user) return jsonError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.');
  if (await getStaffContext()) {
    return jsonError(409, 'STAFF_ACCOUNT', 'Contas da equipe devem ser removidas por um administrador.');
  }
  const admin = createAdminClient();
  const anonymized = await admin.rpc('anonymize_customer_orders', { p_user_id: user.id, p_phone: null });
  if (anonymized.error) return jsonError(503, 'UNAVAILABLE', 'Não foi possível excluir agora. Tente novamente.');
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return jsonError(503, 'UNAVAILABLE', 'Não foi possível excluir agora. Tente novamente.');
  const session = await createSessionClient();
  await session.auth.signOut();
  return Response.json({ ok: true });
}

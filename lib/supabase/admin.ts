import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/**
 * Cliente com a chave secreta (ignora RLS). Uso restrito a operações de servidor
 * que já validaram tudo: criar pedidos, consultar pedido de visitante com token
 * válido e excluir conta a pedido do próprio cliente. NUNCA importar em componentes
 * de cliente.
 */
export function createAdminClient() {
  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

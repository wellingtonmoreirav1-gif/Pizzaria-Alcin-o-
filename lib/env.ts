import 'server-only';

/** Lê variáveis de ambiente obrigatórias do servidor com mensagens claras. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada. Veja .env.example e o README.`);
  }
  return value;
}

export const serverEnv = {
  get supabaseUrl() {
    return required('NEXT_PUBLIC_SUPABASE_URL');
  },
  get supabasePublishableKey() {
    return required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  },
  /** Chave secreta (service_role). NUNCA usar em código de navegador. */
  get supabaseSecretKey() {
    return required('SUPABASE_SECRET_KEY');
  },
  /** Segredo usado para assinar os links de acompanhamento de pedidos. */
  get orderAccessSecret() {
    const value = required('ORDER_ACCESS_SECRET');
    if (value.length < 32) throw new Error('ORDER_ACCESS_SECRET precisa ter pelo menos 32 caracteres.');
    return value;
  },
};

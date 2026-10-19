/**
 * Configuração central do estabelecimento.
 *
 * Estes valores são usados como PADRÃO enquanto o banco ainda não foi configurado.
 * Em produção, a fonte oficial é a tabela `business_settings`, editável em
 * /admin/configuracoes. Para trocar o WhatsApp sem painel, altere
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` (variável de ambiente) ou o valor abaixo.
 */
export const BUSINESS_DEFAULTS = {
  name: 'Pizzaria e Churrascaria Alcinão',
  shortName: 'Alcinão',
  /** Formato internacional, só dígitos: 55 + DDD + número. */
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5583999216691',
  whatsappDisplay: '(83) 99921-6691',
  addressLine: 'Avenida Pedro Eulâmpio',
  city: 'São Bento',
  state: 'PB',
  referencePoint: 'Ao lado do Hospital Dr. Jarques',
  timezone: 'America/Fortaleza',
} as const;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

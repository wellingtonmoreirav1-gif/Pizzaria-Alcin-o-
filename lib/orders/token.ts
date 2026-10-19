import 'server-only';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Token de acesso ao pedido de um visitante. Não é armazenado: é derivado do id
 * do pedido com um segredo do servidor. Sem o token, o código do pedido sozinho
 * não dá acesso a nenhum dado.
 */
export function orderAccessToken(orderId: string, secret = serverEnv.orderAccessSecret): string {
  return createHmac('sha256', secret).update(`order-access:${orderId}`).digest('base64url');
}

export function verifyOrderAccessToken(orderId: string, token: string, secret = serverEnv.orderAccessSecret): boolean {
  if (!token || token.length > 100) return false;
  const expected = Buffer.from(orderAccessToken(orderId, secret));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Hash não reversível do IP para limitar abusos (apagado após 2 dias). */
export function hashIp(ip: string, secret = serverEnv.orderAccessSecret): string {
  return createHmac('sha256', secret).update(`ip:${ip}`).digest('hex').slice(0, 32);
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

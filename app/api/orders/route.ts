import { checkoutSchema, zodMessages } from '@/lib/validation/checkout';
import { createOrder, OrderError } from '@/lib/orders/create';
import { clientIp, isSameOrigin, jsonError, readJson } from '@/lib/http/request';
import { getSessionUser } from '@/lib/auth/session';
import { reportError } from '@/lib/observability/report';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'FORBIDDEN_ORIGIN', 'Origem não permitida.');
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Dados inválidos.');
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, 'VALIDATION', zodMessages(parsed.error).join(' '), { issues: zodMessages(parsed.error) });
  }
  try {
    const user = await getSessionUser().catch(() => null);
    const order = await createOrder(parsed.data, { customerId: user?.id ?? null, ip: clientIp(request) });
    return Response.json({ ok: true, ...order }, { status: order.replayed ? 200 : 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof OrderError) return jsonError(error.status, error.code, error.message, error.extra);
    reportError('api/orders', error);
    return jsonError(500, 'UNEXPECTED', 'Erro inesperado ao registrar o pedido. Seu carrinho foi mantido.');
  }
}

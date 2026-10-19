import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrderIdByCode } from '@/lib/orders/snapshot';
import { verifyOrderAccessToken } from '@/lib/orders/token';
import { isSameOrigin, jsonError, readJson } from '@/lib/http/request';

const bodySchema = z.object({ token: z.string().min(10).max(100) });

/** Registra que o cliente tocou em "Abrir WhatsApp". Não comprova o envio da mensagem. */
export async function POST(request: Request, ctx: RouteContext<'/api/orders/[code]/whatsapp'>) {
  if (!isSameOrigin(request)) return jsonError(403, 'FORBIDDEN_ORIGIN', 'Origem não permitida.');
  const { code } = await ctx.params;
  const parsed = bodySchema.safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return jsonError(400, 'INVALID', 'Dados inválidos.');
  const orderId = await getOrderIdByCode(code);
  if (!orderId || !verifyOrderAccessToken(orderId, parsed.data.token)) {
    return jsonError(404, 'NOT_FOUND', 'Pedido não encontrado.');
  }
  await createAdminClient().rpc('mark_order_whatsapp_opened', { p_order_id: orderId });
  return Response.json({ ok: true });
}

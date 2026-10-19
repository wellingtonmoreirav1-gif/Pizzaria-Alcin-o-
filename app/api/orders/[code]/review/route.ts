import { createAdminClient } from '@/lib/supabase/admin';
import { getOrderIdByCode, getOrderSnapshot } from '@/lib/orders/snapshot';
import { verifyOrderAccessToken } from '@/lib/orders/token';
import { reviewSchema, zodMessages } from '@/lib/validation/checkout';
import { isSameOrigin, jsonError, readJson } from '@/lib/http/request';

/**
 * Avaliação de um pedido CONCLUÍDO. Fica pendente até a moderação da equipe e é
 * marcada como verificada por estar ligada a uma compra real.
 */
export async function POST(request: Request, ctx: RouteContext<'/api/orders/[code]/review'>) {
  if (!isSameOrigin(request)) return jsonError(403, 'FORBIDDEN_ORIGIN', 'Origem não permitida.');
  const { code } = await ctx.params;
  const parsed = reviewSchema.safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return jsonError(422, 'VALIDATION', zodMessages(parsed.error).join(' '));
  const orderId = await getOrderIdByCode(code);
  if (!orderId || !verifyOrderAccessToken(orderId, parsed.data.token)) {
    return jsonError(404, 'NOT_FOUND', 'Pedido não encontrado.');
  }
  const order = await getOrderSnapshot(orderId);
  if (!order || order.status !== 'completed') {
    return jsonError(409, 'NOT_COMPLETED', 'Só é possível avaliar pedidos concluídos.');
  }
  const { error } = await createAdminClient().from('reviews').insert({
    order_id: orderId,
    customer_id: order.customerId,
    author_name: parsed.data.authorName,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    is_verified: true,
    status: 'pending',
  });
  if (error) {
    if (error.code === '23505') return jsonError(409, 'ALREADY_REVIEWED', 'Este pedido já foi avaliado. Obrigado!');
    return jsonError(503, 'UNAVAILABLE', 'Não foi possível enviar a avaliação agora.');
  }
  return Response.json({ ok: true }, { status: 201 });
}

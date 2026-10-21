import { quoteSchema } from '@/lib/validation/checkout';
import { cartProductIds, loadProductsForCart, OrderError, quoteLines } from '@/lib/orders/create';
import { getOperationFresh } from '@/lib/catalog/queries';
import { computeStoreStatus } from '@/lib/business-hours';
import { sumLines, type PricedLine } from '@/lib/pricing';
import { isSameOrigin, jsonError, readJson } from '@/lib/http/request';

/** Recalcula o carrinho com os preços e a disponibilidade ATUAIS do banco. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'FORBIDDEN_ORIGIN', 'Origem não permitida.');
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Dados inválidos.');
  }
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, 'VALIDATION', 'Carrinho inválido.');
  try {
    const now = new Date();
    const [operation, products] = await Promise.all([
      getOperationFresh(),
      loadProductsForCart(cartProductIds(parsed.data.items)),
    ]);
    const status = computeStoreStatus(operation.hours, now);
    const lines = quoteLines(parsed.data.items, products, {
      now,
      openShifts: status.acceptingOrders ? status.openShifts : null,
    });
    const valid = lines.filter((l) => l.ok).map((l) => l.line as PricedLine);
    const meta = Object.fromEntries(
      [...products.values()].map((p) => [p.id, { slug: p.slug, imageUrl: p.imageUrl, maxQuantity: p.maxQuantity, name: p.name }]),
    );
    return Response.json(
      { ok: true, lines, totals: sumLines(valid), status, meta },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof OrderError) return jsonError(error.status, error.code, error.message);
    return jsonError(503, 'UNAVAILABLE', 'Não foi possível atualizar os preços agora.');
  }
}

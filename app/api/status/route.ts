import { connection } from 'next/server';
import { getOperationFresh } from '@/lib/catalog/queries';
import { computeStoreStatus } from '@/lib/business-hours';

export async function GET() {
  await connection();
  try {
    const operation = await getOperationFresh();
    return Response.json(computeStoreStatus(operation.hours, new Date()), { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ acceptingOrders: false, reason: 'closed', message: 'Status indisponível.' }, { status: 503 });
  }
}

import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/orders/labels';
import { cn } from '@/lib/utils';

const STYLE: Record<OrderStatus, string> = {
  registered: 'bg-warning-50 text-warning-600',
  customer_confirmed: 'bg-brand-50 text-brand-700',
  accepted: 'bg-ink-900 text-white',
  preparing: 'bg-ink-700 text-white',
  ready: 'bg-success-50 text-success-600',
  out_for_delivery: 'bg-success-50 text-success-600',
  completed: 'bg-mist text-ink-700',
  cancelled: 'bg-mist text-muted line-through',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', STYLE[status])}>{ORDER_STATUS_LABEL[status]}</span>;
}

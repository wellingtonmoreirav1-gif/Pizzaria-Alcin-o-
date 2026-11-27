import { connection } from 'next/server';
import { Star } from 'lucide-react';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { moderateReview } from './actions';

export const metadata = { title: 'Avaliações' };

export default async function ReviewsPage() {
  await requireStaff([...PERMISSIONS.reviews]);
  await connection();
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from('reviews')
    .select('id, author_name, rating, comment, status, is_verified, created_at, orders(code)')
    .order('created_at', { ascending: false })
    .limit(100);
  return (
    <div className="space-y-4">
      <PageHeader title="Avaliações" description="Somente clientes com pedido concluído podem avaliar (pelo link do pedido). Nada é publicado sem aprovação." />
      {!data?.length ? <EmptyState title="Nenhuma avaliação ainda" /> : null}
      {(data ?? []).map((r) => (
        <Card key={r.id}>
          <div className="flex flex-wrap items-center gap-2">
            <strong>{r.author_name}</strong>
            <span className="flex" aria-label={`${r.rating} estrelas`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={i < r.rating ? 'size-4 fill-brand-600 text-brand-600' : 'size-4 text-line'} aria-hidden />
              ))}
            </span>
            {r.is_verified ? (
              <Badge tone="success">
                Pedido verificado {(r.orders as unknown as { code: string } | null)?.code ? `#${(r.orders as unknown as { code: string }).code}` : ''}
              </Badge>
            ) : null}
            <Badge tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'dark' : 'warning'}>
              {r.status === 'approved' ? 'Publicada' : r.status === 'rejected' ? 'Recusada' : 'Pendente'}
            </Badge>
            <span className="ml-auto text-xs text-muted">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          {r.comment ? <p className="mt-2 text-sm">{r.comment}</p> : null}
          <div className="mt-3 flex gap-2">
            {r.status !== 'approved' ? <ActionForm action={moderateReview.bind(null, r.id, 'approved')} submitLabel="Publicar" size="sm" inline /> : null}
            {r.status !== 'rejected' ? (
              <ActionForm action={moderateReview.bind(null, r.id, 'rejected')} submitLabel="Recusar" size="sm" variant="ghost" inline />
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { getOperationFresh } from '@/lib/catalog/queries';
import { computeStoreStatus } from '@/lib/business-hours';
import { Card, PageHeader, TextField } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { AvailabilityToggle } from '@/components/admin/availability-toggle';
import { Notice } from '@/components/ui/feedback';
import { pauseOrders, setAccepting, setLunchClosed } from './actions';

export const metadata = { title: 'Operação do dia' };

export default async function OperationPage() {
  await requireStaff([...PERMISSIONS.operation]);
  await connection();
  const supabase = await createSessionClient();
  const [operation, settingsRow, products, shared] = await Promise.all([
    getOperationFresh(),
    supabase.from('business_settings').select('accepting_orders, paused_until, lunch_closed_on, pause_message').eq('id', 1).single(),
    supabase
      .from('products')
      .select('id, name, is_available, is_active, categories(name, sort_order), product_variants(id, name, is_available, deleted_at), option_groups!option_groups_product_id_fkey(id, name, kind, deleted_at, option_values(id, name, is_available, deleted_at))')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    supabase
      .from('option_groups')
      .select('id, name, option_values(id, name, is_available, deleted_at, sort_order)')
      .not('shared_key', 'is', null)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('sort_order'),
  ]);
  const status = computeStoreStatus(operation.hours, new Date());
  const s = settingsRow.data;
  const pausedUntil = s?.paused_until && new Date(s.paused_until) > new Date() ? new Date(s.paused_until) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Operação do dia" description="Controles rápidos para a equipe: pausar pedidos, encerrar o almoço e marcar itens esgotados." />
      <Notice tone={status.acceptingOrders ? 'success' : 'warning'} title={status.acceptingOrders ? 'Recebendo pedidos pelo site' : 'Pedidos pelo site bloqueados'}>
        {status.message}
      </Notice>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Recebimento de pedidos" description="Desliga os pedidos pelo site mesmo dentro do horário.">
          {s?.accepting_orders ? (
            <ActionForm action={setAccepting.bind(null, false)} submitLabel="Suspender pedidos" variant="danger" confirm="Suspender o recebimento de pedidos pelo site?">
              <TextField label="Mensagem para os clientes (opcional)" name="message" maxLength={200} placeholder="Ex.: Voltamos em breve!" />
            </ActionForm>
          ) : (
            <ActionForm action={setAccepting.bind(null, true)} submitLabel="Reativar pedidos" />
          )}
        </Card>
        <Card title="Pausa temporária" description={pausedUntil ? `Pausado até ${pausedUntil.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' })}.` : 'Útil em horários de pico.'}>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 60].map((m) => (
              <ActionForm key={m} action={pauseOrders.bind(null, m)} submitLabel={`Pausar ${m} min`} variant="outline" size="sm" inline />
            ))}
            {pausedUntil ? <ActionForm action={pauseOrders.bind(null, 0)} submitLabel="Encerrar pausa" size="sm" inline /> : null}
          </div>
        </Card>
        <Card title="Almoço de hoje" description="Quando a comida acabar, encerre o almoço. A noite não é afetada.">
          {status.lunchClosedToday ? (
            <ActionForm action={setLunchClosed.bind(null, false)} submitLabel="Reabrir almoço de hoje" variant="outline" />
          ) : (
            <ActionForm action={setLunchClosed.bind(null, true)} submitLabel="Encerrar almoço de hoje" variant="dark" confirm="Encerrar o almoço de hoje?" />
          )}
        </Card>
      </div>

      {(shared.data ?? []).length ? (
        <Card title="Bordas e molhos" description="Valem para todos os produtos que oferecem a opção. Marque como esgotado quando acabar.">
          <div className="space-y-4">
            {(shared.data ?? []).map((g) => (
              <div key={g.id}>
                <p className="mb-2 text-sm font-semibold">{g.name}</p>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(g.option_values ?? [])
                    .filter((v) => !v.deleted_at)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-mist px-3 py-2 text-sm">
                        <span>{v.name}</span>
                        <AvailabilityToggle entity="option_value" id={v.id} available={v.is_available} label={`${g.name} ${v.name}`} />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title="Disponibilidade dos itens" description="Marque como esgotado para impedir novos pedidos do item. Vale imediatamente no site.">
        <ul className="divide-y divide-line">
          {(products.data ?? []).map((p) => {
            const variants = (p.product_variants ?? []).filter((v) => !v.deleted_at);
            const values = (p.option_groups ?? []).filter((g) => !g.deleted_at).flatMap((g) => (g.option_values ?? []).filter((v) => !v.deleted_at).map((v) => ({ ...v, group: g.name })));
            return (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {p.name} <span className="text-xs font-normal text-muted">{(p.categories as unknown as { name: string } | null)?.name}</span>
                  </span>
                  <AvailabilityToggle entity="product" id={p.id} available={p.is_available} label={p.name} />
                </div>
                {variants.length + values.length > 0 ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted">Tamanhos e opções ({variants.length + values.length})</summary>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {variants.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-mist px-3 py-2 text-sm">
                          <span>Tamanho: {v.name}</span>
                          <AvailabilityToggle entity="variant" id={v.id} available={v.is_available} label={`${p.name} ${v.name}`} />
                        </li>
                      ))}
                      {values.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-mist px-3 py-2 text-sm">
                          <span>{v.group}: {v.name}</span>
                          <AvailabilityToggle entity="option_value" id={v.id} available={v.is_available} label={`${p.name} ${v.name}`} />
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { FULFILLMENT_LABEL, PAYMENT_LABEL, type Fulfillment, type PaymentMethod } from '@/lib/orders/labels';
import { Card, CheckboxField, PageHeader, TextAreaField, TextField, centsInput } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { saveModes, saveZone } from './actions';

export const metadata = { title: 'Entrega e pagamento' };

type Zone = { id: string; name: string; city: string; fee: number | null; notes: string | null; is_active: boolean; sort_order: number };

function ZoneFields({ z }: { z: Zone | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      <TextField label="Bairro" name="name" required defaultValue={z?.name} className="md:col-span-2" />
      <TextField label="Cidade" name="city" defaultValue={z?.city ?? 'São Bento'} />
      <TextField label="Taxa prevista (R$)" name="fee" inputMode="decimal" defaultValue={centsInput(z?.fee ?? null)} hint="Vazio = a confirmar" />
      <TextField label="Ordem" name="sortOrder" type="number" defaultValue={z?.sort_order ?? 0} />
      <CheckboxField label="Atendido" name="isActive" defaultChecked={z?.is_active ?? true} />
      <TextField label="Observações internas" name="notes" defaultValue={z?.notes ?? ''} className="md:col-span-6" />
    </div>
  );
}

export default async function DeliveryPage() {
  await requireStaff([...PERMISSIONS.delivery]);
  await connection();
  const supabase = await createSessionClient();
  const [settings, zones] = await Promise.all([
    supabase.from('business_settings').select('delivery_enabled, pickup_enabled, dine_in_enabled, payment_methods, min_order_value, delivery_info_text').eq('id', 1).single(),
    supabase.from('delivery_zones').select('*').order('sort_order').order('name'),
  ]);
  const s = settings.data;
  const enabled: Record<Fulfillment, boolean> = { delivery: s?.delivery_enabled ?? true, pickup: s?.pickup_enabled ?? true, dine_in: s?.dine_in_enabled ?? true };
  const pm = (s?.payment_methods ?? {}) as Record<Fulfillment, PaymentMethod[]>;
  return (
    <div className="space-y-6">
      <PageHeader title="Entrega e pagamento" description="A taxa de entrega nunca é calculada por distância: ela é confirmada pela equipe em cada pedido. A taxa do bairro, se informada, aparece como “prevista”." />
      <Card title="Modalidades e formas de pagamento">
        <ActionForm action={saveModes} submitLabel="Salvar">
          <div className="grid gap-4 md:grid-cols-3">
            {(['delivery', 'pickup', 'dine_in'] as Fulfillment[]).map((mode) => (
              <fieldset key={mode} className="space-y-2 rounded-xl border border-line p-4">
                <legend className="px-1 text-sm font-semibold">{FULFILLMENT_LABEL[mode]}</legend>
                <CheckboxField label="Modalidade ativa" name={`enabled:${mode}`} defaultChecked={enabled[mode]} />
                <hr className="border-line" />
                {(Object.keys(PAYMENT_LABEL) as PaymentMethod[])
                  .filter((m) => m !== 'on_delivery' || mode === 'delivery')
                  .map((m) => (
                    <CheckboxField key={m} label={PAYMENT_LABEL[m]} name={`pay:${mode}:${m}`} defaultChecked={(pm[mode] ?? []).includes(m)} />
                  ))}
              </fieldset>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <TextField label="Pedido mínimo (R$)" name="minOrder" inputMode="decimal" defaultValue={centsInput(s?.min_order_value ?? null)} hint="Vazio = sem mínimo" />
            <TextAreaField label="Texto sobre entrega (página inicial)" name="deliveryInfo" defaultValue={s?.delivery_info_text ?? ''} className="md:col-span-2" />
          </div>
        </ActionForm>
      </Card>
      <Card title="Bairros atendidos" description="Opcional. Quando cadastrados, o cliente escolhe o bairro numa lista (e pode informar outro).">
        <div className="space-y-3">
          {((zones.data ?? []) as Zone[]).map((z) => (
            <div key={z.id} className="rounded-xl border border-line p-3">
              <ActionForm action={saveZone.bind(null, z.id)} size="sm"><ZoneFields z={z} /></ActionForm>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-line p-3">
            <p className="mb-2 text-sm font-semibold">Novo bairro</p>
            <ActionForm action={saveZone.bind(null, null)} submitLabel="Adicionar" size="sm" resetOnSuccess><ZoneFields z={null} /></ActionForm>
          </div>
        </div>
      </Card>
    </div>
  );
}

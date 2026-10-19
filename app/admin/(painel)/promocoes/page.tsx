import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { formatBRL, toCents } from '@/lib/money';
import { Card, CheckboxField, PageHeader, SelectField, TextField, centsInput, toLocalInput } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { Badge } from '@/components/ui/feedback';
import { deletePromotion, savePromotion } from './actions';

export const metadata = { title: 'Promoções' };

type Promo = { id: string; title: string; description: string | null; product_id: string; variant_id: string | null; promo_price: number; starts_at: string | null; ends_at: string | null; is_active: boolean };
type Target = { value: string; label: string; regular: number | null };

function Fields({ p, targets }: { p: Promo | null; targets: Target[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      <TextField label="Título" name="title" required defaultValue={p?.title} className="md:col-span-3" maxLength={80} />
      <SelectField label="Produto / tamanho" name="target" required defaultValue={p ? `${p.product_id}:${p.variant_id ?? ''}` : ''} className="md:col-span-3">
        <option value="" disabled>Selecione…</option>
        {targets.map((t) => (
          <option key={t.value} value={t.value}>{t.label}{t.regular !== null ? ` (normal ${formatBRL(toCents(t.regular))})` : ''}</option>
        ))}
      </SelectField>
      <TextField label="Preço promocional (R$)" name="promoPrice" required inputMode="decimal" defaultValue={centsInput(p?.promo_price ?? null)} className="md:col-span-2" />
      <TextField label="Início" name="startsAt" type="datetime-local" defaultValue={toLocalInput(p?.starts_at ?? null)} className="md:col-span-2" />
      <TextField label="Fim" name="endsAt" type="datetime-local" defaultValue={toLocalInput(p?.ends_at ?? null)} className="md:col-span-2" hint="Depois do fim, a promoção some sozinha." />
      <TextField label="Descrição" name="description" defaultValue={p?.description ?? ''} className="md:col-span-5" maxLength={300} />
      <CheckboxField label="Ativa" name="isActive" defaultChecked={p?.is_active ?? true} />
    </div>
  );
}

export default async function PromotionsPage() {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const supabase = await createSessionClient();
  const [promos, products] = await Promise.all([
    supabase.from('promotions').select('*').order('created_at', { ascending: false }),
    supabase.from('products').select('id, name, base_price, product_variants(id, name, price, deleted_at)').is('deleted_at', null).order('name'),
  ]);
  const targets: Target[] = (products.data ?? []).flatMap((p) => {
    const variants = (p.product_variants ?? []).filter((v) => !v.deleted_at);
    return variants.length
      ? [{ value: `${p.id}:`, label: `${p.name} (todos os tamanhos)`, regular: null }, ...variants.map((v) => ({ value: `${p.id}:${v.id}`, label: `${p.name} — ${v.name}`, regular: v.price }))]
      : [{ value: `${p.id}:`, label: p.name, regular: p.base_price }];
  });
  const now = new Date();
  return (
    <div className="space-y-4">
      <PageHeader title="Promoções" description="Defina preço promocional e período. O site mostra o preço antigo riscado apenas quando há desconto real." />
      {((promos.data ?? []) as Promo[]).map((p) => {
        const live = p.is_active && (!p.starts_at || new Date(p.starts_at) <= now) && (!p.ends_at || new Date(p.ends_at) > now);
        return (
          <Card key={p.id} title={p.title} actions={live ? <Badge tone="success">No ar</Badge> : <Badge>Fora do ar</Badge>}>
            <ActionForm action={savePromotion.bind(null, p.id)} size="sm">
              <Fields p={p} targets={targets} />
            </ActionForm>
            <div className="mt-2">
              <ActionForm action={deletePromotion.bind(null, p.id)} submitLabel="Desativar" size="sm" variant="ghost" />
            </div>
          </Card>
        );
      })}
      <Card title="Nova promoção">
        <ActionForm action={savePromotion.bind(null, null)} submitLabel="Criar promoção" resetOnSuccess>
          <Fields p={null} targets={targets} />
        </ActionForm>
      </Card>
    </div>
  );
}

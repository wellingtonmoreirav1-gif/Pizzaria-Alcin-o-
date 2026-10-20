import Link from 'next/link';
import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { Card, PageHeader, centsInput } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { confirmOptionPrice, confirmProductPrices, confirmSelectedProducts } from './actions';

export const metadata = { title: 'Conferência de preços' };

type Variant = { id: string; name: string; size_code: string | null; price: number; sort_order: number; deleted_at: string | null };
type PendingProduct = { id: string; name: string; base_price: number | null; is_active: boolean; categories: { name: string; sort_order: number } | null; product_variants: Variant[] };
type PendingValue = { id: string; name: string; price: number; option_groups: { name: string; shared_key: string | null; product_id: string | null } | null };
type Confirmed = { id: string; name: string; price_confirmed_at: string };

const dateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });

export default async function PricesPage() {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const supabase = await createSessionClient();
  const [productsRes, valuesRes, recentRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, base_price, is_active, categories(name, sort_order), product_variants(id, name, size_code, price, sort_order, deleted_at)')
      .eq('price_confirmed', false)
      .is('deleted_at', null)
      .order('sort_order'),
    supabase
      .from('option_values')
      .select('id, name, price, option_groups!inner(name, shared_key, product_id, deleted_at)')
      .eq('price_confirmed', false)
      .is('deleted_at', null)
      .is('option_groups.deleted_at', null)
      .order('sort_order'),
    supabase.from('products').select('id, name, price_confirmed_at').eq('price_confirmed', true).not('price_confirmed_by', 'is', null).is('deleted_at', null).order('price_confirmed_at', { ascending: false }).limit(10),
  ]);
  const products = ((productsRes.data ?? []) as unknown as PendingProduct[]).sort(
    (a, b) => (a.categories?.sort_order ?? 0) - (b.categories?.sort_order ?? 0),
  );
  const values = (valuesRes.data ?? []) as unknown as PendingValue[];
  const recent = (recentRes.data ?? []) as Confirmed[];
  const BULK = 'confirmar-selecionados';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conferência de preços"
        description="Itens com valor ainda não confirmado pelo restaurante. Eles aparecem no site como “Preço em conferência” ou “Valor a definir” e não podem ser pedidos até você confirmar."
      />
      {productsRes.error || valuesRes.error ? <Notice tone="warning">Não foi possível carregar todos os itens. Atualize a página.</Notice> : null}

      <Card
        title={`Produtos (${products.length})`}
        description="Confira cada tamanho. Você pode corrigir o valor aqui mesmo antes de confirmar. Nenhum valor é alterado sem você clicar."
      >
        {products.length === 0 ? (
          <EmptyState title="Todos os produtos estão com preço conferido" />
        ) : (
          <div className="space-y-3">
            {products.map((p) => {
              const variants = p.product_variants.filter((v) => !v.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div key={p.id} className="rounded-xl border border-line p-3" data-testid="pending-product">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <label className="inline-flex items-center gap-2 font-semibold">
                      <input type="checkbox" name="product" value={p.id} form={BULK} className="size-4 accent-brand-600" aria-label={`Selecionar ${p.name}`} />
                      {p.name}
                    </label>
                    <span className="text-xs text-muted">{p.categories?.name}{p.is_active ? '' : ' · rascunho'}</span>
                    <Link href={`/admin/cardapio/${p.id}`} className="text-xs font-semibold underline">Editar produto</Link>
                  </div>
                  <ActionForm action={confirmProductPrices.bind(null, p.id)} submitLabel="Salvar e confirmar valores" size="sm" className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      {variants.length ? (
                        variants.map((v) => (
                          <label key={v.id} className="text-xs font-medium">
                            {v.name}
                            <input name={`variant:${v.id}`} defaultValue={centsInput(v.price)} inputMode="decimal" required className="mt-1 block h-9 w-28 rounded-lg border border-line px-2 text-sm" />
                          </label>
                        ))
                      ) : (
                        <label className="text-xs font-medium">
                          Preço
                          <input name="basePrice" defaultValue={centsInput(p.base_price)} inputMode="decimal" required className="mt-1 block h-9 w-28 rounded-lg border border-line px-2 text-sm" />
                        </label>
                      )}
                    </div>
                  </ActionForm>
                </div>
              );
            })}
            <ActionForm
              id={BULK}
              action={confirmSelectedProducts}
              submitLabel="Confirmar os selecionados sem alterar valores"
              size="sm"
              variant="outline"
              confirm="Confirmar os valores atuais dos produtos marcados? Eles passam a poder ser pedidos no site."
            />
          </div>
        )}
      </Card>

      <Card title={`Opções sem valor definido (${values.length})`} description="Ex.: molhos. Digite 0,00 se a opção for grátis. Também é possível editar em “Bordas e molhos”.">
        {values.length === 0 ? (
          <EmptyState title="Todas as opções têm valor definido" />
        ) : (
          <ul className="divide-y divide-line">
            {values.map((v) => (
              <li key={v.id} className="py-3" data-testid="pending-option">
                <ActionForm action={confirmOptionPrice.bind(null, v.id)} submitLabel="Confirmar valor" size="sm" inline>
                  <label className="text-sm">
                    <span className="block font-semibold">{v.name}</span>
                    <span className="block text-xs text-muted">{v.option_groups?.name}</span>
                    <input name="price" inputMode="decimal" placeholder="0,00" required aria-label={`Valor de ${v.name}`} className="mt-1 h-9 w-28 rounded-lg border border-line px-2" />
                  </label>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {recent.length ? (
        <Card title="Conferidos recentemente" description="O registro completo (quem alterou e o que mudou) fica em Auditoria.">
          <ul className="divide-y divide-line text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <Link href={`/admin/cardapio/${r.id}`} className="font-medium underline-offset-2 hover:underline">{r.name}</Link>
                <span className="text-muted">{dateTime(r.price_confirmed_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

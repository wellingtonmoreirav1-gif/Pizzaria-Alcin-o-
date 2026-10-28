import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { SIZE_CODES, SIZE_LABEL } from '@/lib/catalog/sizes';
import { Card, CheckboxField, PageHeader, SelectField, TextField, centsInput } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { Badge } from '@/components/ui/feedback';
import { archiveSharedValue, saveSharedGroup, saveSharedLinks, saveSharedSizePrices, saveSharedValue } from './actions';

export const metadata = { title: 'Bordas e molhos' };

const KIND_LABEL = { crust: 'Borda', extra: 'Adicionais / molhos', choice: 'Escolhas' } as const;

type SizePrice = { size_code: string; price: number | null; is_offered: boolean };
type Value = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_confirmed: boolean;
  sort_order: number;
  is_active: boolean;
  is_available: boolean;
  deleted_at: string | null;
  option_value_size_prices: SizePrice[];
};
type Group = {
  id: string;
  shared_key: string;
  kind: keyof typeof KIND_LABEL;
  name: string;
  description: string | null;
  min_select: number;
  max_select: number;
  sort_order: number;
  is_active: boolean;
  option_values: Value[];
  product_shared_groups: { product_id: string; sort_order: number }[];
};
type ProductRow = { id: string; name: string; kind: string; categories: { name: string; sort_order: number } | null };

export default async function SharedOptionsPage() {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const supabase = await createSessionClient();
  const [groupsRes, productsRes] = await Promise.all([
    supabase
      .from('option_groups')
      .select(
        'id, shared_key, kind, name, description, min_select, max_select, sort_order, is_active, option_values(id, name, description, price, price_confirmed, sort_order, is_active, is_available, deleted_at, option_value_size_prices(size_code, price, is_offered)), product_shared_groups(product_id, sort_order)',
      )
      .not('shared_key', 'is', null)
      .is('deleted_at', null)
      .order('sort_order'),
    supabase.from('products').select('id, name, kind, categories(name, sort_order)').is('deleted_at', null).order('sort_order'),
  ]);
  const groups = (groupsRes.data ?? []) as unknown as Group[];
  const products = ((productsRes.data ?? []) as unknown as ProductRow[]).sort(
    (a, b) => (a.categories?.sort_order ?? 0) - (b.categories?.sort_order ?? 0) || a.name.localeCompare(b.name, 'pt-BR'),
  );
  const byCategory = new Map<string, ProductRow[]>();
  for (const p of products) {
    const key = p.categories?.name ?? 'Sem categoria';
    byCategory.set(key, [...(byCategory.get(key) ?? []), p]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bordas e molhos"
        description="Opções cadastradas uma única vez e usadas por vários produtos. Alterar um valor aqui vale para todas as pizzas/lanches ligados."
      />
      {groups.map((g) => {
        const values = g.option_values.filter((v) => !v.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
        const linked = new Set(g.product_shared_groups.map((l) => l.product_id));
        const pending = values.filter((v) => !v.price_confirmed).length;
        return (
          <Card
            key={g.id}
            title={g.name}
            description={`Código: ${g.shared_key} · ligado a ${linked.size} produto(s).`}
            actions={pending ? <Badge tone="warning">{pending} valor(es) a definir</Badge> : <Badge tone="success">Valores conferidos</Badge>}
          >
            <div className="space-y-5" id={g.shared_key}>
              <ActionForm action={saveSharedGroup.bind(null, g.id)} submitLabel="Salvar grupo" size="sm">
                <GroupFields g={g} />
              </ActionForm>

              <section aria-label={`Opções de ${g.name}`} className="space-y-2">
                <h3 className="text-sm font-semibold">Opções</h3>
                {values.map((v) => (
                  <div key={v.id} className="rounded-lg bg-mist p-3" data-testid={`shared-value-${v.name}`}>
                    <ActionForm action={saveSharedValue.bind(null, g.id, v.id)} submitLabel="Salvar" size="sm" className="space-y-2">
                      <ValueFields v={v} />
                    </ActionForm>
                    <div className="mt-1">
                      <ActionForm
                        action={archiveSharedValue.bind(null, g.id, v.id)}
                        submitLabel="Remover opção"
                        size="sm"
                        variant="ghost"
                        confirm="Remover esta opção de todos os produtos?"
                      />
                    </div>
                  </div>
                ))}
                <details className="rounded-lg border border-dashed border-line p-3">
                  <summary className="cursor-pointer text-sm font-semibold">+ Adicionar opção</summary>
                  <div className="mt-3">
                    <ActionForm action={saveSharedValue.bind(null, g.id, null)} submitLabel="Adicionar" size="sm" resetOnSuccess>
                      <ValueFields v={null} />
                    </ActionForm>
                  </div>
                </details>
              </section>

              {values.length > 0 ? (
                <details className="rounded-lg border border-line p-3" open={g.kind === 'crust'}>
                  <summary className="cursor-pointer text-sm font-semibold">Valor por tamanho</summary>
                  <p className="mt-2 text-xs text-muted">
                    Vale para todos os produtos ligados que têm o tamanho com esse código. Vazio = usa o valor padrão da opção. Desmarque “Oferecido” para
                    esconder a opção naquele tamanho.
                  </p>
                  <ActionForm action={saveSharedSizePrices.bind(null, g.id)} submitLabel="Salvar valores por tamanho" size="sm" className="mt-3 space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[40rem] text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted">
                            <th className="py-1 pr-3">Opção</th>
                            {SIZE_CODES.map((code) => (
                              <th key={code} className="px-2 py-1">
                                {SIZE_LABEL[code]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {values.map((val) => (
                            <tr key={val.id} className="border-t border-line">
                              <th scope="row" className="py-2 pr-3 text-left font-medium">
                                {val.name}
                              </th>
                              {SIZE_CODES.map((code) => {
                                const rule = val.option_value_size_prices.find((r) => r.size_code === code);
                                const key = `${val.id}:${code}`;
                                return (
                                  <td key={code} className="px-2 py-2">
                                    <input type="hidden" name={`cell:${key}`} value="1" />
                                    <input
                                      name={`size:${key}`}
                                      defaultValue={centsInput(rule?.price ?? null)}
                                      placeholder="padrão"
                                      inputMode="decimal"
                                      aria-label={`Valor de ${val.name} no tamanho ${SIZE_LABEL[code]}`}
                                      className="h-9 w-24 rounded-lg border border-line px-2"
                                    />
                                    <label className="mt-1 flex items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        name={`offered:${key}`}
                                        defaultChecked={rule ? rule.is_offered : true}
                                        className="accent-brand-600"
                                      />{' '}
                                      Oferecido
                                    </label>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ActionForm>
                </details>
              ) : null}

              <details className="rounded-lg border border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Produtos que oferecem “{g.name}” ({linked.size})
                </summary>
                <ActionForm action={saveSharedLinks.bind(null, g.id)} submitLabel="Salvar produtos ligados" size="sm" className="mt-3 space-y-4">
                  <input type="hidden" name="sortOrder" value={g.product_shared_groups[0]?.sort_order ?? 10} />
                  {[...byCategory.entries()].map(([category, items]) => (
                    <fieldset key={category}>
                      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{category}</legend>
                      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="product" value={p.id} defaultChecked={linked.has(p.id)} className="size-4 accent-brand-600" /> {p.name}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </ActionForm>
              </details>
            </div>
          </Card>
        );
      })}

      <Card
        title="Novo grupo compartilhado"
        description="Ex.: adicionais de lanche usados por vários produtos. Depois de criar, cadastre as opções e ligue aos produtos."
      >
        <ActionForm action={saveSharedGroup.bind(null, null)} submitLabel="Criar grupo" resetOnSuccess>
          <GroupFields g={null} />
          <TextField label="Código (opcional)" name="sharedKey" hint="Identificador sem espaços. Gerado a partir do nome se ficar vazio." />
        </ActionForm>
      </Card>
    </div>
  );
}

function GroupFields({ g }: { g: Pick<Group, 'kind' | 'name' | 'description' | 'min_select' | 'max_select' | 'sort_order' | 'is_active'> | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      <SelectField label="Tipo" name="kind" defaultValue={g?.kind ?? 'extra'} className="md:col-span-2">
        {Object.entries(KIND_LABEL).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </SelectField>
      <TextField label="Nome exibido" name="name" required defaultValue={g?.name} className="md:col-span-2" maxLength={80} />
      <TextField label="Mínimo" name="minSelect" type="number" min={0} defaultValue={g?.min_select ?? 0} hint="0 = opcional" />
      <TextField label="Máximo" name="maxSelect" type="number" min={1} defaultValue={g?.max_select ?? 1} />
      <TextField label="Descrição" name="description" defaultValue={g?.description ?? ''} className="md:col-span-4" maxLength={300} />
      <TextField label="Ordem" name="sortOrder" type="number" defaultValue={g?.sort_order ?? 0} />
      <CheckboxField label="Ativo" name="isActive" defaultChecked={g?.is_active ?? true} />
    </div>
  );
}

function ValueFields({ v }: { v: Value | null }) {
  return (
    <div className="grid gap-2 md:grid-cols-8">
      <TextField label="Nome" name="name" required defaultValue={v?.name} className="md:col-span-2" maxLength={80} />
      <TextField label="Descrição" name="description" defaultValue={v?.description ?? ''} className="md:col-span-2" maxLength={300} />
      <TextField
        label="Valor padrão (R$)"
        name="price"
        inputMode="decimal"
        defaultValue={v?.price_confirmed ? centsInput(v.price) : ''}
        placeholder="a definir"
        hint="0,00 = grátis"
      />
      <TextField label="Ordem" name="sortOrder" type="number" defaultValue={v?.sort_order ?? 0} />
      <div className="space-y-1 md:col-span-2">
        <CheckboxField label="Valor conferido (liberado no site)" name="priceConfirmed" defaultChecked={v?.price_confirmed ?? false} />
        <CheckboxField label="Disponível" name="isAvailable" defaultChecked={v?.is_available ?? true} />
        <CheckboxField label="Ativa" name="isActive" defaultChecked={v?.is_active ?? true} />
      </div>
    </div>
  );
}

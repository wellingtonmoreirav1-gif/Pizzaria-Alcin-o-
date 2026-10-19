import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ChevronLeft, Eye } from 'lucide-react';
import { z } from 'zod';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { buildImageBrief } from '@/lib/images/prompts';
import { Card, CheckboxField, PageHeader, SelectField, TextField, centsInput } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { ProductFields } from '@/components/admin/product-fields';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import {
  addComboItem, archiveGroup, archiveOptionValue, archiveProduct, archiveVariant, removeComboItem,
  saveGroup, saveOptionValue, saveSizeMatrix, saveVariant, updateProduct,
} from '../actions';

export const metadata = { title: 'Editar produto' };

const GROUP_KIND_LABEL = { flavor: 'Sabores (pizza)', crust: 'Borda', extra: 'Adicionais', choice: 'Escolhas / acompanhamentos' } as const;
const RULE_LABEL = { highest: 'Preço do sabor mais caro', average: 'Média dos sabores', fixed: 'Preço fixo do tamanho' } as const;

export default async function EditProductPage({ params }: PageProps<'/admin/cardapio/[id]'>) {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSessionClient();
  const [productRes, categories, allProducts] = await Promise.all([
    supabase
      .from('products')
      .select(
        `*, categories(slug, name),
         product_variants(*),
         option_groups(*, option_values(*, option_value_variant_prices(*))),
         combo_items!combo_items_combo_product_id_fkey(id, item_product_id, item_variant_id, quantity, description, sort_order, item:products!combo_items_item_product_id_fkey(name), variant:product_variants(name))`,
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('categories').select('id, name').is('deleted_at', null).order('sort_order'),
    supabase.from('products').select('id, name, kind, product_variants(id, name, deleted_at)').is('deleted_at', null).neq('id', id).order('name'),
  ]);
  const p = productRes.data;
  if (!p) notFound();
  type Variant = { id: string; name: string; description: string | null; price: number; max_flavors: number; flavor_price_rule: keyof typeof RULE_LABEL; allow_mixed_flavor_tags: boolean; sort_order: number; is_active: boolean; deleted_at: string | null };
  type Value = { id: string; name: string; description: string | null; price: number; combination_tag: string | null; sort_order: number; is_active: boolean; deleted_at: string | null; option_value_variant_prices: { variant_id: string; price: number | null; is_offered: boolean }[] };
  type Group = { id: string; kind: keyof typeof GROUP_KIND_LABEL; name: string; description: string | null; min_select: number; max_select: number; sort_order: number; is_active: boolean; deleted_at: string | null; option_values: Value[] };
  const variants = ((p.product_variants ?? []) as Variant[]).filter((v) => !v.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
  const groups = ((p.option_groups ?? []) as Group[]).filter((g) => !g.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
  const flavorGroup = groups.find((g) => g.kind === 'flavor');
  const brief = buildImageBrief({
    name: p.name,
    slug: p.slug,
    categorySlug: (p.categories as { slug: string } | null)?.slug ?? '',
    description: p.description ?? p.short_description,
    flavors: undefined,
  });

  const problems: string[] = [];
  if (p.kind === 'pizza' && variants.length === 0) problems.push('Pizza sem tamanhos: cadastre pelo menos um tamanho.');
  if (p.kind === 'pizza' && (!flavorGroup || flavorGroup.option_values.filter((v) => !v.deleted_at).length === 0)) problems.push('Pizza sem sabores cadastrados.');
  if (p.kind !== 'pizza' && variants.length === 0 && p.base_price === null) problems.push('Produto sem preço: informe o preço ou cadastre tamanhos.');
  if (p.kind === 'combo' && (p.combo_items ?? []).length === 0) problems.push('Combo sem itens incluídos.');

  return (
    <div className="space-y-6">
      <Link href="/admin/cardapio" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-strong">
        <ChevronLeft className="size-4" aria-hidden /> Cardápio
      </Link>
      <PageHeader
        title={p.name}
        description={p.deleted_at ? 'Produto arquivado.' : p.is_active ? 'Publicado no site.' : 'Rascunho (não aparece no site).'}
        actions={<ButtonLink href={`/admin/cardapio/${p.id}/previa`} variant="outline" size="sm"><Eye className="size-4" aria-hidden /> Prévia</ButtonLink>}
      />
      {problems.length ? (
        <Notice tone="warning" title="Antes de publicar">
          <ul className="list-disc pl-5">{problems.map((m) => <li key={m}>{m}</li>)}</ul>
        </Notice>
      ) : null}

      <Card title="Dados do produto">
        <ActionForm action={updateProduct.bind(null, p.id)} submitLabel="Salvar produto">
          <ProductFields product={p} categories={categories.data ?? []} />
        </ActionForm>
      </Card>

      <Card
        title={p.kind === 'pizza' ? 'Tamanhos e regras da pizza' : 'Tamanhos / variantes'}
        description={
          p.kind === 'pizza'
            ? 'Para cada tamanho: preço-base, quantidade máxima de sabores e a regra de preço para pizza com mais de um sabor.'
            : 'Opcional. Use quando o produto tem tamanhos ou porções (ex.: lata / 2 litros; P / M / G).'
        }
      >
        <div className="space-y-3">
          {variants.map((v) => (
            <div key={v.id} className="rounded-xl border border-line p-3">
              <ActionForm action={saveVariant.bind(null, p.id, v.id)} submitLabel="Salvar tamanho" size="sm">
                <VariantFields v={v} isPizza={p.kind === 'pizza'} />
              </ActionForm>
              <div className="mt-2">
                <ActionForm action={archiveVariant.bind(null, p.id, v.id)} submitLabel="Remover tamanho" size="sm" variant="ghost" confirm="Remover este tamanho?" />
              </div>
            </div>
          ))}
          <details className="rounded-xl border border-dashed border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">+ Adicionar tamanho</summary>
            <div className="mt-3">
              <ActionForm action={saveVariant.bind(null, p.id, null)} submitLabel="Adicionar" size="sm" resetOnSuccess>
                <VariantFields v={null} isPizza={p.kind === 'pizza'} />
              </ActionForm>
            </div>
          </details>
        </div>
      </Card>

      <Card title="Opções de personalização" description="Sabores, borda, adicionais e escolhas (ex.: acompanhamentos). Cada opção pode ter preço diferente por tamanho.">
        <div className="space-y-5">
          {groups.map((g) => {
            const values = g.option_values.filter((v) => !v.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div key={g.id} className="space-y-3 rounded-xl border border-line p-4">
                <ActionForm action={saveGroup.bind(null, p.id, g.id)} submitLabel="Salvar grupo" size="sm">
                  <GroupFields g={g} />
                </ActionForm>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Opções</p>
                  {values.map((v) => (
                    <div key={v.id} className="rounded-lg bg-mist p-3">
                      <ActionForm action={saveOptionValue.bind(null, p.id, g.id, v.id)} submitLabel="Salvar" size="sm" className="space-y-2">
                        <ValueFields v={v} kind={g.kind} />
                      </ActionForm>
                      <div className="mt-1">
                        <ActionForm action={archiveOptionValue.bind(null, p.id, v.id)} submitLabel="Remover opção" size="sm" variant="ghost" confirm="Remover esta opção?" />
                      </div>
                    </div>
                  ))}
                  <details className="rounded-lg border border-dashed border-line p-3">
                    <summary className="cursor-pointer text-sm font-semibold">+ Adicionar opção</summary>
                    <div className="mt-3">
                      <ActionForm action={saveOptionValue.bind(null, p.id, g.id, null)} submitLabel="Adicionar" size="sm" resetOnSuccess>
                        <ValueFields v={null} kind={g.kind} />
                      </ActionForm>
                    </div>
                  </details>
                </div>
                {variants.length > 0 && values.length > 0 ? (
                  <details className="rounded-lg border border-line p-3">
                    <summary className="cursor-pointer text-sm font-semibold">Preço e oferta por tamanho</summary>
                    <p className="mt-2 text-xs text-muted">
                      {g.kind === 'flavor'
                        ? 'Preço da pizza INTEIRA daquele sabor no tamanho. Vazio = usa o preço-base do tamanho.'
                        : 'Vazio = usa o preço padrão da opção.'}{' '}
                      Desmarque “Oferecido” para esconder a opção naquele tamanho.
                    </p>
                    <ActionForm action={saveSizeMatrix.bind(null, p.id, g.id)} submitLabel="Salvar preços por tamanho" size="sm" className="mt-3 space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[32rem] text-sm">
                          <thead>
                            <tr className="text-left text-xs text-muted">
                              <th className="py-1 pr-3">Opção</th>
                              {variants.map((v) => <th key={v.id} className="px-2 py-1">{v.name}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {values.map((val) => (
                              <tr key={val.id} className="border-t border-line">
                                <th scope="row" className="py-2 pr-3 text-left font-medium">{val.name}</th>
                                {variants.map((v) => {
                                  const rule = val.option_value_variant_prices.find((r) => r.variant_id === v.id);
                                  const key = `${val.id}:${v.id}`;
                                  return (
                                    <td key={v.id} className="px-2 py-2">
                                      <input type="hidden" name={`cell:${key}`} value="1" />
                                      <input name={`price:${key}`} defaultValue={centsInput(rule?.price ?? null)} placeholder="padrão" inputMode="decimal" aria-label={`Preço de ${val.name} em ${v.name}`} className="h-9 w-24 rounded-lg border border-line px-2" />
                                      <label className="mt-1 flex items-center gap-1 text-xs">
                                        <input type="checkbox" name={`offered:${key}`} defaultChecked={rule ? rule.is_offered : true} className="accent-brand-600" /> Oferecido
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
                <ActionForm action={archiveGroup.bind(null, p.id, g.id)} submitLabel="Remover grupo" size="sm" variant="ghost" confirm="Remover este grupo e suas opções?" />
              </div>
            );
          })}
          <details className="rounded-xl border border-dashed border-line p-4">
            <summary className="cursor-pointer text-sm font-semibold">+ Adicionar grupo de opções</summary>
            <div className="mt-3">
              <ActionForm action={saveGroup.bind(null, p.id, null)} submitLabel="Adicionar grupo" size="sm" resetOnSuccess>
                <GroupFields g={null} />
              </ActionForm>
            </div>
          </details>
        </div>
      </Card>

      {p.kind === 'combo' ? (
        <Card title="Itens do combo" description="O preço do combo é o definido nos dados do produto. O combo fica indisponível se algum item esgotar.">
          <ul className="mb-4 divide-y divide-line">
            {(p.combo_items ?? []).map((c: { id: string; quantity: number; description: string | null; item: { name: string } | null; variant: { name: string } | null }) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {c.quantity}x {c.description ?? c.item?.name}
                  {c.variant ? ` (${c.variant.name})` : ''}
                </span>
                <ActionForm action={removeComboItem.bind(null, p.id, c.id)} submitLabel="Remover" size="sm" variant="ghost" inline />
              </li>
            ))}
          </ul>
          <ActionForm action={addComboItem.bind(null, p.id)} submitLabel="Incluir item" size="sm" resetOnSuccess>
            <div className="grid gap-3 md:grid-cols-4">
              <SelectField label="Produto" name="itemProductId" required defaultValue="">
                <option value="" disabled>Selecione…</option>
                {(allProducts.data ?? []).filter((x) => x.kind !== 'combo').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </SelectField>
              <SelectField label="Tamanho (se houver)" name="itemVariantId" defaultValue="">
                <option value="">—</option>
                {(allProducts.data ?? []).flatMap((x) => (x.product_variants ?? []).filter((v) => !v.deleted_at).map((v) => <option key={v.id} value={v.id}>{x.name} — {v.name}</option>))}
              </SelectField>
              <TextField label="Quantidade" name="quantity" type="number" min={1} max={20} defaultValue={1} />
              <TextField label="Descrição exibida" name="description" placeholder="Ex.: Pizza grande (sabor à escolha)" />
            </div>
          </ActionForm>
        </Card>
      ) : null}

      <Card title="Foto: briefing e prompt" description="Use para produzir uma foto fiel ao produto (ver docs/LOGO-E-IMAGENS.md). Revise antes de publicar.">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div><dt className="text-muted">Composição</dt><dd>{brief.composition}</dd></div>
          <div><dt className="text-muted">Enquadramento</dt><dd>{brief.framing}</dd></div>
          <div><dt className="text-muted">Iluminação</dt><dd>{brief.lighting}</dd></div>
          <div><dt className="text-muted">Proporção / arquivo</dt><dd>{brief.aspectRatio} · {brief.fileName}</dd></div>
        </dl>
        <textarea readOnly value={brief.prompt} className="mt-3 h-28 w-full rounded-xl border border-line bg-mist p-3 font-mono text-xs" aria-label="Prompt da foto" />
      </Card>

      {!p.deleted_at ? (
        <Card title="Arquivar produto" description="Remove do site e do painel de operação. Pedidos antigos continuam com os dados da época.">
          <ActionForm action={archiveProduct.bind(null, p.id)} submitLabel="Arquivar produto" variant="danger" confirm="Arquivar este produto?" redirectTo="/admin/cardapio" />
        </Card>
      ) : null}
    </div>
  );
}

function VariantFields({ v, isPizza }: { v: { name: string; description: string | null; price: number; max_flavors: number; flavor_price_rule: string; allow_mixed_flavor_tags: boolean; sort_order: number; is_active: boolean } | null; isPizza: boolean }) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      <TextField label="Nome" name="name" required defaultValue={v?.name} className="md:col-span-2" placeholder="Ex.: Grande" />
      <TextField label="Descrição" name="description" defaultValue={v?.description ?? ''} className="md:col-span-2" placeholder="Ex.: 8 fatias" />
      <TextField label={isPizza ? 'Preço-base (R$)' : 'Preço (R$)'} name="price" required inputMode="decimal" defaultValue={centsInput(v?.price ?? null)} />
      <TextField label="Ordem" name="sortOrder" type="number" defaultValue={v?.sort_order ?? 0} />
      {isPizza ? (
        <>
          <TextField label="Máx. de sabores" name="maxFlavors" type="number" min={1} max={8} defaultValue={v?.max_flavors ?? 1} />
          <SelectField label="Preço com 2+ sabores" name="flavorPriceRule" defaultValue={v?.flavor_price_rule ?? 'highest'} className="md:col-span-2">
            {Object.entries(RULE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </SelectField>
          <CheckboxField label="Permite misturar tipos (ex.: doce + salgada)" name="allowMixed" defaultChecked={v?.allow_mixed_flavor_tags ?? true} className="md:col-span-2" />
        </>
      ) : (
        <input type="hidden" name="allowMixed" value="on" />
      )}
      <CheckboxField label="Ativo" name="isActive" defaultChecked={v?.is_active ?? true} />
    </div>
  );
}

function GroupFields({ g }: { g: { kind: string; name: string; description: string | null; min_select: number; max_select: number; sort_order: number; is_active: boolean } | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      <SelectField label="Tipo" name="kind" defaultValue={g?.kind ?? 'choice'} className="md:col-span-2">
        {Object.entries(GROUP_KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </SelectField>
      <TextField label="Nome exibido" name="name" required defaultValue={g?.name} className="md:col-span-2" />
      <TextField label="Mínimo" name="minSelect" type="number" min={0} defaultValue={g?.min_select ?? 0} hint="0 = opcional" />
      <TextField label="Máximo" name="maxSelect" type="number" min={1} defaultValue={g?.max_select ?? 1} hint="Sabores: o limite vem do tamanho" />
      <TextField label="Descrição" name="description" defaultValue={g?.description ?? ''} className="md:col-span-4" />
      <TextField label="Ordem" name="sortOrder" type="number" defaultValue={g?.sort_order ?? 0} />
      <CheckboxField label="Ativo" name="isActive" defaultChecked={g?.is_active ?? true} />
    </div>
  );
}

function ValueFields({ v, kind }: { v: { name: string; description: string | null; price: number; combination_tag: string | null; sort_order: number; is_active: boolean } | null; kind: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-6">
      <TextField label="Nome" name="name" required defaultValue={v?.name} className="md:col-span-2" />
      <TextField label={kind === 'flavor' ? 'Ingredientes' : 'Descrição'} name="description" defaultValue={v?.description ?? ''} className="md:col-span-2" />
      {kind === 'flavor' ? (
        <>
          <input type="hidden" name="price" value="0" />
          <TextField label="Tipo (doce, salgada…)" name="combinationTag" defaultValue={v?.combination_tag ?? ''} hint="Usado na regra de mistura" />
        </>
      ) : (
        <>
          <TextField label="Preço (R$)" name="price" inputMode="decimal" defaultValue={centsInput(v?.price ?? 0)} />
          <input type="hidden" name="combinationTag" value={v?.combination_tag ?? ''} />
        </>
      )}
      <TextField label="Ordem" name="sortOrder" type="number" defaultValue={v?.sort_order ?? 0} />
      <CheckboxField label="Ativa" name="isActive" defaultChecked={v?.is_active ?? true} />
    </div>
  );
}

import Link from 'next/link';
import { connection } from 'next/server';
import { Plus } from 'lucide-react';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { formatBRL, toCents } from '@/lib/money';
import { PageHeader, SelectField } from '@/components/admin/fields';
import { AvailabilityToggle } from '@/components/admin/availability-toggle';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { ActionForm } from '@/components/admin/action-form';
import { restoreProduct } from './actions';

export const metadata = { title: 'Cardápio' };

export default async function CatalogAdminPage({ searchParams }: PageProps<'/admin/cardapio'>) {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const sp = await searchParams;
  const category = typeof sp.categoria === 'string' ? sp.categoria : '';
  const archived = sp.arquivados === '1';
  const supabase = await createSessionClient();
  const [categories, productsRes] = await Promise.all([
    supabase.from('categories').select('id, name').is('deleted_at', null).order('sort_order'),
    (() => {
      let q = supabase
        .from('products')
        .select(
          'id, name, slug, kind, is_active, is_available, is_featured, is_demo, base_price, image_url, deleted_at, categories(name), product_variants(price, deleted_at)',
        )
        .order('sort_order')
        .order('name');
      q = archived ? q.not('deleted_at', 'is', null) : q.is('deleted_at', null);
      if (category) q = q.eq('category_id', category);
      return q;
    })(),
  ]);
  const products = productsRes.data ?? [];
  return (
    <div>
      <PageHeader
        title="Cardápio"
        description="Produtos, tamanhos, sabores, adicionais e combos. Itens arquivados saem do site mas continuam nos relatórios."
        actions={
          <div className="flex gap-2">
            <ButtonLink href="/admin/cardapio/fotos.csv" variant="outline" size="sm" prefetch={false}>
              Lista de fotos (CSV)
            </ButtonLink>
            <ButtonLink href="/admin/cardapio/novo" size="sm">
              <Plus className="size-4" aria-hidden /> Novo produto
            </ButtonLink>
          </div>
        }
      />
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <SelectField label="Categoria" name="categoria" defaultValue={category}>
          <option value="">Todas</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="arquivados" value="1" defaultChecked={archived} className="size-4 accent-brand-600" /> Ver arquivados
        </label>
        <button type="submit" className="h-10 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white">
          Filtrar
        </button>
      </form>
      {products.length === 0 ? <EmptyState title="Nenhum produto">Cadastre o primeiro produto do cardápio.</EmptyState> : null}
      <ul className="grid gap-2">
        {products.map((p) => {
          const prices = (p.product_variants ?? []).filter((v) => !v.deleted_at).map((v) => toCents(v.price));
          const priceLabel = prices.length
            ? `${formatBRL(Math.min(...prices))}${prices.length > 1 ? ` a ${formatBRL(Math.max(...prices))}` : ''}`
            : p.base_price !== null
              ? formatBRL(toCents(p.base_price))
              : 'sem preço';
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/cardapio/${p.id}`} className="font-semibold hover:underline">
                  {p.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <Badge>{(p.categories as unknown as { name: string } | null)?.name}</Badge>
                  <Badge>{p.kind === 'pizza' ? 'Pizza' : p.kind === 'combo' ? 'Combo' : 'Simples'}</Badge>
                  {!p.is_active ? <Badge tone="warning">Rascunho</Badge> : null}
                  {p.is_featured ? <Badge tone="brand">Destaque</Badge> : null}
                  {p.is_demo ? <Badge tone="dark">Demonstração</Badge> : null}
                  {!p.image_url ? <Badge>Sem foto</Badge> : null}
                </div>
              </div>
              <span className="text-sm tabular-nums text-muted-strong">{priceLabel}</span>
              {archived ? (
                <ActionForm action={restoreProduct.bind(null, p.id)} submitLabel="Restaurar" size="sm" variant="outline" inline />
              ) : (
                <AvailabilityToggle entity="product" id={p.id} available={p.is_available} label={p.name} />
              )}
              <Link href={`/admin/cardapio/${p.id}`} className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-mist">
                Editar
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

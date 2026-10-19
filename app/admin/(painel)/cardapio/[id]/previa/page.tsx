import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { z } from 'zod';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { mapProduct, PRODUCT_SELECT, type ProductRow } from '@/lib/catalog/mappers';
import { StoreProviders } from '@/components/storefront/providers';
import { ProductCustomizer } from '@/components/storefront/product-customizer';
import { ProductCard } from '@/components/storefront/product-card';
import { Notice } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/fields';

export const metadata = { title: 'Prévia do produto' };

/** Mostra o produto exatamente como o cliente verá, mesmo se ainda for rascunho. */
export default async function ProductPreviewPage({ params }: PageProps<'/admin/cardapio/[id]/previa'>) {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSessionClient();
  const { data } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
  if (!data) notFound();
  const product = mapProduct(data as unknown as ProductRow);
  const fetchedAt = new Date().toISOString();
  return (
    <div className="space-y-6">
      <PageHeader title={`Prévia: ${product.name}`} description="Simulação da página do produto. Itens adicionados aqui vão para o carrinho deste navegador." />
      {!(data as unknown as ProductRow).is_active ? <Notice tone="warning">Este produto é um rascunho e ainda não aparece no site.</Notice> : null}
      <StoreProviders>
        <div className="grid gap-6 rounded-2xl bg-white p-4 lg:grid-cols-[18rem_1fr]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted">Cartão no cardápio</p>
            <ProductCard product={product} fetchedAt={fetchedAt} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted">Página do produto</p>
            <ProductCustomizer product={product} fetchedAt={fetchedAt} layout="page" />
          </div>
        </div>
      </StoreProviders>
    </div>
  );
}

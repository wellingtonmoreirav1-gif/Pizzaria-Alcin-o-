import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { ProductFields } from '@/components/admin/product-fields';
import { createProduct } from '../actions';

export const metadata = { title: 'Novo produto' };

export default async function NewProductPage() {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const supabase = await createSessionClient();
  const { data: categories } = await supabase.from('categories').select('id, name').is('deleted_at', null).order('sort_order');
  return (
    <div>
      <PageHeader title="Novo produto" description="Crie como rascunho, configure tamanhos e opções, confira a prévia e então publique." />
      <Card>
        <ActionForm action={createProduct} submitLabel="Criar produto" redirectTo="/admin/cardapio/{id}">
          <ProductFields product={{ is_active: false, is_available: true }} categories={categories ?? []} />
        </ActionForm>
      </Card>
    </div>
  );
}

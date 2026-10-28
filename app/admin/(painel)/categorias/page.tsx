import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { Card, CheckboxField, PageHeader, SelectField, TextField } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { archiveCategory, saveCategory } from './actions';

export const metadata = { title: 'Categorias' };

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  show_on_home: boolean;
  section_type: string;
  shared_group_id: string | null;
};
type SharedGroup = { id: string; name: string };

function Fields({ c, groups }: { c: Category | null; groups: SharedGroup[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      <TextField label="Nome" name="name" required defaultValue={c?.name} className="md:col-span-2" />
      <TextField label="Slug" name="slug" defaultValue={c?.slug} className="md:col-span-2" />
      <TextField label="Ordem" name="sortOrder" type="number" defaultValue={c?.sort_order ?? 0} />
      <input type="hidden" name="imageUrl" value={c?.image_url ?? ''} />
      <TextField label="Descrição" name="description" defaultValue={c?.description ?? ''} className="md:col-span-4" maxLength={300} />
      <SelectField
        label="Conteúdo da seção"
        name="sharedGroupId"
        defaultValue={c?.shared_group_id ?? ''}
        className="md:col-span-2"
        hint="Seção informativa mostra a tabela de valores de um grupo (ex.: bordas, molhos) em vez de produtos."
      >
        <option value="">Produtos desta categoria</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            Seção informativa: {g.name}
          </option>
        ))}
      </SelectField>
      <CheckboxField label="Ativa" name="isActive" defaultChecked={c?.is_active ?? true} className="md:col-span-2" />
      <CheckboxField label="Mostrar na página inicial" name="showOnHome" defaultChecked={c?.show_on_home ?? true} className="md:col-span-3" />
    </div>
  );
}

export default async function CategoriesPage() {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const supabase = await createSessionClient();
  const [{ data }, shared] = await Promise.all([
    supabase.from('categories').select('*').is('deleted_at', null).order('sort_order'),
    supabase.from('option_groups').select('id, name').not('shared_key', 'is', null).is('deleted_at', null).order('sort_order'),
  ]);
  const groups = (shared.data ?? []) as SharedGroup[];
  return (
    <div className="space-y-4">
      <PageHeader title="Categorias" description="“Promoções” e “Mais vendidos” são vitrines automáticas e não precisam ser cadastradas." />
      {((data as Category[] | null) ?? []).map((c) => (
        <Card key={c.id} title={c.name}>
          <ActionForm action={saveCategory.bind(null, c.id)} size="sm">
            <Fields c={c} groups={groups} />
          </ActionForm>
          <div className="mt-2">
            <ActionForm
              action={archiveCategory.bind(null, c.id)}
              submitLabel="Arquivar categoria"
              size="sm"
              variant="ghost"
              confirm="Arquivar esta categoria?"
            />
          </div>
        </Card>
      ))}
      <Card title="Nova categoria">
        <ActionForm action={saveCategory.bind(null, null)} submitLabel="Criar categoria" resetOnSuccess>
          <Fields c={null} groups={groups} />
        </ActionForm>
      </Card>
    </div>
  );
}

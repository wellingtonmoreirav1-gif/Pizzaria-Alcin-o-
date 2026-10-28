import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { Card, CheckboxField, PageHeader, TextField, toLocalInput } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { ImageUpload } from '@/components/admin/image-upload';
import { Badge } from '@/components/ui/feedback';
import { deleteBanner, saveBanner } from './actions';

export const metadata = { title: 'Banners' };

type Banner = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  image_alt: string | null;
  cta_label: string | null;
  cta_href: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
};

function Fields({ b }: { b: Banner | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      <TextField label="Título" name="title" required defaultValue={b?.title} className="md:col-span-3" maxLength={80} />
      <TextField label="Texto" name="body" defaultValue={b?.body ?? ''} className="md:col-span-3" maxLength={200} />
      <TextField label="Texto do botão" name="ctaLabel" defaultValue={b?.cta_label ?? ''} className="md:col-span-2" maxLength={30} />
      <TextField label="Link" name="ctaHref" defaultValue={b?.cta_href ?? ''} className="md:col-span-2" placeholder="/cardapio?categoria=pizzas" />
      <TextField label="Ordem" name="sortOrder" type="number" defaultValue={b?.sort_order ?? 0} />
      <CheckboxField label="Ativo" name="isActive" defaultChecked={b?.is_active ?? true} />
      <TextField label="Exibir a partir de" name="startsAt" type="datetime-local" defaultValue={toLocalInput(b?.starts_at ?? null)} className="md:col-span-3" />
      <TextField
        label="Exibir até"
        name="endsAt"
        type="datetime-local"
        defaultValue={toLocalInput(b?.ends_at ?? null)}
        className="md:col-span-3"
        hint="Ofertas vencidas deixam de aparecer automaticamente."
      />
      <div className="md:col-span-3">
        <ImageUpload name="imageUrl" folder="banners" defaultUrl={b?.image_url ?? null} />
      </div>
      <TextField label="Texto alternativo da imagem" name="imageAlt" defaultValue={b?.image_alt ?? ''} className="md:col-span-3" />
    </div>
  );
}

export default async function BannersPage() {
  await requireStaff([...PERMISSIONS.banners]);
  await connection();
  const supabase = await createSessionClient();
  const { data } = await supabase.from('banners').select('*').order('sort_order');
  const now = new Date();
  return (
    <div className="space-y-4">
      <PageHeader title="Banners" description="Destaques exibidos na página inicial. Use apenas ofertas reais." />
      {((data ?? []) as Banner[]).map((b) => {
        const live = b.is_active && (!b.starts_at || new Date(b.starts_at) <= now) && (!b.ends_at || new Date(b.ends_at) > now);
        return (
          <Card key={b.id} title={b.title} actions={live ? <Badge tone="success">No ar</Badge> : <Badge>Fora do ar</Badge>}>
            <ActionForm action={saveBanner.bind(null, b.id)} size="sm">
              <Fields b={b} />
            </ActionForm>
            <div className="mt-2">
              <ActionForm action={deleteBanner.bind(null, b.id)} submitLabel="Excluir" size="sm" variant="ghost" confirm="Excluir este banner?" />
            </div>
          </Card>
        );
      })}
      <Card title="Novo banner">
        <ActionForm action={saveBanner.bind(null, null)} submitLabel="Criar banner" resetOnSuccess>
          <Fields b={null} />
        </ActionForm>
      </Card>
    </div>
  );
}

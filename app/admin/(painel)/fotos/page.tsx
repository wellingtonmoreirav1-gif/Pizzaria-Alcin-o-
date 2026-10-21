import Link from 'next/link';
import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { Card, PageHeader, TextField } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { ImageUpload } from '@/components/admin/image-upload';
import { Badge, Notice } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { saveBrandImages, saveCategoryPhoto, saveProductPhoto } from './actions';

export const metadata = { title: 'Fotos e logo' };

type Row = { id: string; name: string; image_url: string | null; image_alt: string | null; is_active: boolean; categories: { name: string; sort_order: number } | null };
type Status = 'foto' | 'ilustracao' | 'sem';

const statusOf = (url: string | null): Status => (!url ? 'sem' : url.startsWith('/images/products/') ? 'ilustracao' : 'foto');
const STATUS_BADGE: Record<Status, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  foto: { label: 'Foto enviada', tone: 'success' },
  ilustracao: { label: 'Ilustração provisória', tone: 'warning' },
  sem: { label: 'Sem imagem', tone: 'neutral' },
};

export default async function PhotosPage({ searchParams }: PageProps<'/admin/fotos'>) {
  await requireStaff([...PERMISSIONS.catalog]);
  await connection();
  const sp = await searchParams;
  const filter = sp.mostrar === 'pendentes' || sp.mostrar === 'enviadas' ? sp.mostrar : 'todas';
  const supabase = await createSessionClient();
  const [settingsRes, productsRes, categoriesRes] = await Promise.all([
    supabase.from('business_settings').select('logo_url').eq('id', 1).single(),
    supabase.from('products').select('id, name, image_url, image_alt, is_active, categories(name, sort_order)').is('deleted_at', null).order('sort_order'),
    supabase.from('categories').select('id, name, image_url').is('deleted_at', null).eq('is_active', true).eq('show_on_home', true).order('sort_order'),
  ]);
  const categories = (categoriesRes.data ?? []) as { id: string; name: string; image_url: string | null }[];
  const all = ((productsRes.data ?? []) as unknown as Row[]).sort(
    (a, b) => (a.categories?.sort_order ?? 0) - (b.categories?.sort_order ?? 0),
  );
  const done = all.filter((p) => statusOf(p.image_url) === 'foto').length;
  const shown = all.filter((p) => (filter === 'todas' ? true : filter === 'enviadas' ? statusOf(p.image_url) === 'foto' : statusOf(p.image_url) !== 'foto'));
  const groups = new Map<string, Row[]>();
  for (const p of shown) {
    const key = p.categories?.name ?? 'Sem categoria';
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const s = settingsRes.data;
  const chip = (value: string, label: string) => (
    <Link
      href={value === 'todas' ? '/admin/fotos' : `/admin/fotos?mostrar=${value}`}
      aria-current={filter === value ? 'page' : undefined}
      className={cn('rounded-full px-3 py-1.5 text-sm font-semibold', filter === value ? 'bg-ink-900 text-white' : 'bg-mist text-ink-800 hover:bg-line')}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fotos e logo"
        description="Envie aqui a logo oficial e as fotos reais dos produtos. Cada foto aparece no site assim que você clicar em Salvar."
      />

      <Card title="Logo oficial" description="PNG com fundo transparente ou WebP, de preferência quadrada ou horizontal. O topo da página inicial usa a animação da pizza.">
        <ActionForm action={saveBrandImages} submitLabel="Salvar logo">
          <ImageUpload name="logoUrl" folder="brand" defaultUrl={s?.logo_url ?? null} label="Logo oficial" />
        </ActionForm>
      </Card>

      <Card
        title="Fotos das categorias"
        description="Aparecem nas faixas largas da página inicial (“O que você quer hoje?”). Use foto horizontal, de preferência 1600×600. O lado esquerdo fica mais escuro para o nome aparecer. Sem foto, a faixa usa a foto do primeiro produto da categoria."
      >
        <ul className="grid gap-3 md:grid-cols-2">
          {categories.map((c) => (
            <li key={c.id} className="rounded-xl border border-line p-3" data-testid="category-photo">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold">{c.name}</span>
                <Badge tone={c.image_url ? 'success' : 'neutral'}>{c.image_url ? 'Foto enviada' : 'Usando foto do produto'}</Badge>
              </div>
              <ActionForm action={saveCategoryPhoto.bind(null, c.id)} submitLabel="Salvar foto" size="sm">
                <ImageUpload name="imageUrl" folder="categories" defaultUrl={c.image_url} label={`Foto de ${c.name}`} />
              </ActionForm>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title={`Fotos dos produtos (${done} de ${all.length} com foto real)`}
        description="Use fotos do próprio produto, de preferência na proporção 4:3 (ex.: 1600×1200). O painel reduz e converte para WebP automaticamente. Enquanto não houver foto, o site mostra a ilustração provisória."
      >
        <div className="mb-4 flex flex-wrap gap-2" role="navigation" aria-label="Filtro de fotos">
          {chip('todas', `Todos (${all.length})`)}
          {chip('pendentes', `Sem foto real (${all.length - done})`)}
          {chip('enviadas', `Com foto (${done})`)}
        </div>
        {shown.length === 0 ? <Notice tone="success">Nenhum produto neste filtro.</Notice> : null}
        <div className="space-y-6">
          {[...groups.entries()].map(([category, items]) => (
            <section key={category} aria-label={category}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{category}</h3>
              <ul className="grid gap-3 md:grid-cols-2">
                {items.map((p) => {
                  const status = statusOf(p.image_url);
                  return (
                    <li key={p.id} className="rounded-xl border border-line p-3" data-testid="photo-item">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/admin/cardapio/${p.id}`} className="font-semibold underline-offset-2 hover:underline">{p.name}</Link>
                        <span className="flex gap-1">
                          {!p.is_active ? <Badge>Rascunho</Badge> : null}
                          <Badge tone={STATUS_BADGE[status].tone}>{STATUS_BADGE[status].label}</Badge>
                        </span>
                      </div>
                      <ActionForm action={saveProductPhoto.bind(null, p.id)} submitLabel="Salvar foto" size="sm" className="space-y-3">
                        <ImageUpload name="imageUrl" folder="products" defaultUrl={p.image_url} label={`Foto de ${p.name}`} />
                        <TextField
                          label="Texto alternativo"
                          name="imageAlt"
                          defaultValue={status === 'foto' ? (p.image_alt ?? '') : ''}
                          maxLength={200}
                          placeholder={`Ex.: ${p.name} servida no prato`}
                          hint="Descreva a foto (leitores de tela e Google). Vazio = nome do produto."
                        />
                      </ActionForm>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}

import { staffOrNull, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { buildImageBrief, toCsv } from '@/lib/images/prompts';

/** Lista de produção de imagens (um briefing/prompt por produto e por sabor). */
export async function GET() {
  const ctx = await staffOrNull([...PERMISSIONS.catalog]);
  if (!ctx) return new Response('Não autorizado', { status: 403 });
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('products')
    .select('name, slug, description, short_description, image_url, categories(slug, name), option_groups!option_groups_product_id_fkey(kind, deleted_at, option_values(name, description, deleted_at))')
    .is('deleted_at', null)
    .order('name');
  if (error) return new Response('Erro ao gerar a lista', { status: 500 });
  const rows: Record<string, string | null>[] = [];
  for (const p of data ?? []) {
    const cat = p.categories as unknown as { slug: string; name: string } | null;
    const base = buildImageBrief({ name: p.name, slug: p.slug, categorySlug: cat?.slug ?? '', description: p.description ?? p.short_description });
    rows.push({ produto: p.name, categoria: cat?.name ?? '', tem_foto: p.image_url ? 'sim' : 'não', descricao_visual: base.visual, composicao: base.composition, enquadramento: base.framing, iluminacao: base.lighting, fundo: base.background, proporcao: base.aspectRatio, prompt: base.prompt, arquivo: base.fileName });
    const flavors = (p.option_groups ?? []).filter((g) => g.kind === 'flavor' && !g.deleted_at).flatMap((g) => (g.option_values ?? []).filter((v) => !v.deleted_at));
    for (const f of flavors) {
      const b = buildImageBrief({ name: `Pizza ${f.name}`, slug: `${p.slug}-${f.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}`, categorySlug: 'pizzas', description: f.description });
      rows.push({ produto: `${p.name} — sabor ${f.name}`, categoria: cat?.name ?? '', tem_foto: '', descricao_visual: b.visual, composicao: b.composition, enquadramento: b.framing, iluminacao: b.lighting, fundo: b.background, proporcao: b.aspectRatio, prompt: b.prompt, arquivo: b.fileName });
    }
  }
  return new Response(toCsv(rows), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="lista-de-fotos-alcinao.csv"', 'cache-control': 'no-store' },
  });
}

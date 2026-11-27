import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/business';
import { getCatalog } from '@/lib/catalog/queries';
import { MENU_GROUPS } from '@/lib/catalog/groups';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await getCatalog();
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/cardapio`, changeFrequency: 'daily', priority: 0.9 },
    ...MENU_GROUPS.map((g) => ({ url: `${SITE_URL}${g.path}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...data.products.map((p) => ({ url: `${SITE_URL}/produto/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    { url: `${SITE_URL}/privacidade`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/termos`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}

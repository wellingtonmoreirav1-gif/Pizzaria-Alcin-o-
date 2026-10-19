import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { can, getSessionUser, getStaffContext, PERMISSIONS, ROLE_LABEL } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { AdminNav, type NavItem } from '@/components/admin/admin-nav';
import { Skeleton } from '@/components/ui/feedback';

/** Painel é 100% dinâmico (depende da sessão): navegações podem aguardar o servidor. */
export const instant = false;

const ITEMS: (NavItem & { area: keyof typeof PERMISSIONS })[] = [
  { href: '/admin', label: 'Início', icon: 'dashboard', area: 'orders' },
  { href: '/admin/pedidos', label: 'Pedidos', icon: 'orders', area: 'orders' },
  { href: '/admin/operacao', label: 'Operação do dia', icon: 'operation', area: 'operation' },
  { href: '/admin/cardapio', label: 'Cardápio', icon: 'catalog', area: 'catalog' },
  { href: '/admin/categorias', label: 'Categorias', icon: 'categories', area: 'catalog' },
  { href: '/admin/promocoes', label: 'Promoções', icon: 'promotions', area: 'catalog' },
  { href: '/admin/banners', label: 'Banners', icon: 'banners', area: 'banners' },
  { href: '/admin/horarios', label: 'Horários', icon: 'hours', area: 'hours' },
  { href: '/admin/entrega', label: 'Entrega e pagamento', icon: 'delivery', area: 'delivery' },
  { href: '/admin/relatorios', label: 'Relatórios', icon: 'reports', area: 'reports' },
  { href: '/admin/clientes', label: 'Clientes', icon: 'customers', area: 'customers' },
  { href: '/admin/avaliacoes', label: 'Avaliações', icon: 'reviews', area: 'reviews' },
  { href: '/admin/configuracoes', label: 'Configurações', icon: 'settings', area: 'settings' },
  { href: '/admin/equipe', label: 'Equipe', icon: 'team', area: 'team' },
  { href: '/admin/auditoria', label: 'Auditoria', icon: 'audit', area: 'audit' },
];

async function signOut() {
  'use server';
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export default function PanelLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Suspense fallback={<div className="hidden h-screen w-64 bg-ink-950 lg:block" />}>
        <Shell />
      </Suspense>
      <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <Suspense fallback={<Skeleton className="h-96" />}>{children}</Suspense>
      </main>
    </div>
  );
}

async function Shell() {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  const ctx = await getStaffContext();
  if (!ctx) redirect('/admin/sem-permissao');
  const items = ITEMS.filter((i) => can(ctx.role, i.area)).map(({ area: _area, ...rest }) => rest);
  return <AdminNav items={items} userLabel={ctx.user.email ?? ''} roleLabel={ROLE_LABEL[ctx.role]} signOut={signOut} />;
}

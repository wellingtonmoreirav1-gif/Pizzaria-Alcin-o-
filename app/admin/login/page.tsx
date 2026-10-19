import { Suspense } from 'react';
import { AuthForm } from '@/components/account/auth-form';
import { BrandLogo } from '@/components/storefront/brand-logo';

export const metadata = { title: 'Entrar' };

export default function AdminLoginPage({ searchParams }: PageProps<'/admin/login'>) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo logoUrl={null} name="Alcinão" />
        </div>
        <Suspense fallback={null}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
        <p className="text-center text-xs text-muted">
          Acesso restrito à equipe. Novos membros: criem uma conta em /conta e peçam ao administrador para liberar o acesso.
        </p>
      </div>
    </main>
  );
}

async function LoginForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === 'string' && sp.next.startsWith('/admin') && !sp.next.startsWith('//') ? sp.next : '/admin';
  return <AuthForm next={next} allowSignup={false} title="Painel da equipe" />;
}

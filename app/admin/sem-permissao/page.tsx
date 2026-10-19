import Link from 'next/link';

export const metadata = { title: 'Sem permissão' };

export default function NoPermissionPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="font-display text-3xl font-semibold">Acesso não autorizado</h1>
        <p className="text-muted">Sua conta não tem permissão para esta área. Peça a um administrador para liberar o acesso adequado.</p>
        <div className="flex justify-center gap-3">
          <Link href="/admin" className="rounded-xl bg-ink-900 px-4 py-2 font-semibold text-white">Voltar ao painel</Link>
          <Link href="/" className="rounded-xl px-4 py-2 font-semibold">Ir para o site</Link>
        </div>
      </div>
    </main>
  );
}

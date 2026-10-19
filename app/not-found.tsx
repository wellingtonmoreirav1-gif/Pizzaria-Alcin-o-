import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-ink-950 px-4 text-center text-white">
      <div className="space-y-5">
        <p className="font-display text-8xl font-bold italic text-brand-600">404</p>
        <h1 className="font-display text-3xl font-semibold">Essa fatia sumiu do forno.</h1>
        <p className="text-white/70">A página que você procura não existe ou foi movida.</p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="inline-flex h-12 items-center rounded-2xl bg-brand-600 px-6 font-semibold hover:bg-brand-700">Página inicial</Link>
          <Link href="/cardapio" className="inline-flex h-12 items-center rounded-2xl border border-white/25 px-6 font-semibold hover:border-white">Ver cardápio</Link>
        </div>
      </div>
    </main>
  );
}

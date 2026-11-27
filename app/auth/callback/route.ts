import { NextResponse, type NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';

/** Retorno dos links de e-mail do Supabase (confirmação e recuperação de senha). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const nextParam = request.nextUrl.searchParams.get('next') ?? '/conta';
  // Só caminhos deste site: "//x" e "/\x" levariam para outro domínio.
  const target = new URL(nextParam, request.url);
  const next = nextParam.startsWith('/') && target.origin === request.nextUrl.origin ? `${target.pathname}${target.search}` : '/conta';
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL('/conta?erro=link', request.url));
}

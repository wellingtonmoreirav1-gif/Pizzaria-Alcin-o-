import { NextResponse, type NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';

/** Retorno dos links de e-mail do Supabase (confirmação e recuperação de senha). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const nextParam = request.nextUrl.searchParams.get('next') ?? '/conta';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/conta';
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL('/conta?erro=link', request.url));
}

import 'server-only';

/** IP do cliente informado pela hospedagem (Vercel define x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Bloqueia requisições de outros sites (proteção extra contra CSRF).
 * Requisições sem Origin (ex.: ferramentas de linha de comando) só passam se o
 * conteúdo for JSON, o que exige preflight CORS em navegadores.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin) return (request.headers.get('content-type') ?? '').includes('application/json');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(request: Request, maxBytes = 64_000): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('payload_too_large');
  return JSON.parse(text);
}

export function jsonError(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, code, message, ...extra }, { status, headers: { 'cache-control': 'no-store' } });
}

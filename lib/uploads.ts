/**
 * Regras de envio de imagens (usadas no navegador antes do upload e no servidor
 * antes de salvar a URL). O bucket "catalog" também limita tipo e tamanho.
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_FOLDERS = ['products', 'categories', 'banners', 'brand', 'options'] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

/** Confere a "assinatura" do arquivo, não só a extensão. */
export function detectImageType(bytes: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp';
  if (b.length >= 12 && String.fromCharCode(...b.slice(4, 8)) === 'ftyp' && ['avif', 'avis'].includes(String.fromCharCode(...b.slice(8, 12))))
    return 'image/avif';
  return null;
}

export function validateImage(file: { type: string; size: number }, header: Uint8Array): string | null {
  if (file.size > MAX_IMAGE_BYTES) return 'A imagem deve ter no máximo 5 MB.';
  const detected = detectImageType(header);
  if (!detected) return 'Formato não suportado. Envie JPG, PNG, WebP ou AVIF.';
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'Formato não suportado. Envie JPG, PNG, WebP ou AVIF.';
  return null;
}

/** Só aceita URLs do bucket público do próprio projeto (ou caminhos locais /images/...). */
export function isAllowedImageUrl(url: string | null, supabaseUrl: string | undefined): boolean {
  if (url === null || url === '') return true;
  if (/^\/images\/[a-z0-9/_\-.]+$/i.test(url)) return true;
  if (!supabaseUrl) return false;
  try {
    const u = new URL(url);
    const base = new URL(supabaseUrl);
    return u.origin === base.origin && u.pathname.startsWith('/storage/v1/object/public/catalog/');
  } catch {
    return false;
  }
}

export function storagePath(folder: ImageFolder, originalName: string, type: string): string {
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/avif' ? 'avif' : 'jpg';
  const base =
    originalName
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'imagem';
  return `${folder}/${base}-${Date.now().toString(36)}.${ext}`;
}

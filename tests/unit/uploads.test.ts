import { describe, expect, it } from 'vitest';
import { detectImageType, isAllowedImageUrl, storagePath, validateImage } from '@/lib/uploads';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const webp = new Uint8Array(
  [...'RIFF']
    .map((c) => c.charCodeAt(0))
    .concat(
      [0, 0, 0, 0],
      [...'WEBP'].map((c) => c.charCodeAt(0)),
    ),
);
const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('upload de imagens', () => {
  it('detecta o tipo real pelo conteúdo', () => {
    expect(detectImageType(jpeg)).toBe('image/jpeg');
    expect(detectImageType(png)).toBe('image/png');
    expect(detectImageType(webp)).toBe('image/webp');
    expect(detectImageType(exe)).toBeNull();
  });
  it('recusa arquivos grandes, disfarçados ou de tipo não permitido', () => {
    expect(validateImage({ type: 'image/jpeg', size: 1000 }, jpeg)).toBeNull();
    expect(validateImage({ type: 'image/jpeg', size: 6 * 1024 * 1024 }, jpeg)).toMatch(/5 MB/);
    expect(validateImage({ type: 'image/jpeg', size: 1000 }, exe)).toMatch(/Formato/);
    expect(validateImage({ type: 'image/gif', size: 1000 }, jpeg)).toMatch(/Formato/);
  });
  it('aceita somente URLs do bucket do projeto', () => {
    const base = 'https://abc.supabase.co';
    expect(isAllowedImageUrl('https://abc.supabase.co/storage/v1/object/public/catalog/products/x.webp', base)).toBe(true);
    expect(isAllowedImageUrl('https://evil.com/storage/v1/object/public/catalog/x.webp', base)).toBe(false);
    expect(isAllowedImageUrl('https://abc.supabase.co/storage/v1/object/public/outro/x.webp', base)).toBe(false);
    expect(isAllowedImageUrl('/images/products/pizza.webp', base)).toBe(true);
    expect(isAllowedImageUrl('javascript:alert(1)', base)).toBe(false);
    expect(isAllowedImageUrl(null, base)).toBe(true);
  });
  it('gera caminhos seguros', () => {
    expect(storagePath('products', 'Pizza Calabresa (1).JPG', 'image/jpeg')).toMatch(/^products\/pizza-calabresa-1-[a-z0-9]+\.jpg$/);
    expect(storagePath('banners', '../../etc/passwd', 'image/png')).toMatch(/^banners\/[a-z0-9-]+\.png$/);
  });
});

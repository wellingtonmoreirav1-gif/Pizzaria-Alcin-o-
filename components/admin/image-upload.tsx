'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/browser';
import { storagePath, validateImage, type ImageFolder } from '@/lib/uploads';
import { Button } from '@/components/ui/button';

const MAX_SIDE = 1600;

/** Reduz e converte para WebP no navegador (fotos mais leves para o celular). */
async function compress(file: File): Promise<Blob> {
  if (file.type === 'image/avif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 400 * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/webp', 0.85));
}

/**
 * Envio de imagem direto para o Supabase Storage (bucket "catalog") com a sessão
 * do usuário. As políticas do Storage só permitem gerente/administrador.
 * O campo oculto `name` recebe a URL pública para ser salva pelo formulário.
 */
export function ImageUpload({ name, folder, defaultUrl, label = 'Imagem' }: { name: string; folder: ImageFolder; defaultUrl: string | null; label?: string }) {
  const [url, setUrl] = useState(defaultUrl ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setStatus(null);
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const problem = validateImage(file, header);
    if (problem) {
      setStatus(problem);
      return;
    }
    setBusy(true);
    try {
      const blob = await compress(file);
      const type = blob.type || file.type;
      const path = storagePath(folder, file.name, type);
      const supabase = getBrowserClient();
      const { error } = await supabase.storage.from('catalog').upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('catalog').getPublicUrl(path);
      setUrl(data.publicUrl);
      setStatus('Imagem enviada. Clique em Salvar para aplicar.');
    } catch {
      setStatus('Falha no envio. Verifique sua conexão e se o Storage está configurado (veja o README).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-800">{label}</p>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-mist">
          {url ? (
            <Image src={url} alt="Prévia" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-xs text-muted">Sem imagem</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = '';
            }}
            aria-label={`Enviar ${label.toLowerCase()}`}
          />
          <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()}>
            <ImageUp className="size-4" aria-hidden /> {url ? 'Substituir' : 'Enviar'}
          </Button>
          {url ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setUrl('')}>
              <Trash2 className="size-4" aria-hidden /> Remover
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted">JPG, PNG, WebP ou AVIF até 5 MB. Fotos grandes são reduzidas automaticamente.</p>
      {status ? (
        <p className="text-xs font-medium" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

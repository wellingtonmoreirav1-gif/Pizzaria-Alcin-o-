'use client';

import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Abre o WhatsApp com a mensagem pronta. O site NÃO envia a mensagem: o cliente
 * precisa tocar em "Enviar" no WhatsApp. Se não abrir, dá para copiar o texto.
 */
export function WhatsAppActions({
  code,
  token,
  url,
  message,
  phoneDisplay,
  primary = true,
}: {
  code: string;
  token: string | null;
  url: string;
  message: string;
  phoneDisplay: string;
  primary?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showText, setShowText] = useState(false);

  function markOpened() {
    if (!token) return;
    const body = JSON.stringify({ token });
    try {
      const sent = navigator.sendBeacon?.(`/api/orders/${code}/whatsapp`, new Blob([body], { type: 'application/json' }));
      if (!sent) void fetch(`/api/orders/${code}/whatsapp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
    } catch {
      // Falha ao registrar a abertura não impede o cliente de seguir.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShowText(true);
    }
  }

  return (
    <div className="space-y-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={markOpened}
        data-testid="open-whatsapp"
        className={
          primary
            ? 'flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1f8f4e] px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#18733e]'
            : 'inline-flex h-11 items-center gap-2 rounded-2xl bg-[#1f8f4e] px-5 text-sm font-semibold text-white hover:bg-[#18733e]'
        }
      >
        <MessageCircle className="size-5" aria-hidden /> Abrir WhatsApp com o pedido
      </a>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copy} data-testid="copy-message">
          <Copy className="size-4" aria-hidden /> {copied ? 'Mensagem copiada!' : 'Copiar mensagem'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowText((v) => !v)} aria-expanded={showText}>
          {showText ? 'Ocultar mensagem' : 'Ver mensagem'}
        </Button>
      </div>
      <p className="text-xs text-muted">
        O WhatsApp não abriu? Copie a mensagem e envie para {phoneDisplay}. Seu pedido já está registrado com o código <strong>#{code}</strong>.
      </p>
      {showText ? (
        <textarea
          readOnly
          value={message}
          className="h-64 w-full rounded-xl border border-line bg-mist p-3 font-mono text-xs"
          aria-label="Mensagem do pedido"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MessageCircle, RotateCcw, ShoppingBag, Square, X } from 'lucide-react';
import type { CatalogProduct } from '@/types/catalog';
import { formatBRL, type Cents } from '@/lib/money';
import { canBeHalved, flavorName, isProductOrderable, priceLine } from '@/lib/pricing';
import { parseVoiceOrder, type VoiceItem } from '@/lib/voice/parse-order';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { buttonClasses } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/ui/quantity';
import { useToast } from '@/components/ui/toast';
import { useCart } from '@/components/cart/cart-context';
import { useProductDialog } from './product-dialog';

/** Reconhecimento de voz do navegador (Chrome/Android: SpeechRecognition; Safari/iPhone: webkit). */
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;
const recognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

type Phase = 'idle' | 'listening' | 'result' | 'error';

/**
 * "Pedir por áudio": o cliente fala o pedido, o site mostra o que entendeu (produto,
 * tamanho, quantidade, preço) e só adiciona ao carrinho quando ele confirmar.
 * Onde o navegador não reconhece voz, oferece mandar o áudio pelo WhatsApp.
 */
export function VoiceOrderButton({
  products,
  whatsappNumber,
  className,
}: {
  products: CatalogProduct[];
  whatsappNumber: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} data-testid="voice-order">
        <Mic className="size-5" aria-hidden /> Pedir por áudio
      </button>
      {open ? <VoiceOrderDialog products={products} whatsappNumber={whatsappNumber} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function VoiceOrderDialog({
  products,
  whatsappNumber,
  onClose,
}: {
  products: CatalogProduct[];
  whatsappNumber: string;
  onClose: () => void;
}) {
  const dialog = useProductDialog();
  const cart = useCart();
  const toast = useToast();
  const recRef = useRef<Recognition | null>(null);
  // A janela só abre depois de um toque (nunca no servidor): dá para checar o navegador já aqui.
  const [supported] = useState(() => recognitionCtor() !== null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [items, setItems] = useState<VoiceItem[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Só procura entre os produtos que dá para pedir agora (com preço e disponíveis).
  const orderable = products.filter((p) => isProductOrderable(p, new Date()));
  const byId = new Map(products.map((p) => [p.id, p]));

  useEffect(() => () => recRef.current?.abort(), []);

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let text = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) text += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      setTranscript((text + interim).trim());
    };
    rec.onerror = (e) => {
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'O microfone não foi liberado. Toque no cadeado do navegador e permita o microfone, ou mande o áudio pelo WhatsApp.'
          : e.error === 'no-speech'
            ? 'Não ouvimos nada. Toque no microfone e fale perto do celular.'
            : 'Não deu para ouvir agora. Tente de novo ou mande o áudio pelo WhatsApp.',
      );
      setPhase('error');
    };
    rec.onend = () => {
      recRef.current = null;
      const said = text.trim();
      if (!said) {
        setPhase((p) => (p === 'error' ? p : 'idle'));
        return;
      }
      const parsed = parseVoiceOrder(said, orderable);
      setTranscript(said);
      setItems(parsed.items);
      setUnmatched(parsed.unmatched);
      setPhase('result');
    };
    recRef.current = rec;
    setTranscript('');
    setError(null);
    setPhase('listening');
    rec.start();
  }

  const priceOf = (it: VoiceItem): Cents | null => {
    const p = byId.get(it.productId);
    if (!p || (it.needsSize && !it.variantId)) return null;
    const half = it.halfProductId ? byId.get(it.halfProductId) : undefined;
    const selection = { productId: p.id, variantId: it.variantId, options: {}, quantity: it.quantity, halfProductId: it.halfProductId };
    const r = priceLine(p, selection, { now: new Date(), openShifts: null }, half);
    return r.ok ? r.line.lineTotal : null;
  };
  const ready = items.length > 0 && items.every((it) => it.variantId || !it.needsSize);
  const total = items.reduce((sum, it) => sum + (priceOf(it) ?? 0), 0) as Cents;

  function addAll() {
    let n = 0;
    for (const it of items) {
      const p = byId.get(it.productId);
      const half = it.halfProductId ? byId.get(it.halfProductId) : null;
      if (p && dialog.addDirect(p, it.variantId, it.quantity, { silent: true, suggest: false, half })) n += it.quantity;
    }
    if (n) {
      toast(`${n} ${n === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho`);
      onClose();
      cart.setDrawerOpen(true);
    }
  }

  const whatsapp = buildWhatsAppUrl(whatsappNumber, 'Olá! Vou mandar meu pedido por áudio.');

  return (
    <Dialog open onClose={onClose} title="Pedir por áudio" description="Fale o seu pedido. Você confere antes de ir para o carrinho." side="bottom">
      <div className="space-y-5 pb-2" data-testid="voice-dialog">
        {supported === false ? (
          <div className="space-y-4">
            <p className="text-lg">Este navegador não permite pedido por voz. Você pode mandar o áudio direto para a equipe no WhatsApp:</p>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClasses('whatsapp', 'lg', 'w-full')}>
              <MessageCircle className="size-5" aria-hidden /> Mandar áudio no WhatsApp
            </a>
          </div>
        ) : null}

        {supported && phase !== 'result' ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <button
              type="button"
              onClick={() => (phase === 'listening' ? recRef.current?.stop() : start())}
              className={cn(
                'grid size-28 place-items-center rounded-full text-white shadow-[var(--shadow-float)] transition-transform active:scale-95',
                phase === 'listening' ? 'bg-brand-700 ring-8 ring-brand-500/30 motion-safe:animate-pulse' : 'bg-brand-600',
              )}
              aria-label={phase === 'listening' ? 'Parar de gravar' : 'Começar a falar'}
            >
              {phase === 'listening' ? <Square className="size-10 fill-current" aria-hidden /> : <Mic className="size-12" aria-hidden />}
            </button>
            <p className="text-xl font-semibold" aria-live="polite">
              {phase === 'listening' ? 'Ouvindo… pode falar' : 'Toque no microfone e fale'}
            </p>
            {transcript ? <p className="text-lg text-muted">“{transcript}”</p> : null}
            {phase !== 'listening' ? (
              <p className="text-base text-muted">
                Exemplo: <span className="italic text-gold">“uma pizza grande de calabresa e uma coca lata”</span>
              </p>
            ) : null}
            {error ? <p className="rounded-xl bg-brand-50 p-3 text-base text-fg">{error}</p> : null}
          </div>
        ) : null}

        {phase === 'result' ? (
          <div className="space-y-4">
            <p className="text-base text-muted">
              Você disse: <span className="text-fg">“{transcript}”</span>
            </p>
            {items.length ? (
              <ul className="space-y-3" data-testid="voice-items">
                {items.map((it, k) => {
                  const p = byId.get(it.productId)!;
                  const half = it.halfProductId ? byId.get(it.halfProductId) : undefined;
                  const name = half ? `Pizza ½ ${flavorName(p.name)} + ½ ${flavorName(half.name)}` : p.name;
                  // Metade/metade: só os tamanhos G, GG e F que os dois sabores têm.
                  const sizes = p.variants.filter(
                    (v) => v.isAvailable && (!half || (canBeHalved(p, v) && half.variants.some((h) => h.sizeCode === v.sizeCode && h.isAvailable))),
                  );
                  const price = priceOf(it);
                  const update = (patch: Partial<VoiceItem>) => setItems((list) => list.map((x, j) => (j === k ? { ...x, ...patch } : x)));
                  return (
                    <li key={`${it.productId}-${k}`} className="rounded-2xl bg-mist p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-xl font-semibold leading-tight">{name}</p>
                        <button type="button" onClick={() => setItems((list) => list.filter((_, j) => j !== k))} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-line" aria-label={`Tirar ${name}`}>
                          <X className="size-5" aria-hidden />
                        </button>
                      </div>
                      {p.variants.length > 1 ? (
                        <div className="mt-3">
                          {it.needsSize && !it.variantId ? <p className="mb-2 text-sm font-semibold text-gold">Qual tamanho?</p> : null}
                          <div className="flex flex-wrap gap-2" role="group" aria-label={`Tamanho de ${name}`}>
                            {sizes.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => update({ variantId: v.id, needsSize: false })}
                                aria-pressed={it.variantId === v.id}
                                className={cn('h-11 rounded-full px-4 text-sm font-semibold', it.variantId === v.id ? 'bg-gold text-ink-950' : 'bg-surface ring-1 ring-line')}
                              >
                                {v.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <QuantityStepper value={it.quantity} onChange={(q) => update({ quantity: q })} max={p.maxQuantity} />
                        {price != null ? <p className="text-lg font-bold tabular-nums text-gold">{formatBRL(price)}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl bg-mist p-4 text-lg">Não encontramos itens do cardápio nesse áudio. Tente de novo falando o nome do produto, por exemplo “pizza de calabresa grande”.</p>
            )}
            {unmatched.length ? (
              <p className="text-base text-muted" data-testid="voice-unmatched">
                Não entendemos: <span className="text-fg">{unmatched.map((u) => `“${u}”`).join(', ')}</span>. Se faltou algo, fale de novo ou escolha no cardápio.
              </p>
            ) : null}
            <div className="grid gap-3">
              <button
                type="button"
                onClick={addAll}
                disabled={!ready}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-[var(--shadow-float)] hover:bg-brand-700 disabled:opacity-50"
              >
                <ShoppingBag className="size-6" aria-hidden /> Adicionar ao carrinho{total ? ` · ${formatBRL(total)}` : ''}
              </button>
              <button type="button" onClick={start} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-mist text-base font-semibold hover:bg-line">
                <RotateCcw className="size-5" aria-hidden /> Falar de novo
              </button>
            </div>
          </div>
        ) : null}

        {supported ? (
          <p className="text-xs text-muted">
            O áudio é transformado em texto pelo próprio navegador (Google ou Apple). Nada vai para o carrinho sem você confirmar. Prefere falar com a equipe?{' '}
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold underline underline-offset-2">
              Mandar áudio no WhatsApp
            </a>
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

'use client';

import Image from 'next/image';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/** Sequência de quadros da pizza desmontando (gerada de um vídeo de 8 s; ver docs/LOGO-E-IMAGENS.md). */
const FRAME_COUNT = 64;
const frameSrc = (i: number) => `/hero/pizza/${String(i + 1).padStart(3, '0')}.webp`;

/**
 * Etapas da rolagem: 0 = apresentação; 1..n = legendas; a última = convite final.
 * O limite de cada etapa é o progresso (0–1) em que ela começa.
 */
const STAGE_STARTS = [0, 0.25, 0.5, 0.78];
const stageOf = (p: number) => STAGE_STARTS.reduce((stage, start, i) => (p >= start ? i : stage), 0);
/** Quadros-chave (um a cada 8) carregam logo; os demais, quando a pessoa começa a rolar. */
const KEY_STEP = 8;
const PARALLEL = 6;

// Visível só na etapa indicada; invisível sai da ordem do Tab e do leitor de tela.
const LAYER = 'invisible opacity-0 translate-y-3 transition-[opacity,translate,visibility] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]';
const SHOW: Record<number, string> = {
  1: 'group-data-[stage="1"]/hero:visible group-data-[stage="1"]/hero:opacity-100 group-data-[stage="1"]/hero:translate-y-0',
  2: 'group-data-[stage="2"]/hero:visible group-data-[stage="2"]/hero:opacity-100 group-data-[stage="2"]/hero:translate-y-0',
  3: 'group-data-[stage="3"]/hero:visible group-data-[stage="3"]/hero:opacity-100 group-data-[stage="3"]/hero:translate-y-0',
};
const SHOW_PINNED =
  'group-data-[stage="1"]/hero:visible group-data-[stage="1"]/hero:opacity-100 group-data-[stage="1"]/hero:translate-y-0 group-data-[stage="2"]/hero:visible group-data-[stage="2"]/hero:opacity-100 group-data-[stage="2"]/hero:translate-y-0';
// No celular, sobe acima da barra do carrinho quando ela aparece.
const ABOVE_CART = 'max-sm:[body:has([data-mobile-cart-bar])_&]:pb-24';

/**
 * Primeira dobra animada: conforme a pessoa rola a página, a pizza "desmonta" quadro a
 * quadro (canvas fixo dentro de uma seção alta), com legendas e um botão de pedido sempre
 * à mão; no fim, um convite para escolher a pizza. Rolando para cima, ela monta de novo.
 * Quem pede menos movimento no sistema, ou economia de dados, vê só a imagem parada e a
 * apresentação, numa seção da altura da tela.
 */
export function HeroScroll({
  children,
  captions,
  pinned,
  outro,
}: {
  children: ReactNode;
  captions: ReactNode[];
  pinned: ReactNode;
  outro: ReactNode;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!stage || !box || !canvas || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduce || saveData) {
      stage.dataset.static = 'true';
      return;
    }

    const frames: (HTMLImageElement | null)[] = Array.from({ length: FRAME_COUNT }, () => null);
    let current = -1;
    let raf = 0;
    let cancelled = false;

    // A animação fica abaixo do cabeçalho fixo: mede a altura real dele.
    let headerH = 0;
    const measureHeader = () => {
      headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      stage.style.setProperty('--header-h', `${Math.round(headerH)}px`);
    };

    const progress = () => {
      const rect = stage.getBoundingClientRect();
      const total = stage.offsetHeight - (window.innerHeight - headerH);
      return total > 0 ? Math.min(1, Math.max(0, (headerH - rect.top) / total)) : 0;
    };

    /** Quadro mais próximo do desejado entre os que já carregaram. */
    const nearestLoaded = (target: number) => {
      for (let d = 0; d < FRAME_COUNT; d++) {
        if (frames[target - d]) return target - d;
        if (frames[target + d]) return target + d;
      }
      return -1;
    };

    const draw = (index: number) => {
      const img = frames[index];
      if (!img) return;
      const w = canvas.width;
      const h = canvas.height;
      // "cover": preenche a área mantendo a proporção do vídeo.
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      current = index;
    };

    const update = () => {
      raf = 0;
      const p = progress();
      stage.style.setProperty('--p', p.toFixed(4));
      const now = stageOf(p);
      stage.dataset.stage = String(now);
      stage.dataset.past = now > 0 ? 'true' : 'false';
      const index = nearestLoaded(Math.round(p * (FRAME_COUNT - 1)));
      if (index >= 0 && index !== current) draw(index);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const resize = () => {
      measureHeader();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(box.clientWidth * dpr);
      canvas.height = Math.round(box.clientHeight * dpr);
      current = -1;
      schedule();
    };

    const loadFrame = async (i: number) => {
      if (cancelled || frames[i]) return;
      const img = new window.Image();
      img.decoding = 'async';
      img.src = frameSrc(i);
      try {
        await img.decode();
      } catch {
        return;
      }
      frames[i] = img;
      if (i === 0) stage.dataset.ready = 'true';
      schedule();
    };
    const loadAll = async (list: number[]) => {
      const queue = [...list];
      const worker = async () => {
        while (!cancelled && queue.length) await loadFrame(queue.shift()!);
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
    };
    // Primeiro quadro (já pré-carregado pela página) e os quadros-chave: a animação já
    // responde à rolagem. Os intermediários só quando a pessoa começa a rolar.
    const keyFrames = [...Array(FRAME_COUNT).keys()].filter((i) => i % KEY_STEP === 0 || i === FRAME_COUNT - 1);
    const rest = [...Array(FRAME_COUNT).keys()].filter((i) => !keyFrames.includes(i));
    let restStarted = false;
    const startRest = () => {
      if (restStarted) return;
      restStarted = true;
      window.removeEventListener('scroll', startRest);
      void loadAll(rest);
    };
    void loadAll(keyFrames);
    window.addEventListener('scroll', startRest, { passive: true });

    resize();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('scroll', startRest);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      aria-label="Apresentação"
      className="group/hero relative h-auto bg-wine-900 text-white [--header-h:114px] sm:[--header-h:73px] motion-safe:h-[220svh] motion-safe:lg:h-[280vh] data-[static=true]:h-auto!"
      style={{ '--p': 0 } as CSSProperties}
      data-testid="hero"
    >
      <div className="bg-wine sticky top-[var(--header-h)] h-[calc(100svh-var(--header-h))] overflow-hidden lg:[background-image:radial-gradient(ellipse_40%_75%_at_76%_52%,var(--color-wine-500)_0%,var(--color-wine-700)_50%,var(--color-wine-900)_100%)]">
        {/* Área da pizza: tela inteira no celular; coluna à direita no computador. */}
        <div
          ref={boxRef}
          className="absolute inset-0 lg:inset-y-0 lg:left-auto lg:right-[6%] lg:aspect-[9/16] lg:h-full lg:w-auto lg:[mask-image:radial-gradient(closest-side,black_74%,transparent_100%)]"
          aria-hidden
        >
          <Image src={frameSrc(0)} alt="" fill preload unoptimized sizes="100vw" className="object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 size-full opacity-0 transition-opacity duration-300 group-data-[ready=true]/hero:opacity-100" />
        </div>
        {/* Sombra para o texto ficar legível sobre a imagem. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-[#260304]/90 to-transparent lg:hidden" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#260304]/95 to-transparent lg:hidden" aria-hidden />
        {/* No convite final o texto fica sobre a pizza: escurece mais a parte de baixo. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#260304] via-[#260304]/80 to-transparent opacity-0 transition-opacity duration-500 group-data-[stage='3']/hero:opacity-100 lg:hidden"
          aria-hidden
        />

        <div
          className={`relative mx-auto grid h-full max-w-7xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 *:[grid-area:1/1] sm:px-6 lg:pt-0 ${ABOVE_CART}`}
        >
          {/* Apresentação: some no começo da rolagem (e deixa de receber foco). */}
          <div
            className="flex h-full flex-col transition-[opacity,translate,visibility] duration-75 group-data-[past=true]/hero:invisible lg:justify-center"
            style={{ opacity: 'calc(1 - var(--p) * 3.2)', translate: '0 calc(var(--p) * -80px)' }}
          >
            {children}
          </div>

          {/* Legendas que acompanham a pizza desmontando. */}
          {captions.map((caption, i) => (
            <div key={i} className={`${LAYER} ${SHOW[i + 1]} self-start lg:self-center`}>
              {caption}
            </div>
          ))}

          {/* Pedido sempre à mão durante a animação. */}
          <div className={`${LAYER} ${SHOW_PINNED} self-end`}>{pinned}</div>

          {/* Convite final. */}
          <div className={`${LAYER} ${SHOW[STAGE_STARTS.length - 1]} self-end lg:self-center`}>{outro}</div>
        </div>
      </div>
    </section>
  );
}

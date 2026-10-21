'use client';

import Image from 'next/image';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/** Sequência de quadros da pizza desmontando (gerada de um vídeo de 8 s; ver docs/LOGO-E-IMAGENS.md). */
const FRAME_COUNT = 64;
const frameSrc = (i: number) => `/hero/pizza/${String(i + 1).padStart(3, '0')}.webp`;

/**
 * Primeira dobra animada: conforme a pessoa rola a página, a pizza "desmonta" quadro a
 * quadro (canvas fixo dentro de uma seção alta). Rolando para cima, ela monta de novo.
 * Quem pede menos movimento no sistema, ou economia de dados, vê só a imagem parada.
 */
export function HeroScroll({ children }: { children: ReactNode }) {
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
    if (reduce || saveData) return;

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
      stage.dataset.past = p > 0.3 ? 'true' : 'false';
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

    // Carrega os quadros depois da primeira pintura: primeiro um a cada 8 (a animação
    // já responde à rolagem), depois os intermediários.
    const order = [...Array(FRAME_COUNT).keys()].sort((a, b) => (a % 8 === 0 ? 0 : 1) - (b % 8 === 0 ? 0 : 1) || a - b);
    const load = async () => {
      for (const i of order) {
        if (cancelled) return;
        const img = new window.Image();
        img.decoding = 'async';
        img.src = frameSrc(i);
        try {
          await img.decode();
        } catch {
          continue;
        }
        frames[i] = img;
        if (i === 0) stage.dataset.ready = 'true';
        schedule();
      }
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(() => void load());

    resize();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      aria-label="Apresentação"
      className="group/hero relative h-[260svh] bg-[#380507] text-white [--header-h:114px] motion-reduce:h-auto sm:[--header-h:73px] lg:h-[300vh]"
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
          <Image src={frameSrc(0)} alt="" fill priority unoptimized sizes="100vw" className="object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 size-full opacity-0 transition-opacity duration-300 group-data-[ready=true]/hero:opacity-100" />
        </div>
        {/* Sombra para o texto ficar legível sobre a imagem. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-[#260304]/90 to-transparent lg:hidden" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[#260304]/90 to-transparent lg:hidden" aria-hidden />
        <div
          className="relative mx-auto flex h-full max-w-7xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 transition-[opacity,transform] duration-75 group-data-[past=true]/hero:pointer-events-none sm:px-6 lg:justify-center lg:pt-0"
          style={{ opacity: 'calc(1 - var(--p) * 3.2)', transform: 'translateY(calc(var(--p) * -80px))' }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Primeira dobra: fundo preto texturizado (arte do restaurante, sem o anel dourado), por
 * baixo do cabeçalho transparente. Mede a altura do cabeçalho e avisa quando o topo já
 * passou (o cabeçalho volta ao normal). Ver docs/LOGO-E-IMAGENS.md.
 */
export function HeroCover({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let headerH = 0;
    const measureHeader = () => {
      headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      stage.style.setProperty('--header-h', `${Math.round(headerH)}px`);
    };
    const markDone = () => {
      const done = stage.getBoundingClientRect().bottom <= headerH + 1;
      if ((stage.dataset.done === 'true') !== done) stage.dataset.done = String(done);
    };
    measureHeader();
    markDone();
    // Página pronta para tocar (os testes esperam por isto antes de clicar).
    stage.dataset.ready = 'true';
    window.addEventListener('scroll', markDone, { passive: true });
    window.addEventListener('resize', measureHeader);
    return () => {
      window.removeEventListener('scroll', markDone);
      window.removeEventListener('resize', measureHeader);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      aria-label="Apresentação"
      data-hero
      className="relative -mt-[var(--header-h)] overflow-hidden bg-[#0b0b0b] text-white [--header-h:114px] sm:[--header-h:73px]"
      data-testid="hero"
    >
      <div className="absolute inset-0 bg-[url(/hero/fundo-preto.webp)] bg-cover bg-center" aria-hidden />
      {/* Escurece as bordas, como na arte original. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_50%_45%,transparent_35%,rgba(0,0,0,0.65)_100%)]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pt-[calc(var(--header-h)+1rem)] sm:px-6 lg:flex lg:min-h-[min(var(--app-h-stable),54rem)] lg:flex-col lg:justify-end lg:pt-[var(--header-h)]">
        {children}
      </div>
    </section>
  );
}

'use client';

import Image from 'next/image';
import { useEffect, useRef, type ReactNode } from 'react';

/** Vídeo da pizza desmontando (8 s, do restaurante), sem som, em loop. Ver docs/LOGO-E-IMAGENS.md. */
const POSTER = '/hero/pizza/001.webp';
const LOOP = { webm: '/hero/pizza-loop.webm', mp4: '/hero/pizza-loop.mp4' };

/**
 * Primeira dobra: a pizza desmonta sozinha, em loop (como um GIF, mas leve e sem travar),
 * por baixo do cabeçalho transparente. A primeira imagem aparece na hora; o vídeo entra
 * por cima quando começa a tocar. Quem pede menos movimento ou economia de dados vê só a
 * imagem parada.
 */
export function HeroLoop({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) return;

    // O topo fica por baixo do cabeçalho (transparente enquanto o topo está na tela):
    // mede a altura real dele e avisa quando o topo já passou (cabeçalho volta ao normal).
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
    window.addEventListener('scroll', markDone, { passive: true });
    window.addEventListener('resize', measureHeader);
    const cleanup = () => {
      window.removeEventListener('scroll', markDone);
      window.removeEventListener('resize', measureHeader);
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduce || saveData) {
      stage.dataset.static = 'true';
      return cleanup;
    }

    // Só baixa o vídeo depois que a página abriu (a imagem parada já está na tela).
    const onPlaying = () => (stage.dataset.ready = 'true');
    video.addEventListener('playing', onPlaying);
    video.preload = 'auto';
    video.load();
    video.play().catch(() => {});

    // Fora da tela, pausa (economiza bateria); de volta, continua.
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    io.observe(stage);

    return () => {
      cleanup();
      io.disconnect();
      video.removeEventListener('playing', onPlaying);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      aria-label="Apresentação"
      data-hero
      className="group/hero relative -mt-[var(--header-h)] h-svh overflow-hidden bg-wine-900 text-white [--header-h:114px] sm:[--header-h:73px]"
      data-testid="hero"
    >
      <div className="bg-wine absolute inset-0 lg:[background-image:radial-gradient(ellipse_48%_80%_at_63%_52%,var(--color-wine-500)_0%,var(--color-wine-700)_50%,var(--color-wine-900)_100%)]">
        {/* Área da pizza: tela inteira no celular; no computador, grande e levemente à direita. */}
        <div
          className="absolute inset-0 lg:inset-auto lg:left-[40%] lg:top-1/2 lg:aspect-[9/16] lg:h-[145%] lg:w-auto lg:-translate-y-1/2 lg:[mask-image:radial-gradient(closest-side,black_70%,transparent_100%)]"
          aria-hidden
        >
          <Image src={POSTER} alt="" fill loading="eager" fetchPriority="high" unoptimized sizes="100vw" className="object-cover" />
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-data-[ready=true]/hero:opacity-100"
          >
            <source src={LOOP.webm} type="video/webm" />
            <source src={LOOP.mp4} type="video/mp4" />
          </video>
        </div>
        {/* Sombra para o texto ficar legível sobre a imagem. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-[#260304]/90 via-[#260304]/45 to-transparent lg:hidden" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#260304]/95 to-transparent lg:hidden" aria-hidden />
      </div>

      <div className="relative mx-auto flex h-full max-w-7xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(var(--header-h)+1.25rem)] sm:px-6 lg:justify-center lg:pb-10 max-sm:[body:has([data-mobile-cart-bar])_&]:pb-24">
        {children}
      </div>
    </section>
  );
}

'use client';

import Image from 'next/image';
import { useEffect, useRef, type ReactNode } from 'react';

/** Vídeo da pizza desmontando (8 s, do restaurante), sem som, em loop. Ver docs/LOGO-E-IMAGENS.md. */
const POSTER = '/hero/pizza/001.webp';
const LOOP = { webm: '/hero/pizza-loop.webm', mp4: '/hero/pizza-loop.mp4' };

/**
 * Primeira dobra: a pizza desmonta sozinha, em loop (como um GIF, mas leve e sem travar),
 * por baixo do cabeçalho transparente. No celular a pizza fica em cima e o letreiro embaixo;
 * no computador, a pizza à direita e o letreiro à esquerda. A primeira imagem aparece na hora; o vídeo entra
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
      className="group/hero relative -mt-[var(--header-h)] overflow-hidden bg-wine-900 text-white [--header-h:114px] sm:[--header-h:73px] lg:h-[var(--app-h-stable)]"
      data-testid="hero"
    >
      <div
        className="bg-wine absolute inset-0 lg:[background-image:radial-gradient(ellipse_45%_80%_at_74%_52%,var(--color-wine-500)_0%,var(--color-wine-700)_50%,var(--color-wine-900)_100%)]"
        aria-hidden
      />
      {/* Pizza em destaque: no celular, em cima e sem nada por cima; no computador, grande à direita. */}
      <div
        className="relative mt-[var(--header-h)] h-[calc(var(--app-h-stable)*0.58)] w-full [mask-image:linear-gradient(to_bottom,black_80%,transparent)] lg:absolute lg:mt-0 lg:right-[-1%] lg:top-1/2 lg:aspect-[9/16] lg:h-[145%] lg:w-auto lg:-translate-y-1/2 lg:[mask-image:radial-gradient(closest-side,black_70%,transparent_100%)]"
        aria-hidden
      >
        <Image
          src={POSTER}
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          unoptimized
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-[center_32%] lg:object-center"
        />
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          className="absolute inset-0 size-full object-cover object-[center_32%] opacity-0 lg:object-center transition-opacity duration-500 group-data-[ready=true]/hero:opacity-100"
        >
          <source src={LOOP.webm} type="video/webm" />
          <source src={LOOP.mp4} type="video/mp4" />
        </video>
      </div>

      {/* Texto: no celular, logo abaixo da pizza, sobre o fundo vermelho; no computador, à esquerda. */}
      <div className="relative mx-auto -mt-10 flex max-w-7xl flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 lg:mt-0 lg:h-full lg:justify-center lg:pb-10 lg:pt-[var(--header-h)] max-sm:[body:has([data-mobile-cart-bar])_&]:pb-24">
        {children}
      </div>
    </section>
  );
}

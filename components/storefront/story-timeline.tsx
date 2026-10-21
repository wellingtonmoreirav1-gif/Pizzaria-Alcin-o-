'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const INSTAGRAM = { handle: 'pizzariaalcinao', url: 'https://www.instagram.com/pizzariaalcinao/' };

/** Vídeos do Instagram do restaurante (comprimidos em public/historia; ver docs/LOGO-E-IMAGENS.md). */
const TRAGEDY_VIDEO = { src: '/historia/video-1.mp4', cover: '/historia/capa-das-cinzas.webp' };
const CAROUSEL_VIDEOS = [
  { src: '/historia/video-2.mp4', poster: '/historia/video-2.webp', label: 'Parmegiana servida à mesa' },
  { src: '/historia/video-3.mp4', poster: '/historia/video-3.webp', label: 'Churrasco e o salão cheio' },
  { src: '/historia/video-4.mp4', poster: '/historia/video-4.webp', label: 'O Alcinão e o buffet' },
];

/**
 * A história da Alcinão em uma linha do tempo que desce com a rolagem: o começo, a
 * tragédia (vídeo com capa), os vídeos da nova casa num carrossel 3D e o Instagram.
 */
export function StoryTimeline() {
  const listRef = useRef<HTMLOListElement>(null);

  // A linha dourada vai se preenchendo conforme a pessoa desce; cada etapa aparece ao chegar nela.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      list.style.setProperty('--fill', '1');
      return;
    }
    list.dataset.anim = 'ready';
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = list.getBoundingClientRect();
      const mid = window.innerHeight * 0.6;
      const fill = Math.min(1, Math.max(0, (mid - rect.top) / rect.height));
      list.style.setProperty('--fill', fill.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) (e.target as HTMLElement).dataset.visible = 'true';
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    list.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => io.observe(el));
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section id="historia" aria-labelledby="historia-titulo" className="relative overflow-hidden bg-[#0b0a09] py-16 text-white sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-4xl">
        <h2 id="historia-titulo" className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Nossa <span className="italic text-gold">história</span>
        </h2>

        <ol ref={listRef} className="group/story relative mt-12 [--fill:0]">
          {/* Linha do tempo */}
          <div className="absolute bottom-0 left-[0.6875rem] top-2 w-0.5 rounded-full bg-white/10" aria-hidden>
            <div className="h-full origin-top rounded-full bg-gradient-to-b from-gold via-gold to-brand-600" style={{ transform: 'scaleY(var(--fill))' }} />
          </div>

          <Step>
            <p className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              No início, a Alcinão era um <span className="italic text-gold">restaurante de sucesso.</span>
            </p>
          </Step>

          <Step>
            <p className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Até que uma <span className="italic text-brand-500">tragédia</span> aconteceu…
            </p>
            <CoverVideo />
          </Step>

          <Step>
            <p className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Então nos <span className="italic text-gold">reerguemos.</span>
            </p>
            {/* O carrossel usa a largura toda (inclusive a da linha do tempo). */}
            <div className="-ml-12 mt-8 sm:-ml-16">
              <VideoCarousel />
            </div>
          </Step>

          <Step last>
            <a
              href={INSTAGRAM.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('primary', 'lg', 'shadow-[var(--shadow-float)]')}
            >
              <InstagramGlyph className="size-5" /> Seguir @{INSTAGRAM.handle} no Instagram
            </a>
          </Step>
        </ol>
      </div>
    </section>
  );
}

function Step({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <li
      data-step
      className={cn(
        'relative pl-12 transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:pl-16',
        // Escondida até entrar na tela (só quando a animação está ativa).
        'group-data-[anim=ready]/story:translate-y-6 group-data-[anim=ready]/story:opacity-0 data-[visible=true]:translate-y-0! data-[visible=true]:opacity-100!',
        last ? 'pb-2' : 'pb-16 sm:pb-20',
      )}
    >
      <span className="absolute left-0 top-2 grid size-6 place-items-center rounded-full bg-[#0b0a09] ring-2 ring-gold" aria-hidden>
        <span className="size-2.5 rounded-full bg-gold" />
      </span>
      <div>{children}</div>
    </li>
  );
}

/** Vídeo da tragédia com a capa por cima; ao tocar, a capa some e o vídeo começa. */
function CoverVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative mt-6 aspect-[3/4] w-full max-w-sm overflow-hidden lg:max-w-md rounded-[var(--radius-card)] bg-black shadow-[var(--shadow-float)] ring-1 ring-white/10">
      <video
        ref={ref}
        src={TRAGEDY_VIDEO.src}
        preload="none"
        playsInline
        controls={playing}
        className="absolute inset-0 size-full object-contain"
        aria-label="Vídeo: das cinzas à inauguração"
      />
      {!playing ? (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            ref.current?.play().catch(() => setPlaying(false));
          }}
          className="group/cover absolute inset-0"
          aria-label="Assistir ao vídeo: Das cinzas à inauguração"
        >
          <Image src={TRAGEDY_VIDEO.cover} alt="" fill sizes="384px" className="object-cover" />
          {/* No canto, para não cobrir o rosto nem o título da capa. */}
          <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-brand-600 py-2 pl-3 pr-4 text-sm font-semibold text-white shadow-[var(--shadow-float)] ring-2 ring-white/20 transition-transform group-hover/cover:scale-105">
            <Play className="size-4 fill-current" aria-hidden /> Assistir
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** Carrossel 3D: o vídeo do meio fica de frente; os dos lados, girados para trás. */
function VideoCarousel() {
  const [active, setActive] = useState(0);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const touchX = useRef<number | null>(null);
  const n = CAROUSEL_VIDEOS.length;
  const go = (i: number) => {
    const next = (i + n) % n;
    videos.current.forEach((v, k) => k !== next && v?.pause());
    setActive(next);
  };

  return (
    <div role="region" aria-roledescription="carrossel" aria-label="Vídeos da Alcinão" className="relative">
      <div
        className="relative mx-auto h-[26rem] [perspective:1200px] sm:h-[30rem]"
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null || Math.abs(end - start) < 40) return;
          go(active + (end < start ? 1 : -1));
        }}
      >
        {CAROUSEL_VIDEOS.map((v, i) => {
          // Posição relativa ao vídeo ativo: -1 (esquerda), 0 (frente), 1 (direita).
          let offset = i - active;
          if (offset > n / 2) offset -= n;
          if (offset < -n / 2) offset += n;
          const front = offset === 0;
          return (
            <div
              key={v.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${n}: ${v.label}`}
              className="absolute left-1/2 top-0 aspect-[9/16] h-full transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{
                transform: `translateX(calc(-50% + ${offset * 68}%)) rotateY(${offset * -38}deg) scale(${front ? 1 : 0.8})`,
                zIndex: front ? 2 : 1,
                filter: front ? 'none' : 'brightness(0.55)',
              }}
            >
              <video
                ref={(el) => {
                  videos.current[i] = el;
                }}
                src={v.src}
                poster={v.poster}
                preload="none"
                playsInline
                controls={front}
                tabIndex={front ? 0 : -1}
                className="size-full rounded-[var(--radius-card)] bg-black object-cover shadow-[var(--shadow-float)] ring-1 ring-white/10"
                aria-label={v.label}
              />
              {!front ? (
                <button type="button" onClick={() => go(i)} className="absolute inset-0 rounded-[var(--radius-card)]" aria-label={`Ver vídeo: ${v.label}`} />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-center justify-center gap-4">
        <button type="button" onClick={() => go(active - 1)} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Vídeo anterior">
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <div className="flex gap-2" aria-hidden>
          {CAROUSEL_VIDEOS.map((v, i) => (
            <span key={v.src} className={cn('h-2 rounded-full transition-all', i === active ? 'w-6 bg-gold' : 'w-2 bg-white/30')} />
          ))}
        </div>
        <button type="button" onClick={() => go(active + 1)} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Próximo vídeo">
          <ChevronRight className="size-6" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Marca do Instagram desenhada em traço (o pacote de ícones não traz logos de marcas). */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

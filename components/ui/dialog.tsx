'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Diálogo acessível baseado no elemento nativo <dialog> (foco preso, Esc fecha,
 * fundo inerte). `side="bottom"` vira uma "gaveta" no celular.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'center',
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'center' | 'right' | 'bottom';
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Id único: com várias janelas na página (carrinho, produto), cada uma tem o próprio nome.
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && el.open) {
      el.close();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const position = {
    // Alturas em % da própria área da janela (a tela onde ela é posicionada), nunca em
    // dvh/vh: em navegadores dentro de apps essas unidades (e até innerHeight) vêm com
    // uma tela minúscula e a janela ficava espremida no rodapé.
    center: 'm-auto max-h-[calc(100%-2rem)] w-[min(42rem,calc(100%-1.5rem))] rounded-[1.5rem]',
    right: 'ml-auto mr-0 my-0 h-full max-h-full w-full max-w-md rounded-none sm:rounded-l-[1.5rem]',
    bottom:
      'mx-auto mb-[var(--app-bottom-gap)] mt-auto max-h-[calc(100%-2.5rem)] w-full max-w-2xl rounded-t-[1.5rem] sm:m-auto sm:max-h-[calc(100%-4rem)] sm:rounded-[1.5rem]',
  }[side];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      className={cn('p-0 text-fg shadow-[var(--shadow-float)] open:flex open:animate-[var(--animate-sheet)] open:flex-col', position, className)}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 id={titleId} className="font-display text-xl font-semibold leading-tight">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-mist hover:bg-line" aria-label="Fechar">
          <X className="size-5" aria-hidden />
        </button>
      </header>
      {/* flex-auto (não flex-1): no Safari/iPhone, com a altura da janela automática, "flex: 1 1 0%"
          zerava a área do conteúdo e só o título aparecia. min-h-0 deixa encolher e rolar. */}
      <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      {footer ? <footer className="shrink-0 border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</footer> : null}
    </dialog>
  );
}

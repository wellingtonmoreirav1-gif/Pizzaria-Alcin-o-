'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-[0.95rem] text-fg placeholder:text-muted transition-colors focus:border-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-brand-500 disabled:bg-mist aria-[invalid=true]:border-brand-600';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-12', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 py-3', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(control, 'h-12 appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-9', className)}
      style={{
        backgroundImage:
          "var(--select-arrow, url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234a4440' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\"))",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

/** Campo com rótulo, dica e mensagem de erro ligados por aria-describedby. */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-fg">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        ) : (
          <span className="font-normal text-muted"> (opcional)</span>
        )}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

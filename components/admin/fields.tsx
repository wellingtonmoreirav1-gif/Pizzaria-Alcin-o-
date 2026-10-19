import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* Campos simples (sem hooks) para formulários do painel renderizados no servidor. */

const control =
  'w-full rounded-xl border border-line bg-white px-3 text-sm text-ink-900 focus:border-ink-900 focus:outline-none disabled:bg-mist';

export function TextField({ label, name, hint, className, required, ...props }: ComponentProps<'input'> & { label: string; name: string; hint?: ReactNode }) {
  const id = `f-${name}`;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-ink-800">
        {label}
        {required ? <span className="text-brand-600"> *</span> : null}
      </label>
      <input id={id} name={name} required={required} className={cn(control, 'h-10')} {...props} />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextAreaField({ label, name, hint, className, ...props }: ComponentProps<'textarea'> & { label: string; name: string; hint?: ReactNode }) {
  const id = `f-${name}`;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-ink-800">
        {label}
      </label>
      <textarea id={id} name={name} className={cn(control, 'min-h-20 py-2')} {...props} />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function SelectField({ label, name, hint, className, children, ...props }: ComponentProps<'select'> & { label: string; name: string; hint?: ReactNode }) {
  const id = `f-${name}`;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-ink-800">
        {label}
      </label>
      <select id={id} name={name} className={cn(control, 'h-10')} {...props}>
        {children}
      </select>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function CheckboxField({ label, name, hint, className, ...props }: ComponentProps<'input'> & { label: string; name: string; hint?: ReactNode }) {
  return (
    <label className={cn('flex items-start gap-2 text-sm', className)}>
      <input type="checkbox" name={name} className="mt-0.5 size-4 accent-brand-600" {...props} />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Card({ title, description, children, actions, className }: { title?: string; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-white p-5', className)}>
      {title || actions ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="font-display text-lg font-semibold">{title}</h2> : null}
            {description ? <p className="text-sm text-muted">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export function centsInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return Number(value).toFixed(2).replace('.', ',');
}

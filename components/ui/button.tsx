import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'outline' | 'danger' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary: 'bg-mist text-fg hover:bg-line',
  dark: 'bg-fg text-canvas hover:opacity-90',
  ghost: 'text-fg hover:bg-mist',
  outline: 'border border-line bg-surface text-fg hover:border-muted',
  danger: 'bg-surface text-danger border border-brand-200 hover:bg-brand-50',
  whatsapp: 'bg-[#1f8f4e] text-white hover:bg-[#18733e] shadow-sm',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[0.95rem] gap-2 rounded-2xl',
  lg: 'h-14 px-7 text-base gap-2.5 rounded-2xl',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex select-none items-center justify-center font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  loading,
  children,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={props.disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />;
}

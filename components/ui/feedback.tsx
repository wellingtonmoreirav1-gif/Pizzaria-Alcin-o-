import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'success' | 'warning' | 'danger';
const tones: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: 'bg-mist text-ink-800 border-line', icon: <Info className="size-5 shrink-0" aria-hidden /> },
  success: { box: 'bg-success-50 text-success-600 border-success-600/20', icon: <CheckCircle2 className="size-5 shrink-0" aria-hidden /> },
  warning: { box: 'bg-warning-50 text-warning-600 border-warning-600/20', icon: <AlertTriangle className="size-5 shrink-0" aria-hidden /> },
  danger: { box: 'bg-brand-50 text-brand-700 border-brand-200', icon: <XCircle className="size-5 shrink-0" aria-hidden /> },
};

export function Notice({ tone = 'info', title, children, className, live }: { tone?: Tone; title?: string; children?: ReactNode; className?: string; live?: boolean }) {
  return (
    <div className={cn('flex gap-3 rounded-2xl border p-4 text-sm', tones[tone].box, className)} role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}>
      {tones[tone].icon}
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'dark' | 'success' | 'warning'; className?: string }) {
  const styles = {
    neutral: 'bg-mist text-ink-700',
    brand: 'bg-brand-600 text-white',
    dark: 'bg-ink-900 text-white',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', styles[tone], className)}>{children}</span>;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center">
      {icon ? <div className="grid size-14 place-items-center rounded-full bg-mist text-muted">{icon}</div> : null}
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {children ? <div className="max-w-md text-sm text-muted">{children}</div> : null}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} aria-hidden />;
}

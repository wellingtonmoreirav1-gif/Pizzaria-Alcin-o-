'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export type FormAction = (prev: { ok: boolean; message: string; id?: string } | null, form: FormData) => Promise<{ ok: boolean; message: string; id?: string }>;

/**
 * Formulário ligado a uma Server Action. Mostra o resultado (sucesso/erro) e,
 * opcionalmente, redireciona usando o id retornado.
 */
export function ActionForm({
  action,
  children,
  submitLabel = 'Salvar',
  className,
  resetOnSuccess,
  redirectTo,
  confirm,
  variant = 'primary',
  size = 'md',
  inline,
  id,
}: {
  action: FormAction;
  children?: ReactNode;
  submitLabel?: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  /** Para onde ir após sucesso. `{id}` é trocado pelo id retornado pela ação. */
  redirectTo?: string;
  confirm?: string;
  variant?: 'primary' | 'dark' | 'outline' | 'danger' | 'ghost' | 'secondary';
  size?: 'sm' | 'md';
  inline?: boolean;
  /** Permite ligar campos de fora do formulário (atributo `form`). */
  id?: string;
}) {
  const toast = useToast();
  // O aviso é disparado aqui (e não num efeito) para aparecer mesmo quando o
  // formulário some da tela após a ação (ex.: botão "Encerrar pausa").
  const [state, formAction, pending] = useActionState<Awaited<ReturnType<FormAction>> | null, FormData>(async (prev, form) => {
    const result = await action(prev, form);
    toast(result.message, result.ok ? 'success' : 'error');
    return result;
  }, null);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok && resetOnSuccess) ref.current?.reset();
    if (state.ok && redirectTo) router.push(redirectTo.replace('{id}', state.id ?? ''));
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <form
      ref={ref}
      id={id}
      action={formAction}
      className={cn(inline ? 'inline-flex items-end gap-2' : 'space-y-4', className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state && !state.ok ? (
        <p className="text-sm font-medium text-brand-700" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" loading={pending} variant={variant} size={size}>
        {submitLabel}
      </Button>
    </form>
  );
}

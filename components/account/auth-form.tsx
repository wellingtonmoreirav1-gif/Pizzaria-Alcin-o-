'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/form';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'signup' | 'reset';

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Já existe uma conta com este e-mail.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
};

export function AuthForm({ next = '/conta', allowSignup = true, title }: { next?: string; allowSignup?: boolean; title?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = getBrowserClient();
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/conta` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setMessage({ tone: 'success', text: 'Conta criada! Enviamos um link de confirmação para o seu e-mail.' });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/conta/nova-senha` });
        if (error) throw error;
        setMessage({ tone: 'success', text: 'Se existir uma conta com este e-mail, você receberá um link para criar nova senha.' });
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : '';
      setMessage({ tone: 'danger', text: AUTH_ERRORS[raw] ?? (raw.startsWith('A senha') ? raw : 'Não foi possível concluir. Tente novamente em instantes.') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-[var(--radius-card)] border border-line p-6 sm:p-8">
      {title ? <h1 className="font-display text-2xl font-semibold">{title}</h1> : null}
      {allowSignup ? (
        <div className="grid grid-cols-2 rounded-2xl bg-mist p-1" role="tablist">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn('h-10 rounded-xl text-sm font-semibold', mode === m ? 'bg-surface shadow-sm' : 'text-muted')}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>
      ) : null}
      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' ? (
          <Field label="Nome" required>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          </Field>
        ) : null}
        <Field label="E-mail" required>
          {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
        </Field>
        {mode !== 'reset' ? (
          <Field label="Senha" required hint={mode === 'signup' ? 'Mínimo de 8 caracteres.' : undefined}>
            {(p) => <Input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} />}
          </Field>
        ) : null}
        {message ? <Notice tone={message.tone} live>{message.text}</Notice> : null}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'}
        </Button>
      </form>
      <button type="button" onClick={() => setMode(mode === 'reset' ? 'login' : 'reset')} className="text-sm font-medium text-muted-strong underline">
        {mode === 'reset' ? 'Voltar para o login' : 'Esqueci minha senha'}
      </button>
    </div>
  );
}

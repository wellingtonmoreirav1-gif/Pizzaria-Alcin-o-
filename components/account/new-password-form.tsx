'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/form';

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-line p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 8) {
          setError('A senha precisa ter pelo menos 8 caracteres.');
          return;
        }
        setLoading(true);
        const { error: err } = await getBrowserClient().auth.updateUser({ password });
        setLoading(false);
        if (err) setError('Link expirado ou inválido. Peça um novo link de recuperação.');
        else router.replace('/conta');
      }}
    >
      <h1 className="font-display text-2xl font-semibold">Criar nova senha</h1>
      <Field label="Nova senha" required hint="Mínimo de 8 caracteres.">
        {(p) => <Input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />}
      </Field>
      {error ? (
        <Notice tone="danger" live>
          {error}
        </Notice>
      ) : null}
      <Button type="submit" loading={loading} className="w-full">
        Salvar senha
      </Button>
    </form>
  );
}

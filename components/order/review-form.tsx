'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';

export function ReviewForm({ code, token, defaultName }: { code: string; token: string; defaultName: string }) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState(defaultName);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done' | 'error'; message?: string }>({ status: 'idle' });

  if (state.status === 'done')
    return (
      <Notice tone="success" live>
        Obrigado! Sua avaliação será publicada após a moderação da equipe.
      </Notice>
    );

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) {
          setState({ status: 'error', message: 'Escolha de 1 a 5 estrelas.' });
          return;
        }
        setState({ status: 'sending' });
        const res = await fetch(`/api/orders/${code}/review`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, rating, authorName: name, comment: comment || null }),
        }).catch(() => null);
        const data = res ? ((await res.json()) as { ok: boolean; message?: string }) : null;
        setState(data?.ok ? { status: 'done' } : { status: 'error', message: data?.message ?? 'Não foi possível enviar.' });
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold">Sua nota</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
              <Star className={cn('size-8', n <= rating ? 'fill-brand-600 text-brand-600' : 'text-line')} aria-hidden />
              <span className="sr-only">
                {n} {n === 1 ? 'estrela' : 'estrelas'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">
        Nome exibido
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          className="mt-1 h-11 w-full rounded-xl border border-line px-3 font-normal"
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        Comentário (opcional)
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 1000))}
          className="mt-1 min-h-20 w-full rounded-xl border border-line px-3 py-2 font-normal"
        />
      </label>
      {state.status === 'error' ? (
        <Notice tone="danger" live>
          {state.message}
        </Notice>
      ) : null}
      <Button type="submit" loading={state.status === 'sending'}>
        Enviar avaliação
      </Button>
    </form>
  );
}

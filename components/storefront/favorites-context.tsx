'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';

const STORAGE_KEY = 'alcinao:favorites:v1';

interface FavoritesValue {
  ids: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => Promise<boolean>;
  signedIn: boolean;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

/**
 * Favoritos: visitantes guardam no navegador; clientes com conta salvam no banco
 * (tabela favorites, protegida por RLS). Ao entrar, os favoritos locais são enviados.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let local: string[] = [];
    try {
      local = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
    } catch {
      local = [];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- favoritos lidos do localStorage (sistema externo) após hidratar
    setIds(new Set(local));
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = getBrowserClient();
    const sync = async (uid: string | null) => {
      setUserId(uid);
      if (!uid) return;
      if (local.length > 0) {
        await supabase.from('favorites').upsert(
          local.map((product_id) => ({ user_id: uid, product_id })),
          { ignoreDuplicates: true },
        );
      }
      const { data } = await supabase.from('favorites').select('product_id');
      if (data) {
        const merged = new Set(data.map((f: { product_id: string }) => f.product_id));
        setIds(merged);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged]));
        } catch {
          // ignorado
        }
      }
    };
    supabase.auth.getSession().then(({ data }) => sync(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const toggle = useCallback(
    async (id: string) => {
      const next = new Set(ids);
      const adding = !next.has(id);
      if (adding) next.add(id);
      else next.delete(id);
      setIds(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignorado
      }
      if (userId) {
        const supabase = getBrowserClient();
        if (adding) await supabase.from('favorites').upsert({ user_id: userId, product_id: id }, { ignoreDuplicates: true });
        else await supabase.from('favorites').delete().eq('product_id', id);
      }
      return adding;
    },
    [ids, userId],
  );

  const value = useMemo(() => ({ ids, isFavorite: (id: string) => ids.has(id), toggle, signedIn: Boolean(userId) }), [ids, toggle, userId]);
  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites precisa estar dentro de FavoritesProvider');
  return ctx;
}

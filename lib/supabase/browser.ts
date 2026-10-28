'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Cliente do navegador (chave publicável). Usado para login/cadastro. */
export function getBrowserClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '');
  }
  return client;
}

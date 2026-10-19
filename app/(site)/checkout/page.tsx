import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getOperation } from '@/lib/catalog/queries';
import { getSessionUser } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { CheckoutFlow, type CheckoutConfig, type CheckoutPrefill } from '@/components/checkout/checkout-flow';
import { Skeleton } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Finalizar pedido', robots: { index: false } };

// Centro aproximado de São Bento (PB), usado apenas para abrir o mapa quando a
// localização exata do restaurante ainda não foi cadastrada.
const SAO_BENTO_CENTER = { latitude: -6.4864, longitude: -37.4506 };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 font-display text-3xl font-semibold sm:text-4xl">Finalizar pedido</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutLoader />
      </Suspense>
    </div>
  );
}

async function CheckoutLoader() {
  const { data } = await getOperation();
  const s = data.settings;
  const config: CheckoutConfig = {
    enabled: { delivery: s.deliveryEnabled, pickup: s.pickupEnabled, dine_in: s.dineInEnabled },
    paymentMethods: s.paymentMethods,
    zones: data.zones,
    defaultCity: s.city ?? 'São Bento',
    defaultState: s.state ?? 'PB',
    mapCenter: s.latitude !== null && s.longitude !== null ? { latitude: s.latitude, longitude: s.longitude } : SAO_BENTO_CENTER,
    minOrderValue: s.minOrderValue,
  };
  const prefill = await loadPrefill();
  return <CheckoutFlow config={config} prefill={prefill} />;
}

/** Dados salvos do cliente autenticado (opcional; sempre revisáveis). */
async function loadPrefill(): Promise<CheckoutPrefill | null> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return null;
  const supabase = await createSessionClient();
  const [profile, addresses] = await Promise.all([
    supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
    supabase.from('customer_addresses').select('*').order('is_default', { ascending: false }).order('created_at'),
  ]);
  return {
    name: profile.data?.full_name ?? null,
    phone: profile.data?.phone ?? null,
    addresses: (addresses.data ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      street: a.street,
      number: a.number,
      neighborhood: a.neighborhood,
      complement: a.complement,
      reference: a.reference,
      city: a.city,
      state: a.state,
      postalCode: a.postal_code,
    })),
  };
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <Skeleton className="h-96" />
      <Skeleton className="h-64" />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { getSessionUser } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { formatBRL, toCents } from '@/lib/money';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/orders/labels';
import { formatBrazilPhone } from '@/lib/phone';
import { AuthForm } from '@/components/account/auth-form';
import { AddressForm, DeleteAccount, ProfileForm } from '@/components/account/account-forms';
import { RecentGuestOrders } from '@/components/account/recent-orders';
import { Badge, Skeleton } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { deleteAddress, signOut } from './actions';

export const metadata: Metadata = { title: 'Minha conta', robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <AccountContent />
      </Suspense>
      <RecentGuestOrders />
    </div>
  );
}

async function AccountContent() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold">Minha conta</h1>
          <p className="mx-auto mt-2 max-w-md text-muted">
            A conta é opcional: serve para salvar seus dados, endereços, favoritos e ver o histórico. Você pode pedir sem cadastro.
          </p>
        </div>
        <AuthForm />
      </div>
    );
  }
  const supabase = await createSessionClient();
  const [profile, addresses, orders] = await Promise.all([
    supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
    supabase.from('customer_addresses').select('id, label, street, number, neighborhood, city, state').order('created_at'),
    supabase
      .from('orders')
      .select('code, status, total, total_is_final, created_at')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Olá{profile.data?.full_name ? `, ${profile.data.full_name.split(' ')[0]}` : ''}!</h1>
          <p className="text-muted">{user.email}</p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="size-4" aria-hidden /> Sair
          </Button>
        </form>
      </header>

      <section className="rounded-[var(--radius-card)] border border-line p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">Seus pedidos</h2>
        {orders.data?.length ? (
          <ul className="divide-y divide-line">
            {orders.data.map((o) => (
              <li key={o.code} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <strong>#{o.code}</strong>{' '}
                  <span className="text-muted">
                    {new Date(o.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' })}
                  </span>
                </span>
                <Badge>{ORDER_STATUS_LABEL[o.status as OrderStatus]}</Badge>
                <span className="tabular-nums">
                  {formatBRL(toCents(o.total))}
                  {o.total_is_final ? '' : ' + taxa'}
                </span>
                <Link href={`/pedido/${o.code}`} className="font-semibold text-danger underline">
                  Detalhes e pedir novamente
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Você ainda não fez pedidos com esta conta.</p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-line p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">Seus dados</h2>
        <ProfileForm fullName={profile.data?.full_name ?? ''} phone={profile.data?.phone ? formatBrazilPhone(profile.data.phone) : ''} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-line p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">Endereços salvos</h2>
        {addresses.data?.length ? (
          <ul className="mb-6 divide-y divide-line">
            {addresses.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  {a.label ? <strong>{a.label}: </strong> : null}
                  {a.street}, {a.number} — {a.neighborhood}, {a.city}/{a.state}
                </span>
                <form action={deleteAddress.bind(null, a.id)}>
                  <Button type="submit" variant="ghost" size="sm" aria-label={`Excluir endereço ${a.street}, ${a.number}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <AddressForm />
      </section>

      <section className="rounded-[var(--radius-card)] border border-line p-6">
        <h2 className="mb-2 font-display text-xl font-semibold">Privacidade</h2>
        <p className="mb-4 text-sm text-muted">
          Veja a{' '}
          <Link href="/privacidade" className="underline">
            política de privacidade
          </Link>
          . Você pode excluir sua conta quando quiser.
        </p>
        <DeleteAccount />
      </section>
    </>
  );
}

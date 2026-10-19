'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/form';
import { addAddress, updateProfile, type ActionResult } from '@/app/(site)/conta/actions';

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfile, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome" required>
        {(p) => <Input {...p} name="fullName" defaultValue={fullName} autoComplete="name" />}
      </Field>
      <Field label="Telefone (WhatsApp)">
        {(p) => <Input {...p} name="phone" defaultValue={phone} type="tel" autoComplete="tel" />}
      </Field>
      {state ? <Notice tone={state.ok ? 'success' : 'danger'} live className="sm:col-span-2">{state.message}</Notice> : null}
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>Salvar dados</Button>
      </div>
    </form>
  );
}

export function AddressForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addAddress, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-6">
      <Field label="Apelido" className="sm:col-span-2">{(p) => <Input {...p} name="label" placeholder="Casa, trabalho…" />}</Field>
      <Field label="Rua" required className="sm:col-span-3">{(p) => <Input {...p} name="street" />}</Field>
      <Field label="Nº" required className="sm:col-span-1">{(p) => <Input {...p} name="number" />}</Field>
      <Field label="Bairro" required className="sm:col-span-3">{(p) => <Input {...p} name="neighborhood" />}</Field>
      <Field label="Complemento" className="sm:col-span-3">{(p) => <Input {...p} name="complement" />}</Field>
      <Field label="Referência" className="sm:col-span-6">{(p) => <Input {...p} name="reference" />}</Field>
      <Field label="Cidade" required className="sm:col-span-3">{(p) => <Input {...p} name="city" defaultValue="São Bento" />}</Field>
      <Field label="UF" required className="sm:col-span-1">{(p) => <Input {...p} name="state" defaultValue="PB" maxLength={2} />}</Field>
      <Field label="CEP" className="sm:col-span-2">{(p) => <Input {...p} name="postalCode" inputMode="numeric" />}</Field>
      {state ? <Notice tone={state.ok ? 'success' : 'danger'} live className="sm:col-span-6">{state.message}</Notice> : null}
      <div className="sm:col-span-6">
        <Button type="submit" variant="dark" loading={pending}>Adicionar endereço</Button>
      </div>
    </form>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {!confirming ? (
        <Button variant="danger" onClick={() => setConfirming(true)}>Excluir minha conta</Button>
      ) : (
        <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm">
            Vamos apagar sua conta, endereços, favoritos e dados de perfil. Os pedidos já feitos ficam apenas com itens e valores, sem seu nome,
            telefone ou endereço, para o histórico de vendas do restaurante. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              loading={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
                const data = res ? ((await res.json()) as { ok: boolean; message?: string }) : null;
                setLoading(false);
                if (data?.ok) {
                  router.replace('/?conta=excluida');
                  router.refresh();
                } else setError(data?.message ?? 'Não foi possível excluir agora.');
              }}
            >
              Sim, excluir definitivamente
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
          </div>
          {error ? <Notice tone="danger" live>{error}</Notice> : null}
        </div>
      )}
    </div>
  );
}

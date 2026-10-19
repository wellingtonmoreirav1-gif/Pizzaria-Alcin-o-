'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Bike, Check, ChevronLeft, Clock, ShoppingBag, Utensils } from 'lucide-react';
import { formatBRL, parseBRLInput, type Cents } from '@/lib/money';
import { formatBrazilPhone, normalizeBrazilPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { FULFILLMENT_LABEL, PAYMENT_LABEL, type Fulfillment, type PaymentMethod } from '@/lib/orders/labels';
import type { DeliveryZone } from '@/types/settings';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { toSelection, useCart } from '@/components/cart/cart-context';
import { CartLines } from '@/components/cart/cart-lines';
import { useCartQuote } from '@/components/cart/use-cart-quote';
import { LocationStep, type DeliveryLocation } from './location-step';

export interface CheckoutConfig {
  enabled: Record<Fulfillment, boolean>;
  paymentMethods: Record<Fulfillment, PaymentMethod[]>;
  zones: DeliveryZone[];
  defaultCity: string;
  defaultState: string;
  mapCenter: { latitude: number; longitude: number };
  minOrderValue: Cents | null;
}

export interface CheckoutPrefill {
  name: string | null;
  phone: string | null;
  addresses: {
    id: string;
    label: string | null;
    street: string;
    number: string;
    neighborhood: string;
    complement: string | null;
    reference: string | null;
    city: string;
    state: string;
    postalCode: string | null;
  }[];
}

interface AddressForm {
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
  city: string;
  state: string;
  postalCode: string;
  zoneId: string;
}

const STEPS = ['Modalidade', 'Seus dados', 'Entrega', 'Pagamento', 'Revisão'] as const;
const KEY_STORAGE = 'alcinao:checkout-key';
const ORDERS_STORAGE = 'alcinao:orders';
const FORM_STORAGE = 'alcinao:checkout-form';

function newKey() {
  return crypto.randomUUID();
}

export function CheckoutFlow({ config, prefill }: { config: CheckoutConfig; prefill: CheckoutPrefill | null }) {
  const router = useRouter();
  const cart = useCart();
  const quote = useCartQuote(true);
  const availableModes = (Object.keys(config.enabled) as Fulfillment[]).filter((m) => config.enabled[m]);

  const [step, setStep] = useState(0);
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(availableModes.length === 1 ? (availableModes[0] ?? null) : null);
  const [name, setName] = useState(prefill?.name ?? '');
  const [phone, setPhone] = useState(prefill?.phone ? formatBrazilPhone(prefill.phone) : '');
  const firstAddress = prefill?.addresses[0];
  const [address, setAddress] = useState<AddressForm>({
    street: firstAddress?.street ?? '',
    number: firstAddress?.number ?? '',
    neighborhood: firstAddress?.neighborhood ?? '',
    complement: firstAddress?.complement ?? '',
    reference: firstAddress?.reference ?? '',
    city: firstAddress?.city ?? config.defaultCity,
    state: firstAddress?.state ?? config.defaultState,
    postalCode: firstAddress?.postalCode ?? '',
    zoneId: '',
  });
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [otherNeighborhood, setOtherNeighborhood] = useState(Boolean(firstAddress));
  const [tableLabel, setTableLabel] = useState('');
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ title: string; message: string } | null>(null);

  // Mantém os dados digitados se o cliente sair e voltar (somente nesta aba).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FORM_STORAGE) ?? 'null') as null | { name: string; phone: string; address: AddressForm; fulfillment: Fulfillment | null; notes: string; tableLabel: string };
      if (saved && !prefill) {
        setName(saved.name);
        setPhone(saved.phone);
        setAddress(saved.address);
        setFulfillment(saved.fulfillment);
        setNotes(saved.notes);
        setTableLabel(saved.tableLabel);
      }
    } catch {
      // ignorado
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_STORAGE, JSON.stringify({ name, phone, address, fulfillment, notes, tableLabel }));
    } catch {
      // ignorado
    }
  }, [name, phone, address, fulfillment, notes, tableLabel]);

  const steps = fulfillment === 'delivery' ? STEPS : STEPS.filter((s) => s !== 'Entrega');
  const current = steps[step] ?? 'Modalidade';
  const itemsTotal = quote.totals?.itemsSubtotal ?? cart.estimatedTotal;
  const zone = config.zones.find((z) => z.id === address.zoneId) ?? null;
  const estimatedFee = fulfillment === 'delivery' && zone?.fee !== null && zone?.fee !== undefined ? zone.fee : null;
  const methods = fulfillment ? config.paymentMethods[fulfillment] ?? [] : [];
  const hasLineErrors = Object.keys(quote.lineErrors).length > 0;
  const status = quote.status;

  useEffect(() => {
    if (payment && !methods.includes(payment)) setPayment(null);
  }, [fulfillment]); // eslint-disable-line react-hooks/exhaustive-deps

  const cartSignature = useMemo(() => JSON.stringify(cart.lines.map(toSelection)), [cart.lines]);

  function idempotencyKey(): string {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY_STORAGE) ?? 'null') as { key: string; signature: string } | null;
      if (saved && saved.signature === cartSignature) return saved.key;
      const key = newKey();
      sessionStorage.setItem(KEY_STORAGE, JSON.stringify({ key, signature: cartSignature }));
      return key;
    } catch {
      return newKey();
    }
  }

  function validate(stepName: (typeof STEPS)[number]): boolean {
    const e: Record<string, string> = {};
    if (stepName === 'Modalidade' && !fulfillment) e.fulfillment = 'Escolha como quer receber o pedido.';
    if (stepName === 'Seus dados') {
      if (name.trim().length < 2) e.name = 'Informe seu nome.';
      if (!normalizeBrazilPhone(phone)) e.phone = 'Informe um telefone válido com DDD, ex.: (83) 99999-9999.';
    }
    if (stepName === 'Entrega') {
      if (address.street.trim().length < 2) e.street = 'Informe a rua ou avenida.';
      if (!address.number.trim()) e.number = 'Informe o número (ou "s/n").';
      if (address.neighborhood.trim().length < 2) e.neighborhood = 'Informe o bairro.';
      if (address.city.trim().length < 2) e.city = 'Informe a cidade.';
      if (!/^[A-Za-z]{2}$/.test(address.state.trim())) e.state = 'Use a sigla do estado (ex.: PB).';
      if (address.postalCode && address.postalCode.replace(/\D/g, '').length !== 8) e.postalCode = 'O CEP deve ter 8 dígitos.';
    }
    if (stepName === 'Pagamento') {
      if (!payment) e.payment = 'Escolha a forma de pagamento.';
      if (payment === 'cash' && needsChange) {
        const cents = parseBRLInput(changeFor);
        if (!cents) e.changeFor = 'Informe para quanto precisa de troco.';
        else if (cents <= itemsTotal + (estimatedFee ?? 0)) e.changeFor = 'O valor do troco deve ser maior que o total do pedido.';
      }
    }
    if (stepName === 'Revisão' && !confirmed) e.confirmed = 'Confirme que os dados estão corretos.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate(current)) return;
    setStep((s) => Math.min(steps.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    if (!validate('Revisão') || !fulfillment || !payment) return;
    setSubmitting(true);
    setSubmitError(null);
    const body = {
      idempotencyKey: idempotencyKey(),
      fulfillment,
      customer: { name: name.trim(), phone },
      address:
        fulfillment === 'delivery'
          ? {
              street: address.street,
              number: address.number,
              neighborhood: address.neighborhood,
              complement: address.complement || null,
              reference: address.reference || null,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode || null,
              zoneId: address.zoneId || null,
            }
          : null,
      location: fulfillment === 'delivery' && location ? { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy, source: location.source } : null,
      tableLabel: fulfillment === 'dine_in' ? tableLabel || null : null,
      payment: { method: payment, changeForCents: payment === 'cash' && needsChange ? parseBRLInput(changeFor) : null },
      notes: notes || null,
      items: cart.lines.map(toSelection),
      expectedItemsTotalCents: itemsTotal,
      confirmed: true,
    };
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json()) as { ok: boolean; code?: string; message?: string; accessToken?: string; items?: { index: number; message: string }[] };
      if (!res.ok || !data.ok || !data.code || !data.accessToken) {
        if (data.code === 'PRICE_CHANGED') {
          quote.reload();
          setConfirmed(false);
          setSubmitError({ title: 'Os preços mudaram', message: data.message ?? 'Confira o novo total e confirme novamente.' });
        } else if (data.code === 'INVALID_ITEMS') {
          quote.reload();
          setSubmitError({ title: 'Revise o carrinho', message: (data.items ?? []).map((i) => i.message).join(' ') || data.message || '' });
        } else {
          setSubmitError({ title: 'Não foi possível enviar', message: data.message ?? 'Tente novamente em instantes. Seu carrinho continua salvo.' });
        }
        return;
      }
      try {
        const list = JSON.parse(localStorage.getItem(ORDERS_STORAGE) ?? '[]') as { code: string; token: string; createdAt: string }[];
        localStorage.setItem(ORDERS_STORAGE, JSON.stringify([{ code: data.code, token: data.accessToken, createdAt: new Date().toISOString() }, ...list.filter((o) => o.code !== data.code)].slice(0, 10)));
        sessionStorage.removeItem(KEY_STORAGE);
        sessionStorage.removeItem(FORM_STORAGE);
      } catch {
        // ignorado
      }
      cart.clear();
      router.push(`/pedido/${data.code}?t=${encodeURIComponent(data.accessToken)}&novo=1`);
    } catch {
      setSubmitError({ title: 'Sem conexão', message: 'Não conseguimos falar com o servidor. Verifique a internet e tente de novo — o pedido não será duplicado.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.hydrated && cart.lines.length === 0) {
    return (
      <EmptyState icon={<ShoppingBag className="size-6" aria-hidden />} title="Seu carrinho está vazio" action={<ButtonLink href="/cardapio">Ver cardápio</ButtonLink>}>
        Adicione itens para finalizar o pedido.
      </EmptyState>
    );
  }

  const closed = status && !status.acceptingOrders;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
        <ol className="flex gap-2 overflow-x-auto scrollbar-none" aria-label="Etapas do pedido">
          {steps.map((s, i) => (
            <li key={s} className="flex shrink-0 items-center gap-2 text-sm" aria-current={i === step ? 'step' : undefined}>
              <span className={cn('grid size-7 place-items-center rounded-full text-xs font-bold', i < step ? 'bg-ink-900 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-mist text-muted')}>
                {i < step ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className={cn(i === step ? 'font-semibold' : 'text-muted')}>{s}</span>
              {i < steps.length - 1 ? <span className="h-px w-5 bg-line" aria-hidden /> : null}
            </li>
          ))}
        </ol>

        {closed ? (
          <Notice tone="warning" title="Não estamos recebendo pedidos agora" live>
            {status.message} Seu carrinho e seus dados ficam salvos neste aparelho para quando abrirmos.
          </Notice>
        ) : null}
        {hasLineErrors ? (
          <Notice tone="danger" title="Alguns itens precisam de revisão">
            <CartLines lineErrors={quote.lineErrors} compact />
          </Notice>
        ) : null}

        <section aria-labelledby="etapa" className="rounded-[var(--radius-card)] border border-line p-5 sm:p-7">
          <h2 id="etapa" className="mb-5 font-display text-2xl font-semibold">
            {current === 'Modalidade' ? 'Como você quer receber?' : current === 'Seus dados' ? 'Seus dados' : current === 'Entrega' ? 'Endereço de entrega' : current === 'Pagamento' ? 'Pagamento' : 'Revise seu pedido'}
          </h2>

          {current === 'Modalidade' ? (
            <fieldset>
              <legend className="sr-only">Modalidade</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ['delivery', <Bike key="d" className="size-6" aria-hidden />, 'Taxa confirmada pela equipe'],
                    ['pickup', <ShoppingBag key="p" className="size-6" aria-hidden />, 'Retire no restaurante'],
                    ['dine_in', <Utensils key="l" className="size-6" aria-hidden />, 'Pedido para a mesa'],
                  ] as const
                ).map(([mode, icon, hint]) => (
                  <label
                    key={mode}
                    className={cn(
                      'flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-500',
                      fulfillment === mode ? 'border-ink-900 bg-mist' : 'border-line hover:border-ink-600',
                      !config.enabled[mode] && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <input type="radio" name="fulfillment" className="sr-only" value={mode} checked={fulfillment === mode} disabled={!config.enabled[mode]} onChange={() => setFulfillment(mode)} />
                    {icon}
                    <span className="font-semibold">{FULFILLMENT_LABEL[mode]}</span>
                    <span className="text-xs text-muted">{config.enabled[mode] ? hint : 'Indisponível no momento'}</span>
                  </label>
                ))}
              </div>
              {errors.fulfillment ? <p className="mt-3 text-sm font-medium text-brand-700" role="alert">{errors.fulfillment}</p> : null}
            </fieldset>
          ) : null}

          {current === 'Seus dados' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" required error={errors.name}>
                {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />}
              </Field>
              <Field label="Telefone (WhatsApp)" required error={errors.phone} hint="Usado só para falar sobre este pedido.">
                {(p) => <Input {...p} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="(83) 99999-9999" />}
              </Field>
              {fulfillment === 'dine_in' ? (
                <Field label="Mesa" error={errors.tableLabel}>
                  {(p) => <Input {...p} value={tableLabel} onChange={(e) => setTableLabel(e.target.value.slice(0, 20))} placeholder="Ex.: 5" />}
                </Field>
              ) : null}
              {!prefill ? (
                <p className="text-sm text-muted sm:col-span-2">
                  Não precisa criar conta. Quer salvar seus dados para a próxima? <Link href="/conta" className="font-semibold text-ink-900 underline">Entre ou cadastre-se</Link>.
                </p>
              ) : null}
            </div>
          ) : null}

          {current === 'Entrega' ? (
            <div className="space-y-5">
              {prefill && prefill.addresses.length > 1 ? (
                <Field label="Endereço salvo">
                  {(p) => (
                    <Select
                      {...p}
                      onChange={(e) => {
                        const a = prefill.addresses.find((x) => x.id === e.target.value);
                        if (a) setAddress({ street: a.street, number: a.number, neighborhood: a.neighborhood, complement: a.complement ?? '', reference: a.reference ?? '', city: a.city, state: a.state, postalCode: a.postalCode ?? '', zoneId: '' });
                      }}
                    >
                      {prefill.addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label ? `${a.label} — ` : ''}
                          {a.street}, {a.number}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-6">
                <Field label="Rua ou avenida" required error={errors.street} className="sm:col-span-4">
                  {(p) => <Input {...p} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} autoComplete="address-line1" />}
                </Field>
                <Field label="Número" required error={errors.number} className="sm:col-span-2">
                  {(p) => <Input {...p} value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} inputMode="numeric" />}
                </Field>
                <Field label="Bairro" required error={errors.neighborhood} className="sm:col-span-3">
                  {(p) =>
                    config.zones.length ? (
                      <Select
                        {...p}
                        value={address.zoneId || (otherNeighborhood ? 'outro' : '')}
                        onChange={(e) => {
                          const z = config.zones.find((x) => x.id === e.target.value);
                          setOtherNeighborhood(e.target.value === 'outro');
                          setAddress({ ...address, zoneId: z?.id ?? '', neighborhood: z ? z.name : '' });
                        }}
                      >
                        <option value="">Selecione…</option>
                        {config.zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                        <option value="outro">Outro bairro</option>
                      </Select>
                    ) : (
                      <Input {...p} value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                    )
                  }
                </Field>
                {config.zones.length && otherNeighborhood ? (
                  <Field label="Nome do bairro" required error={errors.neighborhood} className="sm:col-span-3">
                    {(p) => <Input {...p} value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />}
                  </Field>
                ) : null}
                <Field label="Complemento" className="sm:col-span-3">
                  {(p) => <Input {...p} value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} placeholder="Casa, apto, bloco…" />}
                </Field>
                <Field label="Ponto de referência" className="sm:col-span-6" hint="Ajuda muito o entregador.">
                  {(p) => <Input {...p} value={address.reference} onChange={(e) => setAddress({ ...address, reference: e.target.value })} />}
                </Field>
                <Field label="Cidade" required error={errors.city} className="sm:col-span-3">
                  {(p) => <Input {...p} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} autoComplete="address-level2" />}
                </Field>
                <Field label="UF" required error={errors.state} className="sm:col-span-1">
                  {(p) => <Input {...p} value={address.state} maxLength={2} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} />}
                </Field>
                <Field label="CEP" error={errors.postalCode} className="sm:col-span-2">
                  {(p) => <Input {...p} value={address.postalCode} inputMode="numeric" onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} autoComplete="postal-code" />}
                </Field>
              </div>
              <LocationStep value={location} onChange={setLocation} defaultCenter={config.mapCenter} />
              <Notice tone="info">
                A taxa de entrega é confirmada pela equipe no WhatsApp, junto com a disponibilidade para o seu endereço.
                {estimatedFee !== null ? ` Taxa prevista para ${zone?.name}: ${formatBRL(estimatedFee)}.` : ''}
              </Notice>
            </div>
          ) : null}

          {current === 'Pagamento' ? (
            <div className="space-y-5">
              <fieldset>
                <legend className="sr-only">Forma de pagamento</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {methods.map((m) => (
                    <label key={m} className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-500', payment === m ? 'border-ink-900 bg-mist' : 'border-line hover:border-ink-600')}>
                      <input type="radio" name="payment" className="sr-only" checked={payment === m} onChange={() => setPayment(m)} />
                      <span className={cn('grid size-5 place-items-center rounded-full border-2', payment === m ? 'border-brand-600 bg-brand-600' : 'border-line')}>
                        {payment === m ? <span className="size-2 rounded-full bg-white" /> : null}
                      </span>
                      <span className="font-medium">{PAYMENT_LABEL[m]}</span>
                    </label>
                  ))}
                </div>
                {errors.payment ? <p className="mt-3 text-sm font-medium text-brand-700" role="alert">{errors.payment}</p> : null}
              </fieldset>
              <p className="text-sm text-muted">O pagamento é feito diretamente com a equipe — o site não faz cobranças.</p>
              {payment === 'cash' ? (
                <div className="space-y-3 rounded-2xl bg-mist p-4">
                  <label className="flex items-center gap-2 font-medium">
                    <input type="checkbox" checked={needsChange} onChange={(e) => setNeedsChange(e.target.checked)} className="size-5 accent-brand-600" />
                    Preciso de troco
                  </label>
                  {needsChange ? (
                    <Field label="Troco para quanto?" required error={errors.changeFor}>
                      {(p) => <Input {...p} inputMode="decimal" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder="Ex.: 100,00" />}
                    </Field>
                  ) : null}
                </div>
              ) : null}
              <Field label="Observações do pedido">
                {(p) => <Textarea {...p} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Algo que a equipe precise saber?" />}
              </Field>
            </div>
          ) : null}

          {current === 'Revisão' && fulfillment ? (
            <div className="space-y-5">
              <CartLines lineErrors={quote.lineErrors} compact />
              <dl className="grid gap-3 rounded-2xl bg-mist p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Modalidade</dt>
                  <dd className="font-semibold">{FULFILLMENT_LABEL[fulfillment]}{fulfillment === 'dine_in' && tableLabel ? ` · Mesa ${tableLabel}` : ''}</dd>
                </div>
                <div>
                  <dt className="text-muted">Cliente</dt>
                  <dd className="font-semibold">{name} · {normalizeBrazilPhone(phone) ? formatBrazilPhone(normalizeBrazilPhone(phone) ?? '') : phone}</dd>
                </div>
                {fulfillment === 'delivery' ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Endereço</dt>
                    <dd className="font-semibold">
                      {address.street}, {address.number}
                      {address.complement ? ` (${address.complement})` : ''} — {address.neighborhood}, {address.city}/{address.state}
                      {address.reference ? <span className="block font-normal text-muted">Referência: {address.reference}</span> : null}
                      <span className="block font-normal text-muted">{location ? 'Localização marcada no mapa' : 'Sem localização no mapa'}</span>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted">Pagamento</dt>
                  <dd className="font-semibold">
                    {payment ? PAYMENT_LABEL[payment] : '—'}
                    {payment === 'cash' ? (needsChange && parseBRLInput(changeFor) ? ` · troco para ${formatBRL(parseBRLInput(changeFor) ?? 0)}` : ' · sem troco') : ''}
                  </dd>
                </div>
                {notes ? (
                  <div>
                    <dt className="text-muted">Observações</dt>
                    <dd>{notes}</dd>
                  </div>
                ) : null}
              </dl>
              <label className="flex items-start gap-3 rounded-2xl border border-line p-4">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-5 accent-brand-600" aria-describedby="confirm-hint" />
                <span>
                  <span className="font-semibold">Confirmo que os itens, valores e dados estão corretos.</span>
                  <span id="confirm-hint" className="block text-sm text-muted">
                    Ao enviar, o pedido fica registrado e você abre o WhatsApp para mandar a mensagem para a equipe. Leia a <Link href="/privacidade" className="underline">política de privacidade</Link>.
                  </span>
                </span>
              </label>
              {errors.confirmed ? <p className="text-sm font-medium text-brand-700" role="alert">{errors.confirmed}</p> : null}
              {submitError ? (
                <Notice tone="danger" title={submitError.title} live>
                  {submitError.message}
                </Notice>
              ) : null}
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="size-4" aria-hidden /> Voltar
              </Button>
            ) : (
              <ButtonLink href="/carrinho" variant="ghost">
                <ChevronLeft className="size-4" aria-hidden /> Carrinho
              </ButtonLink>
            )}
            {current === 'Revisão' ? (
              <Button size="lg" onClick={submit} loading={submitting} disabled={Boolean(closed) || hasLineErrors || quote.loading} data-testid="submit-order">
                Registrar e enviar pelo WhatsApp
              </Button>
            ) : (
              <Button size="lg" onClick={next} data-testid="next-step">
                Continuar
              </Button>
            )}
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-[var(--radius-card)] bg-ink-900 p-6 text-white lg:sticky lg:top-24" aria-label="Resumo dos valores">
        <h2 className="font-display text-xl font-semibold">Resumo</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-white/70">Itens ({cart.count})</dt>
            <dd className="tabular-nums">{formatBRL(quote.totals?.grossSubtotal ?? itemsTotal)}</dd>
          </div>
          {quote.totals && quote.totals.discountTotal > 0 ? (
            <div className="flex justify-between text-[#86efac]">
              <dt>Descontos</dt>
              <dd className="tabular-nums">-{formatBRL(quote.totals.discountTotal)}</dd>
            </div>
          ) : null}
          {fulfillment === 'delivery' ? (
            <div className="flex justify-between">
              <dt className="text-white/70">Taxa de entrega</dt>
              <dd>{estimatedFee !== null ? `${formatBRL(estimatedFee)} (prevista)` : 'A confirmar'}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-white/15 pt-3 text-base">
            <dt className="font-semibold">{fulfillment === 'delivery' ? (estimatedFee !== null ? 'Total estimado' : 'Total dos itens') : 'Total'}</dt>
            <dd className="font-bold tabular-nums" data-testid="checkout-total">
              {formatBRL(itemsTotal + (estimatedFee ?? 0))}
            </dd>
          </div>
        </dl>
        {fulfillment === 'delivery' ? (
          <p className="text-xs text-white/60">O total definitivo inclui a taxa de entrega confirmada pela equipe no WhatsApp.</p>
        ) : null}
        {config.minOrderValue && itemsTotal < config.minOrderValue ? (
          <p className="text-xs text-[#fca5a5]">Pedido mínimo: {formatBRL(config.minOrderValue)}.</p>
        ) : null}
        {quote.loading ? (
          <p className="flex items-center gap-2 text-xs text-white/60">
            <Clock className="size-3.5" aria-hidden /> Conferindo preços…
          </p>
        ) : null}
      </aside>
    </div>
  );
}

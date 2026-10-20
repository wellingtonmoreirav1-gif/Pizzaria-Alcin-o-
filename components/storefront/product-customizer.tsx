'use client';

import { useMemo, useState } from 'react';
import { Check, Clock, ShoppingBag } from 'lucide-react';
import type { CatalogOptionGroup, CatalogOptionValue, CatalogProduct, CatalogVariant, LineSelection } from '@/types/catalog';
import {
  flavorLimitsFor,
  flavorPriceFor,
  isOptionOfferedFor,
  optionPriceFor,
  isProductOrderable,
  priceLine,
} from '@/lib/pricing';
import { findBestPromotion } from '@/lib/pricing/promotions';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useNow } from '@/lib/use-now';
import { Button } from '@/components/ui/button';
import { Badge, Notice } from '@/components/ui/feedback';
import { QuantityStepper } from '@/components/ui/quantity';
import { ProductImage } from '@/components/ui/product-image';
import { useToast } from '@/components/ui/toast';
import { useCart, type CartLine } from '@/components/cart/cart-context';
import { PizzaVisual } from './pizza-visual';

const SHIFT_NOTE = { lunch: 'Servido no horário do almoço', dinner: 'Servido no horário da noite' } as const;

/** Pré-seleciona o tamanho só quando existe uma única opção; senão o cliente escolhe. */
function defaultVariant(product: CatalogProduct): CatalogVariant | null {
  const available = product.variants.filter((v) => v.isAvailable);
  return product.variants.length === 1 ? (available[0] ?? null) : null;
}

/** Faixa de preço de uma opção entre os tamanhos (ex.: borda "+ R$ 4,00 a R$ 10,00"). */
function optionPriceRange(value: CatalogOptionValue, variants: CatalogVariant[]): string | null {
  const prices = variants.map((v) => optionPriceFor(value, v)).filter((p) => p > 0);
  if (prices.length === 0) return value.price > 0 ? `+ ${formatBRL(value.price)}` : null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `+ ${formatBRL(min)}` : `+ ${formatBRL(min)} a ${formatBRL(max)}`;
}

/** Remove escolhas que deixam de valer quando o tamanho muda. */
function pruneForVariant(product: CatalogProduct, options: Record<string, string[]>, variant: CatalogVariant | null) {
  const next: Record<string, string[]> = {};
  for (const group of product.groups) {
    let ids = (options[group.id] ?? []).filter((id) => {
      const value = group.values.find((v) => v.id === id);
      return value && value.isAvailable && isOptionOfferedFor(value, variant);
    });
    if (group.kind === 'flavor') ids = ids.slice(0, flavorLimitsFor(group, variant).max);
    if (ids.length) next[group.id] = ids;
  }
  return next;
}

export function ProductCustomizer({
  product,
  fetchedAt,
  editLine,
  onDone,
  layout = 'dialog',
}: {
  product: CatalogProduct;
  fetchedAt: string;
  editLine?: CartLine | null;
  onDone?: () => void;
  layout?: 'dialog' | 'page';
}) {
  const now = useNow(fetchedAt);
  const cart = useCart();
  const toast = useToast();
  const [variantId, setVariantId] = useState<string | null>(editLine?.variantId ?? defaultVariant(product)?.id ?? null);
  const [options, setOptions] = useState<Record<string, string[]>>(editLine?.options ?? {});
  const [quantity, setQuantity] = useState(editLine?.quantity ?? 1);
  const [notes, setNotes] = useState(editLine?.notes ?? '');
  const [touched, setTouched] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const orderable = isProductOrderable(product, now);
  const selection: LineSelection = { productId: product.id, variantId, options, quantity, notes: notes.trim() || undefined };
  const result = useMemo(() => priceLine(product, selection, { now, openShifts: null }), [product, variantId, options, quantity, notes, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = [...product.groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const flavorGroup = groups.find((g) => g.kind === 'flavor');
  const chosenFlavorNames = flavorGroup
    ? (options[flavorGroup.id] ?? []).map((id) => flavorGroup.values.find((v) => v.id === id)?.name ?? '').filter(Boolean)
    : [];
  const crustGroup = groups.find((g) => g.kind === 'crust');

  function selectVariant(id: string) {
    const next = product.variants.find((v) => v.id === id) ?? null;
    setVariantId(id);
    setOptions((o) => pruneForVariant(product, o, next));
  }

  function toggle(group: CatalogOptionGroup, valueId: string) {
    setOptions((current) => {
      const chosen = current[group.id] ?? [];
      const single = group.kind === 'crust' || (group.kind !== 'flavor' && group.maxSelect === 1);
      let next: string[];
      if (chosen.includes(valueId)) next = chosen.filter((id) => id !== valueId);
      else if (single) next = [valueId];
      else {
        const max = group.kind === 'flavor' ? flavorLimitsFor(group, variant).max : group.maxSelect;
        if (chosen.length >= max) return current;
        next = [...chosen, valueId];
      }
      return { ...current, [group.id]: next };
    });
  }

  function submit() {
    setTouched(true);
    if (!result.ok) return;
    const line = result.line;
    const payload = {
      ...selection,
      notes: selection.notes ?? null,
      slug: product.slug,
      name: product.name,
      variantName: line.variantName,
      summary: line.summary,
      imageUrl: product.imageUrl,
      unitPrice: line.unitPrice,
      unitRegular: line.unitRegular,
      maxQuantity: product.maxQuantity,
    } as Omit<CartLine, 'lineId'>;
    if (editLine) {
      cart.replace(editLine.lineId, payload);
      toast('Item atualizado no carrinho');
    } else {
      cart.add(payload);
      toast(`${product.name} adicionado ao carrinho`);
    }
    onDone?.();
  }

  const variantPriceLabel = (v: CatalogVariant) => {
    if (product.kind === 'pizza' && v.flavorPriceRule !== 'fixed' && flavorGroup) {
      const prices = flavorGroup.values.filter((f) => f.isAvailable && isOptionOfferedFor(f, v)).map((f) => flavorPriceFor(f, v));
      return prices.length ? `a partir de ${formatBRL(Math.min(...prices))}` : '';
    }
    const promo = findBestPromotion(product, v.id, v.price, now);
    return promo ? (
      <>
        <s className="mr-1 text-muted">{formatBRL(v.price)}</s>
        <span className="font-semibold text-danger">{formatBRL(promo.promoPrice)}</span>
      </>
    ) : (
      formatBRL(v.price)
    );
  };

  const footer = (
    <div className="flex items-center gap-3">
      <QuantityStepper value={quantity} onChange={setQuantity} max={product.maxQuantity} />
      <Button size="lg" className="flex-1" onClick={submit} disabled={!orderable} data-testid="add-to-cart">
        <ShoppingBag className="size-5" aria-hidden />
        {!orderable ? 'Indisponível' : editLine ? 'Salvar alterações' : 'Adicionar'}
        {result.ok ? <span className="ml-auto tabular-nums">{formatBRL(result.line.lineTotal)}</span> : null}
      </Button>
    </div>
  );

  return (
    <div className={cn('flex flex-col', layout === 'page' ? 'gap-8 lg:flex-row' : 'gap-5')}>
      <div className={cn(layout === 'page' ? 'lg:w-[44%]' : '', 'flex flex-col gap-4')}>
        {product.kind === 'pizza' && flavorGroup ? (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] bg-surface p-6 ring-1 ring-line">
            <PizzaVisual flavors={chosenFlavorNames} maxFlavors={variant?.maxFlavors ?? 1} hasCrust={Boolean(crustGroup && (options[crustGroup.id] ?? []).length)} />
          </div>
        ) : (
          <ProductImage src={product.imageUrl} alt={product.imageAlt} name={product.name} sizes="(max-width: 1024px) 100vw, 40vw" className="rounded-[var(--radius-card)]" priority={layout === 'page'} />
        )}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {!product.priceConfirmed ? <Badge className="bg-gold-soft text-gold">Preço em conferência</Badge> : !orderable ? <Badge tone="dark">Esgotado</Badge> : null}
            {product.tags.includes('especial-da-casa') ? <Badge className="bg-gold text-ink-950">Especial da casa</Badge> : null}
            {result.ok && result.line.unitDiscount > 0 ? (
              <Badge tone="brand">Promoção</Badge>
            ) : null}
            {product.shiftRestriction !== 'any' ? (
              <Badge>
                <Clock className="size-3" aria-hidden /> {SHIFT_NOTE[product.shiftRestriction]}
              </Badge>
            ) : null}
            {product.serves ? <Badge className="bg-gold-soft text-gold">{product.serves}</Badge> : null}
          </div>
          {layout === 'page' ? <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1> : null}
          {!product.priceConfirmed ? (
            <Notice tone="warning">Os valores deste item estão em conferência pelo restaurante. Ele poderá ser pedido assim que forem confirmados.</Notice>
          ) : null}
          {product.description || product.shortDescription ? (
            <p className="text-[0.95rem] leading-relaxed text-muted-strong">{product.description ?? product.shortDescription}</p>
          ) : null}
          {product.kind === 'combo' && product.comboItems.length ? (
            <ul className="space-y-1 rounded-2xl bg-mist p-4 text-sm">
              {product.comboItems.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="flex items-center gap-2">
                  <Check className="size-4 text-gold" aria-hidden />
                  {item.quantity}x {item.description ?? item.productName}
                  {!item.isAvailable ? <span className="text-danger">(esgotado)</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <form
        className={cn('flex flex-1 flex-col gap-6', layout === 'page' && 'lg:pt-2')}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {product.variants.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="mb-2 flex w-full items-center justify-between">
              <span className="font-display text-lg font-semibold">{product.kind === 'pizza' || product.variants.some((v) => v.sizeCode) ? 'Tamanho' : 'Escolha uma opção'}</span>
              <Badge tone="dark">Obrigatório</Badge>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {product.variants.map((v) => (
                <label
                  key={v.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-500',
                    variantId === v.id ? 'border-fg bg-mist' : 'border-line hover:border-muted',
                    !v.isAvailable && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input type="radio" name="variant" className="sr-only" checked={variantId === v.id} disabled={!v.isAvailable} onChange={() => selectVariant(v.id)} />
                  <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', variantId === v.id ? 'border-brand-600 bg-brand-600' : 'border-line')}>
                    {variantId === v.id ? <span className="size-2 rounded-full bg-surface" /> : null}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{v.name}</span>
                    <span className="block text-xs text-muted">
                      {[v.description, product.kind === 'pizza' ? `até ${v.maxFlavors} ${v.maxFlavors > 1 ? 'sabores' : 'sabor'}` : null].filter(Boolean).join(' · ')}
                      {!v.isAvailable ? ' · esgotado' : ''}
                    </span>
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-gold">{variantPriceLabel(v)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {groups.map((group) => {
          if (group.kind === 'flavor' && product.kind !== 'pizza') return null;
          const chosen = options[group.id] ?? [];
          const limits =
            group.kind === 'flavor'
              ? flavorLimitsFor(group, variant)
              : group.kind === 'crust'
                ? { min: Math.min(group.minSelect, 1), max: 1 }
                : { min: group.minSelect, max: group.maxSelect };
          const single = limits.max === 1;
          const chosenTags = new Set(
            chosen.map((id) => group.values.find((v) => v.id === id)?.combinationTag ?? ''),
          );
          const helper =
            group.kind === 'flavor'
              ? `Escolha ${limits.max > 1 ? `de 1 a ${limits.max} sabores` : '1 sabor'}${variant && !variant.allowMixedFlavorTags && limits.max > 1 ? ' do mesmo tipo' : ''}${variant?.flavorPriceRule === 'highest' && limits.max > 1 ? ' · vale o preço do sabor mais caro' : variant?.flavorPriceRule === 'average' && limits.max > 1 ? ' · preço pela média dos sabores' : ''}`
              : limits.min > 0
                ? single
                  ? 'Escolha 1'
                  : `Escolha de ${limits.min} a ${limits.max}`
                : single
                  ? 'Opcional'
                  : `Opcional · até ${limits.max}`;
          return (
            <fieldset key={group.id} className="space-y-2" data-testid={`group-${group.kind}`}>
              <legend className="mb-2 flex w-full items-center justify-between gap-3">
                <span>
                  <span className="block font-display text-lg font-semibold">{group.name}</span>
                  <span className="block text-xs text-muted">
                    {helper}
                    {!variant && product.variants.length > 1 && group.kind !== 'flavor' ? ' · o valor depende do tamanho' : ''}
                  </span>
                </span>
                {limits.min > 0 ? <Badge tone="dark">Obrigatório</Badge> : null}
              </legend>
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {group.kind === 'crust' && limits.min === 0 ? (
                  <OptionRow
                    type="radio"
                    name={group.id}
                    checked={chosen.length === 0}
                    onChange={() => setOptions((o) => ({ ...o, [group.id]: [] }))}
                    title="Sem borda recheada"
                  />
                ) : null}
                {group.values.map((value) => {
                  const offered = isOptionOfferedFor(value, variant);
                  const isChosen = chosen.includes(value.id);
                  const tagBlocked =
                    group.kind === 'flavor' && variant && !variant.allowMixedFlavorTags && chosen.length > 0 && !isChosen && !chosenTags.has(value.combinationTag ?? '');
                  const full = !single && !isChosen && chosen.length >= limits.max;
                  const disabled = !value.priceConfirmed || !value.isAvailable || !offered || Boolean(tagBlocked) || full;
                  const price = !value.priceConfirmed
                    ? null
                    : group.kind === 'flavor'
                      ? variant && variant.flavorPriceRule !== 'fixed'
                        ? formatBRL(flavorPriceFor(value, variant))
                        : null
                      : variant
                        ? (() => {
                            const p = optionPriceFor(value, variant);
                            return p > 0 ? `+ ${formatBRL(p)}` : null;
                          })()
                        : optionPriceRange(value, product.variants);
                  const reason = !value.priceConfirmed
                    ? 'Valor a definir pelo restaurante'
                    : !value.isAvailable
                      ? 'Esgotado'
                      : !offered
                        ? 'Indisponível neste tamanho'
                        : tagBlocked
                          ? 'Não combina com o sabor escolhido'
                          : null;
                  return (
                    <OptionRow
                      key={value.id}
                      type={single ? 'radio' : 'checkbox'}
                      name={group.id}
                      checked={isChosen}
                      disabled={disabled && !isChosen}
                      onChange={() => toggle(group, value.id)}
                      title={value.name}
                      description={reason ?? value.description}
                      price={price}
                      muted={Boolean(reason)}
                    />
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="space-y-2">
          <label htmlFor={`notes-${product.id}`} className="font-display text-lg font-semibold">
            Observações <span className="font-sans text-xs font-normal text-muted">(opcional)</span>
          </label>
          <textarea
            id={`notes-${product.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            maxLength={200}
            placeholder="Ex.: sem cebola, carne bem passada…"
            className="min-h-20 w-full rounded-xl border border-line px-3.5 py-3 text-[0.95rem] focus:border-fg focus:outline-none"
          />
          <p className="text-right text-xs text-muted">{notes.length}/200</p>
        </div>

        {result.ok ? (
          <div className="rounded-2xl bg-mist p-4 text-sm" aria-live="polite">
            <p className="font-semibold">Resumo</p>
            <ul className="mt-1 space-y-0.5 text-muted-strong">
              <li>
                {quantity}x {product.name}
                {result.line.variantName ? ` — ${result.line.variantName}` : ''}
              </li>
              {result.line.summary.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-2 flex items-baseline justify-between">
              <span>Preço unitário</span>
              <span className="tabular-nums">
                {result.line.unitDiscount > 0 ? <s className="mr-2 text-muted">{formatBRL(result.line.unitRegular)}</s> : null}
                <strong className="text-gold">{formatBRL(result.line.unitPrice)}</strong>
              </span>
            </p>
          </div>
        ) : touched || (product.kind !== 'pizza' && product.groups.every((g) => g.minSelect === 0)) ? (
          <Notice tone="warning" live>
            {result.error.message}
          </Notice>
        ) : (
          <p className="text-sm text-muted" aria-live="polite">
            {result.error.message}
          </p>
        )}

        {layout === 'page' ? <div className="sticky bottom-0 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:p-0">{footer}</div> : null}
        {layout === 'dialog' ? <div className="sticky bottom-0 -mx-5 -mb-4 border-t border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </form>
    </div>
  );
}

function OptionRow({
  type,
  name,
  checked,
  disabled,
  onChange,
  title,
  description,
  price,
  muted,
}: {
  type: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title: string;
  description?: string | null;
  price?: string | null;
  muted?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 bg-surface px-4 py-3 transition-colors has-[:focus-visible]:bg-mist',
        checked && 'bg-brand-50/60',
        disabled && 'cursor-not-allowed',
      )}
    >
      <input type={type} name={name} checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center border-2 transition-colors',
          type === 'radio' ? 'rounded-full' : 'rounded-md',
          checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-line',
          disabled && !checked && 'opacity-40',
        )}
      >
        {checked ? type === 'radio' ? <span className="size-2 rounded-full bg-surface" /> : <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
      <span className={cn('flex-1', disabled && !checked && 'opacity-50')}>
        <span className="block text-[0.95rem] font-medium">{title}</span>
        {description ? <span className={cn('block text-xs', muted ? 'text-danger' : 'text-muted')}>{description}</span> : null}
      </span>
      {price ? <span className={cn('text-sm tabular-nums text-muted-strong', disabled && !checked && 'opacity-50')}>{price}</span> : null}
    </label>
  );
}

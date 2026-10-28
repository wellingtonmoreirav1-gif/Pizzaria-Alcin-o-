'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { CatalogProduct, CatalogVariant } from '@/types/catalog';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';
import { canBeHalved, flavorName, HALF_SIZES, isProductOrderable } from '@/lib/pricing';
import { menuGroup } from '@/lib/catalog/groups';

/** Ordem dos tipos como no cardápio (tradicionais, especiais, premium, doces). */
const typeRank = (slug: string) => {
  const i = menuGroup('pizzas').slugs.indexOf(slug);
  return i === -1 ? 99 : i;
};

/** Sabores que podem ser a outra metade, no mesmo tamanho, agrupados por tipo. */
function halfOptions(product: CatalogProduct, variant: CatalogVariant, pizzas: CatalogProduct[], now: Date) {
  const groups = new Map<string, { name: string; items: { product: CatalogProduct; price: number }[] }>();
  const sorted = [...pizzas].sort((a, b) => typeRank(a.categorySlug) - typeRank(b.categorySlug) || a.sortOrder - b.sortOrder);
  for (const p of sorted) {
    if (p.id === product.id || p.kind !== 'pizza' || !isProductOrderable(p, now)) continue;
    const v = p.variants.find((x) => x.sizeCode === variant.sizeCode && x.isAvailable);
    if (!v) continue;
    const g = groups.get(p.categoryId) ?? { name: p.categoryName, items: [] };
    g.items.push({ product: p, price: v.price });
    groups.set(p.categoryId, g);
  }
  return [...groups.values()];
}

/**
 * "Quantos sabores?": inteira ou metade/metade (só G, GG e F). Na metade/metade, o
 * cliente escolhe o outro sabor numa lista simples; vale o preço do sabor mais caro.
 */
export function HalfPicker({
  product,
  variant,
  pizzas,
  value,
  onChange,
  now,
}: {
  product: CatalogProduct;
  variant: CatalogVariant | null;
  pizzas: CatalogProduct[];
  value: string | null;
  onChange: (halfProductId: string | null) => void;
  now: Date;
}) {
  const [two, setTwo] = useState(value != null);
  const [choosing, setChoosing] = useState(false);
  if (product.kind !== 'pizza' || !variant) return null;
  if (!canBeHalved(product, variant)) {
    return <p className="text-sm text-muted">Pizza com 2 sabores (metade/metade) nos tamanhos {HALF_SIZES.join(', ')}.</p>;
  }
  const groups = halfOptions(product, variant, pizzas, now);
  if (groups.length === 0) return null;
  const chosen = pizzas.find((p) => p.id === value) ?? null;
  const showList = two && (!chosen || choosing);

  return (
    <fieldset className="space-y-3" data-testid="half-picker">
      <legend className="mb-2 font-display text-lg font-semibold">Quantos sabores?</legend>
      <div className="grid grid-cols-2 gap-2">
        <Choice
          pressed={!two}
          onClick={() => {
            setTwo(false);
            setChoosing(false);
            onChange(null);
          }}
          title="1 sabor"
          subtitle="Pizza inteira"
        />
        <Choice pressed={two} onClick={() => setTwo(true)} title="2 sabores" subtitle="Metade/metade" testId="half-two" />
      </div>

      {two && chosen && !choosing ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-mist px-4 py-3" data-testid="half-chosen">
          <p className="font-semibold">
            ½ {flavorName(product.name)} + ½ {flavorName(chosen.name)}
          </p>
          <button type="button" onClick={() => setChoosing(true)} className="shrink-0 text-sm font-semibold text-gold underline underline-offset-4">
            Trocar
          </button>
        </div>
      ) : null}

      {showList ? (
        <div className="space-y-4">
          <p className="text-base font-semibold">
            A outra metade vai ser de quê? <span className="block text-sm font-normal text-muted">Vale o preço do sabor mais caro.</span>
          </p>
          {groups.map((g) => (
            <div key={g.name}>
              <p className="mb-2 text-sm font-semibold text-gold">{g.name}</p>
              <ul className="space-y-2">
                {g.items.map(({ product: p, price }) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(p.id);
                        setChoosing(false);
                      }}
                      aria-pressed={value === p.id}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-line transition-colors hover:ring-gold',
                        value === p.id && 'ring-2 ring-gold',
                      )}
                      data-testid="half-option"
                    >
                      <span className="min-w-0 flex-1 text-lg font-semibold leading-tight">{flavorName(p.name)}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-gold">{formatBRL(price)}</span>
                      {value === p.id ? <Check className="size-5 shrink-0 text-gold" aria-hidden /> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}

function Choice({ pressed, onClick, title, subtitle, testId }: { pressed: boolean; onClick: () => void; title: string; subtitle: string; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn('rounded-2xl px-4 py-3 text-left ring-1 transition-colors', pressed ? 'bg-mist ring-2 ring-gold' : 'bg-surface ring-line hover:ring-gold')}
      data-testid={testId}
    >
      <span className="block text-lg font-bold">{title}</span>
      <span className="block text-sm text-muted">{subtitle}</span>
    </button>
  );
}

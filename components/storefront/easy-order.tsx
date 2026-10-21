'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import type { Catalog, CatalogProduct, CatalogVariant } from '@/types/catalog';
import type { MenuGroup } from '@/lib/catalog/groups';
import { formatBRL, type Cents } from '@/lib/money';
import { isProductOrderable, priceLine } from '@/lib/pricing';
import { useNow } from '@/lib/use-now';
import { Dialog } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/ui/quantity';
import { useProductDialog } from './product-dialog';

/** Chave do tamanho: o código (P, M, G…) ou, sem código, o nome da variante. */
const sizeKey = (v: CatalogVariant) => v.sizeCode ?? v.name;
/** "Ingredientes principais: molho, …" → "Molho, …" (mais curto para ler). */
const describe = (p: CatalogProduct) => {
  const text = (p.shortDescription ?? '').replace(/^ingredientes principais:\s*/i, '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
};

/**
 * Pedido passo a passo, pensado para quem não tem costume com celular:
 * 1) tipo (ex.: tradicionais, especiais…), 2) tamanho (do maior para o menor),
 * 3) sabor — só nome, do que é feito e preço. Passos que não se aplicam são pulados.
 * O passo fica no endereço (?tipo=…&tamanho=…), então o "voltar" do celular funciona.
 */
export function EasyOrder({ catalog, group }: { catalog: Catalog; group: MenuGroup }) {
  const params = useSearchParams();
  const router = useRouter();
  const now = useNow(catalog.fetchedAt);
  const dialog = useProductDialog();
  const [picked, setPicked] = useState<{ product: CatalogProduct; variant: CatalogVariant | null } | null>(null);

  const categories = catalog.categories.filter((c) => group.slugs.includes(c.slug) && catalog.products.some((p) => p.categoryId === c.id));
  const productsOf = (categoryId: string) => catalog.products.filter((p) => p.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
  const priceOf = (p: CatalogProduct, v: CatalogVariant | null): Cents | null => {
    if (!isProductOrderable(p, now) || (v && !v.isAvailable)) return null;
    const r = priceLine(p, { productId: p.id, variantId: v?.id ?? p.variants[0]?.id ?? null, options: {}, quantity: 1 }, { now, openShifts: null });
    return r.ok ? r.line.unitPrice : null;
  };
  const minPrice = (list: (Cents | null)[]) => {
    const valid = list.filter((x): x is Cents => x != null);
    return valid.length ? (Math.min(...valid) as Cents) : null;
  };

  const go = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    router.push(`${group.path}${q.size ? `?${q}` : ''}`);
  };

  const skipType = categories.length === 1;
  const category = skipType ? categories[0] : categories.find((c) => c.slug === params.get('tipo'));
  const products = category ? productsOf(category.id) : [];
  // Tamanhos do tipo escolhido, do maior para o menor (F, GG, G, M, P).
  const sizes = new Map<string, CatalogVariant>();
  for (const p of products) for (const v of p.variants) if (!sizes.has(sizeKey(v))) sizes.set(sizeKey(v), v);
  const sizeList = [...sizes.values()].sort((a, b) => b.sortOrder - a.sortOrder);
  const skipSize = sizeList.length <= 1;
  const size = skipSize ? null : sizeList.find((v) => sizeKey(v) === params.get('tamanho')) ?? null;

  const step = !category ? 'tipo' : !skipSize && !size ? 'tamanho' : 'sabor';
  // Antes de escolher o tipo, conta o passo do tamanho se algum tipo do grupo tiver tamanhos.
  const hasSizes = (categoryId: string) => new Set(productsOf(categoryId).flatMap((p) => p.variants.map(sizeKey))).size > 1;
  const sizeStep = category ? !skipSize : categories.some((c) => hasSizes(c.id));
  const steps = [!skipType && 'tipo', sizeStep && 'tamanho', 'sabor'].filter(Boolean) as string[];
  const stepNumber = steps.indexOf(step) + 1;
  const back = step === 'sabor' && !skipSize ? () => go({ tamanho: null }) : step === 'sabor' && !skipType ? () => go({ tipo: null }) : step === 'tamanho' && !skipType ? () => go({ tipo: null, tamanho: null }) : null;
  const [one, many] = group.key === 'pizzas' ? ['sabor', 'sabores'] : ['item', 'itens'];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6" data-testid="easy-order">
      <div className="flex items-center justify-between gap-3">
        {back ? (
          <button type="button" onClick={back} className="inline-flex h-12 items-center gap-2 rounded-full bg-mist px-5 text-base font-semibold hover:bg-line">
            <ArrowLeft className="size-5" aria-hidden /> Voltar
          </button>
        ) : (
          <span />
        )}
        {steps.length > 1 ? (
          <p className="text-sm font-semibold text-muted" aria-live="polite">
            Passo {stepNumber} de {steps.length}
          </p>
        ) : null}
      </div>

      {step === 'tipo' ? (
        <Step title="Qual tipo você quer?">
          {categories.map((c) => {
            const list = productsOf(c.id);
            const from = minPrice(list.flatMap((p) => (p.variants.length ? p.variants.map((v) => priceOf(p, v)) : [priceOf(p, null)])));
            return (
              <BigChoice
                key={c.id}
                title={c.name}
                subtitle={`${list.length} ${list.length === 1 ? one : many}${from ? ` · a partir de ${formatBRL(from)}` : ''}`}
                onClick={() => go({ tipo: c.slug, tamanho: null })}
              />
            );
          })}
        </Step>
      ) : null}

      {step === 'tamanho' && category ? (
        <Step title="Qual tamanho?" hint={category.name}>
          {sizeList.map((v) => {
            const price = minPrice(products.map((p) => priceOf(p, p.variants.find((x) => sizeKey(x) === sizeKey(v)) ?? null)));
            const allSame = new Set(products.map((p) => priceOf(p, p.variants.find((x) => sizeKey(x) === sizeKey(v)) ?? null)).filter((x) => x != null)).size <= 1;
            return (
              <BigChoice
                key={sizeKey(v)}
                title={v.name}
                subtitle={price != null ? `${allSame ? '' : 'a partir de '}${formatBRL(price)}` : 'Indisponível agora'}
                onClick={() => go({ tamanho: sizeKey(v) })}
              />
            );
          })}
        </Step>
      ) : null}

      {step === 'sabor' && category ? (
        <Step title={group.key === 'pizzas' ? 'Qual sabor?' : 'O que vai ser?'} hint={[category.name, size?.name].filter(Boolean).join(' · ')}>
          {products.map((p) => {
            const variant = size ? p.variants.find((v) => sizeKey(v) === sizeKey(size)) ?? null : p.variants[0] ?? null;
            const price = size && !variant ? null : priceOf(p, variant);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={price == null}
                  onClick={() => setPicked({ product: p, variant })}
                  className="flex w-full items-center gap-4 rounded-2xl bg-surface px-5 py-4 text-left ring-1 ring-line transition-colors hover:ring-gold disabled:opacity-55"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl font-semibold leading-tight">{p.name}</span>
                    {describe(p) ? <span className="mt-1 block text-base text-muted">{describe(p)}</span> : null}
                  </span>
                  <span className="shrink-0 text-right">
                    {price != null ? (
                      <span className="block text-lg font-bold tabular-nums text-gold">{formatBRL(price)}</span>
                    ) : (
                      <span className="block text-sm text-muted">{isProductOrderable(p, now) ? 'Indisponível' : 'Preço a definir'}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </Step>
      ) : null}

      {picked ? (
        <AddSheet
          product={picked.product}
          variant={picked.variant}
          unitPrice={priceOf(picked.product, picked.variant)}
          description={describe(picked.product)}
          onClose={() => setPicked(null)}
          onAdd={(qty) => {
            if (dialog.addDirect(picked.product, picked.variant?.id ?? null, qty)) setPicked(null);
          }}
          onCustomize={() => {
            const { product, variant } = picked;
            setPicked(null);
            dialog.open(product, catalog.fetchedAt, null, variant?.id ?? null);
          }}
        />
      ) : null}
    </div>
  );
}

function Step({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      {hint ? <p className="text-base font-semibold text-gold">{hint}</p> : null}
      <h2 className="font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      <ul className="mt-5 space-y-3">{children}</ul>
    </section>
  );
}

function BigChoice({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-20 w-full items-center gap-4 rounded-2xl bg-surface px-5 py-4 text-left ring-1 ring-line transition-colors hover:ring-gold"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl font-semibold leading-tight sm:text-3xl">{title}</span>
          <span className="mt-1 block text-base text-muted">{subtitle}</span>
        </span>
        <ChevronRight className="size-7 shrink-0 text-gold" aria-hidden />
      </button>
    </li>
  );
}

/** Confirmação simples: quantidade e "Adicionar ao pedido". Borda, molho e observação ficam num link. */
function AddSheet({
  product,
  variant,
  unitPrice,
  description,
  onClose,
  onAdd,
  onCustomize,
}: {
  product: CatalogProduct;
  variant: CatalogVariant | null;
  unitPrice: Cents | null;
  description: string | null;
  onClose: () => void;
  onAdd: (quantity: number) => void;
  onCustomize: () => void;
}) {
  const [qty, setQty] = useState(1);
  const hasExtras = product.groups.some((g) => g.values.some((v) => v.isAvailable));
  return (
    <Dialog open onClose={onClose} title={product.name} description={variant && product.variants.length > 1 ? variant.name : product.categoryName} side="bottom">
      <div className="space-y-5 pb-2">
        {description ? <p className="text-lg text-muted">{description}</p> : null}
        <div className="flex items-center justify-between gap-4">
          <QuantityStepper value={qty} onChange={setQty} max={product.maxQuantity} />
          {unitPrice != null ? <p className="text-2xl font-bold tabular-nums text-gold">{formatBRL((unitPrice * qty) as Cents)}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onAdd(qty)}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-[var(--shadow-float)] hover:bg-brand-700"
          data-testid="easy-add"
        >
          <ShoppingBag className="size-6" aria-hidden /> Adicionar ao pedido
        </button>
        {hasExtras ? (
          <button type="button" onClick={onCustomize} className="w-full text-center text-base font-semibold text-gold underline underline-offset-4">
            Quero borda, molho ou observação
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}

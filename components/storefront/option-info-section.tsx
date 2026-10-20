import type { CatalogCategory, CatalogOptionGroup } from '@/types/catalog';
import { formatBRL } from '@/lib/money';

const SIZE_ORDER = ['P', 'M', 'G', 'GG', 'F'];
const SIZE_LABEL: Record<string, string> = { P: 'Pequena', M: 'Média', G: 'Grande', GG: 'Gigante', F: 'Família' };

/**
 * Seção informativa do cardápio para um grupo compartilhado: tabela de preços por
 * tamanho (bordas) ou lista simples (molhos). A escolha acontece no produto.
 */
export function OptionInfoSection({ category, group }: { category: CatalogCategory; group: CatalogOptionGroup }) {
  const values = group.values.filter((v) => v.isAvailable || !v.priceConfirmed);
  const sizes = SIZE_ORDER.filter((code) => values.some((v) => v.sizeRules[code]));
  return (
    <section id={category.slug} aria-labelledby={`cat-${category.slug}`} className="mt-10 scroll-mt-48" data-testid={`info-${category.slug}`}>
      <h2 id={`cat-${category.slug}`} className="font-display text-2xl font-semibold sm:text-3xl">
        {category.name}
      </h2>
      {category.description ? <p className="mt-1 text-muted">{category.description}</p> : null}
      {sizes.length > 0 ? (
        <div tabIndex={0} role="region" aria-label={`Valores de ${group.name.toLowerCase()} por tamanho`} className="mt-4 overflow-x-auto focus-visible:outline-3 focus-visible:outline-gold rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">Preço de cada {group.name.toLowerCase()} por tamanho da pizza</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3">{group.name}</th>
                {sizes.map((code) => (
                  <th key={code} scope="col" className="px-3 py-3 text-right">
                    {SIZE_LABEL[code] ?? code} <span className="text-muted">({code})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-3 text-left font-medium text-muted-strong">Sem borda</th>
                {sizes.map((code) => (
                  <td key={code} className="px-3 py-3 text-right text-muted">—</td>
                ))}
              </tr>
              {values.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-semibold">{v.name}</th>
                  {sizes.map((code) => {
                    const rule = v.sizeRules[code];
                    return (
                      <td key={code} className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-gold">
                        {!v.priceConfirmed ? 'a definir' : rule && rule.isOffered && rule.price !== null ? `+ ${formatBRL(rule.price)}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
              <span className="font-semibold">{v.name}</span>
              <span className="text-sm tabular-nums text-gold">
                {!v.priceConfirmed ? 'Valor a definir' : v.price === 0 ? 'Grátis' : `+ ${formatBRL(v.price)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted">
        {group.kind === 'crust' ? 'Escolha a borda ao montar a sua pizza. O valor é somado ao preço da pizza.' : 'Disponíveis como adicional nos produtos indicados.'}
      </p>
    </section>
  );
}

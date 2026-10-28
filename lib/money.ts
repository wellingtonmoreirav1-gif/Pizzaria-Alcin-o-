/**
 * Dinheiro é manipulado em CENTAVOS inteiros no código e em numeric(10,2) no banco.
 * Nunca some valores em reais com ponto flutuante.
 */
export type Cents = number;

export function toCents(value: number | string | null | undefined): Cents {
  if (value === null || value === undefined || value === '') return 0;
  const text = typeof value === 'number' ? value.toFixed(2) : value.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error(`Valor monetário inválido: ${String(value)}`);
  }
  const negative = text.startsWith('-');
  const [intPart = '0', decPart = ''] = text.replace('-', '').split('.');
  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, '0'));
  return negative ? -cents : cents;
}

export function toCentsOrNull(value: number | string | null | undefined): Cents | null {
  if (value === null || value === undefined || value === '') return null;
  return toCents(value);
}

/** Converte centavos para string decimal aceita pelo PostgreSQL ("12.50"). */
export function centsToDecimal(cents: Cents): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  return `${negative ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(cents: Cents): string {
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/** Lê um valor digitado pelo usuário ("12,50", "R$ 1.234,00") e devolve centavos. */
export function parseBRLInput(input: string): Cents | null {
  const cleaned = input
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (cleaned === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return toCents(cleaned);
}

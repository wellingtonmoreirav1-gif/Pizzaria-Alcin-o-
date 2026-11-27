/** Normaliza telefone brasileiro para apenas dígitos com DDD (10 ou 11 dígitos). */
export function normalizeBrazilPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  if (digits.length !== 10 && digits.length !== 11) return null;
  if (digits.length === 11 && digits[2] !== '9') return null;
  return digits;
}

export function formatBrazilPhone(digits: string): string {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

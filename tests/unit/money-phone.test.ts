import { describe, expect, it } from 'vitest';
import { centsToDecimal, formatBRL, parseBRLInput, toCents } from '@/lib/money';
import { formatBrazilPhone, normalizeBrazilPhone } from '@/lib/phone';
import { slugify, normalizeSearch } from '@/lib/utils';

describe('money', () => {
  it('converts without floating point drift', () => {
    expect(toCents('0.1')).toBe(10);
    expect(toCents(19.9)).toBe(1990);
    expect(toCents('1234.56')).toBe(123456);
    expect(toCents(null)).toBe(0);
    expect(centsToDecimal(1990)).toBe('19.90');
    expect(centsToDecimal(5)).toBe('0.05');
    expect(() => toCents('abc')).toThrow();
  });
  it('formats and parses BRL', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(parseBRLInput('R$ 1.234,56')).toBe(123456);
    expect(parseBRLInput('12,5')).toBe(1250);
    expect(parseBRLInput('abc')).toBeNull();
  });
});

describe('phone', () => {
  it('normalizes Brazilian phones', () => {
    expect(normalizeBrazilPhone('(83) 99921-6691')).toBe('83999216691');
    expect(normalizeBrazilPhone('+55 83 99921-6691')).toBe('83999216691');
    expect(normalizeBrazilPhone('83 3444-1234')).toBe('8334441234');
    expect(normalizeBrazilPhone('123')).toBeNull();
    expect(normalizeBrazilPhone('83 89921-6691')).toBeNull();
    expect(formatBrazilPhone('83999216691')).toBe('(83) 99921-6691');
  });
});

describe('text utils', () => {
  it('slugifies and normalizes', () => {
    expect(slugify('Pizza Calabresa & Queijo Coalho')).toBe('pizza-calabresa-queijo-coalho');
    expect(normalizeSearch('  Almoço ')).toBe('almoco');
  });
});

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClosingInfo } from '@/components/storefront/closing-info';
import type { BusinessHourRow } from '@/lib/business-hours';

/** Horário com almoço e noite em todos os dias, menos os de folga. */
const hours = (closed: number[]): BusinessHourRow[] =>
  [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
    (['lunch', 'dinner'] as const).map((shift) => ({
      weekday,
      shift,
      opensAt: shift === 'lunch' ? '10:30' : '18:30',
      closesAt: shift === 'lunch' ? null : '23:00',
      isActive: !closed.includes(weekday),
    })),
  );
const text = (rows: BusinessHourRow[]) => renderToStaticMarkup(<ClosingInfo delivery hours={rows} />).replace(/<[^>]+>/g, '');

describe('"Bom saber": dia de folga vem do horário cadastrado', () => {
  it('terça fechada o dia todo', () => {
    const t = text(hours([2]));
    expect(t).toContain('Fechamos às terças');
    expect(t).toContain('Às terças-feiras o restaurante não abre.');
  });

  it('só um turno fechado não é folga', () => {
    const rows = hours([]).map((h) => (h.weekday === 2 && h.shift === 'lunch' ? { ...h, isActive: false } : h));
    expect(text(rows)).not.toContain('Fechamos');
  });

  it('mais de um dia, e domingo com "aos"', () => {
    expect(text(hours([1, 2]))).toContain('Fechamos às segundas e terças');
    expect(text(hours([0]))).toContain('Fechamos aos domingos');
  });

  it('todos abertos ou sem horário (dados fora do ar): não afirma folga', () => {
    expect(text(hours([]))).not.toContain('Fechamos');
    expect(text([])).not.toContain('Fechamos');
  });
});

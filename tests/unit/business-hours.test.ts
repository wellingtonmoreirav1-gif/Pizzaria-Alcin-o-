import { describe, expect, it } from 'vitest';
import { computeStoreStatus, shiftsForDate, type HoursConfig } from '@/lib/business-hours';

// America/Fortaleza = UTC-3 (sem horário de verão). 2026-10-19 é uma segunda-feira.
const at = (local: string) => new Date(`${local}-03:00`);

function config(overrides: Partial<HoursConfig['settings']> = {}, extra: Partial<HoursConfig> = {}): HoursConfig {
  const hours = [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
    { weekday, shift: 'lunch' as const, opensAt: '10:30:00', closesAt: null, isActive: true },
    { weekday, shift: 'dinner' as const, opensAt: '18:30:00', closesAt: '23:00:00', isActive: true },
  ]);
  return {
    hours,
    exceptions: [],
    settings: {
      timezone: 'America/Fortaleza',
      acceptingOrders: true,
      pausedUntil: null,
      pauseMessage: null,
      lunchClosedOn: null,
      orderGraceMinutes: 0,
      ...overrides,
    },
    ...extra,
  };
}

describe('business hours', () => {
  it('is closed before lunch and shows next opening', () => {
    const s = computeStoreStatus(config(), at('2026-10-19T09:00:00'));
    expect(s.acceptingOrders).toBe(false);
    expect(s.reason).toBe('closed');
    expect(s.nextOpening?.label).toBe('hoje às 10h30 (almoço)');
  });

  it('is open at lunch with manual close label, lunch runs until dinner starts', () => {
    const s = computeStoreStatus(config(), at('2026-10-19T12:00:00'));
    expect(s.acceptingOrders).toBe(true);
    expect(s.openShifts).toEqual(['lunch']);
    expect(s.closesAtLabel).toBe('até acabar a comida');
    const windows = shiftsForDate(config(), '2026-10-19');
    expect(windows[0]).toMatchObject({ shift: 'lunch', start: 630, end: 1110, manualClose: true });
  });

  it('closing lunch early keeps dinner intact', () => {
    const c = config({ lunchClosedOn: '2026-10-19' });
    const afternoon = computeStoreStatus(c, at('2026-10-19T13:00:00'));
    expect(afternoon.acceptingOrders).toBe(false);
    expect(afternoon.lunchClosedToday).toBe(true);
    expect(afternoon.message).toContain('almoço de hoje já foi encerrado');
    expect(afternoon.nextOpening?.label).toBe('hoje às 18h30 (noite)');
    const night = computeStoreStatus(c, at('2026-10-19T19:00:00'));
    expect(night.acceptingOrders).toBe(true);
    expect(night.openShifts).toEqual(['dinner']);
    // No dia seguinte o almoço volta automaticamente.
    expect(computeStoreStatus(c, at('2026-10-20T11:00:00')).acceptingOrders).toBe(true);
  });

  it('closes at 23h and respects grace minutes', () => {
    expect(computeStoreStatus(config(), at('2026-10-19T22:59:00')).acceptingOrders).toBe(true);
    const late = computeStoreStatus(config(), at('2026-10-19T23:05:00'));
    expect(late.acceptingOrders).toBe(false);
    expect(late.nextOpening?.label).toBe('amanhã às 10h30 (almoço)');
    expect(computeStoreStatus(config({ orderGraceMinutes: 10 }), at('2026-10-19T23:05:00')).acceptingOrders).toBe(true);
  });

  it('manual suspension and temporary pause block orders inside hours', () => {
    const suspended = computeStoreStatus(config({ acceptingOrders: false, pauseMessage: 'Voltamos já' }), at('2026-10-19T19:00:00'));
    expect(suspended.reason).toBe('suspended');
    expect(suspended.message).toBe('Voltamos já');
    const paused = computeStoreStatus(config({ pausedUntil: at('2026-10-19T19:30:00').toISOString() }), at('2026-10-19T19:00:00'));
    expect(paused.reason).toBe('paused');
    expect(paused.acceptingOrders).toBe(false);
    expect(paused.message).toContain('19h30');
    const resumed = computeStoreStatus(config({ pausedUntil: at('2026-10-19T19:30:00').toISOString() }), at('2026-10-19T19:31:00'));
    expect(resumed.acceptingOrders).toBe(true);
  });

  it('holidays and special hours override the regular schedule', () => {
    const holiday = config({}, { exceptions: [{ date: '2026-10-19', shift: null, isClosed: true, opensAt: null, closesAt: null, note: 'Feriado' }] });
    const s = computeStoreStatus(holiday, at('2026-10-19T19:00:00'));
    expect(s.acceptingOrders).toBe(false);
    expect(s.nextOpening?.label).toBe('amanhã às 10h30 (almoço)');
    const special = config(
      {},
      { exceptions: [{ date: '2026-10-19', shift: 'dinner', isClosed: false, opensAt: '19:00:00', closesAt: '21:00:00', note: null }] },
    );
    // Almoço sem horário de fechamento segue aberto até o jantar especial começar (19h).
    expect(computeStoreStatus(special, at('2026-10-19T18:45:00')).openShifts).toEqual(['lunch']);
    expect(computeStoreStatus(special, at('2026-10-19T20:00:00')).closesAtLabel).toBe('até 21h');
  });

  it('inactive weekdays are skipped when looking for next opening', () => {
    const c = config();
    c.hours = c.hours.map((h) => (h.weekday === 2 ? { ...h, isActive: false } : h));
    const s = computeStoreStatus(c, at('2026-10-19T23:30:00'));
    expect(s.nextOpening?.label).toBe('quarta-feira às 10h30 (almoço)');
  });
});

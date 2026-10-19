/**
 * Regras de funcionamento (fuso America/Fortaleza por padrão).
 *
 * - Cada dia tem turnos (almoço e noite) com abertura e, opcionalmente, fechamento.
 * - Almoço sem horário de fechamento fica aberto até a equipe encerrar no painel;
 *   por segurança, termina automaticamente quando o próximo turno do dia começa.
 * - Exceções (feriados, horários especiais) substituem o horário regular da data.
 * - "Recebimento de pedidos" desligado ou pausa temporária bloqueiam novos pedidos
 *   mesmo dentro do horário.
 * - Tolerância (order_grace_minutes): pedidos ENVIADOS até X minutos após o
 *   fechamento ainda são aceitos. O que vale é o horário em que o servidor recebe
 *   o pedido, não o horário em que o cliente começou a montar o carrinho.
 */
import type { ServiceShift } from '@/types/catalog';

export interface BusinessHourRow {
  weekday: number;
  shift: ServiceShift;
  opensAt: string; // HH:MM ou HH:MM:SS
  closesAt: string | null;
  isActive: boolean;
}

export interface BusinessHourException {
  date: string; // YYYY-MM-DD
  shift: ServiceShift | null;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
}

export interface OperationSettings {
  timezone: string;
  acceptingOrders: boolean;
  pausedUntil: string | null;
  pauseMessage: string | null;
  lunchClosedOn: string | null;
  orderGraceMinutes: number;
}

export interface HoursConfig {
  hours: BusinessHourRow[];
  exceptions: BusinessHourException[];
  settings: OperationSettings;
}

export interface ShiftWindow {
  shift: ServiceShift;
  start: number; // minutos desde 00:00 (hora local)
  end: number; // minutos desde 00:00 (exclusivo)
  manualClose: boolean;
  note: string | null;
}

export type StoreStatusReason = 'open' | 'closed' | 'paused' | 'suspended';

export interface NextOpening {
  date: string;
  time: string;
  shift: ServiceShift;
  label: string;
}

export interface StoreStatus {
  isWithinHours: boolean;
  acceptingOrders: boolean;
  reason: StoreStatusReason;
  openShifts: ServiceShift[];
  message: string;
  closesAtLabel: string | null;
  lunchClosedToday: boolean;
  nextOpening: NextOpening | null;
  localDate: string;
  localTime: string;
}

const SHIFT_LABEL: Record<ServiceShift, string> = { lunch: 'almoço', dinner: 'noite' };
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DAY_MINUTES = 24 * 60;

export function timeToMinutes(value: string): number {
  const [h = '0', m = '0'] = value.split(':');
  return Number(h) * 60 + Number(m);
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Data, dia da semana e minutos locais de um instante, no fuso informado. */
export function localParts(now: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday ?? '');
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { date, weekday: weekdayIndex, minutes, time: `${parts.hour}:${parts.minute}` };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Turnos efetivos de uma data (horário regular + exceções + almoço encerrado). */
export function shiftsForDate(config: HoursConfig, date: string): ShiftWindow[] {
  const weekday = weekdayOf(date);
  const exceptions = config.exceptions.filter((e) => e.date === date);
  if (exceptions.some((e) => e.shift === null && e.isClosed)) return [];

  const byShift = new Map<ServiceShift, { opensAt: string; closesAt: string | null; note: string | null }>();
  for (const row of config.hours) {
    if (row.weekday === weekday && row.isActive) {
      byShift.set(row.shift, { opensAt: row.opensAt, closesAt: row.closesAt, note: null });
    }
  }
  for (const ex of exceptions) {
    if (!ex.shift) continue;
    if (ex.isClosed) byShift.delete(ex.shift);
    else if (ex.opensAt) byShift.set(ex.shift, { opensAt: ex.opensAt, closesAt: ex.closesAt, note: ex.note });
  }
  if (config.settings.lunchClosedOn === date) byShift.delete('lunch');

  const windows = [...byShift.entries()]
    .map(([shift, v]) => ({
      shift,
      start: timeToMinutes(v.opensAt),
      rawEnd: v.closesAt ? timeToMinutes(v.closesAt) : null,
      note: v.note,
    }))
    .sort((a, b) => a.start - b.start);

  return windows.map((w, i) => {
    const next = windows[i + 1];
    const end = w.rawEnd ?? (next ? next.start : DAY_MINUTES);
    return { shift: w.shift, start: w.start, end, manualClose: w.rawEnd === null, note: w.note };
  });
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'hoje';
  if (date === addDays(today, 1)) return 'amanhã';
  return WEEKDAYS[weekdayOf(date)] ?? date;
}

export function findNextOpening(config: HoursConfig, fromDate: string, fromMinutes: number): NextOpening | null {
  for (let offset = 0; offset < 21; offset++) {
    const date = addDays(fromDate, offset);
    for (const w of shiftsForDate(config, date)) {
      if (offset === 0 && w.start <= fromMinutes) continue;
      const time = `${String(Math.floor(w.start / 60)).padStart(2, '0')}:${String(w.start % 60).padStart(2, '0')}`;
      return {
        date,
        time,
        shift: w.shift,
        label: `${dayLabel(date, fromDate)} às ${minutesToLabel(w.start)} (${SHIFT_LABEL[w.shift]})`,
      };
    }
  }
  return null;
}

export function computeStoreStatus(config: HoursConfig, now: Date): StoreStatus {
  const { timezone, acceptingOrders, pausedUntil, pauseMessage, orderGraceMinutes, lunchClosedOn } = config.settings;
  const local = localParts(now, timezone);
  const windows = shiftsForDate(config, local.date);
  const grace = Math.max(0, orderGraceMinutes);

  const open = windows.filter((w) => local.minutes >= w.start && local.minutes < w.end + grace);
  const openShifts = open.map((w) => w.shift);
  const isWithinHours = open.length > 0;
  const lunchClosedToday = lunchClosedOn === local.date;
  const current = open[open.length - 1];
  const closesAtLabel = current
    ? current.manualClose
      ? current.shift === 'lunch'
        ? 'até acabar a comida'
        : null
      : `até ${minutesToLabel(current.end)}`
    : null;

  const base = { openShifts, isWithinHours, lunchClosedToday, closesAtLabel, localDate: local.date, localTime: local.time };

  if (!acceptingOrders) {
    return {
      ...base,
      acceptingOrders: false,
      reason: 'suspended',
      openShifts: [],
      message: pauseMessage ?? 'No momento não estamos recebendo pedidos pelo site.',
      nextOpening: null,
    };
  }

  if (pausedUntil && new Date(pausedUntil) > now) {
    const resume = localParts(new Date(pausedUntil), timezone);
    return {
      ...base,
      acceptingOrders: false,
      reason: 'paused',
      openShifts: [],
      message: pauseMessage ?? `Pedidos pausados por alguns minutos. Voltamos às ${minutesToLabel(resume.minutes)}.`,
      nextOpening: isWithinHours
        ? { date: resume.date, time: resume.time, shift: openShifts[0] ?? 'dinner', label: `hoje às ${minutesToLabel(resume.minutes)}` }
        : findNextOpening(config, local.date, local.minutes),
    };
  }

  if (!isWithinHours) {
    const next = findNextOpening(config, local.date, local.minutes);
    const lunchNote = lunchClosedToday && local.minutes < timeToMinutes('18:00') ? 'O almoço de hoje já foi encerrado. ' : '';
    return {
      ...base,
      acceptingOrders: false,
      reason: 'closed',
      message: `${lunchNote}Estamos fechados agora.${next ? ` Abrimos ${next.label}.` : ''}`,
      nextOpening: next,
    };
  }

  return {
    ...base,
    acceptingOrders: true,
    reason: 'open',
    message: `Aberto agora${closesAtLabel ? ` — ${closesAtLabel}` : ''}.`,
    nextOpening: null,
  };
}

export const SHIFT_LABELS = SHIFT_LABEL;
export const WEEKDAY_LABELS = WEEKDAYS;

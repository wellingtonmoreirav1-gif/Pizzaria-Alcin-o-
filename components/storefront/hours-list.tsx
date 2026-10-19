import type { BusinessHourRow } from '@/lib/business-hours';
import { minutesToLabel, timeToMinutes, WEEKDAY_LABELS } from '@/lib/business-hours';
import { cn } from '@/lib/utils';

/** Lista de horários agrupando dias com o mesmo funcionamento. */
export function HoursList({ hours, tone = 'dark' }: { hours: BusinessHourRow[]; tone?: 'dark' | 'light' }) {
  const describe = (weekday: number) => {
    const rows = hours.filter((h) => h.weekday === weekday && h.isActive).sort((a, b) => timeToMinutes(a.opensAt) - timeToMinutes(b.opensAt));
    if (rows.length === 0) return 'Fechado';
    return rows
      .map((r) =>
        r.shift === 'lunch'
          ? `Almoço a partir das ${minutesToLabel(timeToMinutes(r.opensAt))}${r.closesAt ? ` até ${minutesToLabel(timeToMinutes(r.closesAt))}` : ' (até acabar)'}`
          : `Noite ${minutesToLabel(timeToMinutes(r.opensAt))}${r.closesAt ? `–${minutesToLabel(timeToMinutes(r.closesAt))}` : ''}`,
      )
      .join(' · ');
  };
  const groups: { days: number[]; text: string }[] = [];
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    const text = describe(day);
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.days.push(day);
    else groups.push({ days: [day], text });
  }
  const dayName = (d: number) => (WEEKDAY_LABELS[d] ?? '').replace('-feira', '');
  if (hours.length === 0) return <p className={cn('mt-3 text-sm', tone === 'light' ? 'text-white/60' : 'text-muted')}>Horários em atualização.</p>;
  return (
    <dl className={cn('mt-3 space-y-2 text-sm', tone === 'light' ? 'text-white/80' : 'text-ink-800')}>
      {groups.map((g) => (
        <div key={g.days.join()} className="flex flex-col">
          <dt className="font-semibold capitalize">
            {g.days.length === 7 ? 'Todos os dias' : g.days.length > 2 ? `${dayName(g.days[0] ?? 0)} a ${dayName(g.days[g.days.length - 1] ?? 0)}` : g.days.map(dayName).join(' e ')}
          </dt>
          <dd className={tone === 'light' ? 'text-white/60' : 'text-muted'}>{g.text}</dd>
        </div>
      ))}
    </dl>
  );
}

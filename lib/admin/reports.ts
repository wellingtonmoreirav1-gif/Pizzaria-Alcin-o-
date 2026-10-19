import 'server-only';

/** Data local (America/Fortaleza) de N dias atrás, AAAA-MM-DD. */
export function localDateDaysAgo(days = 0): string {
  return new Date(Date.now() - 3 * 3600e3 - days * 86400e3).toISOString().slice(0, 10);
}

export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400e3).toISOString();
}

/** Converte filtros da URL (datas locais de Fortaleza) em intervalo UTC [from, to). */
export function reportRange(sp: Record<string, string | string[] | undefined>) {
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const preset = get('periodo') || '30';
  let fromDate = get('de');
  let toDate = get('ate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    toDate = today;
    if (preset === 'hoje') fromDate = today;
    else if (preset === 'mes') fromDate = `${today.slice(0, 8)}01`;
    else {
      const days = Math.min(366, Math.max(1, Number(preset) || 30));
      fromDate = new Date(Date.parse(`${today}T12:00:00Z`) - (days - 1) * 86400e3).toISOString().slice(0, 10);
    }
  }
  if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
  const from = new Date(`${fromDate}T00:00:00-03:00`).toISOString();
  const to = new Date(Date.parse(`${toDate}T00:00:00-03:00`) + 86400e3).toISOString();
  const spanDays = Math.round((Date.parse(to) - Date.parse(from)) / 86400e3);
  const bucket = (['day', 'week', 'month'] as const).find((b) => b === get('agrupar')) ?? (spanDays > 120 ? 'month' : spanDays > 45 ? 'week' : 'day');
  return { from, to, fromDate, toDate, preset, bucket };
}

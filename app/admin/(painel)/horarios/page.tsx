import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { WEEKDAY_LABELS } from '@/lib/business-hours';
import { Card, PageHeader, SelectField, TextField } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { localDateDaysAgo } from '@/lib/admin/reports';
import { addException, removeException, saveWeek } from './actions';

export const metadata = { title: 'Horários' };

export default async function HoursPage() {
  await requireStaff([...PERMISSIONS.hours]);
  await connection();
  const supabase = await createSessionClient();
  const [hours, exceptions, settings] = await Promise.all([
    supabase.from('business_hours').select('weekday, shift, opens_at, closes_at, is_active'),
    supabase.from('business_hour_exceptions').select('*').gte('date', localDateDaysAgo(0)).order('date'),
    supabase.from('business_settings').select('order_grace_minutes').eq('id', 1).single(),
  ]);
  const find = (d: number, s: string) => (hours.data ?? []).find((h) => h.weekday === d && h.shift === s);
  const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Horários"
        description="Fuso America/Fortaleza. Almoço sem horário de fechamento fica aberto até ser encerrado em “Operação do dia” (ou até o início do turno da noite)."
      />
      <Card title="Grade semanal">
        <ActionForm action={saveWeek} submitLabel="Salvar horários">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2">Dia</th>
                  <th>Almoço: ativo / abre / fecha</th>
                  <th>Noite: ativo / abre / fecha</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <tr key={d} className="border-t border-line">
                    <th scope="row" className="py-2 pr-3 text-left font-medium capitalize">
                      {WEEKDAY_LABELS[d]}
                    </th>
                    {(['lunch', 'dinner'] as const).map((s) => {
                      const h = find(d, s);
                      return (
                        <td key={s} className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name={`active:${d}:${s}`}
                              defaultChecked={h?.is_active ?? false}
                              className="size-4 accent-brand-600"
                              aria-label={`${WEEKDAY_LABELS[d]} ${s === 'lunch' ? 'almoço' : 'noite'} ativo`}
                            />
                            <input
                              type="time"
                              name={`open:${d}:${s}`}
                              defaultValue={hhmm(h?.opens_at)}
                              className="h-9 rounded-lg border border-line px-2"
                              aria-label="Abre"
                            />
                            <input
                              type="time"
                              name={`close:${d}:${s}`}
                              defaultValue={hhmm(h?.closes_at)}
                              className="h-9 rounded-lg border border-line px-2"
                              aria-label="Fecha (vazio = até encerrar)"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TextField
            label="Tolerância após o fechamento (minutos)"
            name="grace"
            type="number"
            min={0}
            max={60}
            defaultValue={settings.data?.order_grace_minutes ?? 0}
            className="max-w-xs"
            hint="Pedidos ENVIADOS até X minutos depois do fechamento ainda são aceitos. O que vale é o horário do envio."
          />
        </ActionForm>
      </Card>

      <Card title="Feriados, folgas e horários especiais">
        <ul className="mb-4 divide-y divide-line text-sm">
          {(exceptions.data ?? []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <strong>{new Date(`${e.date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong> —{' '}
                {e.shift ? (e.shift === 'lunch' ? 'almoço' : 'noite') : 'dia inteiro'}:{' '}
                {e.is_closed ? 'fechado' : `${hhmm(e.opens_at)}–${hhmm(e.closes_at) || 'até encerrar'}`}
                {e.note ? ` · ${e.note}` : ''}
              </span>
              <ActionForm action={removeException.bind(null, e.id)} submitLabel="Remover" size="sm" variant="ghost" inline />
            </li>
          ))}
          {!exceptions.data?.length ? <li className="py-2 text-muted">Nenhuma exceção futura.</li> : null}
        </ul>
        <ActionForm action={addException} submitLabel="Adicionar exceção" resetOnSuccess>
          <div className="grid gap-3 md:grid-cols-6">
            <TextField label="Data" name="date" type="date" required />
            <SelectField label="Turno" name="shift" defaultValue="">
              <option value="">Dia inteiro</option>
              <option value="lunch">Almoço</option>
              <option value="dinner">Noite</option>
            </SelectField>
            <SelectField label="Tipo" name="type" defaultValue="closed">
              <option value="closed">Fechado</option>
              <option value="special">Horário especial</option>
            </SelectField>
            <TextField label="Abre" name="opensAt" type="time" />
            <TextField label="Fecha" name="closesAt" type="time" />
            <TextField label="Motivo" name="note" placeholder="Ex.: Feriado" maxLength={120} />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

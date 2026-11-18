import { Bike, CalendarX, Flame } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BusinessHourRow } from '@/lib/business-hours';

const DAY_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
const DAY_FULL = ['Aos domingos', 'Às segundas-feiras', 'Às terças-feiras', 'Às quartas-feiras', 'Às quintas-feiras', 'Às sextas-feiras', 'Aos sábados'];

/** "terças" / "terças e quartas" / "segundas, terças e quartas". */
const joinPt = (list: string[]) => (list.length < 2 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} e ${list.at(-1)}`);

/**
 * Fechamento da página inicial: o que o cliente precisa saber antes de pedir (informado pelo
 * restaurante). O dia de folga vem do horário cadastrado (Painel → Horários), para nunca
 * contradizer a lista de horários do rodapé.
 */
export function ClosingInfo({ delivery, hours }: { delivery: boolean; hours: BusinessHourRow[] }) {
  const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !hours.some((h) => h.weekday === d && h.isActive));
  const rows: { icon: ReactNode; title: ReactNode; text: string }[] = [
    ...(delivery
      ? [
          {
            icon: <Bike className="size-8 sm:size-10" aria-hidden />,
            title: (
              <>
                Fazemos <span className="italic text-gold">entrega</span>
              </>
            ),
            text: 'Monte o pedido aqui no site e receba em casa. A taxa é confirmada pela equipe no WhatsApp.',
          },
        ]
      : []),
    {
      icon: <Flame className="size-8 sm:size-10" aria-hidden />,
      title: (
        <>
          Rodízio de <span className="italic text-gold">churrasco</span>
        </>
      ),
      text: 'A partir de R$ 49,90. Presencial, no restaurante.',
    },
    // Sem horário cadastrado (dados fora do ar), não afirma nada sobre folga.
    ...(hours.length > 0 && closedDays.length > 0 && closedDays.length < 7
      ? [
          {
            icon: <CalendarX className="size-8 sm:size-10" aria-hidden />,
            title: (
              <>
                {closedDays[0] === 0 || closedDays[0] === 6 ? 'Fechamos aos' : 'Fechamos às'}{' '}
                <span className="italic text-gold">{joinPt(closedDays.map((d) => DAY_PLURAL[d]!))}</span>
              </>
            ),
            text: closedDays.length === 1 ? `${DAY_FULL[closedDays[0]!]} o restaurante não abre.` : 'Nesses dias o restaurante não abre.',
          },
        ]
      : []),
  ];
  return (
    <section aria-labelledby="fechamento-titulo" className="py-16 text-white sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 id="fechamento-titulo" className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Bom <span className="italic text-gold">saber</span>
        </h2>
        <ul className="mt-8 divide-y divide-white/15 border-y border-white/15">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2 py-8 sm:grid-cols-[auto_1fr_minmax(0,18rem)] sm:gap-x-8 sm:py-10">
              <span className="text-gold">{r.icon}</span>
              <p className="min-w-0 font-display text-[2rem] font-bold leading-tight [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">{r.title}</p>
              <p className="col-start-2 text-pretty text-white/80 sm:col-start-3 sm:text-right sm:text-lg">{r.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

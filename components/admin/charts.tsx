'use client';

import { useId, useState } from 'react';
import { formatBRL } from '@/lib/money';
import { cn } from '@/lib/utils';

/*
 * Gráficos leves em SVG/HTML (sem biblioteca). Regras: uma série por gráfico, um
 * único eixo, barras finas com ponta arredondada, grade discreta, tooltip no
 * hover/foco e tabela equivalente sempre disponível.
 */

const SERIES = 'var(--color-brand-600)';

function compact(cents: number, money: boolean) {
  const v = money ? cents / 100 : cents;
  if (Math.abs(v) >= 1000) return `${money ? 'R$ ' : ''}${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return money ? `R$ ${Math.round(v)}` : String(Math.round(v));
}

function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= max / 4) ?? 10;
  return Math.ceil(max / (step * pow)) * step * pow;
}

export interface ColumnDatum {
  label: string;
  value: number; // centavos quando money=true
  detail?: string;
}

export function ColumnChart({ data, money = true, title }: { data: ColumnDatum[]; money?: boolean; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  const width = 720;
  const height = 240;
  const pad = { top: 16, right: 8, bottom: 28, left: 64 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const band = innerW / Math.max(1, data.length);
  const barW = Math.min(24, Math.max(4, band - 2));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.ceil(data.length / 10);
  const fmt = (v: number) => (money ? formatBRL(v) : v.toLocaleString('pt-BR'));

  if (data.length === 0) return <p className="text-sm text-muted">Sem dados no período.</p>;

  return (
    <figure className="space-y-2">
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-labelledby={`${id}-t`}>
          <title id={`${id}-t`}>{title}</title>
          {ticks.map((t) => {
            const y = pad.top + innerH - (t / max) * innerH;
            return (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-[var(--color-muted)] text-[11px]">
                  {compact(t, money)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = (d.value / max) * innerH;
            const x = pad.left + i * band + (band - barW) / 2;
            const y = pad.top + innerH - h;
            const r = Math.min(4, h / 2, barW / 2);
            const path =
              h <= 0
                ? ''
                : `M${x},${pad.top + innerH} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${pad.top + innerH} Z`;
            return (
              <g
                key={d.label}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${fmt(d.value)}${d.detail ? `, ${d.detail}` : ''}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                <rect x={pad.left + i * band} y={pad.top} width={band} height={innerH} fill="transparent" />
                {path ? <path d={path} fill={SERIES} opacity={active === null || active === i ? 1 : 0.55} /> : null}
                {i % labelEvery === 0 ? (
                  <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="fill-[var(--color-muted)] text-[11px]">
                    {d.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        {active !== null && data[active] ? (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${((pad.left + active * band + band / 2) / width) * 100}%` }}
            role="status"
          >
            <p className="font-semibold">{data[active].label}</p>
            <p className="tabular-nums">{fmt(data[active].value)}</p>
            {data[active].detail ? <p className="text-white/70">{data[active].detail}</p> : null}
          </div>
        ) : null}
      </div>
      <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-semibold text-muted-strong underline" aria-expanded={showTable}>
        {showTable ? 'Ocultar tabela' : 'Ver como tabela'}
      </button>
      {showTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted"><th className="py-1">Período</th><th className="text-right">Valor</th><th className="text-right">Detalhe</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-line"><td className="py-1">{d.label}</td><td className="text-right tabular-nums">{fmt(d.value)}</td><td className="text-right text-muted">{d.detail ?? ''}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  secondary?: string;
}

/** Barras horizontais (ranking). O número fica na ponta, em cor de texto. */
export function BarList({ data, money = false, empty = 'Sem dados no período.' }: { data: BarDatum[]; money?: boolean; empty?: string }) {
  if (data.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="group" title={`${d.label}: ${money ? formatBRL(d.value) : d.value.toLocaleString('pt-BR')}${d.secondary ? ` · ${d.secondary}` : ''}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{d.label}</span>
            <span className="shrink-0 tabular-nums text-ink-800">
              {money ? formatBRL(d.value) : d.value.toLocaleString('pt-BR')}
              {d.secondary ? <span className="ml-2 text-xs text-muted">{d.secondary}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-mist">
            <div className={cn('h-2 rounded-full transition-opacity group-hover:opacity-80')} style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

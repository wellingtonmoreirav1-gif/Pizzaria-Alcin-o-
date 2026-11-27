/** Ilustração da pizza montada: uma fatia por sabor escolhido e borda destacada. */
export function PizzaVisual({ flavors, maxFlavors, hasCrust }: { flavors: string[]; maxFlavors: number; hasCrust: boolean }) {
  const parts = Math.max(1, flavors.length || 1);
  const r = 80;
  const cx = 100;
  const cy = 100;
  const fills = ['#c8102e', '#e5283b', '#a50d26', '#f05a6a', '#840b20', '#ff7b88', '#5c0716', '#ff9aa4'];
  const wedges = Array.from({ length: parts }, (_, i) => {
    const a0 = (i / parts) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / parts) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const mid = (a0 + a1) / 2;
    const path = parts === 1 ? null : `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
    return { path, mid, label: flavors[i] ?? '' };
  });
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 200 200"
        className="size-40 drop-shadow-[0_10px_25px_rgba(12,10,9,0.35)] sm:size-48"
        role="img"
        aria-label={flavors.length ? `Pizza com ${flavors.join(', ')}` : 'Escolha os sabores'}
      >
        <circle cx={cx} cy={cy} r={96} fill={hasCrust ? '#e9b26a' : '#d99a52'} />
        <circle cx={cx} cy={cy} r={hasCrust ? 86 : 90} fill="#f3d9a4" />
        {flavors.length === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#efe6d8" stroke="#d8cbb8" strokeDasharray="6 6" />
        ) : (
          wedges.map((w, i) =>
            w.path ? (
              <path key={i} d={w.path} fill={fills[i % fills.length]} stroke="#f3d9a4" strokeWidth="3" />
            ) : (
              <circle key={i} cx={cx} cy={cy} r={r} fill={fills[0]} />
            ),
          )
        )}
        {[
          [70, 70],
          [130, 85],
          [95, 130],
          [125, 125],
          [75, 115],
          [105, 60],
        ].map(([x, y], i) => (flavors.length ? <circle key={i} cx={x} cy={y} r={5} fill="#fff" fillOpacity={0.55} /> : null))}
      </svg>
      <figcaption className="text-center text-xs text-muted-strong">
        {flavors.length === 0
          ? `Escolha até ${maxFlavors} ${maxFlavors > 1 ? 'sabores' : 'sabor'}`
          : flavors.length > 1
            ? flavors.map((f) => `1/${flavors.length} ${f}`).join(' · ')
            : flavors[0]}
      </figcaption>
    </figure>
  );
}

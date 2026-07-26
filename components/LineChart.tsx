/**
 * Minimal dependency-free SVG line chart with an area fill.
 * Pure/server-renderable. Good enough for trend visualisation in the prototype;
 * swap for a charting lib later without touching the pages.
 */

export type Series = {
  points: { x: string; y: number }[];
  color?: string;
  label?: string;
};

export function LineChart({
  series,
  height = 220,
  yLabel,
  format = (n) => `${n}`,
}: {
  series: Series;
  height?: number;
  yLabel?: string;
  format?: (n: number) => string;
}) {
  const W = 640;
  const H = height;
  const padX = 40;
  const padY = 24;

  const ys = series.points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const pad = span * 0.15;
  const lo = min - pad;
  const hi = max + pad;

  const n = series.points.length;
  const xAt = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2);
  const yAt = (v: number) => padY + (1 - (v - lo) / (hi - lo)) * (H - padY * 2);

  const line = series.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.y).toFixed(1)}`)
    .join(" ");
  const area =
    `M ${xAt(0).toFixed(1)} ${(H - padY).toFixed(1)} ` +
    series.points.map((p, i) => `L ${xAt(i).toFixed(1)} ${yAt(p.y).toFixed(1)}`).join(" ") +
    ` L ${xAt(n - 1).toFixed(1)} ${(H - padY).toFixed(1)} Z`;

  const color = series.color ?? "#e11d2a";
  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={series.label ?? "trend chart"}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal grid + y labels */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const v = hi - (i / gridLines) * (hi - lo);
        const y = padY + (i / gridLines) * (H - padY * 2);
        return (
          <g key={i}>
            <line x1={padX} x2={W - padX} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={8} y={y + 4} fontSize={10} fill="#71717a">
              {format(Math.round(v))}
            </text>
          </g>
        );
      })}

      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* points + x labels */}
      {series.points.map((p, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(p.y)} r={3} fill="#0d0d0f" stroke={color} strokeWidth={2} />
          {(i === 0 || i === n - 1 || i % 2 === 0) && (
            <text x={xAt(i)} y={H - 6} fontSize={10} fill="#71717a" textAnchor="middle">
              {p.x}
            </text>
          )}
        </g>
      ))}

      {yLabel && (
        <text x={padX} y={14} fontSize={10} fill="#a1a1aa" fontWeight={600}>
          {yLabel}
        </text>
      )}
    </svg>
  );
}

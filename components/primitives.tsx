import type { ReactNode } from "react";
import { complianceColor } from "@/lib/format";

/* ---------------------------------------------------------------- */
/* Card                                                              */
/* ---------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`card ${hover ? "card-hover" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Page header                                                       */
/* ---------------------------------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-blood-500">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Section title                                                    */
/* ---------------------------------------------------------------- */

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
        {children}
      </h2>
      {right}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Pill / Badge                                                      */
/* ---------------------------------------------------------------- */

export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`pill ${className}`}>{children}</span>;
}

/* ---------------------------------------------------------------- */
/* Stat card                                                        */
/* ---------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = false,
  delta,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
  delta?: { value: string; positive?: boolean };
}) {
  return (
    <Card className={`p-5 ${accent ? "ring-1 ring-inset ring-blood-500/30" : ""}`}>
      <div className="flex items-start justify-between">
        <span className="stat-label">{label}</span>
        {icon && <span className="text-zinc-500">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {delta && (
          <span
            className={`text-xs font-semibold ${
              delta.positive ? "text-emerald-400" : "text-blood-400"
            }`}
          >
            {delta.value}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* Progress bar                                                     */
/* ---------------------------------------------------------------- */

export function ProgressBar({
  value,
  max = 100,
  color,
  className = "",
  height = "h-2",
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  height?: string;
}) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/[0.06] ${height} ${className}`}>
      <div
        className={`${height} rounded-full ${color ?? complianceColor(percent)} transition-all`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Ring (circular progress)                                         */
/* ---------------------------------------------------------------- */

export function Ring({
  value,
  size = 120,
  stroke = 10,
  label,
  sublabel,
  trackColor = "rgba(255,255,255,0.08)",
  color = "#e11d2a",
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  trackColor?: string;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {label && <span className="text-xl font-bold text-white">{label}</span>}
        {sublabel && <span className="text-[10px] uppercase tracking-wider text-zinc-500">{sublabel}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Avatar                                                           */
/* ---------------------------------------------------------------- */

export function Avatar({
  initials,
  size = "md",
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  return (
    <span
      className={`grid ${dims} shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink-700 to-ink-800 font-semibold text-zinc-200 ring-1 ring-inset ring-white/10`}
    >
      {initials}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Empty state                                                      */
/* ---------------------------------------------------------------- */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-white/10 py-10 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

import type { ReactNode } from "react";
import { Card, SectionTitle, Pill } from "./primitives";

/**
 * A design-only section (AI Insights, Automation Status). Renders the intended
 * layout with example rows greyed out and a "Coming soon" tag — no logic, no
 * fabricated data. The architecture is wired so the real feed drops in later
 * without changing this shell.
 */
export function PlaceholderCard({
  title,
  icon,
  examples,
  note,
}: {
  title: string;
  icon?: ReactNode;
  examples: string[];
  note: string;
}) {
  return (
    <Card className="p-5">
      <SectionTitle
        right={
          <Pill className="bg-white/5 text-zinc-500 ring-white/10">Coming soon</Pill>
        }
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
      </SectionTitle>
      <ul className="space-y-2">
        {examples.map((ex, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-xl border border-dashed border-white/[0.08] bg-ink-850/40 px-3 py-2.5 text-sm text-zinc-500"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700" />
            {ex}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-zinc-600">{note}</p>
    </Card>
  );
}

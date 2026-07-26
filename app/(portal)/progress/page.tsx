import { TrendingDown, Scale, Percent, Ruler } from "lucide-react";
import { getCurrentClient, progressForClient } from "@/lib/store";
import { Card, PageHeader, SectionTitle, StatCard, EmptyState } from "@/components/primitives";
import { ProgressExplorer } from "@/components/ProgressExplorer";
import { shortDate } from "@/lib/format";

export default async function ProgressPage() {
  const client = await getCurrentClient();
  const data = progressForClient(client.id);
  const first = data[0];
  const last = data[data.length - 1];

  const d = (a?: number, b?: number) =>
    a != null && b != null ? +(b - a).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Progress"
        title="Body composition"
        subtitle={`${data.length} measurements · ${shortDate(first?.date ?? "")} – ${shortDate(last?.date ?? "")}`}
      />

      {data.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Weight" value={`${last.weight} lb`} icon={<Scale className="h-4 w-4" />}
              delta={{ value: `${d(first.weight, last.weight)} lb`, positive: d(first.weight, last.weight) < 0 }} sub="Since start" />
            <StatCard label="Body fat" value={`${last.bodyFat}%`} icon={<Percent className="h-4 w-4" />}
              delta={{ value: `${d(first.bodyFat, last.bodyFat)}%`, positive: d(first.bodyFat, last.bodyFat) < 0 }} sub="Estimated" />
            <StatCard label="Lean mass" value={`${last.leanMass} lb`} icon={<TrendingDown className="h-4 w-4 rotate-180" />}
              delta={{ value: `${d(first.leanMass, last.leanMass)} lb`, positive: d(first.leanMass, last.leanMass) >= 0 }} sub="Preserved muscle" />
            <StatCard label="Waist" value={`${last.waist} in`} icon={<Ruler className="h-4 w-4" />}
              delta={{ value: `${d(first.waist, last.waist)} in`, positive: d(first.waist, last.waist) < 0 }} sub="Navel measurement" />
          </div>

          <Card className="p-6">
            <SectionTitle>Trends</SectionTitle>
            <ProgressExplorer data={data} />
          </Card>

          <Card className="p-6">
            <SectionTitle>Measurement log</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-zinc-500">
                    <th className="py-2 pr-4 font-semibold">Date</th>
                    <th className="py-2 pr-4 font-semibold">Weight</th>
                    <th className="py-2 pr-4 font-semibold">Body Fat</th>
                    <th className="py-2 pr-4 font-semibold">Lean Mass</th>
                    <th className="py-2 pr-4 font-semibold">Waist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {[...data].reverse().map((p) => (
                    <tr key={p.date} className="text-zinc-300">
                      <td className="py-2.5 pr-4 font-medium text-white">{shortDate(p.date)}</td>
                      <td className="py-2.5 pr-4">{p.weight} lb</td>
                      <td className="py-2.5 pr-4">{p.bodyFat}%</td>
                      <td className="py-2.5 pr-4">{p.leanMass} lb</td>
                      <td className="py-2.5 pr-4">{p.waist} in</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-6">
          <EmptyState title="No measurements yet" hint="Log your first check-in to start tracking." />
        </Card>
      )}
    </div>
  );
}

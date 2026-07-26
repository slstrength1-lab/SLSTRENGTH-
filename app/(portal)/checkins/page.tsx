import { getCurrentClient, checkInsForClient } from "@/lib/store";
import { Card, PageHeader, SectionTitle, Pill } from "@/components/primitives";
import { CheckInForm } from "@/components/CheckInForm";
import { shortDate, relativeDate } from "@/lib/format";

const statusStyle: Record<string, string> = {
  Reviewed: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  Submitted: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  Pending: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
};

export default async function CheckInsPage() {
  const client = await getCurrentClient();
  const history = await checkInsForClient(client.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accountability"
        title="Weekly check-in"
        subtitle="Submit every Sunday. This is how Shane keeps your plan dialed in."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <SectionTitle right={<Pill className="bg-blood-500/10 text-blood-400 ring-blood-500/30">Due Sunday</Pill>}>
            This week
          </SectionTitle>
          <CheckInForm clientId={client.id} clientName={client.name} />
        </Card>

        <Card className="h-fit p-6">
          <SectionTitle>Check-in history</SectionTitle>
          <ol className="relative space-y-4 before:absolute before:left-[7px] before:top-1 before:h-full before:w-px before:bg-white/[0.08]">
            {history.map((c) => (
              <li key={c.id} className="relative pl-6">
                <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-ink-900 bg-blood-500" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{shortDate(c.date)}</span>
                  <Pill className={statusStyle[c.status]}>{c.status}</Pill>
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">{relativeDate(c.date)}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                  <span>{c.bodyweight} lb</span>
                  <span>{c.compliance}% compliance</span>
                  <span>Energy: {c.energy}</span>
                  <span>Sleep: {c.sleep}</span>
                </div>
                {c.adjustments && (
                  <p className="mt-2 rounded-lg bg-ink-850/60 px-3 py-2 text-xs text-zinc-400">
                    <span className="font-medium text-blood-400">Coach: </span>
                    {c.adjustments}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

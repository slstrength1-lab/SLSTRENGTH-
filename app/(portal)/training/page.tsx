import { ExternalLink } from "lucide-react";
import { getCurrentClient, programForClient } from "@/lib/store";
import { PageHeader, Pill, Card, EmptyState } from "@/components/primitives";
import { TrainingProgram } from "@/components/TrainingProgram";
import { shortDate } from "@/lib/format";

export default async function TrainingPage() {
  const client = await getCurrentClient();
  const program = await programForClient(client.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Training"
        title={program?.name ?? "Your program"}
        subtitle={
          program
            ? `${program.type} · ${program.phase} phase · ${shortDate(program.startDate)} – ${shortDate(program.endDate)}`
            : undefined
        }
        actions={
          program?.link && (
            <a
              href={program.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:border-white/20 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" /> Full spreadsheet
            </a>
          )
        }
      />

      {program ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Pill className="bg-blood-500/10 text-blood-400 ring-blood-500/30">{program.phase}</Pill>
            <Pill className="bg-white/5 text-zinc-300 ring-white/10">{program.type}</Pill>
            <Pill className="bg-emerald-500/10 text-emerald-400 ring-emerald-500/25">{program.status}</Pill>
            <Pill className="bg-white/5 text-zinc-300 ring-white/10">4-day split</Pill>
          </div>
          <TrainingProgram program={program} />
        </>
      ) : (
        <Card className="p-6">
          <EmptyState title="No active program yet" hint="Your coach is building your next block." />
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import {
  DollarSign,
  Users,
  TrendingUp,
  Target,
  AlertTriangle,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import {
  clients,
  leads,
  metrics as allMetrics,
  content,
  checkInsForClient,
} from "@/lib/data";
import {
  Card,
  PageHeader,
  SectionTitle,
  StatCard,
  Pill,
  Avatar,
} from "@/components/primitives";
import { PipelineBoard } from "@/components/PipelineBoard";
import { ClientRoster } from "@/components/ClientRoster";
import { LineChart } from "@/components/LineChart";
import { currency, shortDate, relativeDate, riskClasses } from "@/lib/format";

const contentStatusStyle: Record<string, string> = {
  Idea: "bg-white/5 text-zinc-400 ring-white/10",
  Writing: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  Filming: "bg-orange-500/15 text-orange-400 ring-orange-500/25",
  Editing: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  Scheduled: "bg-violet-500/15 text-violet-400 ring-violet-500/25",
  Published: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
};

export default function CoachPage() {
  const metrics = [...allMetrics].sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));
  const latest = metrics[0];
  const prev = metrics[1];

  const activeClients = clients.filter(
    (c) => c.status === "Active" || c.status === "Onboarding",
  );
  const riskFlags = clients
    .filter((c) => c.riskLevel !== "Green" && c.status !== "Churned")
    .sort((a, b) => (a.riskLevel === "Red" ? -1 : 1));

  const liveMrr = activeClients.reduce((s, c) => s + c.monthlyRate, 0);
  const mrrDelta = latest.mrr - prev.mrr;

  const openLeads = leads.filter((l) => l.stage !== "Closed Won" && l.stage !== "Nurture");
  const pipelineValue = openLeads.reduce((s, l) => s + l.estValue, 0);

  const upcomingContent = [...content].sort((a, b) => (a.publishDate < b.publishDate ? -1 : 1));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command Center"
        title="Coach Dashboard"
        subtitle="Who needs attention, what's selling, and how the business is performing."
        actions={
          <span className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-zinc-400">
            Week of {shortDate(latest.weekOf)}
          </span>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly recurring"
          value={currency(liveMrr)}
          icon={<DollarSign className="h-4 w-4" />}
          accent
          delta={{ value: `${mrrDelta >= 0 ? "+" : ""}${currency(mrrDelta)}`, positive: mrrDelta >= 0 }}
          sub="Live from active clients"
        />
        <StatCard
          label="Active clients"
          value={activeClients.length}
          icon={<Users className="h-4 w-4" />}
          sub={`${riskFlags.length} need attention`}
        />
        <StatCard
          label="Pipeline value"
          value={currency(pipelineValue)}
          icon={<TrendingUp className="h-4 w-4" />}
          sub={`${openLeads.length} open leads`}
        />
        <StatCard
          label="Close rate"
          value={`${latest.closeRate}%`}
          icon={<Target className="h-4 w-4" />}
          sub={`${latest.calls} calls · ${latest.retention}% retention`}
        />
      </div>

      {/* Risk flags + revenue trend */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <SectionTitle right={<span className="text-xs text-zinc-500">{riskFlags.length}</span>}>
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blood-500" /> Risk flags
            </span>
          </SectionTitle>
          {riskFlags.length ? (
            <ul className="space-y-2">
              {riskFlags.map((c) => {
                const lastCi = checkInsForClient(c.id)[0];
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-xl bg-ink-850/60 p-3">
                    <Avatar initials={c.avatarInitials} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white">{c.name}</span>
                        <Pill className={riskClasses(c.riskLevel)}>{c.riskLevel}</Pill>
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {c.compliance}% compliance · checked in {relativeDate(c.lastCheckIn)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">All clients green. 🔥</p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle right={<span className="text-xs text-zinc-500">MRR · last {metrics.length} weeks</span>}>
            Revenue trend
          </SectionTitle>
          <LineChart
            series={{
              points: [...metrics].reverse().map((m) => ({ x: shortDate(m.weekOf), y: m.mrr })),
              color: "#e11d2a",
            }}
            height={200}
            yLabel="MRR ($)"
            format={(n) => `$${n}`}
          />
        </Card>
      </div>

      {/* Sales pipeline */}
      <Card className="p-5">
        <SectionTitle
          right={
            <span className="text-xs text-zinc-500">
              {currency(pipelineValue)} open · {openLeads.length} leads
            </span>
          }
        >
          Sales pipeline
        </SectionTitle>
        <PipelineBoard leads={leads} />
      </Card>

      {/* Active clients + content */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle right={<span className="text-xs text-zinc-500">{activeClients.length} active</span>}>
            Active clients
          </SectionTitle>
          <ClientRoster clients={activeClients} />
        </Card>

        <Card className="p-5">
          <SectionTitle
            right={
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <CalendarDays className="h-3.5 w-3.5" /> Upcoming
              </span>
            }
          >
            Content calendar
          </SectionTitle>
          <ul className="space-y-2">
            {upcomingContent.map((item) => (
              <li key={item.id} className="rounded-xl bg-ink-850/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-white">{item.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{shortDate(item.publishDate)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Pill className={contentStatusStyle[item.status]}>{item.status}</Pill>
                  <span className="text-[11px] text-zinc-600">{item.format}</span>
                  <span className="text-[11px] text-zinc-600">· {item.platform.join(", ")}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/coach"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blood-500"
          >
            Open content engine <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
}

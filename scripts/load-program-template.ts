/**
 * SL Strength OS — Program Template Loader
 *
 * Proves the training pipeline end-to-end:
 *   Template JSON → Notion Programs DB → Notion Workouts DB → existing Training UI
 *
 * Usage:
 *   npm run load:program -- <templatePath> <clientId> [--dry-run] [--status=Active] [--replace]
 *   npx tsx scripts/load-program-template.ts data/program-templates/hardwood-force-block.json <clientId> --dry-run
 *
 * Arguments:
 *   templatePath   path to a program-template JSON (see data/program-templates/)
 *   clientId       the Notion page id of the client to assign the program to
 *
 * Flags:
 *   --dry-run          parse + print the write plan; touch nothing (works without a key)
 *   --status=<Status>  Programs Status to set (default: Active)
 *   --replace          if a program of the same name already exists for the client,
 *                      archive it and its workout rows first (idempotent re-load)
 *
 * The NOTION_API_KEY secret is read from the environment or .env.local and is
 * never printed. This script only writes when NOT in --dry-run mode.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { Client } from "@notionhq/client";

/* ---- Notion data sources (same ids the app uses) ----------------- */
const DS = {
  programs: "aac6fb13-f9a7-4e71-8ee3-d9c4c0bf8481",
  workouts: "7f5e8a76-c1f1-4f66-856b-122ea2e9904c",
} as const;

/* ---- Template shape --------------------------------------------- */
interface TemplateExercise {
  order: number;
  supersetGroup?: string;
  exercise: string;
  setType?: string;
  sets: number;
  reps: string;
  load?: string;
  percent1RM?: number | null;
  rpe?: number | null;
  tempo?: string;
  rest?: string;
  notes?: string;
}
interface TemplateDay { day: number; focus: string; exercises: TemplateExercise[] }
interface TemplateWeek { week: number; days: TemplateDay[] }
interface Template {
  program: {
    name: string;
    type: string;
    phase: string;
    goal?: string;
    durationWeeks?: number;
    weeks: TemplateWeek[];
  };
}

/* ---- Args -------------------------------------------------------- */
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));
const [templateArg, clientId] = positional;
const dryRun = flags.has("--dry-run");
const replace = flags.has("--replace");
const statusFlag = argv.find((a) => a.startsWith("--status="))?.split("=")[1] ?? "Active";

function die(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!templateArg) die("Missing <templatePath>. Usage: load:program -- <templatePath> <clientId> [--dry-run]");
if (!clientId && !dryRun) die("Missing <clientId>. Pass the client's Notion page id (or use --dry-run to preview).");

/* ---- Load .env.local (secret never printed) ---------------------- */
function loadEnvLocal(): Record<string, string> {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const path = join(root, ".env.local");
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const fileEnv = loadEnvLocal();
const key = (process.env.NOTION_API_KEY || fileEnv.NOTION_API_KEY || "").trim();

/* ---- Read + validate template ------------------------------------ */
const templatePath = resolve(process.cwd(), templateArg);
if (!existsSync(templatePath)) die(`Template not found: ${templatePath}`);

let tpl: Template;
try {
  tpl = JSON.parse(readFileSync(templatePath, "utf8"));
} catch (e) {
  die(`Template is not valid JSON: ${e instanceof Error ? e.message : e}`);
}
const program = tpl?.program;
if (!program?.name || !Array.isArray(program.weeks)) {
  die("Template missing program.name or program.weeks[].");
}

// Flatten to workout rows and validate as we go.
interface Row extends TemplateExercise { week: number; day: number; focus: string }
const rows: Row[] = [];
for (const w of program.weeks) {
  for (const d of w.days) {
    for (const ex of d.exercises) {
      if (!ex.exercise || typeof ex.sets !== "number" || !ex.reps) {
        die(`Invalid exercise at week ${w.week} day ${d.day} order ${ex?.order}: needs exercise, numeric sets, reps.`);
      }
      rows.push({ ...ex, week: w.week, day: d.day, focus: d.focus });
    }
  }
}

/* ---- Dates ------------------------------------------------------- */
const startDate = new Date();
const endDate = new Date(startDate);
endDate.setDate(endDate.getDate() + (program.durationWeeks ?? program.weeks.length) * 7);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/* ---- Plan summary ------------------------------------------------ */
console.log("\nSL Strength OS — Program Template Loader");
console.log("========================================");
console.log(`Template : ${program.name}`);
console.log(`Type     : ${program.type}   Phase: ${program.phase}   Status: ${statusFlag}`);
console.log(`Client   : ${clientId ?? "(dry-run — none)"}`);
console.log(`Dates    : ${iso(startDate)} → ${iso(endDate)}`);
console.log(`Plan     : 1 Programs page + ${rows.length} Workouts rows` +
  ` (${program.weeks.length} weeks × ${program.weeks[0]?.days.length ?? "?"} days)`);

if (dryRun) {
  const perWeek = program.weeks.map((w) => `W${w.week}:${w.days.reduce((n, d) => n + d.exercises.length, 0)}`).join("  ");
  console.log(`By week  : ${perWeek}`);
  console.log("Sample   :", JSON.stringify(rows[0]));
  console.log("\n✓ Dry run only — nothing written to Notion.\n");
  process.exit(0);
}

if (!key) die("NOTION_API_KEY not set. Put it in .env.local (see .env.example) or the environment.");

/* ---- Notion property builders ------------------------------------ */
const notion = new Client({ auth: key });
type Props = Record<string, unknown>;
const pTitle = (s: string) => ({ title: [{ text: { content: s } }] });
const pRich = (s?: string | null) => ({ rich_text: s ? [{ text: { content: String(s) } }] : [] });
const pNum = (n?: number | null) => ({ number: n === null || n === undefined ? null : Number(n) });
const pSel = (name?: string | null) => (name ? { select: { name } } : { select: null });
const pDate = (start?: string) => (start ? { date: { start } } : { date: null });
const pRel = (ids: string[]) => ({ relation: ids.map((id) => ({ id })) });

async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 4): Promise<T> {
  let delay = 1000;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.status ?? e?.code;
      const retryable = status === 429 || (typeof status === "number" && status >= 500);
      if (!retryable || i === tries) throw e;
      console.warn(`  … ${label} failed (${status}); retry ${i}/${tries - 1} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error("unreachable");
}

async function createPage(dataSourceId: string, properties: Props) {
  return withRetry("create", () =>
    notion.pages.create({ parent: { type: "data_source_id", data_source_id: dataSourceId }, properties } as any),
  );
}

/* ---- Idempotency: find existing program for this client ---------- */
async function findExistingPrograms(): Promise<string[]> {
  const res: any = await withRetry("query", () =>
    notion.dataSources.query({
      data_source_id: DS.programs,
      filter: {
        and: [
          { property: "Program", title: { equals: program.name } },
          { property: "Client", relation: { contains: clientId } },
        ],
      },
    } as any),
  );
  return res.results.map((r: any) => r.id);
}

async function archiveProgram(programId: string) {
  // Archive the program's workout rows first, then the program page.
  const res: any = await withRetry("query-workouts", () =>
    notion.dataSources.query({
      data_source_id: DS.workouts,
      filter: { property: "Program", relation: { contains: programId } },
    } as any),
  );
  for (const w of res.results) {
    await withRetry("archive-workout", () => notion.pages.update({ page_id: w.id, archived: true } as any));
  }
  await withRetry("archive-program", () => notion.pages.update({ page_id: programId, archived: true } as any));
  console.log(`  archived old program ${programId} and ${res.results.length} workout rows`);
}

/* ---- Concurrency-limited map ------------------------------------- */
async function pool<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ---- Run --------------------------------------------------------- */
async function main() {
  // Validate the client exists.
  try {
    await withRetry("client", () => notion.pages.retrieve({ page_id: clientId } as any));
  } catch (e: any) {
    die(`Client ${clientId} not found or not shared with the integration (${e?.status ?? e?.code ?? e?.message}).`);
  }

  // Idempotency guard.
  const existing = await findExistingPrograms();
  if (existing.length) {
    if (!replace) {
      die(`"${program.name}" already exists for this client (${existing.length}). Re-run with --replace to overwrite.`);
    }
    console.log(`Replacing ${existing.length} existing "${program.name}" program(s)…`);
    for (const id of existing) await archiveProgram(id);
  }

  // 1) Create the Programs page.
  const programPage: any = await createPage(DS.programs, {
    Program: pTitle(program.name),
    Type: pSel(program.type),
    Phase: pSel(program.phase),
    Status: pSel(statusFlag),
    "Start Date": pDate(iso(startDate)),
    "End Date": pDate(iso(endDate)),
    Client: pRel([clientId]),
  });
  const programId = programPage.id;
  console.log(`\n✓ Created Programs page ${programId}`);

  // 2) Create the Workouts rows (concurrency-limited to respect rate limits).
  let done = 0;
  await pool(rows, 4, async (r) => {
    await createPage(DS.workouts, {
      Exercise: pTitle(r.exercise),
      Program: pRel([programId]),
      Client: pRel([clientId]),
      Week: pNum(r.week),
      Day: pNum(r.day),
      Focus: pRich(r.focus),
      Order: pNum(r.order),
      "Superset Group": pRich(r.supersetGroup),
      "Set Type": pSel(r.setType),
      Sets: pNum(r.sets),
      Reps: pRich(r.reps),
      Load: pRich(r.load),
      "% 1RM": pNum(r.percent1RM),
      RPE: pNum(r.rpe),
      Tempo: pRich(r.tempo),
      Rest: pRich(r.rest),
      Notes: pRich(r.notes),
    });
    done++;
    if (done % 20 === 0 || done === rows.length) console.log(`  … ${done}/${rows.length} workout rows`);
  });

  console.log(`\n✓ Loaded "${program.name}": 1 program + ${rows.length} workouts for client ${clientId}.`);
  console.log("Open the client's Training section to see it rendered.\n");
}

main().catch((e) => die(e instanceof Error ? e.message : String(e)));

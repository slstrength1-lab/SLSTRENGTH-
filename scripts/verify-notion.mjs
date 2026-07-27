/**
 * SL Strength OS — Notion connection verifier.
 *
 *   npm run verify:notion
 *
 * Checks (without ever printing your secret):
 *   1. Is .env.local present in the project root?
 *   2. Is NOTION_API_KEY detected?
 *   3. Live mode vs Sample mode?
 *   4. Can it read every Notion database?
 *
 * The API key is never logged — only whether it exists, its length, and the
 * non-secret "ntn_" prefix (the same for every Notion token).
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "@notionhq/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

// Same data source IDs the app uses (lib/notion.ts).
const DATA_SOURCES = {
  Clients: "002ab021-86fe-43ed-b0c5-6de2ae845d48",
  Leads: "a7d125f8-b72a-4b17-8f54-5735e4fce805",
  Sales: "7f1cdeda-694e-4104-b4fe-8a49de234832",
  "Check-ins": "54ba94b6-2204-48ef-824f-ad669a1f3660",
  Programs: "aac6fb13-f9a7-4e71-8ee3-d9c4c0bf8481",
  Content: "7b9428d8-9f4f-48c8-95d6-9a95bef9fc1f",
  "Business Metrics": "b456da35-4b5d-4870-a802-5c699d350855",
  Workouts: "7f5e8a76-c1f1-4f66-856b-122ea2e9904c",
  Nutrition: "7fef8dfe-692d-4e5f-af53-b592f1d0a672",
  "Coach Notes": "6ec70405-6d57-4abf-ab6b-7131aa403a48",
};

function loadEnvLocal(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const fileEnv = loadEnvLocal(envPath);
const key = (process.env.NOTION_API_KEY || fileEnv.NOTION_API_KEY || "").trim();
const detected = key.length > 0;

console.log("\nSL Strength OS — Notion connection check");
console.log("========================================\n");

// 1
console.log(`1. .env.local present:        ${existsSync(envPath) ? "YES" : "NO"}`);

// 2 — masked, never prints the secret
console.log(
  `2. NOTION_API_KEY detected:  ${
    detected ? `YES  (length ${key.length}, prefix "${key.slice(0, 4)}…")` : "NO — value is empty"
  }`,
);

// 3
console.log(`3. Mode:                     ${detected ? "LIVE" : "SAMPLE (no key set)"}`);

// 4
if (!detected) {
  console.log("4. Notion read test:         SKIPPED — add a key first\n");
  console.log("Fix:");
  console.log("  Put your integration secret in .env.local at the project root:");
  console.log("    NOTION_API_KEY=ntn_your_secret_here");
  console.log("  Then re-run:  npm run verify:notion\n");
  process.exit(1);
}

console.log("4. Notion read test:");
const notion = new Client({ auth: key, logger: () => {} }); // silence SDK's own logs; we print our own
let allOk = true;
let anyForbidden = false;

for (const [name, id] of Object.entries(DATA_SOURCES)) {
  try {
    const res = await notion.dataSources.query({ data_source_id: id, page_size: 1 });
    const more = res.has_more ? "+" : "";
    console.log(`   - ${name.padEnd(18)} OK  (readable, ${res.results.length}${more} row sampled)`);
  } catch (e) {
    allOk = false;
    const status = e?.status ?? "";
    if (status === 403 || status === 404) anyForbidden = true;
    console.log(`   - ${name.padEnd(18)} FAIL  [${status} ${e?.code ?? ""}] ${e?.message ?? e}`);
  }
}

console.log("");
if (allOk) {
  console.log("All seven databases are reachable. Notion is LIVE. ✅\n");
  process.exit(0);
}

console.log("Some databases failed. Likely fixes:");
if (anyForbidden) {
  console.log("  • 403/404 = the integration is not shared with that database.");
  console.log("    In Notion, open the database (or the SL Strength OS hub page) →");
  console.log('    ••• menu → Connections → connect your integration. Then re-run.');
}
console.log("  • 401 = the token is wrong or rotated — re-copy it into .env.local.");
console.log("  • Confirm the integration has Read + Update + Insert capabilities.\n");
process.exit(1);

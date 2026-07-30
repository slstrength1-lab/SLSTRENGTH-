/**
 * "SL Strength Assessment Form" (Google Form) → SL Strength OS Notion CRM.
 *
 * On each submission this:
 *   1. Creates a Lead in the Notion Leads database (Stage = "New") with Name,
 *      Email/Phone (auto-detected from the combined contact question), Goal,
 *      and Health issues → Problem.
 *   2. Attaches a Coach Note to that lead containing the full assessment
 *      (balance test, weight/height/waistline, pillows, vegetables, and any
 *      other questions) — so it appears in the Lead Command Center's activity
 *      log. The same summary is also saved to the lead's Notes as a backup.
 *
 * Free, direct, no Zapier/Make. Flows straight into the pipeline + Lead
 * Command Center.
 *
 * ── SETUP (5 minutes) ─────────────────────────────────────────────────────
 * 1. Google Form → ⋮ → "Script editor" (or the linked responses Sheet →
 *    Extensions → Apps Script). Paste this whole file in.
 * 2. Project Settings ⚙ → Script properties → Add:
 *        name: NOTION_TOKEN   value: <your Notion internal integration secret>
 * 3. In Notion, open BOTH the "Leads" and "Coach Notes" databases →
 *    ⋯ → Connections → add that same integration (without this you get 403).
 * 4. Triggers ⏰ → Add trigger → function: onFormSubmit,
 *    event source: From form, type: On form submit.
 * 5. Submit a test response → a Lead (with an assessment note) appears.
 * ──────────────────────────────────────────────────────────────────────────
 */

// SL Strength OS Notion data sources (stable ids).
var LEADS_DATA_SOURCE_ID = "a7d125f8-b72a-4b17-8f54-5735e4fce805";
var COACH_NOTES_DATA_SOURCE_ID = "6ec70405-6d57-4abf-ab6b-7131aa403a48";
var NOTION_VERSION = "2025-09-03";

// Default Source for a web-form submission (the form doesn't ask). Blank string
// leaves it unset; change to any of: Instagram / Referral / Website /
// Word of Mouth / Facebook / Other.
var DEFAULT_SOURCE = "Website";

// Exact Google Form question titles that map to dedicated Lead fields.
// Everything NOT listed here is rolled into the assessment note automatically.
var FIELD_TITLES = {
  name: "Name",
  contact: "Phone number or email address to be contacted at",
  goal: "Goal",
  problem: "Health issues?",
};

function onFormSubmit(e) {
  var nv = (e && e.namedValues) || {};

  var name = firstValue(nv[FIELD_TITLES.name]);
  if (!name) {
    Logger.log("No name in submission — skipping. Keys: " + Object.keys(nv).join(", "));
    return;
  }
  var contact = firstValue(nv[FIELD_TITLES.contact]);
  var isEmail = contact.indexOf("@") !== -1;
  var goal = firstValue(nv[FIELD_TITLES.goal]);
  var problem = firstValue(nv[FIELD_TITLES.problem]);

  // Everything else → assessment summary (captures Section 5 etc. automatically).
  var assessment = [];
  var skip = {};
  for (var k in FIELD_TITLES) skip[FIELD_TITLES[k]] = true;
  for (var title in nv) {
    if (skip[title] || title === "Timestamp") continue;
    var ans = (nv[title] || []).join(", ").trim();
    if (ans) assessment.push(title + ": " + ans);
  }
  var summary = assessment.join("\n");

  // 1) Create the lead.
  var leadProps = {
    "Name": { title: [{ text: { content: name } }] },
    "Stage": { select: { name: "New" } },
  };
  if (isEmail && contact) leadProps["Email"] = { email: contact };
  if (!isEmail && contact) leadProps["Phone"] = { phone_number: contact };
  if (goal) leadProps["Goal"] = { rich_text: [{ text: { content: goal } }] };
  if (problem) leadProps["Problem"] = { rich_text: [{ text: { content: problem } }] };
  if (DEFAULT_SOURCE) leadProps["Source"] = { select: { name: DEFAULT_SOURCE } };
  if (summary) leadProps["Notes"] = { rich_text: [{ text: { content: truncate(summary, 1900) } }] };

  var leadId = createNotionPage(LEADS_DATA_SOURCE_ID, leadProps);

  // 2) Attach the assessment as a Coach Note on the lead (visible in the app).
  if (leadId && summary) {
    var noteProps = {
      "Note": { title: [{ text: { content: "Assessment intake — " + name } }] },
      "Body": { rich_text: [{ text: { content: truncate(summary, 1900) } }] },
      "Type": { select: { name: "Coaching Note" } },
      "Status": { select: { name: "New" } },
      "Lead": { relation: [{ id: leadId }] },
    };
    try {
      createNotionPage(COACH_NOTES_DATA_SOURCE_ID, noteProps);
    } catch (err) {
      Logger.log("Lead created, but assessment note failed: " + err);
    }
  }
}

/** First trimmed value from a namedValues entry (array). */
function firstValue(v) {
  if (!v) return "";
  return String(Array.isArray(v) ? v[0] : v).trim();
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** Create a Notion page under a data source; returns the new page id. */
function createNotionPage(dataSourceId, properties) {
  var token = PropertiesService.getScriptProperties().getProperty("NOTION_TOKEN");
  if (!token) throw new Error("Missing NOTION_TOKEN script property (Project Settings → Script properties).");

  var res = UrlFetchApp.fetch("https://api.notion.com/v1/pages", {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + token, "Notion-Version": NOTION_VERSION },
    payload: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: properties,
    }),
  });
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    return JSON.parse(res.getContentText()).id;
  }
  Logger.log("Notion create failed (" + code + "): " + res.getContentText());
  throw new Error("Notion create failed: " + code);
}

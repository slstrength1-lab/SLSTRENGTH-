/**
 * "SL Strength — Coaching Application & Assessment" (Google Form) → Notion CRM.
 *
 * On each submission this creates a fully-qualified Lead in the Notion Leads
 * database and attaches the assessment as a Coach Note on that lead.
 *
 * Field mapping (exact Google Form question titles → Lead fields):
 *   Full name                                   → Name        (required)
 *   Email                                        → Email
 *   Phone                                        → Phone
 *   How did you hear about us?                   → Source
 *   What are you most interested in?             → Interest (multi)
 *   What is your #1 goal?                        → Goal
 *   Any injuries, pain, or surgeries ...?        → Problem
 *   What monthly investment range works for you? → Est. Value (parsed to $)
 *   Preferred consult date                       → Consult Date
 *   Stage                                        → "New" (always)
 * Every other answer (age, experience, days/week, equipment, health screen,
 * movement tests, nutrition, etc.) is rolled into an "Assessment intake"
 * Coach Note attached to the lead (and the lead's Notes as a backup).
 *
 * ── SETUP ──────────────────────────────────────────────────────────────────
 * 1. Form ⋮ → Script editor → paste this file.
 * 2. Project Settings ⚙ → Script properties → add NOTION_TOKEN = <secret>.
 * 3. In Notion, share that integration with BOTH the Leads and Coach Notes DBs
 *    (⋯ → Connections). Skipping this causes a 403.
 * 4. Triggers ⏰ → Add trigger → onFormSubmit / From form / On form submit.
 * IMPORTANT: the question titles below must match the form EXACTLY.
 * ────────────────────────────────────────────────────────────────────────────
 */

var LEADS_DATA_SOURCE_ID = "a7d125f8-b72a-4b17-8f54-5735e4fce805";
var COACH_NOTES_DATA_SOURCE_ID = "6ec70405-6d57-4abf-ab6b-7131aa403a48";
var NOTION_VERSION = "2025-09-03";

var FIELD_TITLES = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  source: "How did you hear about us?",
  interest: "What are you most interested in?",
  goal: "What is your #1 goal?",
  problem: "Any injuries, pain, or surgeries we should know about?",
  budget: "What monthly investment range works for you?",
  consultDate: "Preferred consult date",
};

var SOURCE_OPTIONS = ["Instagram", "Referral", "Website", "Word of Mouth", "Facebook", "Other"];
var INTEREST_OPTIONS = ["Body Transformation", "Strength", "Nutrition", "Hybrid"];

function onFormSubmit(e) {
  var nv = (e && e.namedValues) || {};
  var v = function (title) { return firstValue(nv[title]); };

  var name = v(FIELD_TITLES.name);
  if (!name) {
    Logger.log("No name — skipping. Keys: " + Object.keys(nv).join(", "));
    return;
  }

  // Assessment summary = every question not mapped to a dedicated Lead field.
  var skip = {}; for (var k in FIELD_TITLES) skip[FIELD_TITLES[k]] = true;
  var assessment = [];
  for (var title in nv) {
    if (skip[title] || title === "Timestamp") continue;
    var ans = (nv[title] || []).join(", ").trim();
    if (ans) assessment.push(title + ": " + ans);
  }
  var summary = assessment.join("\n");

  // 1) Lead
  var props = {
    "Name": { title: [{ text: { content: name } }] },
    "Stage": { select: { name: "New" } },
  };
  var email = v(FIELD_TITLES.email);
  var phone = v(FIELD_TITLES.phone);
  var goal = v(FIELD_TITLES.goal);
  var problem = v(FIELD_TITLES.problem);
  var source = matchOption(v(FIELD_TITLES.source), SOURCE_OPTIONS);
  var interest = pickOptions(nv[FIELD_TITLES.interest], INTEREST_OPTIONS);
  var estValue = budgetToValue(v(FIELD_TITLES.budget));
  var consult = toISODate(v(FIELD_TITLES.consultDate));

  if (email) props["Email"] = { email: email };
  if (phone) props["Phone"] = { phone_number: phone };
  if (goal) props["Goal"] = { rich_text: [{ text: { content: goal } }] };
  if (problem) props["Problem"] = { rich_text: [{ text: { content: problem } }] };
  if (source) props["Source"] = { select: { name: source } };
  if (interest.length) props["Interest"] = { multi_select: interest.map(function (n) { return { name: n }; }) };
  if (estValue != null) props["Est. Value"] = { number: estValue };
  if (consult) props["Consult Date"] = { date: { start: consult } };
  if (summary) props["Notes"] = { rich_text: [{ text: { content: truncate(summary, 1900) } }] };

  var leadId = createNotionPage(LEADS_DATA_SOURCE_ID, props);

  // 2) Assessment Coach Note on the lead
  if (leadId && summary) {
    try {
      createNotionPage(COACH_NOTES_DATA_SOURCE_ID, {
        "Note": { title: [{ text: { content: "Assessment intake — " + name } }] },
        "Body": { rich_text: [{ text: { content: truncate(summary, 1900) } }] },
        "Type": { select: { name: "Coaching Note" } },
        "Status": { select: { name: "New" } },
        "Lead": { relation: [{ id: leadId }] },
      });
    } catch (err) {
      Logger.log("Lead created, assessment note failed: " + err);
    }
  }
}

/* helpers -------------------------------------------------------------------- */
function firstValue(x) { if (!x) return ""; return String(Array.isArray(x) ? x[0] : x).trim(); }
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

/** Best-effort case-insensitive match to an allowed select option (else "Other"). */
function matchOption(value, options) {
  if (!value) return null;
  var v = value.toLowerCase();
  for (var i = 0; i < options.length; i++) if (v.indexOf(options[i].toLowerCase()) !== -1) return options[i];
  return "Other";
}

/** Checkbox answers → the allowed multi-select options that appear in them. */
function pickOptions(raw, options) {
  var text = (raw || []).join(", ").toLowerCase();
  var out = [];
  for (var i = 0; i < options.length; i++) if (text.indexOf(options[i].toLowerCase()) !== -1) out.push(options[i]);
  return out;
}

/** "$100–$250" → 175, "$500+" → 600, "Under $100" → 75. Null if no number. */
function budgetToValue(s) {
  if (!s) return null;
  var nums = (s.match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  if (/\+/.test(s)) return Math.round(nums[0] * 1.2);
  if (/under|less/i.test(s)) return Math.round(nums[0] * 0.75);
  return nums[0];
}

/** Parse "YYYY-MM-DD" or "M/D/YYYY" to ISO YYYY-MM-DD; "" if unparseable. */
function toISODate(s) {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
  return "";
}

function createNotionPage(dataSourceId, properties) {
  var token = PropertiesService.getScriptProperties().getProperty("NOTION_TOKEN");
  if (!token) throw new Error("Missing NOTION_TOKEN script property.");
  var res = UrlFetchApp.fetch("https://api.notion.com/v1/pages", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + token, "Notion-Version": NOTION_VERSION },
    payload: JSON.stringify({ parent: { type: "data_source_id", data_source_id: dataSourceId }, properties: properties }),
  });
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) return JSON.parse(res.getContentText()).id;
  Logger.log("Notion create failed (" + code + "): " + res.getContentText());
  throw new Error("Notion create failed: " + code);
}

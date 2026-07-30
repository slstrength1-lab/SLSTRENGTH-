/**
 * Google Form → SL Strength OS "Leads" (Notion) — free, direct integration.
 *
 * On each form submission this creates a Lead in the Notion Leads database, so
 * it lands at the top of the pipeline (Stage = "New") and flows into the CRM
 * and Lead Command Center automatically. No Zapier/Make subscription needed.
 *
 * ── SETUP (5 minutes) ─────────────────────────────────────────────────────
 * 1. Open your Google Form → ⋮ menu → "Script editor" (or open the linked
 *    responses Google Sheet → Extensions → Apps Script).
 * 2. Paste this whole file in, replacing any default code.
 * 3. Store your Notion token as a Script Property (do NOT hard-code it):
 *      Project Settings ⚙ → Script properties → Add property
 *        name:  NOTION_TOKEN     value:  <your Notion internal integration secret>
 *    (Make sure that Notion integration is shared with the Leads database.)
 * 4. Edit the QUESTION_MAP below so the keys match your form's EXACT question
 *    titles (left = your Google Form question, right = handled automatically).
 * 5. Add the trigger: Triggers ⏰ → Add trigger →
 *        function: onFormSubmit   event source: From form   type: On form submit
 * 6. Submit a test response → a new Lead appears in Notion.
 * ──────────────────────────────────────────────────────────────────────────
 */

// Leads data source id (SL Strength OS Notion workspace). Stable — don't change
// unless the Leads database is recreated.
var LEADS_DATA_SOURCE_ID = "a7d125f8-b72a-4b17-8f54-5735e4fce805";
var NOTION_VERSION = "2025-09-03";

/**
 * Map YOUR Google Form question titles (left) to the Lead field they feed
 * (right). Edit the left-hand strings to match your form exactly. Any field you
 * don't collect: leave it out — it's simply left blank on the lead.
 */
var QUESTION_MAP = {
  "Name": "name",
  "Email": "email",
  "Phone": "phone",
  "How did you hear about us?": "source",
  "What is your main goal?": "goal",
  "What's your biggest challenge right now?": "problem",
  "What are you interested in?": "interest", // multi-select ok
};

// Normalize free-text answers onto the Notion select options (best-effort).
var SOURCE_OPTIONS = ["Instagram", "Referral", "Website", "Word of Mouth", "Facebook", "Other"];
var INTEREST_OPTIONS = ["Body Transformation", "Strength", "Nutrition", "Hybrid"];

function onFormSubmit(e) {
  var answers = readAnswers(e); // { name, email, phone, source, goal, problem, interest }
  if (!answers.name) {
    Logger.log("No name in submission — skipping. Answers: " + JSON.stringify(answers));
    return;
  }
  var props = buildProperties(answers);
  createNotionLead(props);
}

/** Pull answers from the form-submit event using QUESTION_MAP. */
function readAnswers(e) {
  var out = {};
  // Form-bound trigger: e.namedValues = { "Question title": ["answer"] }
  var nv = (e && e.namedValues) || {};
  for (var title in QUESTION_MAP) {
    var field = QUESTION_MAP[title];
    var raw = nv[title];
    var val = Array.isArray(raw) ? raw.join(", ") : (raw || "");
    out[field] = String(val).trim();
  }
  // Fallback for Sheet-bound triggers (e.values in column order) is intentionally
  // omitted — the named-values path above is the reliable one for form triggers.
  return out;
}

/** Build the Notion properties payload for the Leads database. */
function buildProperties(a) {
  var props = {
    "Name": { title: [{ text: { content: a.name } }] },
    "Stage": { select: { name: "New" } },
  };
  if (a.email) props["Email"] = { email: a.email };
  if (a.phone) props["Phone"] = { phone_number: a.phone };
  if (a.goal) props["Goal"] = { rich_text: [{ text: { content: a.goal } }] };
  if (a.problem) props["Problem"] = { rich_text: [{ text: { content: a.problem } }] };

  var source = matchOption(a.source, SOURCE_OPTIONS);
  if (source) props["Source"] = { select: { name: source } };

  if (a.interest) {
    var picked = [];
    for (var i = 0; i < INTEREST_OPTIONS.length; i++) {
      if (a.interest.toLowerCase().indexOf(INTEREST_OPTIONS[i].toLowerCase()) !== -1) {
        picked.push({ name: INTEREST_OPTIONS[i] });
      }
    }
    if (picked.length) props["Interest"] = { multi_select: picked };
  }
  return props;
}

/** Case-insensitive match of a free-text answer to an allowed select option. */
function matchOption(value, options) {
  if (!value) return null;
  var v = value.toLowerCase();
  for (var i = 0; i < options.length; i++) {
    if (v.indexOf(options[i].toLowerCase()) !== -1) return options[i];
  }
  return "Other";
}

/** Create the Lead page in Notion. */
function createNotionLead(properties) {
  var token = PropertiesService.getScriptProperties().getProperty("NOTION_TOKEN");
  if (!token) throw new Error("Missing NOTION_TOKEN script property (Project Settings → Script properties).");

  var payload = {
    parent: { type: "data_source_id", data_source_id: LEADS_DATA_SOURCE_ID },
    properties: properties,
  };
  var res = UrlFetchApp.fetch("https://api.notion.com/v1/pages", {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + token,
      "Notion-Version": NOTION_VERSION,
    },
    payload: JSON.stringify(payload),
  });
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    Logger.log("Lead created in Notion.");
  } else {
    Logger.log("Notion create failed (" + code + "): " + res.getContentText());
    throw new Error("Notion create failed: " + code);
  }
}

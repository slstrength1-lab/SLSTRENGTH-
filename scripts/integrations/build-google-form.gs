/**
 * ONE-CLICK BUILDER: creates the "SL Strength — Coaching Application &
 * Assessment" Google Form, wires it to the Notion CRM, and prints the link.
 *
 * You run this once. It:
 *   1. Builds the whole form (5 sections, all questions/options/validation).
 *   2. Installs an on-submit trigger that creates a qualified Lead in Notion
 *      + attaches the assessment as a Coach Note on that lead.
 *   3. Logs the form's live (published) URL and the edit URL.
 *
 * ── HOW TO RUN ──────────────────────────────────────────────────────────────
 * 1. Go to script.google.com → New project. Paste this whole file in.
 * 2. Project Settings ⚙ → Script properties → add:
 *        NOTION_TOKEN = <your Notion internal integration secret>
 * 3. In Notion, share that integration with BOTH the "Leads" and "Coach Notes"
 *    databases (⋯ → Connections). (Skipping this = 403 on submit.)
 * 4. (Optional) set BOOKING_LINK below to your Calendly/Google Appointments URL.
 * 5. Select the function `buildForm` in the toolbar → Run. Approve permissions.
 * 6. Open View → Logs (or Executions). Copy the "PUBLISHED (share this) URL".
 *    ⚠️ Run buildForm ONCE — each run creates a new form.
 * ────────────────────────────────────────────────────────────────────────────
 */

var BOOKING_LINK = ""; // e.g. "https://calendly.com/slstrength/consult" — optional

/* ── Notion config (SL Strength OS) ─────────────────────────────────────────*/
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

/* ── 1. Build the form ──────────────────────────────────────────────────────*/
function buildForm() {
  var form = FormApp.create("SL Strength — Coaching Application & Assessment");
  form.setDescription(
    "Thanks for applying to SL Strength coaching. Answer honestly — it shapes " +
    "your programming. Some assessments include a follow-up video chat, which " +
    "we'll book at the end."
  );
  try { form.setCollectEmail(false); } catch (e) {}

  // Section 1 — About You (no page break: this is the first section)
  req(form.addTextItem().setTitle("Full name"));
  var emailItem = form.addTextItem().setTitle("Email");
  try { emailItem.setValidation(FormApp.createTextValidation().requireTextIsEmail().build()); } catch (e) {}
  req(emailItem);
  req(form.addTextItem().setTitle("Phone"));
  form.addTextItem().setTitle("Age");
  form.addMultipleChoiceItem().setTitle("Sex").setChoiceValues(["Male", "Female", "Prefer to self-describe"]);
  req(form.addMultipleChoiceItem().setTitle("How did you hear about us?").setChoiceValues(SOURCE_OPTIONS));

  // Section 2 — Goals & Fit
  form.addPageBreakItem().setTitle("Goals & Fit");
  req(form.addTextItem().setTitle("What is your #1 goal?"));
  form.addParagraphTextItem().setTitle("Why is now the right time? Any deadline or event?");
  form.addParagraphTextItem().setTitle("What have you tried before, and what got in the way?");
  req(form.addCheckboxItem().setTitle("What are you most interested in?").setChoiceValues(INTEREST_OPTIONS));
  form.addMultipleChoiceItem().setTitle("Training experience")
    .setChoiceValues(["Beginner (under 1 year)", "Intermediate (1–3 years)", "Advanced (3+ years)"]);
  form.addMultipleChoiceItem().setTitle("How many days per week can you train?")
    .setChoiceValues(["2", "3", "4", "5+"]);
  form.addMultipleChoiceItem().setTitle("What equipment do you have access to?")
    .setChoiceValues(["Full gym", "Home basics (dumbbells/bands)", "Bodyweight only"]);
  form.addMultipleChoiceItem().setTitle("What monthly investment range works for you?")
    .setChoiceValues(["Under $100", "$100–$250", "$250–$500", "$500+"]);

  // Section 3 — Health & Readiness
  form.addPageBreakItem().setTitle("Health & Readiness");
  req(form.addParagraphTextItem().setTitle("Any injuries, pain, or surgeries we should know about?"));
  form.addParagraphTextItem().setTitle("Any medical conditions or medications?");
  req(form.addMultipleChoiceItem().setTitle("Have you been cleared by a physician to exercise?")
    .setChoiceValues(["Yes", "No", "Unsure"]));
  form.addTextItem().setTitle("Average sleep per night (hours)");
  form.addMultipleChoiceItem().setTitle("Current stress level (1 low – 5 high)")
    .setChoiceValues(["1", "2", "3", "4", "5"]);
  form.addParagraphTextItem().setTitle("Nutrition snapshot (meals/day, protein, water, alcohol, restrictions)");

  // Section 4 — Movement Screen
  form.addPageBreakItem().setTitle("Movement Screen");
  req(form.addMultipleChoiceItem().setTitle("Can you stand on one foot for 10+ seconds? (try both feet)")
    .setChoiceValues(["Yes – both", "One leg only", "No"]));
  req(form.addMultipleChoiceItem().setTitle("Can you hold a plank for 2 minutes?").setChoiceValues(["Yes", "No"]));
  form.addMultipleChoiceItem().setTitle("Do you exercise at least 30 minutes most days?")
    .setChoiceValues(["Yes", "Sometimes", "No"]);
  form.addParagraphTextItem().setTitle("Describe your current exercise routine");
  form.addParagraphTextItem().setTitle("Did you feel any pain during these movements? If so, where?");

  // Section 5 — Book Your Consult
  var book = form.addPageBreakItem().setTitle("Book Your Consult");
  if (BOOKING_LINK) book.setHelpText("Last step — book your free video consult: " + BOOKING_LINK);
  form.addDateItem().setTitle("Preferred consult date");
  form.addMultipleChoiceItem().setTitle("Preferred time of day").setChoiceValues(["Morning", "Afternoon", "Evening"]);
  req(form.addMultipleChoiceItem().setTitle("Is it okay to text and email you?").setChoiceValues(["Yes", "No"]));

  form.setConfirmationMessage(
    "Thanks! We've got your application." + (BOOKING_LINK ? " Book your consult here: " + BOOKING_LINK : "")
  );

  // Install the on-submit → Notion trigger (avoid duplicates).
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onFormSubmit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onFormSubmit").forForm(form).onFormSubmit().create();

  Logger.log("✅ Form built.");
  Logger.log("PUBLISHED (share this) URL: " + form.getPublishedUrl());
  Logger.log("EDIT URL: " + form.getEditUrl());
  if (!BOOKING_LINK) Logger.log("Tip: set BOOKING_LINK at the top and re-run to add a booking CTA (or add it in the form editor).");
}

function req(item) { item.setRequired(true); return item; }

/* ── 2. On submit → Notion ──────────────────────────────────────────────────*/
function onFormSubmit(e) {
  var nv = {};
  if (e && e.response && e.response.getItemResponses) {
    e.response.getItemResponses().forEach(function (ir) {
      nv[ir.getItem().getTitle()] = [].concat(ir.getResponse());
    });
  } else if (e && e.namedValues) {
    nv = e.namedValues; // (fallback if bound to a sheet)
  }
  var v = function (t) { var x = nv[t]; return x ? String([].concat(x)[0]).trim() : ""; };

  var name = v(FIELD_TITLES.name);
  if (!name) { Logger.log("No name — skipping."); return; }

  var skip = {}; for (var k in FIELD_TITLES) skip[FIELD_TITLES[k]] = true;
  var assessment = [];
  for (var title in nv) {
    if (skip[title] || title === "Timestamp") continue;
    var ans = [].concat(nv[title]).join(", ").trim();
    if (ans) assessment.push(title + ": " + ans);
  }
  var summary = assessment.join("\n");

  var props = { "Name": { title: [{ text: { content: name } }] }, "Stage": { select: { name: "New" } } };
  var email = v(FIELD_TITLES.email), phone = v(FIELD_TITLES.phone),
      goal = v(FIELD_TITLES.goal), problem = v(FIELD_TITLES.problem);
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
  if (leadId && summary) {
    try {
      createNotionPage(COACH_NOTES_DATA_SOURCE_ID, {
        "Note": { title: [{ text: { content: "Assessment intake — " + name } }] },
        "Body": { rich_text: [{ text: { content: truncate(summary, 1900) } }] },
        "Type": { select: { name: "Coaching Note" } },
        "Status": { select: { name: "New" } },
        "Lead": { relation: [{ id: leadId }] },
      });
    } catch (err) { Logger.log("Lead ok, note failed: " + err); }
  }
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function matchOption(value, options) {
  if (!value) return null;
  var v = value.toLowerCase();
  for (var i = 0; i < options.length; i++) if (v.indexOf(options[i].toLowerCase()) !== -1) return options[i];
  return "Other";
}
function pickOptions(raw, options) {
  var text = [].concat(raw || []).join(", ").toLowerCase(), out = [];
  for (var i = 0; i < options.length; i++) if (text.indexOf(options[i].toLowerCase()) !== -1) out.push(options[i]);
  return out;
}
function budgetToValue(s) {
  if (!s) return null;
  var nums = (s.match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  if (/\+/.test(s)) return Math.round(nums[0] * 1.2);
  if (/under|less/i.test(s)) return Math.round(nums[0] * 0.75);
  return nums[0];
}
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

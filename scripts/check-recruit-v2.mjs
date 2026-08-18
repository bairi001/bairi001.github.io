import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const errors = [];
const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const requireText = (file, content, text, label = text) => {
  if (!content.includes(text)) errors.push(`${file}: missing ${label}`);
};

const runtimeFile = new URL("../assets/recruit-direct-apply.js", import.meta.url);
const syntax = spawnSync(process.execPath, ["--check", fileURLToPath(runtimeFile)], { encoding: "utf8" });
if (syntax.status !== 0) errors.push(`assets/recruit-direct-apply.js: syntax check failed: ${syntax.stderr.trim()}`);

const recruit = await read("recruit.html");
requireText("recruit.html", recruit, 'data-recruit-v2="prepared"', "Recruit V2 prepared marker");
requireText("recruit.html", recruit, '<script src="assets/recruit-direct-apply.js"></script>', "Recruit V2 runtime include");
requireText("recruit.html", recruit, "最短1分の応募・見学相談", "lower-friction application heading");
for (const id of ["applicantName", "contactMethod", "contactValue", "experience", "workStyle", "recruitConsent"]) {
  requireText("recruit.html", recruit, `id="${id}"`, `${id} field`);
}

const jobLinks = {
  "recruit/contractor.html": "/recruit.html?job=contractor#apply",
  "recruit/full-time.html": "/recruit.html?job=full-time#apply",
  "recruit/part-time.html": "/recruit.html?job=part-time#apply"
};
for (const [file, href] of Object.entries(jobLinks)) {
  const html = await read(file);
  requireText(file, html, `href="${href}"`, "job-context application link");
  if (html.includes('directApply":true') || html.includes('"directApply": true')) {
    errors.push(`${file}: directApply=true must remain disabled until direct submission is live`);
  }
}

const runtime = await read("assets/recruit-direct-apply.js");
for (const [text, label] of [
  ["recruit_form_view", "form view event"],
  ["recruit_form_start", "form start event"],
  ["recruit_form_submit_success", "direct submit success event"],
  ["recruit_form_duplicate", "duplicate separation"],
  ["recruit_form_submit_error", "submit error event"],
  ["recruitOptionalDetails", "collapsed optional fields"],
  ["originJob", "job-context preselection"],
  ["replaceButton", "legacy handler removal"],
  ["requestType: \"recruit\"", "recruit request type"],
  ["recruitWebsite", "honeypot field"]
]) requireText("assets/recruit-direct-apply.js", runtime, text, label);

const enabled = runtime.match(/enabled:\s*(true|false)/)?.[1];
const endpoint = runtime.match(/endpoint:\s*"([^"]*)"/)?.[1] ?? null;
if (!enabled || endpoint == null) {
  errors.push("assets/recruit-direct-apply.js: direct-submit configuration is unreadable");
} else if (enabled === "true" && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint)) {
  errors.push("assets/recruit-direct-apply.js: enabled direct submit requires a valid Apps Script /exec endpoint");
} else if (enabled === "false" && endpoint !== "") {
  errors.push("assets/recruit-direct-apply.js: disabled direct submit must not retain an endpoint");
}

for (const piiKey of ["name:", "contactValue:", "email:", "phone:"]) {
  const eventSection = runtime.match(/function track\([\s\S]*?\n  }/)?.[0] || "";
  if (eventSection.includes(piiKey)) errors.push(`assets/recruit-direct-apply.js: analytics track helper contains PII key ${piiKey}`);
}

const backend = await read("docs/google-apps-script/RecruitCode.gs");
for (const [text, label] of [
  ["shinyuuan-recruit", "separate recruit service"],
  ["Recruit Applications", "separate sheet tab"],
  ["requestType !== \"recruit\"", "request-type guard"],
  ["recruitSendApplicantReceipt_", "applicant email receipt"],
  ["recruitIsDuplicateApplication_", "duplicate guard"],
  ["recruitCheckRateLimit_", "rate limit"]
]) requireText("docs/google-apps-script/RecruitCode.gs", backend, text, label);
for (const property of ["TO_MAIL", "SHEET_ID", "MAX_PER_HOUR", "SALON_NAME", "TIME_ZONE", "SHEET_NAME"]) {
  requireText("docs/google-apps-script/RecruitCode.gs", backend, `getProperty("${property}")`, `${property} Script Property`);
}
if (/\b[\w.+-]+@gmail\.com\b/i.test(backend)) errors.push("docs/google-apps-script/RecruitCode.gs: real email must not be committed");

const guide = await read("docs/google-apps-script/RECRUIT_DEPLOY.md");
requireText("docs/google-apps-script/RECRUIT_DEPLOY.md", guide, "现有预约 Web App **分开部署**", "booking-backend isolation warning");
requireText("docs/google-apps-script/RECRUIT_DEPLOY.md", guide, "enabled: true", "activation step");
requireText("docs/google-apps-script/RECRUIT_DEPLOY.md", guide, "TEST RECRUIT", "live test checklist");

if (errors.length) {
  console.error(`Recruit Direct Apply V2 check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Recruit Direct Apply V2 check passed: contextual entry, low-friction UI, isolated backend, fallback channels and activation gate are present.");

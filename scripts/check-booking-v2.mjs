import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";

const errors = [];
const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const requireText = (file, content, text, label = text) => {
  if (!content.includes(text)) errors.push(`${file}: missing ${label}`);
};

for (const file of ["assets/booking-mode.js", "assets/secondary-pages.js"]) {
  const result = spawnSync(process.execPath, ["--check", new URL(`../${file}`, import.meta.url)], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`${file}: JavaScript syntax check failed: ${result.stderr.trim()}`);
}

const booking = await read("assets/booking-mode.js");
for (const [text, label] of [
  ["minAdvanceMinutes: 120", "120-minute same-day web lead time"],
  ["quietHoursEarliestMinutes: 12 * 60", "quiet-hours noon floor"],
  ["booking_form_duplicate", "duplicate submission analytics separation"],
  ["bookingAlternative", "alternative date/time controls"],
  ["secondDate", "second preferred date"],
  ["secondTime", "second preferred time"],
  ["timeFlex", "time flexibility"],
  ["sameStart", "multi-guest simultaneous-start choice"],
  ["service_context", "service context analytics"],
  ["origin_page", "origin page analytics"],
  ["showAllCourses", "course-group expansion control"],
  ["filterableServices", "relevant-course filtering"],
  ["preferred = (lang === \"ja\" ? [\"hpb\", \"web\"] : [\"web\", \"whatsapp\"])", "language-specific primary channels"]
]) requireText("assets/booking-mode.js", booking, text, label);

if (/booking_form_submit_success[\s\S]{0,160}duplicate\s*===\s*true[\s\S]{0,160}originalTrackEvent\(name/.test(booking)) {
  errors.push("assets/booking-mode.js: duplicate submissions can still fall through to the success key event");
}

const secondary = await read("assets/secondary-pages.js");
for (const [path, service] of [
  ["/bodycare-kamata.html", "body"],
  ["/aroma-oil-kamata.html", "aroma"],
  ["/ashitsubo-fukurahagi.html", "foot"],
  ["/headspa-kamata.html", "head"],
  ["/kamata-late-night.html", "late"]
]) {
  requireText("assets/secondary-pages.js", secondary, `\"${path}\": \"${service}\"`, `${path} booking context`);
}
requireText("assets/secondary-pages.js", secondary, 'url.searchParams.set("service", serviceContext)', "service parameter propagation");
requireText("assets/secondary-pages.js", secondary, 'url.searchParams.set("origin", origin)', "origin parameter propagation");

const bookingHtml = await read("booking.html");
requireText("booking.html", bookingHtml, '<script src="assets/booking-mode.js"></script>', "booking-mode runtime include");
requireText("booking.html", bookingHtml, "23:00以降にご来店の場合", "arrival-based late-night fee wording");
requireText("booking.html", bookingHtml, "FORM_LIVE_TESTED = true", "live-tested web form lock");

if (errors.length) {
  console.error(`Smart Booking V2 check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Smart Booking V2 check passed: contextual course selection, safe same-day times, alternative scheduling, channel reduction and analytics guards are present.");

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const errors = [];
const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const requireText = (file, content, text, label = text) => {
  if (!content.includes(text)) errors.push(`${file}: missing ${label}`);
};
const forbidText = (file, content, text, label = text) => {
  if (content.includes(text)) errors.push(`${file}: still contains ${label}`);
};

for (const file of ["assets/booking-mode.js", "assets/secondary-pages.js"]) {
  const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
  const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`${file}: JavaScript syntax check failed: ${result.stderr.trim()}`);
}

const booking = await read("assets/booking-mode.js");
for (const [text, label] of [
  ["const order = [\"web\", \"whatsapp\", \"line\", \"phone\"]", "four always-visible direct booking channels"],
  ["requestedCourse", "explicit course preselection without filtering"],
  ["service_context", "service context analytics"],
  ["origin_page", "origin page analytics"],
  ["booking_form_duplicate", "duplicate submission analytics separation"],
  ["roundUp", "elapsed-time-only same-day slot filtering"],
  ["23:00以降に実際にご来店の場合のみ深夜料金800円", "arrival-based late-night fee wording"],
  ["originalTrackEvent(\"booking_form_duplicate\", eventParameters);\n      return;", "duplicate event early return"]
]) requireText("assets/booking-mode.js", booking, text, label);

for (const [text, label] of [
  ["minAdvanceMinutes", "hard lead-time restriction"],
  ["quietHoursEarliestMinutes", "pre-opening noon floor"],
  ["bookingAlternative", "second-choice scheduling block"],
  ["secondDate", "second preferred date"],
  ["secondTime", "second preferred time"],
  ["timeFlex", "time flexibility selector"],
  ["showAllCourses", "course filtering toggle"],
  ["filterableServices", "source-page course filtering"],
  ["channelHpb", "HotPepper booking-page channel"],
  ["booking-v2-other-channels", "collapsed secondary booking channels"],
  ["preferred = (lang ===", "language-specific channel hiding"]
]) forbidText("assets/booking-mode.js", booking, text, label);

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
requireText("booking.html", bookingHtml, "FORM_LIVE_TESTED = true", "live-tested web form lock");
requireText("booking.html", bookingHtml, '<meta name="robots" content="noindex,follow">', "booking page remains noindex");

if (errors.length) {
  console.error(`Booking Simple Recovery check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Booking Simple Recovery check passed: all courses stay visible, four direct channels stay visible, only elapsed times are filtered, and analytics guards remain intact.");

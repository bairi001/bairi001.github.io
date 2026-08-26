import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const errors = [];
const findBrowser = () => {
  for (const candidate of ["google-chrome", "chromium", "chromium-browser"]) {
    const result = spawnSync("which", [candidate], { encoding: "utf8" });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  return "";
};
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const requireText = (html, text, label) => {
  if (!html.includes(text)) errors.push(`runtime harness missing ${label}`);
};

const browser = findBrowser();
if (!browser) {
  console.error("Booking Simple Recovery runtime check failed: Chrome/Chromium is unavailable on the runner.");
  process.exit(1);
}

const port = 18765;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: new URL("..", import.meta.url),
  stdio: "ignore"
});

try {
  await wait(700);
  const url = `http://127.0.0.1:${port}/scripts/fixtures/booking-v2-harness.html?lang=ja&service=aroma&origin=aroma-oil-kamata&cta=service_hero`;
  const result = spawnSync(browser, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--dump-dom",
    url
  ], { encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024 });

  if (result.status !== 0) {
    errors.push(`headless browser exited with ${result.status}: ${(result.stderr || "").trim()}`);
  } else {
    const html = result.stdout;
    requireText(html, 'data-test-ready="true"', "ready marker");
    requireText(html, 'data-course-options="SELECT COURSE|試し — ¥4800|整体30 — ¥2400|足45 — ¥3980|アロマ30 — ¥2980|アロマ60 — ¥4980"', "all course groups remain visible");
    requireText(html, 'data-first-time="11:00"', "opening-time slot remains available before opening");
    requireText(html, 'data-story-image="/assets/img/head-scalp-care.webp"', "booking page does not visually rewrite itself from referrer context");
    requireText(html, 'data-alternative="false"', "second-choice scheduling block removed");
    requireText(html, 'data-visible-channels="4"', "Web, WhatsApp, LINE and phone all visible together");
    requireText(html, 'data-payload-note="Second input|origin: aroma-oil-kamata / cta: service_hero"', "web payload origin attribution");
    requireText(html, "booking_form_start:web", "deduplicated web form start");
    requireText(html, "booking_form_duplicate:", "duplicate submission event");
    const startCount = (html.match(/booking_form_start:web/g) || []).length;
    if (startCount !== 1) errors.push(`expected one booking_form_start:web event, found ${startCount}`);
    if (html.includes("booking_form_submit_success:") && html.includes("duplicate=true")) {
      errors.push("duplicate submission was recorded as a success event");
    }
  }
} finally {
  server.kill("SIGTERM");
}

if (errors.length) {
  console.error(`Booking Simple Recovery runtime check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Booking Simple Recovery runtime check passed in headless Chromium.");

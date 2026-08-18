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
  console.error("Recruit V2 runtime check failed: Chrome/Chromium is unavailable on the runner.");
  process.exit(1);
}

const port = 18766;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: new URL("..", import.meta.url),
  stdio: "ignore"
});

try {
  await wait(700);
  const url = `http://127.0.0.1:${port}/scripts/fixtures/recruit-v2-harness.html?job=contractor&utm_source=indeed&utm_medium=job_board`;
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
    requireText(html, 'data-work-style="業務委託"', "contractor job preselection");
    requireText(html, 'data-context="true"', "job-context notice");
    requireText(html, 'data-optional="true"', "collapsed optional details");
    requireText(html, 'data-optional-contains="true"', "optional fields moved into details");
    requireText(html, 'data-required-outside="true"', "required fields kept outside details");
    requireText(html, 'data-primary-button="メールアプリで送る"', "safe fallback button while direct submit is disabled");
    requireText(html, 'data-direct-state="現在はメールまたはLINEで送信できます。直接送信機能は公開前テスト中です。"', "disabled direct-submit state");
    requireText(html, "recruit_form_view|", "form view event");
    requireText(html, "recruit_form_start|", "single form start event");
    const startCount = (html.match(/recruit_form_start\|/g) || []).length;
    if (startCount !== 1) errors.push(`expected one recruit_form_start event, found ${startCount}`);
    if (html.includes("recruit_form_submit_success|")) errors.push("disabled direct-submit mode emitted a success event");
  }
} finally {
  server.kill("SIGTERM");
}

if (errors.length) {
  console.error(`Recruit V2 runtime check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Recruit Direct Apply V2 runtime check passed in headless Chromium.");

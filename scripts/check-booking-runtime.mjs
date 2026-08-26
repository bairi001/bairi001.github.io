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

const dump = url => spawnSync(browser, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--dump-dom",
  url
], { encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024 });

const expectedLead = {
  ja: "すべてのコースから自由に選び、ご希望日時を入力して、ウェブまたはWhatsAppから予約リクエストを送信できます。空き状況を確認後、当店からの返信をもって予約確定となります。",
  en: "Choose any course and preferred time, then send your request on this website or via WhatsApp. We will check availability and reply to confirm your appointment.",
  zh: "可自由选择全部套餐和希望时间，再通过本网页或WhatsApp发送预约申请。收到店铺回复后，预约才正式成立。",
  ko: "모든 코스에서 자유롭게 선택하고 희망 시간을 입력한 뒤 웹페이지 또는 WhatsApp으로 예약 신청을 보낼 수 있습니다. 매장의 답변을 받은 뒤 예약이 확정됩니다."
};

try {
  await wait(700);
  const rootUrl = `http://127.0.0.1:${port}/scripts/fixtures/booking-v2-harness.html?service=aroma&origin=aroma-oil-kamata&cta=service_hero`;

  for (const language of ["ja", "en", "zh", "ko"]) {
    const result = dump(`${rootUrl}&lang=${language}`);
    if (result.status !== 0) {
      errors.push(`${language} browser exited with ${result.status}: ${(result.stderr || "").trim()}`);
      continue;
    }
    const html = result.stdout;
    requireText(html, 'data-test-ready="true"', `${language} ready marker`);
    requireText(html, `data-lang="${language}"`, `${language} language state`);
    requireText(html, `data-form-lead="${expectedLead[language]}"`, `${language} V3 form lead`);
    requireText(html, 'data-visible-channels="4"', `${language} four direct booking channels`);
    requireText(html, 'data-channel-list="web|whatsapp|line|phone"', `${language} exact channel list without HotPepper`);
    requireText(html, 'data-channel-hrefs="web:#bookingForm|whatsapp:#bookingForm|line:https://page.line.me/017hlpiu|phone:tel:0368746808"', `${language} direct channel hrefs`);
    requireText(html, 'data-whatsapp-mode="true|false|false|true"', `${language} WhatsApp mode visibility`);
    requireText(html, 'data-web-mode="false|true|true|false"', `${language} Web mode visibility`);
    requireText(html, 'data-guests="3"', `${language} multi-guest interaction`);
  }

  const baseUrl = `${rootUrl}&lang=ja`;
  const result = dump(baseUrl);
  if (result.status !== 0) {
    errors.push(`headless browser exited with ${result.status}: ${(result.stderr || "").trim()}`);
  } else {
    const html = result.stdout;
    requireText(html, 'data-course-options="SELECT COURSE|試し — ¥4800|整体30 — ¥2400|足45 — ¥3980|アロマ30 — ¥2980|アロマ60 — ¥4980"', "all course groups remain visible");
    requireText(html, 'data-first-time="11:00"', "opening-time slot remains available before opening");
    requireText(html, 'data-story-image="/assets/img/head-scalp-care.webp"', "booking page does not visually rewrite itself from referrer context");
    requireText(html, 'data-alternative="false"', "second-choice scheduling block removed");
    requireText(html, 'data-payload-note="Second input|origin: aroma-oil-kamata / cta: service_hero"', "web payload origin attribution");
    requireText(html, "booking_form_start:web", "deduplicated web form start");
    requireText(html, "booking_form_duplicate:", "duplicate submission event");
    const startCount = (html.match(/booking_form_start:web/g) || []).length;
    if (startCount !== 1) errors.push(`expected one booking_form_start:web event, found ${startCount}`);
    if (html.includes("booking_form_submit_success:") && html.includes("duplicate=true")) {
      errors.push("duplicate submission was recorded as a success event");
    }
  }

  const preselected = dump(`${baseUrl}&course=aroma60`);
  if (preselected.status !== 0) {
    errors.push(`course-preselection browser exited with ${preselected.status}: ${(preselected.stderr || "").trim()}`);
  } else {
    requireText(preselected.stdout, 'data-selected-course="aroma60"', "explicit course CTA preselection");
    requireText(preselected.stdout, 'data-course-options="SELECT COURSE|試し — ¥4800|整体30 — ¥2400|足45 — ¥3980|アロマ30 — ¥2980|アロマ60 — ¥4980"', "preselection keeps all course groups visible");
  }

  const afterMidnight = dump(`${baseUrl}&clock=after_midnight`);
  if (afterMidnight.status !== 0) {
    errors.push(`after-midnight browser exited with ${afterMidnight.status}: ${(afterMidnight.stderr || "").trim()}`);
  } else {
    requireText(afterMidnight.stdout, 'data-first-time="00:30"', "00:30 current-calendar late-night slot at 00:10 JST");
  }
} finally {
  server.kill("SIGTERM");
}

if (errors.length) {
  console.error(`Booking Simple Recovery runtime check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Booking Simple Recovery runtime check passed in headless Chromium for ja/en/zh/ko, four direct channels, mode switching, guest selection, course preselection and after-midnight availability.");
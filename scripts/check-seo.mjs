import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const errors = [];
const read = relative => readFile(path.join(root, relative), "utf8");
const fail = (file, message) => errors.push(`${file}: ${message}`);

const sitemap = await read("sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>(https:\/\/shinyuuan\.jp\/[^<]*)<\/loc>/g)].map(match => match[1]);

function urlToFile(url) {
  const pathname = new URL(url).pathname;
  if (pathname === "/") return "index.html";
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  return pathname.slice(1);
}

function firstMatch(source, pattern) {
  return source.match(pattern)?.[1]?.trim() || "";
}

function requireFragments(file, source, fragments, label) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) fail(file, `${label} missing: ${fragment}`);
  }
}

const indexableFiles = new Map();
for (const url of sitemapUrls) indexableFiles.set(urlToFile(url), url);

for (const [file, url] of indexableFiles) {
  const html = await read(file);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(file, "missing non-empty title");
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html)) fail(file, "missing non-empty meta description");
  if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) fail(file, "missing H1");
  if (/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) fail(file, "sitemap page must not be noindex");

  const canonical = firstMatch(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canonical) fail(file, "missing canonical");
  else if (canonical !== url) fail(file, `canonical mismatch: expected ${url}, found ${canonical}`);

  if (/https?:\/\/wa\.me\//i.test(html)) fail(file, "indexable page must not bypass the structured booking form with a direct wa.me link");
  if (/(完全個室|個室サロン|全室個室)/.test(html)) fail(file, "forbidden private-room wording remains in raw HTML");

  for (const [index, match] of [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    try { JSON.parse(match[1]); }
    catch (error) { fail(file, `invalid JSON-LD block ${index + 1}: ${error.message}`); }
  }
}

const noindexFiles = ["booking.html", "privacy.html", "404.html", "company.html", "yoyaku.html"];
for (const file of noindexFiles) {
  const html = await read(file);
  if (!/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) fail(file, "expected noindex directive");
}
const privacy = await read("privacy.html");
if (/<link\s+rel=["']alternate["'][^>]*hreflang=/i.test(privacy)) {
  fail("privacy.html", "noindex privacy page should not publish parameter-based hreflang alternates");
}
if (sitemap.includes("https://shinyuuan.jp/privacy.html")) fail("sitemap.xml", "privacy page must stay out of sitemap");

const importantPaths = [
  "/ashitsubo-fukurahagi.html",
  "/kamata-late-night.html",
  "/headspa-kamata.html",
  "/en/foot-massage-kamata.html",
  "/en/late-night-massage-kamata.html",
  "/en/haneda-kamata-massage.html",
  "/recruit/contractor.html",
  "/recruit/full-time.html",
  "/recruit/part-time.html"
];
const indexableHtml = Object.fromEntries(await Promise.all([...indexableFiles.keys()].map(async file => [file, await read(file)])));
for (const target of importantPaths) {
  const targetFile = urlToFile(`https://shinyuuan.jp${target}`);
  const linkedFrom = Object.entries(indexableHtml).some(([file, html]) => file !== targetFile && new RegExp(`href=["'](?:https:\\/\\/shinyuuan\\.jp)?${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[?#][^"']*)?["']`, "i").test(html));
  if (!linkedFrom) fail(targetFile, "important page has no crawlable internal link from another indexable page");
}

const logoPath = "https://shinyuuan.jp/assets/logo-square.svg";
const logoSvg = await read("assets/logo-square.svg");
if (!/viewBox=["']0 0 512 512["']/.test(logoSvg) || !logoSvg.includes("身悠晏")) {
  fail("assets/logo-square.svg", "brand logo must remain a square 512-viewBox asset with the brand name");
}
for (const file of ["index.html", "shop.html", "en/index.html"]) {
  const html = indexableHtml[file];
  if (!html.includes('"validFrom":"2027-01-01"') || !html.includes('"validThrough":"2027-01-01"')) {
    fail(file, "LocalBusiness structured data is missing January 1 closure override");
  }
  if (!html.includes(`"logo":"${logoPath}"`)) fail(file, "LocalBusiness structured data is missing the official square logo");
}

const lateNightChecks = {
  "menu.html": "深夜料金（23:00以降にご来店の場合）",
  "kamata-late-night.html": "23:00以降にご来店の場合",
  "en/index.html": "arrive at or after 11:00 PM",
  "en/late-night-massage-kamata.html": "arrive at or after 11:00 PM",
  "zh/index.html": "到店时间为23:00或之后",
  "ko/index.html": "23:00 이후에 도착"
};
for (const [file, phrase] of Object.entries(lateNightChecks)) {
  if (!indexableHtml[file]?.includes(phrase)) fail(file, `late-night arrival rule missing: ${phrase}`);
}

const menu = indexableHtml["menu.html"];
if ((menu.match(/HotPepperでこのメニューを見る/g) || []).length !== 0) fail("menu.html", "repeated per-menu HotPepper CTA has returned");
for (const image of ["premium-seitai.webp", "menu-aroma-back.webp", "head-scalp-care.webp", "leg-option-care-new.webp", "decollete-care-new.webp"]) {
  if (!menu.includes(image)) fail("menu.html", `new treatment image is not statically referenced: ${image}`);
}

for (const file of ["index.html", "menu.html", "shop.html", "faq.html", "en/index.html", "zh/index.html", "ko/index.html", "assets/language-routing.js", "assets/secondary-pages.js"]) {
  const source = file.endsWith(".html") ? (indexableHtml[file] || await read(file)) : await read(file);
  if (source.includes("site-closeout.js")) fail(file, "runtime SEO closeout script must not be referenced");
}

const bookingMode = await read("assets/booking-mode.js");
if (!/const\s+WHATSAPP_CHANNEL_ENABLED\s*=\s*true\s*;/.test(bookingMode)) fail("assets/booking-mode.js", "WhatsApp channel should remain enabled");
if (!bookingMode.includes('get("mode")') || !bookingMode.includes('requestedMode === "whatsapp"')) fail("assets/booking-mode.js", "booking page must support mode=whatsapp without bypassing the form");

const booking = await read("booking.html");
if (!booking.includes("https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText())}")) fail("booking.html", "WhatsApp handoff must use the generated structured message");
for (const required of ["labels.course", "labels.date", "labels.time", "labels.guests", "labels.name", "via shinyuuan.jp/booking.html"]) {
  if (!booking.includes(required)) fail("booking.html", `structured WhatsApp message field missing: ${required}`);
}

for (const phrase of ["Open daily","毎日営業","每天营业","매일 영업","Private room space","個室空間"]) { if (booking.includes(phrase)) fail("booking.html", `stale raw booking claim remains: ${phrase}`); }
for (const phrase of ["予約時刻ではなく実際のご来店時刻が基準です","arrive at or after 11:00 PM","1月1日休み","個室仕様の施術スペース","Private treatment spaces","独立护理空间","독립형 관리 공간"]) { if (!booking.includes(phrase)) fail("booking.html", `truthful raw booking wording missing: ${phrase}`); }
if (booking.includes("isLate()")) fail("booking.html", "selected booking time must not calculate or append the late-night fee");
for (const file of ["index.html","shop.html","en/index.html"]) { const html=indexableHtml[file]; for (const image of ["shop-front.jpg","premium-seitai.webp","menu-aroma-back.webp","menu-foot-close.webp","head-scalp-care.webp"]) if (!html.includes(image)) fail(file, `LocalBusiness representative image missing: ${image}`); }
const legacyCloseout = await read("assets/site-closeout.js");
for (const stale of ["body-shoulder-care-new.webp","aroma-leg-care-new.webp","Open daily","Private room space","patchMenu","patchFaq"]) if (legacyCloseout.includes(stale)) fail("assets/site-closeout.js", `legacy compatibility shim still contains stale DOM patch: ${stale}`);

const spaceWordingLocks = {
  "index.html": ["個室仕様の施術スペース"],
  "shop.html": ["個室仕様の施術スペース", "三方を壁で仕切った個室仕様の施術スペースです。入口はカーテンになっています。"],
  "faq.html": ["個室ですか？", "三方を壁で仕切った個室仕様の施術スペースです。入口はカーテンになっています。"],
  "en/index.html": ["Private treatment spaces"],
  "zh/index.html": ["独立护理空间", "三面由隔断墙分隔，入口使用帘子"],
  "ko/index.html": ["독립형 관리 공간", "세 면은 벽으로 구분되어 있고 입구는 커튼으로 되어 있습니다."]
};
for (const [file, phrases] of Object.entries(spaceWordingLocks)) requireFragments(file, indexableHtml[file], phrases, "private-space wording");
for (const phrase of ["個室仕様の施術スペース","Private treatment spaces","独立护理空间","독립형 관리 공간"]) if (!bookingMode.includes(phrase)) fail("assets/booking-mode.js", `booking runtime space wording missing: ${phrase}`);

const routing = await read("assets/language-routing.js");
if (/https?:\/\/wa\.me\//i.test(routing)) fail("assets/language-routing.js", "homepage WhatsApp CTA must route through booking.html, not directly to wa.me");
if (/configureHomeMobileCta|replaceChildren\s*\(/.test(routing)) fail("assets/language-routing.js", "mobile conversion CTA must be static HTML, not rebuilt at runtime");
if (!routing.includes('mobile_conversion_click') || !routing.includes('dataset.channel')) fail("assets/language-routing.js", "static mobile CTA conversion tracking is missing");
if (!routing.includes('gridTemplateColumns = "minmax(0,1fr) minmax(0,1fr) minmax(56px,.72fr)"')) fail("assets/language-routing.js", "three-button EN/ZH/KO mobile CTA layout guard is missing");

const staticCtas = {
  "index.html": ['data-channel="hpb">HotPepper予約', 'data-channel="web">ウェブ予約', 'data-channel="line">LINE相談'],
  "menu.html": ['data-channel="hpb">HotPepper予約', 'data-channel="web">ウェブ予約', 'data-channel="line">LINE相談'],
  "shop.html": ['data-channel="hpb">HotPepper予約', 'data-channel="web">ウェブ予約', 'data-channel="line">LINE相談'],
  "faq.html": ['data-channel="hpb">HotPepper予約', 'data-channel="web">ウェブ予約', 'data-channel="line">LINE相談'],
  "en/index.html": ['data-channel="web">Book Online', 'data-channel="whatsapp">WhatsApp', 'data-channel="phone">Call'],
  "zh/index.html": ['data-channel="web">网页预约', 'data-channel="whatsapp">WhatsApp', 'data-channel="line">LINE'],
  "ko/index.html": ['data-channel="web">온라인 예약', 'data-channel="whatsapp">WhatsApp', 'data-channel="line">LINE']
};
for (const [file, fragments] of Object.entries(staticCtas)) requireFragments(file, indexableHtml[file], fragments, "static mobile CTA");
for (const file of ["en/index.html", "zh/index.html", "ko/index.html"]) {
  if (!indexableHtml[file].includes("mode=whatsapp")) fail(file, "WhatsApp CTA must deep-link to booking mode=whatsapp");
}

requireFragments("zh/index.html", indexableHtml["zh/index.html"], ["东京蒲田站东口步行约1分钟", "足底・身体・香薰放松护理"], "search-intent H1");
requireFragments("ko/index.html", indexableHtml["ko/index.html"], ["도쿄 가마타역 동쪽 출구 도보 약 1분", "발・바디・아로마 릴랙세이션"], "search-intent H1");

for (const file of ["shop.html", "faq.html"]) {
  const html = indexableHtml[file];
  if (!html.includes("mode=whatsapp") || !html.includes("WhatsApp")) fail(file, "restored WhatsApp option must be visible and routed through booking.html");
  if (/https?:\/\/wa\.me\//i.test(html)) fail(file, "WhatsApp option must never bypass structured booking form");
}
if (indexableHtml["shop.html"].includes("完整な")) fail("shop.html", "mixed-language WhatsApp helper copy remains");

const currentLastmod = [
  "https://shinyuuan.jp/",
  "https://shinyuuan.jp/shop.html",
  "https://shinyuuan.jp/faq.html",
  "https://shinyuuan.jp/en/",
  "https://shinyuuan.jp/zh/",
  "https://shinyuuan.jp/ko/"
];
for (const url of currentLastmod) {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = sitemap.match(new RegExp(`<url><loc>${escaped}</loc><lastmod>([^<]+)</lastmod>`))?.[1];
  if (value !== "2026-08-11") fail("sitemap.xml", `${url} lastmod should reflect the 2026-08-11 private-space wording closeout`);
}

if (errors.length) {
  console.error(`SEO consistency check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`SEO consistency check passed for ${indexableFiles.size} sitemap pages: canonical/index rules, structured data, internal links, January closure, official logo, static multilingual mobile CTAs, restored WhatsApp handoff, search-intent H1s, local-business facts and regression guards.`);

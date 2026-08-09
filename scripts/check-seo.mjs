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

const noindexFiles = ["booking.html", "404.html", "company.html", "yoyaku.html"];
for (const file of noindexFiles) {
  const html = await read(file);
  if (!/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
    fail(file, "expected noindex directive");
  }
}

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
  if (!linkedFrom) fail(targetFile, `important page has no crawlable internal link from another indexable page`);
}

for (const file of ["index.html", "shop.html", "en/index.html"]) {
  const html = indexableHtml[file];
  if (!html.includes('"validFrom":"2027-01-01"') || !html.includes('"validThrough":"2027-01-01"')) {
    fail(file, "LocalBusiness structured data is missing January 1 closure override");
  }
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
if ((menu.match(/HotPepperでこのメニューを見る/g) || []).length !== 0) {
  fail("menu.html", "repeated per-menu HotPepper CTA has returned");
}
for (const image of ["body-shoulder-care-new.webp", "aroma-leg-care-new.webp", "leg-option-care-new.webp", "decollete-care-new.webp"]) {
  if (!menu.includes(image)) fail("menu.html", `new treatment image is not statically referenced: ${image}`);
}

for (const file of ["index.html", "menu.html", "shop.html", "faq.html", "en/index.html", "zh/index.html", "ko/index.html", "assets/language-routing.js", "assets/secondary-pages.js"]) {
  const source = file.endsWith(".html") ? (indexableHtml[file] || await read(file)) : await read(file);
  if (source.includes("site-closeout.js")) fail(file, "runtime SEO closeout script must not be referenced");
}

const bookingMode = await read("assets/booking-mode.js");
if (!/const\s+WHATSAPP_CHANNEL_ENABLED\s*=\s*true\s*;/.test(bookingMode)) {
  fail("assets/booking-mode.js", "WhatsApp channel should be enabled after account restoration");
}
if (!bookingMode.includes('get("mode")') || !bookingMode.includes('requestedMode === "whatsapp"')) {
  fail("assets/booking-mode.js", "booking page must support a mode=whatsapp deep link without bypassing the form");
}

const booking = await read("booking.html");
if (!booking.includes("https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText())}")) {
  fail("booking.html", "WhatsApp handoff must use the generated structured message");
}
for (const required of ["labels.course", "labels.date", "labels.time", "labels.guests", "labels.name", "via shinyuuan.jp/booking.html"]) {
  if (!booking.includes(required)) fail("booking.html", `structured WhatsApp message field missing: ${required}`);
}

const routing = await read("assets/language-routing.js");
if (/https?:\/\/wa\.me\//i.test(routing)) {
  fail("assets/language-routing.js", "homepage WhatsApp CTA must route through booking.html, not directly to wa.me");
}
for (const required of [
  'label: "HotPepper予約"', 'label: "ウェブ予約"', 'label: "LINE相談"',
  'label: "Book Online"', 'label: "WhatsApp"', 'label: "Call"',
  'label: "网页预约"', 'label: "온라인 예약"', 'mode=whatsapp'
]) {
  if (!routing.includes(required)) fail("assets/language-routing.js", `mobile CTA configuration missing: ${required}`);
}

for (const localized of ["https://shinyuuan.jp/zh/", "https://shinyuuan.jp/ko/"]) {
  const block = sitemap.match(new RegExp(`<url><loc>${localized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc><lastmod>([^<]+)</lastmod>`))?.[1];
  if (block !== "2026-08-09") fail("sitemap.xml", `${localized} lastmod should reflect the current significant SEO update`);
}

if (errors.length) {
  console.error(`SEO consistency check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`SEO consistency check passed for ${indexableFiles.size} sitemap pages, structured data, noindex rules, internal links, restored WhatsApp channel, structured booking handoff, mobile conversion CTAs, local-business facts and static content guards.`);
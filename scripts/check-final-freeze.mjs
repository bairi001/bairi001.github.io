import { readFile } from "node:fs/promises";
import process from "node:process";

const errors = [];
const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const fail = (file, message) => errors.push(`${file}: ${message}`);
const requireText = (file, html, text, label = text) => {
  if (!html.includes(text)) fail(file, `missing ${label}`);
};

const menu = await read("menu.html");
for (const [href, anchor] of [
  ["bodycare-kamata.html", "もみほぐし・整体ボディケアの詳しい案内"],
  ["aroma-oil-kamata.html", "アロマ・オイルマッサージの詳しい案内"]
]) {
  requireText("menu.html", menu, `href="${href}"`, `contextual link to ${href}`);
  requireText("menu.html", menu, anchor, `contextual anchor for ${href}`);
}

const body = await read("bodycare-kamata.html");
requireText("bodycare-kamata.html", body, "<title>蒲田のもみほぐし・整体ボディケア｜駅東口徒歩1分｜身悠晏</title>", "focused bodycare title");
requireText("bodycare-kamata.html", body, "<h1>蒲田でもみほぐし・整体ボディケアをお探しの方へ</h1>", "focused bodycare H1");
requireText("bodycare-kamata.html", body, "蒲田 もみほぐし", "蒲田 もみほぐし intent");
if (/<title>[^<]*マッサージをお探しの方へ[^<]*<\/title>/i.test(body)) {
  fail("bodycare-kamata.html", "title competes with homepage for the broad massage head term");
}

const late = await read("kamata-late-night.html");
requireText("kamata-late-night.html", late, "<title>蒲田の深夜マッサージ・リラクゼーション｜翌2時まで｜身悠晏</title>", "late-night title");
requireText("kamata-late-night.html", late, "<h1>蒲田で深夜2時までのマッサージ・リラクゼーション</h1>", "late-night H1");
requireText("kamata-late-night.html", late, "23:00以降にご来店の場合", "arrival-based late fee wording");

const logo = "https://shinyuuan.jp/assets/logo-square.svg";
const jobs = {
  "recruit/full-time.html": ["仕事内容：", "勤務時間：", "店舗見学・条件相談"],
  "recruit/part-time.html": ["勤務日数：", "研修・技術確認", "店舗見学"],
  "recruit/contractor.html": ["応募条件：", "保証制度", "技術確認"]
};

for (const [file, descriptionFragments] of Object.entries(jobs)) {
  const html = await read(file);
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => { try { return JSON.parse(match[1]); } catch { return null; } })
    .filter(Boolean);
  const job = blocks.find(data => data?.["@type"] === "JobPosting");
  if (!job) {
    fail(file, "missing JobPosting structured data");
    continue;
  }
  if (job.directApply === true) fail(file, "directApply=true overstates the current application path");
  if (job.hiringOrganization?.logo !== logo) fail(file, "hiringOrganization logo is missing or incorrect");
  if ("validThrough" in job) fail(file, "long-running recruitment must not invent validThrough");
  if (file.endsWith("contractor.html")) {
    if ("baseSalary" in job) fail(file, "contractor commission/guarantee must not be represented as baseSalary");
  } else if (!job.baseSalary) {
    fail(file, "employee JobPosting must retain its real baseSalary");
  }
  if (!html.includes('href="/recruit.html#apply"')) fail(file, "missing crawlable application-consultation link");
  for (const fragment of descriptionFragments) {
    if (!job.description?.includes(fragment)) fail(file, `JobPosting description missing ${fragment}`);
  }
}

const sitemap = await read("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>(https:\/\/shinyuuan\.jp\/[^<]*)<\/loc>/g)].map(match => match[1]);
if (locs.length !== 19) fail("sitemap.xml", `expected 19 indexable URLs, found ${locs.length}`);
for (const url of [
  "https://shinyuuan.jp/menu.html",
  "https://shinyuuan.jp/kamata-late-night.html",
  "https://shinyuuan.jp/recruit/contractor.html",
  "https://shinyuuan.jp/recruit/full-time.html",
  "https://shinyuuan.jp/recruit/part-time.html"
]) {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const date = sitemap.match(new RegExp(`<loc>${escaped}</loc><lastmod>([^<]+)</lastmod>`))?.[1];
  if (date !== "2026-08-11") fail("sitemap.xml", `${url} lastmod should be 2026-08-11 after final audit`);
}

if (errors.length) {
  console.error(`Final freeze check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Final freeze check passed: intent ownership, money-page links, late-night targeting, truthful JobPosting data, and sitemap lastmod are locked.");

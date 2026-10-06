import { access, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const root = path.resolve(new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const allFiles = await walk(root);
const htmlFiles = allFiles.filter(file => file.endsWith(".html"));

function report(file, message) {
  errors.push(`${path.relative(root, file)}: ${message}`);
}

function inlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/\bsrc\s*=/.test(match[1]) && !/application\/ld\+json/i.test(match[1]))
    .map(match => match[2]);
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const required of [/<!doctype html>/i, /<html\b/i, /<head\b/i, /<title>[\s\S]*?<\/title>/i, /<body\b/i]) {
    if (!required.test(html)) report(file, `missing ${required}`);
  }

  inlineScripts(html).forEach((source, index) => {
    try { new vm.Script(source, { filename: `${file}:inline-${index + 1}` }); }
    catch (error) { report(file, `JavaScript syntax error: ${error.message}`); }
  });

  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"'#]+)["']/gi)) {
    const reference = match[1];
    if (/^(?:https?:|tel:|mailto:|data:|javascript:)/i.test(reference)) continue;
    const clean = reference.split(/[?#]/)[0];
    if (!clean) continue;
    let target = clean.startsWith("/")
      ? path.join(root, decodeURIComponent(clean.slice(1)))
      : path.resolve(path.dirname(file), decodeURIComponent(clean));
    if (clean.endsWith("/")) target = path.join(target, "index.html");
    try { await access(target, constants.F_OK); }
    catch { report(file, `local resource not found: ${reference}`); }
  }

  for (const call of html.matchAll(/gtag\s*\(\s*["']event["'][\s\S]{0,240}?\)/gi)) {
    if (/(?:email|phone|note|submissionId|messageText)\s*[:),]|(?:^|[,{])\s*name\s*:/i.test(call[0])) {
      report(file, "analytics event may include personal information");
    }
  }
}

for (const file of allFiles.filter(file => file.endsWith(".js") || file.endsWith(".gs"))) {
  const source = await readFile(file, "utf8");
  try { new vm.Script(source, { filename: file }); }
  catch (error) { report(file, `JavaScript syntax error: ${error.message}`); }
}

const css = await readFile(path.join(root, "assets", "style.css"), "utf8");
const homeHtml = await readFile(path.join(root, "index.html"), "utf8");
for (const [course, service] of [["body60","body"],["foot60","foot"],["aroma60","aroma"],["aromaFoot90","set"]]) {
  const pattern = new RegExp(`href="\\/booking\\.html\\?lang=ja&amp;course=${course}&amp;service=${service}&amp;origin=home&amp;cta=recommended_course"`, "i");
  if (!pattern.test(homeHtml)) report(path.join(root, "index.html"), `recommended course CTA must preserve ${course} intent`);
}
for (const cta of ["nav","mobile_nav","hero_other","footer_methods","footer_nav","fixed_web"]) {
  if (!new RegExp(`origin=home&amp;cta=${cta}`, "i").test(homeHtml)) {
    report(path.join(root, "index.html"), `homepage booking attribution missing for ${cta}`);
  }
}
if (/蒲田でよく検索されるお悩み/.test(homeHtml)) {
  report(path.join(root, "index.html"), "homepage needs copy must stay people-first, not search-engine-facing");
}
if (!/お疲れの場所や利用シーンから、詳しい案内を選べます。/.test(homeHtml)) {
  report(path.join(root, "index.html"), "homepage needs copy lost its user-facing guidance");
}

const shopHtml = await readFile(path.join(root, "shop.html"), "utf8");
const shopMobileBlock = shopHtml.match(/@media\(max-width:600px\)\{[\s\S]*?\}\s*<\/style>/i)?.[0] || "";
if (!/\.shop-info-table tr\{[^}]*grid-template-columns:1fr!important/i.test(shopMobileBlock)) {
  report(path.join(root, "shop.html"), "mobile shop info table must override the global !important two-column grid");
}
if (!/id="keikyu-kamata"/i.test(shopHtml) || !/京急蒲田駅からの道順（徒歩約9分）/.test(shopHtml)) {
  report(path.join(root, "shop.html"), "Keikyu Kamata walking guidance is missing");
}
if (!/<title>蒲田駅東口徒歩1分・京急蒲田駅徒歩約9分｜アクセス・店舗情報｜身悠晏<\/title>/.test(shopHtml)) {
  report(path.join(root, "shop.html"), "Keikyu Kamata access signal is missing from the shop title");
}
if (!/<meta\s+name="description"\s+content="[^"]*京急蒲田駅から徒歩約9分[^"]*"/i.test(shopHtml)) {
  report(path.join(root, "shop.html"), "Keikyu Kamata access signal is missing from the shop meta description");
}
if (!/href="shop\.html#keikyu-kamata"[^>]*>京急蒲田駅からのアクセスを見る<\/a>/.test(homeHtml)) {
  report(path.join(root, "index.html"), "homepage must keep a crawlable internal link to Keikyu Kamata access");
}
if (!/京急蒲田駅の西口/.test(shopHtml) || !/京急蒲田商店街あすと/.test(shopHtml)) {
  report(path.join(root, "shop.html"), "Keikyu Kamata route must preserve the verified west-exit and Asuto guidance");
}
if (!/google\.com\/maps\/dir\/\?api=1[^"]*origin=%E4%BA%AC%E6%80%A5%E8%92%B2%E7%94%B0%E9%A7%85[^"]*travelmode=walking/i.test(shopHtml)) {
  report(path.join(root, "shop.html"), "Keikyu Kamata walking Google Maps fallback is missing");
}
if (/counter\(list-item\)/i.test(shopHtml)) {
  report(path.join(root, "shop.html"), "shop-local access step styling must not override the shared access counter with list-item");
}
if (!/\.access-steps li::before\{content:counter\(access\)/i.test(shopHtml)) {
  report(path.join(root, "shop.html"), "shop-local access step marker must use the shared access counter");
}
const sharedStyle = await readFile(path.join(root, "assets", "style.css"), "utf8");
if (!/\.access-steps\{[^}]*counter-reset:access/i.test(sharedStyle) || !/\.access-steps li\{[^}]*counter-increment:access/i.test(sharedStyle)) {
  report(path.join(root, "assets", "style.css"), "shared access step counter contract is missing");
}
if (!/\.shop-info-table td\{[^}]*overflow-wrap:anywhere/i.test(shopMobileBlock)) {
  report(path.join(root, "shop.html"), "mobile shop info values must allow long text to wrap");
}

const aromaHtml = await readFile(path.join(root, "aroma-oil-kamata.html"), "utf8");
const footHtml = await readFile(path.join(root, "ashitsubo-fukurahagi.html"), "utf8");
const menuHtml = await readFile(path.join(root, "menu.html"), "utf8");
const secondaryPagesJs = await readFile(path.join(root, "assets", "secondary-pages.js"), "utf8");
const bodycareHtml = await readFile(path.join(root, "bodycare-kamata.html"), "utf8");
const lateNightHtml = await readFile(path.join(root, "kamata-late-night.html"), "utf8");

for (const [fileName, html] of [
  ["aroma-oil-kamata.html", aromaHtml],
  ["ashitsubo-fukurahagi.html", footHtml],
  ["bodycare-kamata.html", bodycareHtml]
]) {
  if (/Googleで|検索で|「蒲田 [^」]+」を中心に/.test(html)) {
    report(path.join(root, fileName), "service copy must remain people-first, not search-engine-facing");
  }
}
for (const [fileName, html, anchorId] of [
  ["bodycare-kamata.html", bodycareHtml, "course-prices"],
  ["kamata-late-night.html", lateNightHtml, "late-course-prices"]
]) {
  if (!new RegExp(`href="#${anchorId}"`, "i").test(html) || !new RegExp(`id="${anchorId}"`, "i").test(html)) {
    report(path.join(root, fileName), "hero price CTA must stay on-page");
  }
  if (!/class="quick-course-grid"/i.test(html) || !/course=[a-zA-Z0-9]+/i.test(html)) {
    report(path.join(root, fileName), "quick course selection must preserve course intent");
  }
}

for (const [fileName, html] of [["aroma-oil-kamata.html", aromaHtml], ["ashitsubo-fukurahagi.html", footHtml]]) {
  if (!/class="value-actions"[^>]*>[\s\S]{0,500}?href="\/booking\.html\?lang=ja"/i.test(html)) {
    report(path.join(root, fileName), "value module must have a nearby Japanese booking CTA");
  }
  if (!/id="course-prices"/i.test(html) || !/href="#course-prices"/i.test(html)) {
    report(path.join(root, fileName), "value module must link to the local course-prices section");
  }
}
if (!/cta",\s*isHero\s*\?\s*"service_hero"\s*:\s*\(isNavigation\s*\?\s*"service_nav"\s*:\s*"service_page"\)/i.test(secondaryPagesJs)) {
  report(path.join(root, "assets", "secondary-pages.js"), "service-page booking attribution fallback changed unexpectedly");
}
if (!/\.foot-value-grid\{[^}]*align-items:start/i.test(footHtml)) {
  report(path.join(root, "ashitsubo-fukurahagi.html"), "desktop foot value cards must not stretch to equal height");
}
if (!/menu-price-nowrap[^}]*white-space:nowrap/i.test(menuHtml) || !/class="menu-price-nowrap">20分 \+2,000円/i.test(menuHtml)) {
  report(path.join(root, "menu.html"), "hot-stone desktop price units must stay intact");
}

let depth = 0;
for (const character of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (character === "{") depth += 1;
  if (character === "}") depth -= 1;
  if (depth < 0) break;
}
if (depth !== 0) report(path.join(root, "assets", "style.css"), "unbalanced CSS braces");

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("not a JPEG");
  }
  const sofMarkers = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  let offset = 2;
  while (offset + 3 < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    const segmentMarker = buffer[offset++];
    if (segmentMarker === 0xd9 || segmentMarker === 0xda) break;
    if (segmentMarker >= 0xd0 && segmentMarker <= 0xd7) continue;
    if (offset + 1 >= buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if (sofMarkers.has(segmentMarker) && segmentLength >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5)
      };
    }
    offset += segmentLength;
  }
  throw new Error("JPEG dimensions not found");
}

const shopAccessPath = path.join(root, "assets", "img", "shop-access.jpg");
try {
  const [shopAccess, shopAccessInfo] = await Promise.all([readFile(shopAccessPath), stat(shopAccessPath)]);
  if (shopAccess[0] !== 0xff || shopAccess[1] !== 0xd8 || shopAccess.at(-2) !== 0xff || shopAccess.at(-1) !== 0xd9) {
    report(shopAccessPath, "must remain a real JPEG payload");
  }
  const { width, height } = jpegDimensions(shopAccess);
  if (width !== 2390 || height !== 1792) report(shopAccessPath, `unexpected dimensions ${width}x${height}`);
  if (shopAccessInfo.size > 1500000) report(shopAccessPath, `performance regression: ${shopAccessInfo.size} bytes exceeds 1.5 MB`);
  if (shopAccessInfo.size < 100000) report(shopAccessPath, `suspiciously small image: ${shopAccessInfo.size} bytes`);
} catch (error) {
  report(shopAccessPath, error.message);
}

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const url of ["/", "/en/", "/zh/", "/ko/"]) {
  if (!sitemap.includes(`<loc>https://shinyuuan.jp${url}</loc>`)) {
    report(path.join(root, "sitemap.xml"), `missing localized URL ${url}`);
  }
}
for (const hreflang of ["ja", "en", "zh-Hans", "ko", "x-default"]) {
  const count = [...sitemap.matchAll(new RegExp(`hreflang="${hreflang}"`, "g"))].length;
  if (count !== 4) report(path.join(root, "sitemap.xml"), `expected 4 ${hreflang} alternates, found ${count}`);
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
if (!/Sitemap:\s*https:\/\/shinyuuan\.jp\/sitemap\.xml/i.test(robots)) {
  report(path.join(root, "robots.txt"), "sitemap declaration missing");
}

const workflowPath = path.join(root, ".github", "workflows", "site-check.yml");
const workflow = await readFile(workflowPath, "utf8");
for (const marker of ["pull_request:", "runs-on:", "node scripts/check-site.mjs", "node scripts/check-prices.mjs"]) {
  if (!workflow.includes(marker)) report(workflowPath, `missing workflow marker: ${marker}`);
}

if (errors.length) {
  console.error(`Site check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`Site check passed for ${htmlFiles.length} HTML files, local resources, scripts, CSS, sitemap, robots, workflow, and analytics guards.`);

import { access, readFile, readdir } from "node:fs/promises";
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
let depth = 0;
for (const character of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (character === "{") depth += 1;
  if (character === "}") depth -= 1;
  if (depth < 0) break;
}
if (depth !== 0) report(path.join(root, "assets", "style.css"), "unbalanced CSS braces");

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

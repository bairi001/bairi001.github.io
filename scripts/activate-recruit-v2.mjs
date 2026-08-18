import { readFile, writeFile, rm } from "node:fs/promises";

const endpoint = "https://script.google.com/macros/s/AKfycbzAAWxxBqoCOGGMgxtXPJekDEA7MLYz2MEvRI9g5cLX9Bnmx377ABZIdKXdMh9q_nE1/exec";

const replaceOnce = (text, before, after, file) => {
  if (text.includes(after)) return text;
  if (!text.includes(before)) throw new Error(`${file}: expected source fragment was not found`);
  return text.replace(before, after);
};

const runtimeFile = "assets/recruit-direct-apply.js";
let runtime = await readFile(runtimeFile, "utf8");
runtime = replaceOnce(runtime, "    enabled: false,\n    endpoint: \"\",", `    enabled: true,\n    endpoint: \"${endpoint}\",`, runtimeFile);
await writeFile(runtimeFile, runtime);

const checkFile = "scripts/check-recruit-runtime.mjs";
let check = await readFile(checkFile, "utf8");
check = replaceOnce(
  check,
  "data-primary-button=\"メールアプリで送る\"",
  "data-primary-button=\"このサイトから相談を送信\"",
  checkFile
);
check = replaceOnce(
  check,
  "data-direct-state=\"現在はメールまたはLINEで送信できます。直接送信機能は公開前テスト中です。\"",
  "data-direct-state=\"このサイトから直接送信できます。メールアプリを開く必要はありません。\"",
  checkFile
);
await writeFile(checkFile, check);

await rm(new URL(import.meta.url));
await rm(new URL("../.github/workflows/activate-recruit-v2.yml", import.meta.url));
console.log("Recruit Direct Apply V2 endpoint activated and one-time activation files removed.");

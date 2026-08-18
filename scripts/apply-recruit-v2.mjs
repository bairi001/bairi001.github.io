import { readFile, writeFile } from "node:fs/promises";

const replaceOnce = (text, before, after, file) => {
  if (text.includes(after)) return text;
  if (!text.includes(before)) throw new Error(`${file}: source fragment not found: ${before.slice(0, 80)}`);
  return text.replace(before, after);
};

async function patchRecruit() {
  const file = "recruit.html";
  let text = await readFile(file, "utf8");
  text = replaceOnce(
    text,
    'id="recruitForm" novalidate',
    'id="recruitForm" data-recruit-v2="prepared" novalidate',
    file
  );
  text = replaceOnce(
    text,
    '<h2 class="rp-title">30秒の簡易フォーム</h2>',
    '<h2 class="rp-title">最短1分の応募・見学相談</h2>',
    file
  );
  text = replaceOnce(
    text,
    '<p class="rp-lead">正式応募だけでなく、見学や条件相談にも利用できます。</p>',
    '<p class="rp-lead">必須項目を入力し、正式応募・店舗見学・条件相談に利用できます。</p>',
    file
  );
  text = replaceOnce(
    text,
    '入力内容から応募相談文を作り、メールまたはLINEで送れます。',
    '必須項目だけで相談できます。直接送信の公開前はメールまたはLINEを利用できます。',
    file
  );
  if (!text.includes('assets/recruit-direct-apply.js')) {
    const index = text.lastIndexOf("</body>");
    if (index < 0) throw new Error(`${file}: closing body tag not found`);
    text = `${text.slice(0, index)}<script src="assets/recruit-direct-apply.js"></script>\n${text.slice(index)}`;
  }
  for (const marker of [
    'data-recruit-v2="prepared"',
    '最短1分の応募・見学相談',
    'assets/recruit-direct-apply.js'
  ]) {
    if (!text.includes(marker)) throw new Error(`${file}: final marker missing: ${marker}`);
  }
  await writeFile(file, text);
  console.log(`patched ${file}`);
}

async function patchJobPage(file, job) {
  let text = await readFile(file, "utf8");
  const desired = `/recruit.html?job=${job}#apply`;
  if (!text.includes(desired)) {
    if (!text.includes('/recruit.html#apply')) throw new Error(`${file}: application link not found`);
    text = text.replaceAll('/recruit.html#apply', desired);
  }
  await writeFile(file, text);
  console.log(`patched ${file}`);
}

await patchRecruit();
await patchJobPage("recruit/contractor.html", "contractor");
await patchJobPage("recruit/full-time.html", "full-time");
await patchJobPage("recruit/part-time.html", "part-time");

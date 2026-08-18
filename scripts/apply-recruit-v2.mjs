import { readFile, writeFile } from "node:fs/promises";

const replacements = new Map([
  ["recruit.html", [
    [
      '<form class="rp-form" id="recruitForm" novalidate>',
      '<form class="rp-form" id="recruitForm" data-recruit-v2="prepared" novalidate>'
    ],
    [
      '<div class="rp-center"><span class="rp-eyebrow">Quick Entry</span><h2 class="rp-title">30秒の簡易フォーム</h2><p class="rp-lead">正式応募だけでなく、見学や条件相談にも利用できます。</p></div>',
      '<div class="rp-center"><span class="rp-eyebrow">Quick Entry</span><h2 class="rp-title">最短1分の応募・見学相談</h2><p class="rp-lead">必須項目を入力し、正式応募・店舗見学・条件相談に利用できます。</p></div>'
    ],
    [
      '<div class="rp-form-intro"><h3>送信前に準備するものはありません</h3><p>入力内容から応募相談文を作り、メールまたはLINEで送れます。</p>',
      '<div class="rp-form-intro"><h3>送信前に準備するものはありません</h3><p>必須項目だけで相談できます。直接送信の公開前はメールまたはLINEを利用できます。</p>'
    ],
    [
      '</script>\n</body>',
      '</script>\n<script src="assets/recruit-direct-apply.js"></script>\n</body>'
    ]
  ]],
  ["recruit/contractor.html", [[
    'href="/recruit.html#apply"',
    'href="/recruit.html?job=contractor#apply"'
  ]]],
  ["recruit/full-time.html", [[
    'href="/recruit.html#apply"',
    'href="/recruit.html?job=full-time#apply"'
  ]]],
  ["recruit/part-time.html", [[
    'href="/recruit.html#apply"',
    'href="/recruit.html?job=part-time#apply"'
  ]]]
]);

for (const [file, changes] of replacements) {
  let text = await readFile(file, "utf8");
  for (const [before, after] of changes) {
    if (!text.includes(before)) throw new Error(`${file}: expected source fragment was not found`);
    text = text.replace(before, after);
  }
  await writeFile(file, text);
  console.log(`patched ${file}`);
}

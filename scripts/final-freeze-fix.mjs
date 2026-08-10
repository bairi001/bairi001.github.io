import { readFile, writeFile } from "node:fs/promises";

async function replaceOnce(file, from, to, label) {
  const source = await readFile(file, "utf8");
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly one ${label || "replacement"}, found ${count}`);
  await writeFile(file, source.replace(from, to), "utf8");
}

async function updateJobPosting(file, description) {
  const source = await readFile(file, "utf8");
  let found = 0;
  const updated = source.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, jsonText) => {
    let data;
    try { data = JSON.parse(jsonText); } catch { return full; }
    if (data?.["@type"] !== "JobPosting") return full;
    found += 1;
    data.description = description;
    if (!data.hiringOrganization || data.hiringOrganization["@type"] !== "Organization") throw new Error(`${file}: missing hiringOrganization`);
    data.hiringOrganization.logo = "https://shinyuuan.jp/assets/logo-square.svg";
    delete data.directApply;
    delete data.validThrough;
    if (file.endsWith("contractor.html")) delete data.baseSalary;
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  });
  if (found !== 1) throw new Error(`${file}: expected one JobPosting JSON-LD block, found ${found}`);
  await writeFile(file, updated, "utf8");
}

await replaceOnce("menu.html", '<table class="price-table"><tr><th>30分</th><td>2,400円</td></tr><tr><th>60分</th><td>3,980円</td></tr><tr><th>90分</th><td>6,800円</td></tr></table></div>', '<table class="price-table"><tr><th>30分</th><td>2,400円</td></tr><tr><th>60分</th><td>3,980円</td></tr><tr><th>90分</th><td>6,800円</td></tr></table><p style="margin:14px 0 0;"><a href="bodycare-kamata.html" style="font-weight:800;color:#2F4438;">もみほぐし・整体ボディケアの詳しい案内 →</a></p></div>', "bodycare contextual link");
await replaceOnce("menu.html", '<table class="price-table"><tr><th>30分</th><td>2,980円</td></tr><tr><th>60分</th><td>4,980円</td></tr><tr><th>90分</th><td>7,800円</td></tr><tr><th>120分</th><td>9,980円</td></tr></table></div>', '<table class="price-table"><tr><th>30分</th><td>2,980円</td></tr><tr><th>60分</th><td>4,980円</td></tr><tr><th>90分</th><td>7,800円</td></tr><tr><th>120分</th><td>9,980円</td></tr></table><p style="margin:14px 0 0;"><a href="aroma-oil-kamata.html" style="font-weight:800;color:#2F4438;">アロマ・オイルマッサージの詳しい案内 →</a></p></div>', "aroma contextual link");

await replaceOnce("bodycare-kamata.html", "<title>蒲田のもみほぐし・整体ボディケア｜マッサージをお探しの方へ｜身悠晏</title>", "<title>蒲田のもみほぐし・整体ボディケア｜駅東口徒歩1分｜身悠晏</title>", "bodycare title");
await replaceOnce("bodycare-kamata.html", '<meta property="og:description" content="蒲田でもみほぐし・マッサージをお探しの方へ。駅東口徒歩1分、施術着を着たまま受ける整体ボディケア。">', '<meta property="og:description" content="蒲田でもみほぐし・整体ボディケアをお探しの方へ。駅東口徒歩1分、施術着を着たまま受けるリラクゼーション。">', "bodycare og description");
await replaceOnce("bodycare-kamata.html", '<h1>蒲田でもみほぐし・マッサージをお探しの方へ｜整体ボディケア</h1>', '<h1>蒲田でもみほぐし・整体ボディケアをお探しの方へ</h1>', "bodycare H1");
await replaceOnce("bodycare-kamata.html", '<h2>蒲田で「マッサージ」「もみほぐし」を探している方へ</h2><p>検索では「蒲田 マッサージ」「蒲田 もみほぐし」と探す方にも、実際の内容が分かりやすいようご案内しています。当店のメニュー名は「整体ボディケア」で、医療行為や治療を目的とした施術ではありません。</p>', '<h2>蒲田で「もみほぐし」「整体」を探している方へ</h2><p>「蒲田 もみほぐし」「蒲田 整体」を中心に、マッサージやボディケアを探している方にも実際の内容が分かりやすいようご案内しています。当店のメニュー名は「整体ボディケア」で、医療行為や治療を目的とした施術ではありません。</p>', "bodycare intent section");

await replaceOnce("kamata-late-night.html", "<title>蒲田で夜遅くまで利用できるリラクゼーション｜深夜2時まで｜身悠晏</title>", "<title>蒲田の深夜マッサージ・リラクゼーション｜翌2時まで｜身悠晏</title>", "late-night title");
await replaceOnce("kamata-late-night.html", '<meta name="description" content="JR蒲田駅東口徒歩1分、11:00〜翌2:00。仕事帰りや遅い時間に利用しやすい身悠晏。23時以降のご来店は深夜料金800円。当日予約可。">', '<meta name="description" content="蒲田で深夜・夜遅くのマッサージやリラクゼーションをお探しの方へ。JR蒲田駅東口徒歩1分、11:00〜翌2:00。23時以降のご来店は深夜料金800円。当日予約可。">', "late-night description");
await replaceOnce("kamata-late-night.html", '<meta property="og:title" content="蒲田で夜遅くまで利用できるリラクゼーション｜深夜2時まで｜身悠晏">', '<meta property="og:title" content="蒲田の深夜マッサージ・リラクゼーション｜翌2時まで｜身悠晏">', "late-night og title");
await replaceOnce("kamata-late-night.html", '<meta property="og:description" content="JR蒲田駅東口徒歩1分、11:00〜翌2:00。仕事帰りや遅い時間に利用しやすい身悠晏。23時以降のご来店は深夜料金800円。当日予約可。">', '<meta property="og:description" content="蒲田で深夜・夜遅くのマッサージやリラクゼーションを探す方へ。駅東口徒歩1分、11:00〜翌2:00。当日予約可。">', "late-night og description");
await replaceOnce("kamata-late-night.html", '"name":"蒲田で夜遅くまで利用できるリラクゼーション"', '"name":"蒲田の深夜マッサージ・リラクゼーション"', "late-night breadcrumb jsonld");
await replaceOnce("kamata-late-night.html", '<nav class="breadcrumb"><a href="/">ホーム</a><span>›</span>蒲田で夜遅くまで利用できるリラクゼーション</nav>', '<nav class="breadcrumb"><a href="/">ホーム</a><span>›</span>蒲田の深夜マッサージ・リラクゼーション</nav>', "late-night breadcrumb");
await replaceOnce("kamata-late-night.html", '<h1>蒲田で夜遅くまで利用できるリラクゼーション</h1>', '<h1>蒲田で深夜2時までのマッサージ・リラクゼーション</h1>', "late-night H1");
await replaceOnce("kamata-late-night.html", 'alt="蒲田で夜遅くまで利用できるリラクゼーション"', 'alt="蒲田で深夜2時まで利用できるマッサージ・リラクゼーション"', "late-night hero alt");

await replaceOnce("recruit.html", '<figcaption>カーテンで区切られた施術スペース</figcaption>', '<figcaption>個室仕様の施術スペース</figcaption>', "recruit room caption");

await updateJobPosting("recruit/full-time.html", '<p>蒲田駅東口徒歩1分のリラクゼーションサロン身悠晏で、正社員・契約社員のセラピストを募集します。</p><ul><li>仕事内容：もみほぐし、足つぼ、アロマトリートメント等の施術、接客、店内業務</li><li>月給250,000円〜320,000円。経験、対応メニュー、勤務時間帯により決定</li><li>勤務時間：11:00〜翌2:00の営業枠内で、雇用契約・シフトにより決定</li><li>交通費支給（社内規定あり）</li><li>社会保険は法令に基づき加入</li><li>店舗見学・条件相談から応募可能</li></ul><p>最終的な雇用条件は面談後、書面で確認します。</p>');
await updateJobPosting("recruit/part-time.html", '<p>蒲田駅東口徒歩1分の身悠晏で、アルバイト・パートのセラピストを募集します。未経験・経験の浅い方は有給研修から相談できます。</p><ul><li>経験者：時給1,400円〜1,700円</li><li>未経験研修：時給1,300円〜</li><li>勤務日数：週2日〜、1日5時間〜相談可。土日・遅番に入れる方は優遇</li><li>研修・技術確認の時間も時給支給。技術チェック合格後にお客様を担当</li><li>交通費支給（社内規定あり）</li><li>初回は履歴書不要。店舗見学のみも可</li></ul><p>東京都最低賃金の改定時は改定後の金額以上に見直します。最終的な雇用条件は面談後、書面で確認します。</p>');
await updateJobPosting("recruit/contractor.html", '<p>蒲田駅東口徒歩1分の身悠晏で、もみほぐし・足つぼ・オイルを独立して担当できる経験者の業務委託セラピストを募集します。</p><ul><li>報酬：施術売上50％〜</li><li>条件により月額最低報酬30万円保証制度あり。高稼働条件は35万円まで個別相談</li><li>指名料全額。23時以降に来店されたお客様1件につき800円を加算</li><li>応募条件：もみほぐし・足つぼ・オイルを独立して担当でき、当店の技術確認に合格できる方</li><li>保証制度は予約受付可能な曜日・時間帯、稼働日数、対応メニュー等を確認し、適用条件を契約書で明示</li><li>初回は履歴書不要。店舗見学のみも可</li></ul><p>歩合報酬が保証額を超えた場合は実績額を支払います。最終的な業務委託条件は面談後、書面で確認します。</p>');

for (const [url, oldDate] of [["https://shinyuuan.jp/menu.html","2026-08-10"],["https://shinyuuan.jp/kamata-late-night.html","2026-08-09"],["https://shinyuuan.jp/recruit.html","2026-08-09"],["https://shinyuuan.jp/recruit/contractor.html","2026-08-09"],["https://shinyuuan.jp/recruit/full-time.html","2026-08-09"],["https://shinyuuan.jp/recruit/part-time.html","2026-08-09"]]) {
  await replaceOnce("sitemap.xml", `<loc>${url}</loc><lastmod>${oldDate}</lastmod>`, `<loc>${url}</loc><lastmod>2026-08-11</lastmod>`, `sitemap lastmod ${url}`);
}

await replaceOnce("scripts/check-seo.mjs", '  "bodycare-kamata.html": ["蒲田でもみほぐし・マッサージ", "整体ボディケア", "個室仕様", "エレベーター"],\n  "aroma-oil-kamata.html": ["オイルマッサージ", "アロマリンパ", "アロママッサージ", "個室仕様", "エレベーター"]', '  "bodycare-kamata.html": ["蒲田でもみほぐし・整体ボディケア", "蒲田 もみほぐし", "整体ボディケア", "個室仕様", "エレベーター"],\n  "aroma-oil-kamata.html": ["オイルマッサージ", "アロマリンパ", "アロママッサージ", "個室仕様", "エレベーター"],\n  "kamata-late-night.html": ["深夜マッサージ", "マッサージ・リラクゼーション", "23:00以降にご来店の場合", "JR蒲田駅東口徒歩1分"]', "Japanese intent ownership locks");

const guardBlock = `

// Final internal-link and recruitment structured-data locks.
for (const [fragment, target] of [
  ["もみほぐし・整体ボディケアの詳しい案内", "bodycare-kamata.html"],
  ["アロマ・オイルマッサージの詳しい案内", "aroma-oil-kamata.html"]
]) {
  if (!menu.includes(fragment) || !menu.includes(\`href="\${target}"\`)) fail("menu.html", \`missing contextual money-page link: \${target}\`);
}
if (/<title>[^<]*マッサージをお探しの方へ[^<]*<\\/title>/i.test(indexableHtml["bodycare-kamata.html"])) fail("bodycare-kamata.html", "bodycare title should not compete with homepage for the broad massage head term");

const recruitJobFiles = ["recruit/contractor.html", "recruit/full-time.html", "recruit/part-time.html"];
for (const file of recruitJobFiles) {
  const html = indexableHtml[file];
  const blocks = [...html.matchAll(/<script\\b[^>]*type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)].map(match => { try { return JSON.parse(match[1]); } catch { return null; } }).filter(Boolean);
  const job = blocks.find(data => data?.["@type"] === "JobPosting");
  if (!job) { fail(file, "missing JobPosting structured data"); continue; }
  if (job.directApply === true) fail(file, "directApply must not be claimed until the job-detail URL itself completes the application flow");
  if (job.hiringOrganization?.logo !== logoPath) fail(file, "JobPosting hiringOrganization is missing the official logo");
  if ("validThrough" in job) fail(file, "long-running job must not invent a validThrough date");
  if (file.endsWith("contractor.html") && "baseSalary" in job) fail(file, "contractor commission/guarantee must not be misrepresented as baseSalary");
  if (!file.endsWith("contractor.html") && !job.baseSalary) fail(file, "employee JobPosting must retain the real baseSalary");
  if (!html.includes('href="/recruit.html#apply"')) fail(file, "job detail must retain a crawlable path to the application consultation form");
}
requireFragments("recruit/full-time.html", indexableHtml["recruit/full-time.html"], ["仕事内容：", "勤務時間：", "店舗見学・条件相談"], "complete JobPosting description");
requireFragments("recruit/part-time.html", indexableHtml["recruit/part-time.html"], ["勤務日数：", "研修・技術確認", "店舗見学"], "complete JobPosting description");
requireFragments("recruit/contractor.html", indexableHtml["recruit/contractor.html"], ["応募条件：", "保証制度", "技術確認"], "complete JobPosting description");
if (!indexableHtml["recruit.html"].includes("個室仕様の施術スペース")) fail("recruit.html", "recruit salon photo caption must use the current truthful room wording");
`;

await replaceOnce("scripts/check-seo.mjs", '\nif (errors.length) {\n  console.error(`SEO consistency check failed:\\n- ${errors.join("\\n- ")}`);', `${guardBlock}\nif (errors.length) {\n  console.error(\`SEO consistency check failed:\\n- \${errors.join("\\n- ")}\`);`, "final SEO guard insertion");
await replaceOnce("scripts/check-seo.mjs", '  "https://shinyuuan.jp/aroma-oil-kamata.html",\n  "https://shinyuuan.jp/shop.html",', '  "https://shinyuuan.jp/aroma-oil-kamata.html",\n  "https://shinyuuan.jp/menu.html",\n  "https://shinyuuan.jp/kamata-late-night.html",\n  "https://shinyuuan.jp/recruit.html",\n  "https://shinyuuan.jp/recruit/contractor.html",\n  "https://shinyuuan.jp/recruit/full-time.html",\n  "https://shinyuuan.jp/recruit/part-time.html",\n  "https://shinyuuan.jp/shop.html",', "lastmod lock expansion");

console.log("Final freeze fixes applied successfully.");

import { readFile, writeFile, unlink } from "node:fs/promises";

const read = file => readFile(file, "utf8");
const write = (file, content) => writeFile(file, content, "utf8");

function replaceExact(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  return source.slice(0, first) + to + source.slice(first + from.length);
}

function requireText(source, text, label) {
  if (!source.includes(text)) throw new Error(`Post-patch check failed: ${label}`);
}

const today = "2026-08-11";

// 1) Japanese homepage: own the highest-volume legitimate intent without keyword stuffing.
{
  let s = await read("index.html");
  s = replaceExact(
    s,
    `<title>身悠晏 Shin Yuu An｜蒲田駅東口徒歩1分のリラクゼーションサロン</title>`,
    `<title>蒲田のマッサージ・リラクゼーション｜駅東口徒歩1分｜身悠晏</title>`,
    "homepage title"
  );
  s = replaceExact(
    s,
    `<meta name="description" content="JR蒲田駅東口徒歩1分、11:00〜翌2:00。足裏リフレ・整体ボディケア・アロマ・ヘッドケアのリラクゼーションサロン身悠晏。当日予約可。仕事帰り・旅行中のご利用にも。">`,
    `<meta name="description" content="蒲田でマッサージ・リラクゼーションをお探しの方へ。JR蒲田駅東口徒歩1分、11:00〜翌2:00。足裏リフレ、整体ボディケア、アロマリンパ、ヘッドケア。個室仕様、当日予約可、男性のお客様も歓迎。">`,
    "homepage meta description"
  );
  s = replaceExact(
    s,
    `<meta property="og:title" content="身悠晏 Shin Yuu An｜蒲田のリラクゼーションサロン">`,
    `<meta property="og:title" content="蒲田のマッサージ・リラクゼーション｜身悠晏 Shin Yuu An">`,
    "homepage og title"
  );
  s = replaceExact(
    s,
    `<meta property="og:description" content="蒲田駅東口徒歩1分・深夜2時まで。足裏・整体・アロマ・ヘッドケアのリラクゼーションサロン。Googleクチコミ300件以上。">`,
    `<meta property="og:description" content="蒲田駅東口徒歩1分・深夜2時まで。マッサージ・リラクゼーションを探す方へ、足裏・整体ボディケア・アロマ・ヘッドケアをご案内。個室仕様、当日予約可。">`,
    "homepage og description"
  );
  s = replaceExact(
    s,
    `"description":"蒲田駅東口徒歩1分。足裏リフレクソロジー、整体ボディケア、アロマトリートメント、ドライヘッドケアを提供するリラクゼーションサロン。11:00から翌2:00まで営業。1月1日休業。"`,
    `"description":"蒲田でマッサージ・リラクゼーションを探す方へ。蒲田駅東口徒歩1分。足裏リフレクソロジー、整体ボディケア、アロマトリートメント、ドライヘッドケアを提供するリラクゼーションサロン。11:00から翌2:00まで営業。1月1日休業。"`,
    "homepage LocalBusiness description"
  );
  s = replaceExact(
    s,
    `<span class="hero-location-line"><span>蒲田駅東口</span><span>徒歩1分の</span></span>
      <em class="hero-service-line"><span>リラクゼーション</span><span>サロン</span></em>`,
    `<span class="hero-location-line"><span>蒲田駅東口</span><span>徒歩1分の</span></span>
      <em class="hero-service-line"><span>マッサージ・</span><span>リラクゼーション</span></em>`,
    "homepage H1"
  );
  s = replaceExact(
    s,
    `<p class="premium-hero-lead">足裏・整体ボディケア・アロマ・ヘッドケア、<span class="hero-hours">11:00〜翌2:00</span>。</p>`,
    `<p class="premium-hero-lead">蒲田でマッサージ・リラクゼーションをお探しの方へ。足裏・整体ボディケア・アロマ・ヘッドケア、<span class="hero-hours">11:00〜翌2:00</span>。</p>`,
    "homepage hero lead"
  );
  s = replaceExact(
    s,
    `<span>女性も通いやすい空間</span>
        <span>仕事帰りにも便利</span>`,
    `<span>女性も通いやすい空間</span>
        <span>男性のお客様も歓迎</span>
        <span>仕事帰りにも便利</span>`,
    "homepage male welcome feature"
  );
  s = replaceExact(
    s,
    `<article class="recommend-card"><h3>足裏・ふくらはぎ</h3><p>立ち仕事、歩き疲れ、足まわりをゆっくり休めたい方へ。</p><div class="cta-row"><a href="ashitsubo-fukurahagi.html" class="btn-secondary">詳しく見る</a></div></article>
      <article class="recommend-card"><h3>夜遅く・今から</h3>`,
    `<article class="recommend-card"><h3>足裏マッサージ・足つぼ</h3><p>足裏からふくらはぎまで。立ち仕事、歩き疲れ、足まわりを休めたい方へ。</p><div class="cta-row"><a href="ashitsubo-fukurahagi.html" class="btn-secondary">足裏・足つぼを見る</a></div></article>
      <article class="recommend-card"><h3>もみほぐし・整体</h3><p>蒲田でもみほぐしやマッサージを探している方へ。服を着たまま受ける整体ボディケア。</p><div class="cta-row"><a href="bodycare-kamata.html" class="btn-secondary">整体ボディケアを見る</a></div></article>
      <article class="recommend-card"><h3>アロマ・オイルマッサージ</h3><p>アロマリンパやオイルマッサージを探している方へ。ゆったり受けたい日のオイルケア。</p><div class="cta-row"><a href="aroma-oil-kamata.html" class="btn-secondary">アロマ・オイルを見る</a></div></article>
      <article class="recommend-card"><h3>夜遅く・今から</h3>`,
    "homepage money-intent cards"
  );
  s = replaceExact(
    s,
    `<a href="menu.html#foot">メニューを見る <span aria-hidden="true">→</span></a>`,
    `<a href="ashitsubo-fukurahagi.html">足裏マッサージ・足つぼの詳しい案内 <span aria-hidden="true">→</span></a>`,
    "homepage foot service link"
  );
  s = replaceExact(
    s,
    `<a href="menu.html#bodycare">メニューを見る <span aria-hidden="true">→</span></a>`,
    `<a href="bodycare-kamata.html">もみほぐし・整体の詳しい案内 <span aria-hidden="true">→</span></a>`,
    "homepage body service link"
  );
  s = replaceExact(
    s,
    `<a href="menu.html#aroma">アロマメニューを見る <span aria-hidden="true">→</span></a>`,
    `<a href="aroma-oil-kamata.html">アロマ・オイルの詳しい案内 <span aria-hidden="true">→</span></a>`,
    "homepage aroma service link"
  );
  for (const phrase of ["蒲田のマッサージ・リラクゼーション", "足裏マッサージ・足つぼ", "もみほぐし・整体", "アロマ・オイルマッサージ", "男性のお客様も歓迎"]) requireText(s, phrase, `homepage ${phrase}`);
  await write("index.html", s);
}

// 2) Foot page: bridge real user wording to the official menu name.
{
  let s = await read("ashitsubo-fukurahagi.html");
  s = replaceExact(s,
    `<title>蒲田の足裏リフレ・ふくらはぎケア｜身悠晏</title>`,
    `<title>蒲田の足裏マッサージ・足つぼ｜ふくらはぎケア｜身悠晏</title>`,
    "foot title");
  s = replaceExact(s,
    `<meta name="description" content="蒲田駅東口徒歩1分。足裏からふくらはぎまで丁寧にケアする身悠晏の足裏リフレ。30・45・60分、整体とのセットも掲載。11:00〜翌2:00。">`,
    `<meta name="description" content="蒲田で足裏マッサージ・足つぼ・ふくらはぎマッサージをお探しの方へ。JR蒲田駅東口徒歩1分。足裏リフレクソロジー30・45・60分、整体とのセットも掲載。11:00〜翌2:00。">`,
    "foot description");
  s = replaceExact(s,
    `<meta property="og:title" content="蒲田の足裏リフレ・ふくらはぎケア｜身悠晏">`,
    `<meta property="og:title" content="蒲田の足裏マッサージ・足つぼ｜ふくらはぎケア｜身悠晏">`,
    "foot og title");
  s = replaceExact(s,
    `<meta property="og:description" content="蒲田駅東口徒歩1分。足裏からふくらはぎまで丁寧にケアする身悠晏の足裏リフレ。30・45・60分、整体とのセットも掲載。11:00〜翌2:00。">`,
    `<meta property="og:description" content="蒲田で足裏マッサージ・足つぼ・ふくらはぎマッサージをお探しの方へ。足裏リフレクソロジー30・45・60分、整体とのセットも掲載。">`,
    "foot og description");
  s = replaceExact(s,
    `{"@type":"ListItem","position":2,"name":"蒲田の足裏リフレ・ふくらはぎケア","item":"https://shinyuuan.jp/ashitsubo-fukurahagi.html"}`,
    `{"@type":"ListItem","position":2,"name":"蒲田の足裏マッサージ・足つぼ","item":"https://shinyuuan.jp/ashitsubo-fukurahagi.html"}`,
    "foot breadcrumb schema");
  s = replaceExact(s,
    `<nav class="breadcrumb"><a href="/">ホーム</a><span>›</span>蒲田の足裏リフレ・ふくらはぎケア</nav>`,
    `<nav class="breadcrumb"><a href="/">ホーム</a><span>›</span>蒲田の足裏マッサージ・足つぼ</nav>`,
    "foot breadcrumb visible");
  s = replaceExact(s,
    `<section class="intent-hero"><div><span class="section-en">Kamata Local Guide</span><h1>蒲田の足裏リフレ・ふくらはぎケア</h1><p class="section-lead" style="text-align:left">立ち仕事、歩き疲れ、旅行や買い物のあとなど、足裏からふくらはぎをゆっくり休めたい方へ。</p>`,
    `<section class="intent-hero"><div><span class="section-en">Kamata Local Guide</span><h1>蒲田で足裏マッサージ・足つぼをお探しの方へ</h1><p class="section-lead" style="text-align:left">当店では足裏リフレクソロジーとして、足裏からふくらはぎまで丁寧にケアします。立ち仕事、歩き疲れ、旅行や買い物のあとにも選びやすいメニューです。</p>`,
    "foot H1 and lead");
  s = replaceExact(s,
    `<section class="intent-section"><h2>どんな方に選ばれていますか？</h2><ul>`,
    `<section class="intent-section"><h2>足裏マッサージ・足つぼを探す方に選びやすい理由</h2><p>Googleで「足裏マッサージ」「足つぼ」「ふくらはぎマッサージ」と検索している方にも内容が分かりやすいよう、当店では実際のメニュー名「足裏リフレクソロジー」としてご案内しています。</p><ul>`,
    "foot search-language bridge");
  s = replaceExact(s,
    `仕事帰りや遅い時間のご利用は<a href="/kamata-late-night.html">蒲田の深夜利用ガイド</a>をご確認ください。短時間で頭まわりも休めたい方は<a href="/headspa-kamata.html">ドライヘッドケアの案内</a>もご覧いただけます。`,
    `全身のもみほぐしも受けたい方は<a href="/bodycare-kamata.html">蒲田のもみほぐし・整体ボディケア</a>、オイルケアを組み合わせたい方は<a href="/aroma-oil-kamata.html">蒲田のアロマ・オイルマッサージ案内</a>をご覧ください。仕事帰りや遅い時間のご利用は<a href="/kamata-late-night.html">蒲田の深夜利用ガイド</a>もご確認いただけます。`,
    "foot related links");
  for (const phrase of ["足裏マッサージ", "足つぼ", "ふくらはぎマッサージ", "足裏リフレクソロジー"]) requireText(s, phrase, `foot ${phrase}`);
  await write("ashitsubo-fukurahagi.html", s);
}

// 3) Menu page: contextual anchors to the two new money pages.
{
  let s = await read("menu.html");
  s = replaceExact(s,
    `<div class="menu-content"><span class="section-en">Foot Reflexology</span><h2>足裏リフレクソロジー</h2><p>足裏からふくらはぎまで、足の重だるさや立ち仕事後の足まわりが気になる方に向けたケアです。</p><table class="price-table"><tr><th>30分</th><td>2,800円</td></tr><tr><th>45分</th><td>3,980円</td></tr><tr><th>60分</th><td>4,980円</td></tr></table><p style="margin:14px 0 0;"><a href="ashitsubo-fukurahagi.html" style="font-weight:800;color:#2F4438;">足裏・ふくらはぎケアの詳しい選び方 →</a></p></div>`,
    `<div class="menu-content"><span class="section-en">Foot Reflexology</span><h2>足裏リフレクソロジー</h2><p>足裏マッサージ・足つぼ・ふくらはぎマッサージをお探しの方にも選びやすい、足裏からふくらはぎまでのリラクゼーションケアです。</p><table class="price-table"><tr><th>30分</th><td>2,800円</td></tr><tr><th>45分</th><td>3,980円</td></tr><tr><th>60分</th><td>4,980円</td></tr></table><p style="margin:14px 0 0;"><a href="ashitsubo-fukurahagi.html" style="font-weight:800;color:#2F4438;">足裏マッサージ・足つぼ・ふくらはぎの詳しい案内 →</a></p></div>`,
    "menu foot copy");
  s = replaceExact(s,
    `<div class="menu-content"><span class="section-en">Body Care</span><h2>整体ボディケア</h2><p>首肩まわりのこわばり、背中や腰まわりの重さが気になる方に。お身体の状態に合わせて丁寧にケアします。</p><table class="price-table"><tr><th>30分</th><td>2,400円</td></tr><tr><th>60分</th><td>3,980円</td></tr><tr><th>90分</th><td>6,800円</td></tr></table></div>`,
    `<div class="menu-content"><span class="section-en">Body Care</span><h2>整体ボディケア</h2><p>蒲田でもみほぐしやマッサージをお探しの方へ。施術着を着たまま、首肩・背中・腰まわりなどをお身体の状態に合わせて丁寧にケアします。</p><table class="price-table"><tr><th>30分</th><td>2,400円</td></tr><tr><th>60分</th><td>3,980円</td></tr><tr><th>90分</th><td>6,800円</td></tr></table><p style="margin:14px 0 0;"><a href="bodycare-kamata.html" style="font-weight:800;color:#2F4438;">蒲田のもみほぐし・整体ボディケアを見る →</a></p></div>`,
    "menu body copy");
  s = replaceExact(s,
    `<div class="menu-content"><span class="section-en">Aroma Oil</span><h2>アロマリンパ・オイル</h2><p>香りに包まれながら、ゆっくりリラックスして過ごしたい方におすすめです。力加減はご希望に合わせて調整します。</p><table class="price-table"><tr><th>30分</th><td>2,980円</td></tr><tr><th>60分</th><td>4,980円</td></tr><tr><th>90分</th><td>7,800円</td></tr><tr><th>120分</th><td>9,980円</td></tr></table></div>`,
    `<div class="menu-content"><span class="section-en">Aroma Oil</span><h2>アロマリンパ・オイル</h2><p>蒲田でオイルマッサージやアロマリンパをお探しの方へ。香りに包まれながら、背中や脚などをオイルでゆっくりケアします。力加減はご希望に合わせて調整します。</p><table class="price-table"><tr><th>30分</th><td>2,980円</td></tr><tr><th>60分</th><td>4,980円</td></tr><tr><th>90分</th><td>7,800円</td></tr><tr><th>120分</th><td>9,980円</td></tr></table><p style="margin:14px 0 0;"><a href="aroma-oil-kamata.html" style="font-weight:800;color:#2F4438;">蒲田のアロマ・オイルマッサージを見る →</a></p></div>`,
    "menu aroma copy");
  await write("menu.html", s);
}

// 4) New money pages.
const secondaryStyle = `.intent-wrap{max-width:980px;margin:auto}.intent-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:34px;align-items:center;padding:56px 0}.intent-hero img{width:100%;border-radius:18px;aspect-ratio:4/3;object-fit:cover}.intent-hero h1{font-size:clamp(1.9rem,4vw,3rem);line-height:1.45}.intent-section{padding:30px 0;border-top:1px solid rgba(74,55,40,.12)}.intent-section h2{font-size:1.45rem;margin:0 0 14px}.intent-section p,.intent-section li{line-height:1.95;color:#5f5750}.intent-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.intent-facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.intent-facts span{padding:7px 11px;border-radius:999px;background:#eef7f3;font-size:.82rem;font-weight:800}`;

const header = () => `<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <a href="/" class="site-logo" aria-label="身悠晏 ホーム"><span class="logo-mark">身悠晏</span><span class="logo-divider"></span><span class="logo-tagline">Shin Yuu An<br>Relaxation Salon</span></a>
    <nav class="secondary-main-nav" aria-label="メインナビゲーション"><a href="/">ホーム</a><a href="/menu.html">メニュー</a><a href="/shop.html">店舗情報</a><a href="/faq.html">FAQ</a><a href="/recruit.html">採用情報</a><a href="/booking.html?lang=ja" class="nav-cta">ご予約</a><a href="/en/">English</a></nav>
    <a class="secondary-language-pill" href="/en/" aria-label="English site">EN</a>
    <button class="hamburger" id="hamburger" aria-label="メニューを開く" data-closed-label="メニューを開く" data-open-label="メニューを閉じる"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-nav secondary-mobile-nav" id="mobileNav"><a href="/">ホーム</a><a href="/menu.html">メニュー</a><a href="/shop.html">店舗情報</a><a href="/faq.html">FAQ</a><a href="/recruit.html">採用情報</a><a href="/booking.html?lang=ja" class="mobile-cta">ご予約</a><a href="/en/">English</a></div>`;

const footer = `<footer class="site-footer"><div class="container"><div class="footer-bottom"><span>© 2026 身悠晏</span><div class="footer-legal"><a href="/privacy.html">プライバシーポリシー</a><a href="/recruit.html">採用情報</a></div></div></div></footer>
<script src="/assets/secondary-pages.js"></script>`;

const bodyPage = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>蒲田のもみほぐし・整体ボディケア｜マッサージをお探しの方へ｜身悠晏</title>
<meta name="description" content="蒲田でマッサージ・もみほぐし・整体ボディケアをお探しの方へ。JR蒲田駅東口徒歩1分。施術着を着たまま受ける30・60・90分のボディケア。個室仕様、当日予約可、11:00〜翌2:00。">
<link rel="canonical" href="https://shinyuuan.jp/bodycare-kamata.html">
<meta property="og:type" content="article"><meta property="og:site_name" content="身悠晏 Shin Yuu An"><meta property="og:title" content="蒲田のもみほぐし・整体ボディケア｜身悠晏"><meta property="og:description" content="蒲田でマッサージ・もみほぐしをお探しの方へ。駅東口徒歩1分、施術着を着たまま受ける整体ボディケア。"><meta property="og:url" content="https://shinyuuan.jp/bodycare-kamata.html"><meta property="og:image" content="https://shinyuuan.jp/assets/img/premium-seitai.webp">
<link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/secondary-pages.css"><link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"ホーム","item":"https://shinyuuan.jp/"},{"@type":"ListItem","position":2,"name":"蒲田のもみほぐし・整体ボディケア","item":"https://shinyuuan.jp/bodycare-kamata.html"}]}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SWGGKR9K9W"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-SWGGKR9K9W');</script>
<style>${secondaryStyle}</style>
</head>
<body class="secondary-page">
${header()}
<main><div class="container intent-wrap">
<nav class="breadcrumb"><a href="/">ホーム</a><span>›</span>蒲田のもみほぐし・整体ボディケア</nav>
<section class="intent-hero"><div><span class="section-en">Kamata Body Care</span><h1>蒲田でもみほぐし・マッサージをお探しの方へ｜整体ボディケア</h1><p class="section-lead" style="text-align:left">当店では、服を着たまま受ける「整体ボディケア」として、首肩・背中・腰まわりなどをお疲れに合わせて丁寧にもみほぐします。リラクゼーション目的の施術です。</p><div class="intent-facts"><span>JR蒲田駅東口徒歩1分</span><span>個室仕様</span><span>当日予約可</span><span>11:00〜翌2:00</span></div><div class="intent-actions"><a class="btn-primary" href="/booking.html?lang=ja">予約を相談する</a><a class="btn-secondary" href="/menu.html#bodycare">料金を見る</a></div></div><img src="/assets/img/premium-seitai.webp" alt="蒲田で施術着を着たまま受けるもみほぐし・整体ボディケア" fetchpriority="high" width="1254" height="1050"></section>
<section class="intent-section"><h2>蒲田で「マッサージ」「もみほぐし」を探している方へ</h2><p>検索では「蒲田 マッサージ」「蒲田 もみほぐし」と探す方にも、実際の内容が分かりやすいようご案内しています。当店のメニュー名は「整体ボディケア」で、医療行為や治療を目的とした施術ではありません。</p></section>
<section class="intent-section"><h2>時間の選び方</h2><p><strong>30分 2,400円</strong>：気になる箇所を短時間で。<br><strong>60分 3,980円</strong>：全身をバランスよく受けたい方に。<br><strong>90分 6,800円</strong>：ゆっくり全身を受けたい日に。</p></section>
<section class="intent-section"><h2>初めての方にも利用しやすい設備</h2><ul><li>三方を壁で仕切った個室仕様の施術スペース</li><li>施術用のお着替えをご用意</li><li>男性のお客様もご利用いただけます</li><li>力加減は施術中も調整可能</li></ul></section>
<section class="intent-section"><h2>組み合わせメニュー</h2><p>足まわりも気になる方は<a href="/ashitsubo-fukurahagi.html">足裏マッサージ・足つぼの案内</a>、オイルでゆっくり受けたい方は<a href="/aroma-oil-kamata.html">アロマ・オイルマッサージの案内</a>をご覧ください。遅い時間は<a href="/kamata-late-night.html">深夜利用ガイド</a>もご確認いただけます。</p></section>
<section class="intent-section"><h2>身悠晏へのアクセス</h2><p>東京都大田区蒲田5-12-3 北島ビル4F。JR蒲田駅東口から徒歩1分。ファミリーマート隣の北島ビルに入り、奥のエレベーターで4Fへお越しください。</p><div class="intent-actions"><a class="btn-secondary" href="https://www.google.com/maps/search/?api=1&amp;query=身悠晏+蒲田" target="_blank" rel="noopener">Google Maps</a><a class="btn-secondary" href="/shop.html">写真付き道順</a></div></section>
</div></main>
${footer}
</body></html>`;

const aromaPage = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>蒲田のオイルマッサージ・アロマリンパ｜駅東口徒歩1分｜身悠晏</title>
<meta name="description" content="蒲田でオイルマッサージ・アロマリンパ・アロママッサージをお探しの方へ。JR蒲田駅東口徒歩1分。30・60・90・120分のオイルトリートメント。個室仕様、当日予約可、11:00〜翌2:00。">
<link rel="canonical" href="https://shinyuuan.jp/aroma-oil-kamata.html">
<meta property="og:type" content="article"><meta property="og:site_name" content="身悠晏 Shin Yuu An"><meta property="og:title" content="蒲田のオイルマッサージ・アロマリンパ｜身悠晏"><meta property="og:description" content="蒲田駅東口徒歩1分。オイルマッサージ・アロマリンパを探している方へ、30〜120分のアロマオイルケアをご案内。"><meta property="og:url" content="https://shinyuuan.jp/aroma-oil-kamata.html"><meta property="og:image" content="https://shinyuuan.jp/assets/img/menu-aroma-back.webp">
<link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/secondary-pages.css"><link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"ホーム","item":"https://shinyuuan.jp/"},{"@type":"ListItem","position":2,"name":"蒲田のオイルマッサージ・アロマリンパ","item":"https://shinyuuan.jp/aroma-oil-kamata.html"}]}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SWGGKR9K9W"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-SWGGKR9K9W');</script>
<style>${secondaryStyle}</style>
</head>
<body class="secondary-page">
${header()}
<main><div class="container intent-wrap">
<nav class="breadcrumb"><a href="/">ホーム</a><span>›</span>蒲田のオイルマッサージ・アロマリンパ</nav>
<section class="intent-hero"><div><span class="section-en">Kamata Aroma Oil</span><h1>蒲田でオイルマッサージ・アロマリンパをお探しの方へ</h1><p class="section-lead" style="text-align:left">当店ではリラクゼーション目的の「アロマリンパ・オイルトリートメント」として、背中や脚などをオイルでゆっくりケアします。力加減はご希望に合わせて調整します。</p><div class="intent-facts"><span>JR蒲田駅東口徒歩1分</span><span>個室仕様</span><span>当日予約可</span><span>11:00〜翌2:00</span></div><div class="intent-actions"><a class="btn-primary" href="/booking.html?lang=ja">予約を相談する</a><a class="btn-secondary" href="/menu.html#aroma">料金を見る</a></div></div><img src="/assets/img/menu-aroma-back.webp" alt="蒲田のアロマリンパ・オイルマッサージを探す方へ向けた背中のオイルケア" fetchpriority="high" width="1800" height="1005"></section>
<section class="intent-section"><h2>蒲田で「オイルマッサージ」「アロママッサージ」を探している方へ</h2><p>検索でオイルマッサージやアロママッサージをお探しの方にも内容が分かりやすいよう、当店では実際のメニュー名「アロマリンパ・オイル」としてご案内しています。香りとオイルを使ったリラクゼーションメニューです。</p></section>
<section class="intent-section"><h2>時間の選び方</h2><p><strong>30分 2,980円</strong>：短時間のオイルケア。<br><strong>60分 4,980円</strong>：初めての方にも選びやすい基本コース。<br><strong>90分 7,800円</strong>：ゆったり受けたい日に。<br><strong>120分 9,980円</strong>：時間をかけて全身を休めたい方に。</p></section>
<section class="intent-section"><h2>利用しやすい店内環境</h2><ul><li>三方を壁で仕切った個室仕様の施術スペース</li><li>施術用のお着替えをご用意</li><li>男性のお客様もご利用いただけます</li><li>力加減のご希望を確認しながら進めます</li></ul></section>
<section class="intent-section"><h2>足裏・整体との組み合わせ</h2><p>足の疲れが中心なら<a href="/ashitsubo-fukurahagi.html">足裏マッサージ・足つぼの案内</a>、服を着たまま全身を受けたい方は<a href="/bodycare-kamata.html">もみほぐし・整体ボディケアの案内</a>をご覧ください。遅い時間は<a href="/kamata-late-night.html">深夜利用ガイド</a>もご確認いただけます。</p></section>
<section class="intent-section"><h2>身悠晏へのアクセス</h2><p>東京都大田区蒲田5-12-3 北島ビル4F。JR蒲田駅東口から徒歩1分。ファミリーマート隣の北島ビルに入り、奥のエレベーターで4Fへお越しください。</p><div class="intent-actions"><a class="btn-secondary" href="https://www.google.com/maps/search/?api=1&amp;query=身悠晏+蒲田" target="_blank" rel="noopener">Google Maps</a><a class="btn-secondary" href="/shop.html">写真付き道順</a></div></section>
</div></main>
${footer}
</body></html>`;

await write("bodycare-kamata.html", bodyPage);
await write("aroma-oil-kamata.html", aromaPage);

// 5) Strengthen internal links on existing local-intent pages.
{
  let s = await read("kamata-late-night.html");
  s = replaceExact(
    s,
    `整体60分、足裏45〜60分、アロマ60分など、時間に合わせて選べます。短時間だけでなく、整体＋足裏のセットもご用意しています。足まわりを中心に受けたい方は<a href="/ashitsubo-fukurahagi.html">足裏・ふくらはぎケアの詳しい案内</a>もご確認ください。`,
    `<a href="/bodycare-kamata.html">もみほぐし・整体ボディケア</a>、<a href="/ashitsubo-fukurahagi.html">足裏マッサージ・足つぼ</a>、<a href="/aroma-oil-kamata.html">アロマ・オイルマッサージ</a>など、時間に合わせて選べます。短時間だけでなく、整体＋足裏のセットもご用意しています。`,
    "late night money-page links"
  );
  await write("kamata-late-night.html", s);
}
{
  let s = await read("headspa-kamata.html");
  s = replaceExact(
    s,
    `足まわりのお疲れが中心なら<a href="/ashitsubo-fukurahagi.html">足裏・ふくらはぎケア</a>、仕事帰りや遅い時間のご利用なら<a href="/kamata-late-night.html">蒲田の深夜利用ガイド</a>もご確認ください。`,
    `全身をもみほぐしたい方は<a href="/bodycare-kamata.html">蒲田のもみほぐし・整体ボディケア</a>、足まわりが中心なら<a href="/ashitsubo-fukurahagi.html">足裏マッサージ・足つぼ</a>、オイルケアなら<a href="/aroma-oil-kamata.html">アロマ・オイルマッサージ</a>をご覧ください。仕事帰りや遅い時間のご利用は<a href="/kamata-late-night.html">深夜利用ガイド</a>もご確認いただけます。`,
    "head related money-page links"
  );
  await write("headspa-kamata.html", s);
}

// 6) Sitemap: two new indexable money pages + current lastmod.
{
  let s = await read("sitemap.xml");
  s = replaceExact(s,
    `<url><loc>https://shinyuuan.jp/menu.html</loc><lastmod>2026-08-10</lastmod></url>`,
    `<url><loc>https://shinyuuan.jp/menu.html</loc><lastmod>${today}</lastmod></url>`,
    "sitemap menu lastmod");
  s = replaceExact(s,
    `<url><loc>https://shinyuuan.jp/ashitsubo-fukurahagi.html</loc><lastmod>2026-08-09</lastmod></url>`,
    `<url><loc>https://shinyuuan.jp/ashitsubo-fukurahagi.html</loc><lastmod>${today}</lastmod></url>
  <url><loc>https://shinyuuan.jp/bodycare-kamata.html</loc><lastmod>${today}</lastmod></url>
  <url><loc>https://shinyuuan.jp/aroma-oil-kamata.html</loc><lastmod>${today}</lastmod></url>`,
    "sitemap money pages");
  s = replaceExact(s,
    `<url><loc>https://shinyuuan.jp/kamata-late-night.html</loc><lastmod>2026-08-09</lastmod></url>`,
    `<url><loc>https://shinyuuan.jp/kamata-late-night.html</loc><lastmod>${today}</lastmod></url>`,
    "sitemap late night lastmod");
  s = replaceExact(s,
    `<url><loc>https://shinyuuan.jp/headspa-kamata.html</loc><lastmod>2026-08-10</lastmod></url>`,
    `<url><loc>https://shinyuuan.jp/headspa-kamata.html</loc><lastmod>${today}</lastmod></url>`,
    "sitemap head lastmod");
  await write("sitemap.xml", s);
}

// 7) SEO regression guards: exposure phrases, new pages, clean intent.
{
  let s = await read("scripts/check-seo.mjs");
  s = replaceExact(
    s,
    `  "/ashitsubo-fukurahagi.html",
  "/kamata-late-night.html",`,
    `  "/ashitsubo-fukurahagi.html",
  "/bodycare-kamata.html",
  "/aroma-oil-kamata.html",
  "/kamata-late-night.html",`,
    "important money paths"
  );
  s = replaceExact(
    s,
    `const currentLastmod = [
  "https://shinyuuan.jp/",
  "https://shinyuuan.jp/shop.html",`,
    `const currentLastmod = [
  "https://shinyuuan.jp/",
  "https://shinyuuan.jp/menu.html",
  "https://shinyuuan.jp/ashitsubo-fukurahagi.html",
  "https://shinyuuan.jp/bodycare-kamata.html",
  "https://shinyuuan.jp/aroma-oil-kamata.html",
  "https://shinyuuan.jp/kamata-late-night.html",
  "https://shinyuuan.jp/headspa-kamata.html",
  "https://shinyuuan.jp/shop.html",`,
    "current lastmod money pages"
  );
  s = replaceExact(
    s,
    `  if (value !== "2026-08-11") fail("sitemap.xml", \`${url} lastmod should reflect the 2026-08-11 private-space wording closeout\`);
}

if (errors.length) {`,
    `  if (value !== "2026-08-11") fail("sitemap.xml", \`${url} lastmod should reflect the 2026-08-11 SEO closeout\`);
}

const jpExposureLocks = {
  "index.html": ["蒲田のマッサージ・リラクゼーション", "マッサージ・", "個室仕様の施術スペース", "男性のお客様も歓迎"],
  "ashitsubo-fukurahagi.html": ["足裏マッサージ", "足つぼ", "ふくらはぎマッサージ", "足裏リフレクソロジー"],
  "bodycare-kamata.html": ["蒲田でもみほぐし・マッサージ", "整体ボディケア", "個室仕様", "エレベーター"],
  "aroma-oil-kamata.html": ["オイルマッサージ", "アロマリンパ", "アロママッサージ", "個室仕様", "エレベーター"]
};
for (const [file, phrases] of Object.entries(jpExposureLocks)) requireFragments(file, indexableHtml[file], phrases, "Japanese money-keyword coverage");

for (const [file, html] of Object.entries(indexableHtml)) {
  if (/(nuru|adult|soapy|風俗|リンガム)/i.test(html)) fail(file, "adult/incorrect-intent keyword leaked into an indexable page");
  if (/(指圧|あん摩)/.test(html)) fail(file, "regulated massage-service wording leaked into an indexable page");
}

if (sitemapUrls.length !== 19) fail("sitemap.xml", \`expected 19 indexable URLs after Japanese money-page expansion, found ${sitemapUrls.length}\`);

if (errors.length) {`,
    "keyword coverage guards"
  );
  await write("scripts/check-seo.mjs", s);
}

// Self-clean temporary applicator files before the workflow commits final changes.
for (const file of ["scripts/apply-jp-money-seo.mjs", ".github/workflows/apply-jp-money-seo.yml"]) {
  try { await unlink(file); } catch {}
}

console.log("Japanese money-keyword SEO expansion applied and temporary applicator removed.");

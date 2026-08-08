from pathlib import Path
import re
from textwrap import dedent

ROOT = Path('.')
TODAY = '2026-08-09'
LAT = '35.5634739'
LNG = '139.7170054'


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')
    print('updated', path)


def replace_once(text, old, new, label):
    if old not in text:
        print('WARN missing:', label)
        return text
    return text.replace(old, new, 1)


def add_before_head_end(text, snippet, marker):
    if marker in text:
        return text
    return text.replace('</head>', snippet + '\n</head>', 1)


def breadcrumb_schema(items):
    parts = []
    for i, (name, url) in enumerate(items, 1):
        parts.append(f'{{"@type":"ListItem","position":{i},"name":"{name}","item":"{url}"}}')
    return '<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[' + ','.join(parts) + ']}</script>'


BUSINESS_JSON = dedent(f'''\
<script type="application/ld+json">
{{
  "@context":"https://schema.org",
  "@graph":[
    {{
      "@type":"WebSite",
      "@id":"https://shinyuuan.jp/#website",
      "url":"https://shinyuuan.jp/",
      "name":"身悠晏 Shin Yuu An",
      "alternateName":["Shin Yuu An","shinyuuan.jp"]
    }},
    {{
      "@type":"HealthAndBeautyBusiness",
      "@id":"https://shinyuuan.jp/#business",
      "name":"身悠晏 Shin Yuu An",
      "alternateName":"Shin Yuu An Relaxation Salon",
      "description":"蒲田駅東口徒歩1分。足裏リフレクソロジー、整体ボディケア、アロマトリートメント、ドライヘッドスパを提供するリラクゼーションサロン。11:00から翌2:00まで営業。",
      "url":"https://shinyuuan.jp/",
      "image":"https://shinyuuan.jp/assets/img/shop-front.jpg",
      "telephone":"+81-3-6874-6808",
      "address":{{"@type":"PostalAddress","streetAddress":"蒲田5-12-3 北島ビル4F","addressLocality":"大田区","addressRegion":"東京都","postalCode":"144-0052","addressCountry":"JP"}},
      "geo":{{"@type":"GeoCoordinates","latitude":{LAT},"longitude":{LNG}}},
      "openingHoursSpecification":{{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"11:00","closes":"02:00"}},
      "priceRange":"¥2,400-¥10,500",
      "currenciesAccepted":"JPY",
      "paymentAccepted":"Cash, Credit Card, PayPay",
      "hasMap":"https://www.google.com/maps/search/?api=1&query=身悠晏+蒲田",
      "sameAs":["https://beauty.hotpepper.jp/kr/slnH000397723/","https://page.line.me/017hlpiu","https://www.instagram.com/shinyuuankamata/"]
    }}
  ]
}}
</script>''')

BUSINESS_ONLY_JSON = dedent(f'''\
<script type="application/ld+json">
{{
  "@context":"https://schema.org",
  "@type":"HealthAndBeautyBusiness",
  "@id":"https://shinyuuan.jp/#business",
  "name":"身悠晏 Shin Yuu An",
  "alternateName":"Shin Yuu An Relaxation Salon",
  "url":"https://shinyuuan.jp/",
  "image":"https://shinyuuan.jp/assets/img/shop-front.jpg",
  "telephone":"+81-3-6874-6808",
  "address":{{"@type":"PostalAddress","streetAddress":"蒲田5-12-3 北島ビル4F","addressLocality":"大田区","addressRegion":"東京都","postalCode":"144-0052","addressCountry":"JP"}},
  "geo":{{"@type":"GeoCoordinates","latitude":{LAT},"longitude":{LNG}}},
  "openingHoursSpecification":{{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"11:00","closes":"02:00"}},
  "priceRange":"¥2,400-¥10,500",
  "hasMap":"https://www.google.com/maps/search/?api=1&query=身悠晏+蒲田",
  "sameAs":["https://beauty.hotpepper.jp/kr/slnH000397723/","https://page.line.me/017hlpiu","https://www.instagram.com/shinyuuankamata/"]
}}
</script>''')

# 1) Japanese homepage
p = 'index.html'
t = read(p)
t = replace_once(t,
    '<meta name="description" content="蒲田駅東口徒歩1分・深夜2時まで営業。足裏リフレ・整体ボディケア・アロマオイルの個室リラクゼーションサロン。Googleクチコミ4.8。当日予約OK、ウェブ・WhatsApp・LINEでも予約申請できます。">',
    '<meta name="description" content="JR蒲田駅東口徒歩1分、11:00〜翌2:00。足裏リフレ・整体ボディケア・アロマ・ドライヘッドスパのリラクゼーションサロン身悠晏。当日予約可。仕事帰り・旅行中のご利用にも。">',
    'home description')
if '<meta property="og:site_name"' not in t:
    t = t.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n<meta property="og:site_name" content="身悠晏 Shin Yuu An">', 1)
# replace LocalBusiness block
pat = re.compile(r'<script type="application/ld\+json">\s*\{.*?"@type"\s*:\s*"HealthAndBeautyBusiness".*?</script>', re.S)
t, n = pat.subn(BUSINESS_JSON, t, count=1)
print('home schema replaced', n)
t = replace_once(t,
    '<h1 id="hero-title"><span>一日の疲れを、</span><em>静かにほどく。</em></h1>\n    <p class="premium-hero-lead">足裏・整体・アロマの本格リラクゼーション。<br>蒲田駅東口徒歩1分、深夜2時まで。</p>',
    '<h1 id="hero-title"><span>蒲田駅東口徒歩1分の</span><em>リラクゼーションサロン</em></h1>\n    <p class="premium-hero-lead">一日の疲れを、静かにほどく。<br>足裏・整体ボディケア・アロマ・ドライヘッドスパ、11:00〜翌2:00。</p>',
    'home h1')
t = t.replace('<a href="/booking.html?lang=ja" class="btn-secondary">その他の予約方法</a>', '<a href="/booking.html?lang=ja" class="btn-secondary" data-track="hero_other_booking">その他の予約方法</a>', 1)
visitor = dedent('''\
<div class="visitor-english" role="note">
  <a href="/en/" data-track="visitor_english">Visiting Japan? <strong>English massage menu, booking &amp; directions</strong> →</a>
</div>
''')
if 'class="visitor-english"' not in t:
    t = t.replace('</nav>\n\n<main>', '</nav>\n' + visitor + '\n<main>', 1)
intent_section = dedent('''\
<section class="section section-soft" aria-labelledby="search-needs-title">
  <div class="container">
    <div class="section-header center fade-up"><span class="section-en">Popular Needs</span><h2 class="section-title" id="search-needs-title">目的から選ぶ</h2><p class="section-lead">蒲田でよく検索されるお悩み・利用シーンに合わせた案内ページです。</p></div>
    <div class="recommend-grid fade-up">
      <article class="recommend-card"><h3>足裏・ふくらはぎ</h3><p>立ち仕事、歩き疲れ、足まわりをゆっくり休めたい方へ。</p><div class="cta-row"><a href="ashitsubo-fukurahagi.html" class="btn-secondary">詳しく見る</a></div></article>
      <article class="recommend-card"><h3>夜遅く・今から</h3><p>仕事帰りや遅い時間に。11:00〜翌2:00、当日予約可。</p><div class="cta-row"><a href="kamata-late-night.html" class="btn-secondary">深夜利用を見る</a></div></article>
      <article class="recommend-card"><h3>ドライヘッドスパ</h3><p>首肩まわりと合わせて、頭まわりをゆったりケアしたい方へ。</p><div class="cta-row"><a href="headspa-kamata.html" class="btn-secondary">ヘッドスパを見る</a></div></article>
      <article class="recommend-card"><h3>English / Travelers</h3><p>English menu, WhatsApp booking and directions for visitors to Tokyo.</p><div class="cta-row"><a href="/en/" class="btn-secondary">English site</a></div></article>
    </div>
  </div>
</section>
''')
if 'id="search-needs-title"' not in t:
    t = t.replace('<section class="section" id="services">', intent_section + '\n<section class="section" id="services">', 1)
# visitor styling
style_add = dedent('''\
.visitor-english{padding:9px 16px;text-align:center;background:#183a33;color:#fff;font-size:.86rem;line-height:1.5}.visitor-english a{color:#fff;text-decoration:none}.visitor-english strong{color:#f3dca6}.visitor-english a:hover{text-decoration:underline;text-underline-offset:3px}
''')
if '.visitor-english{' not in t:
    t = t.replace('</style>', style_add + '</style>', 1)
write(p, t)

# 2) English homepage
p = 'en/index.html'
t = read(p)
t = replace_once(t,
    '<title>Massage in Kamata, Tokyo | Shin Yuu An – Foot, Seitai &amp; Oil Massage near Kamata Station</title>',
    '<title>Massage near JR Kamata Station, Tokyo | Foot, Body &amp; Aroma Oil Massage | Shin Yuu An</title>',
    'en title')
t = replace_once(t,
    '<meta name="description" content="Relaxation salon 1 minute from JR Kamata Station East Exit, 15 min from Haneda Airport. Foot reflexology, seitai bodycare and aroma oil massage in private rooms. Open daily until 2:00 AM. Request an appointment online or via WhatsApp — English OK.">',
    '<meta name="description" content="Massage and relaxation salon 1 minute from JR Kamata Station East Exit, Tokyo. Foot reflexology, full-body massage and aroma oil massage. Open 11:00 AM–2:00 AM. Same-day requests and WhatsApp booking in English.">',
    'en description')
t = t.replace('<meta property="og:title" content="Shin Yuu An – Massage &amp; Relaxation Salon in Kamata, Tokyo">', '<meta property="og:title" content="Massage near JR Kamata Station, Tokyo | Shin Yuu An">', 1)
t = t.replace('<meta property="og:description" content="1 min from JR Kamata Station East Exit. Foot, seitai &amp; oil massage. Open until 2:00 AM. English-friendly.">', '<meta property="og:description" content="1 min from JR Kamata Station East Exit. Foot, full-body and aroma oil massage. Open until 2:00 AM. English booking and WhatsApp available.">', 1)
if '<meta property="og:site_name"' not in t:
    t = t.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n<meta property="og:site_name" content="身悠晏 Shin Yuu An">', 1)
# replace English LocalBusiness block with same entity
pat = re.compile(r'<script type="application/ld\+json">\s*\{.*?"@type"\s*:\s*"HealthAndBeautyBusiness".*?</script>', re.S)
t, n = pat.subn(BUSINESS_ONLY_JSON, t, count=1)
print('english schema replaced', n)
t = replace_once(t,
    '<h1>Unwind in Kamata.<br>Foot, seitai &amp; aroma oil massage.</h1>\n    <p>1 minute from JR Kamata Station East Exit. Private rooms (curtain entrance), open every day until 2:00 AM. Same-day booking welcome — English-friendly.</p>',
    '<h1>Massage near JR Kamata Station, Tokyo</h1>\n    <p>Foot massage · full-body massage · aroma oil massage. 1 minute from East Exit, open 11:00 AM–2:00 AM. Same-day requests welcome — English-friendly.</p>',
    'en hero h1')
t = replace_once(t,
    '<div class="hero-cta">\n      <a href="https://shinyuuan.jp/booking.html?lang=en" class="btn-primary">Request Appointment</a>\n      <a href="#menu" class="btn-secondary" style="background:rgba(255,255,255,.92);">See Menu &amp; Prices</a>\n    </div>',
    '<div class="hero-cta">\n      <a href="https://shinyuuan.jp/booking.html?lang=en" class="btn-primary" data-track="hero_book">Book Online</a>\n      <a href="https://wa.me/817091659898?text=Hello%2C%20I%20would%20like%20to%20request%20a%20massage%20appointment%20at%20Shin%20Yuu%20An." target="_blank" rel="noopener" class="btn-secondary" style="background:rgba(255,255,255,.92);" data-track="hero_whatsapp">WhatsApp</a>\n    </div>\n    <p style="margin-top:12px;"><a href="#menu" style="color:#fff;font-weight:700;text-decoration:underline;text-underline-offset:3px;">See menu &amp; prices</a></p>',
    'en hero cta')
t = t.replace('Seitai bodycare (dry massage) — 60 min', 'Full-body massage / Japanese body care (seitai) — 60 min')
t = t.replace('Kamata is just 10–15 minutes from Haneda Airport by Keikyu bus or taxi — perfect for a massage the night before an early flight, or to reset after a long-haul arrival. Open until 2:00 AM every day.', 'Kamata offers convenient access from the Haneda Airport area by bus, train or taxi. Travel time varies by terminal, route and traffic. If you are staying around Kamata before or after a flight, our salon is open until 2:00 AM.')
# improve booking CTA
old = '<a href="https://page.line.me/017hlpiu" target="_blank" rel="noopener" class="btn-secondary">Have LINE? You can also book via LINE chat.</a>'
new = '<a href="https://wa.me/817091659898?text=Hello%2C%20I%20would%20like%20to%20request%20an%20appointment%20at%20Shin%20Yuu%20An." target="_blank" rel="noopener" class="btn-secondary" data-track="booking_whatsapp">Send request on WhatsApp</a>'
t = t.replace(old, new, 1)
quick = dedent('''\
<section class="section section-soft" aria-labelledby="arriving-now-title">
  <div class="container">
    <div class="section-header center fade-up"><span class="section-en">For Visitors</span><h2 class="section-title" id="arriving-now-title">Arriving now?</h2><p class="section-lead">JR Kamata East Exit → Kitajima Building → elevator to 4F. If you are already nearby, check the map or message us before coming upstairs.</p></div>
    <div class="yoyaku-notice-grid fade-up">
      <div class="mini-note"><strong>Google Maps</strong><a href="https://www.google.com/maps/search/?api=1&amp;query=Shin+Yuu+An+Kamata" target="_blank" rel="noopener" data-track="visitor_map">Open directions →</a></div>
      <div class="mini-note"><strong>WhatsApp</strong><a href="https://wa.me/817091659898?text=Hello%2C%20I%20am%20near%20JR%20Kamata%20Station%20and%20would%20like%20to%20check%20availability." target="_blank" rel="noopener" data-track="visitor_whatsapp">Ask availability →</a></div>
      <div class="mini-note"><strong>Walk-ins</strong>May be accepted when a therapist is available. A quick booking request is recommended.</div>
      <div class="mini-note"><strong>Late night</strong>An ¥800 late-night fee applies when you arrive at or after 11:00 PM.</div>
    </div>
    <div class="section-header center fade-up" style="margin-top:40px;"><h2 class="section-title">Choose by what you need</h2></div>
    <div class="recommend-grid fade-up">
      <article class="recommend-card"><h3>Foot Massage</h3><p>Foot reflexology with calf care for tired legs after walking or travel.</p><div class="cta-row"><a class="btn-secondary" href="/en/foot-massage-kamata.html">Foot massage guide</a></div></article>
      <article class="recommend-card"><h3>Late-Night Massage</h3><p>Open until 2:00 AM near JR Kamata Station.</p><div class="cta-row"><a class="btn-secondary" href="/en/late-night-massage-kamata.html">Late-night guide</a></div></article>
      <article class="recommend-card"><h3>Haneda &amp; Kamata</h3><p>Useful information for travelers staying around Kamata before or after a flight.</p><div class="cta-row"><a class="btn-secondary" href="/en/haneda-kamata-massage.html">Traveler guide</a></div></article>
    </div>
  </div>
</section>
''')
if 'id="arriving-now-title"' not in t:
    t = t.replace('<section class="section" id="menu">', quick + '\n<section class="section" id="menu">', 1)
# track English clicks
track_script = dedent('''\
<script>
document.addEventListener('click',function(e){var a=e.target.closest('[data-track]');if(a&&typeof gtag==='function'){gtag('event','english_conversion_click',{action:a.dataset.track,link_url:a.href||''});}});
</script>
''')
if 'english_conversion_click' not in t:
    t = t.replace('<script src="../assets/language-routing.js"></script>', track_script + '<script src="../assets/language-routing.js"></script>', 1)
# mobile fixed CTA: make second button WhatsApp for foreign visitors
t = t.replace('<a href="tel:0368746808">Call</a>\n</div>', '<a href="https://wa.me/817091659898?text=Hello%2C%20I%20would%20like%20to%20check%20availability%20at%20Shin%20Yuu%20An." target="_blank" rel="noopener" data-track="mobile_whatsapp">WhatsApp</a>\n</div>', 1)
write(p, t)

# 3) Menu metadata + breadcrumb + links
p = 'menu.html'
t = read(p)
t = t.replace('<title>メニュー・料金｜身悠晏 Shin Yuu An</title>', '<title>蒲田の足裏・整体・アロマ・ヘッドスパ｜メニュー・料金｜身悠晏</title>', 1)
t = t.replace('<meta name="description" content="蒲田駅東口徒歩1分。足裏・整体・アロマリンパを中心に、お疲れに合わせて選べるメニューをご用意しています。">', '<meta name="description" content="蒲田駅東口徒歩1分、身悠晏のメニュー・料金。足裏リフレ、整体ボディケア、アロマ、ドライヘッドスパ、セットコースを掲載。11:00〜翌2:00、当日予約可。">', 1)
t = add_before_head_end(t, breadcrumb_schema([('ホーム','https://shinyuuan.jp/'),('メニュー・料金','https://shinyuuan.jp/menu.html')]), 'BreadcrumbList')
if 'ashitsubo-fukurahagi.html' not in t:
    t = t.replace('<div class="menu-actions"><a href="https://beauty.hotpepper.jp/kr/slnH000397723/"', '<p style="margin:14px 0 0;"><a href="ashitsubo-fukurahagi.html" style="font-weight:800;color:#2F4438;">足裏・ふくらはぎケアの詳しい選び方 →</a></p>\n        <div class="menu-actions"><a href="https://beauty.hotpepper.jp/kr/slnH000397723/"', 1)
write(p, t)

# 4) Shop metadata/schema/breadcrumb
p = 'shop.html'
t = read(p)
t = t.replace('<title>店舗情報・アクセス｜身悠晏 Shin Yuu An</title>', '<title>蒲田駅東口徒歩1分｜アクセス・営業時間・店舗情報｜身悠晏</title>', 1)
t = t.replace('<meta name="description" content="身悠晏の店舗情報・アクセス。蒲田駅東口徒歩1分、北島ビル4F。入口、エレベーター、店内写真、ウェブ・WhatsApp・LINEなどの予約方法をご確認いただけます。">', '<meta name="description" content="JR蒲田駅東口徒歩1分、北島ビル4Fの身悠晏。11:00〜翌2:00。写真付き道順、Google Maps、エレベーター、支払い方法、予約方法をご案内します。">', 1)
pat = re.compile(r'<script type="application/ld\+json">\s*\{.*?"@type"\s*:\s*"HealthAndBeautyBusiness".*?</script>', re.S)
t, n = pat.subn(BUSINESS_ONLY_JSON, t, count=1)
print('shop schema replaced', n)
t = add_before_head_end(t, breadcrumb_schema([('ホーム','https://shinyuuan.jp/'),('店舗情報・アクセス','https://shinyuuan.jp/shop.html')]), 'BreadcrumbList')
write(p, t)

# 5) FAQ metadata + breadcrumb
p = 'faq.html'
t = read(p)
t = t.replace('<title>よくある質問（FAQ）｜身悠晏 Shin Yuu An</title>', '<title>予約・料金・深夜営業・アクセスFAQ｜蒲田 身悠晏</title>', 1)
t = t.replace('<meta name="description" content="身悠晏のよくある質問。ウェブ予約、WhatsApp、LINE、アクセス、支払い、着替え、施術に関するご案内。">', '<meta name="description" content="蒲田の身悠晏 FAQ。予約確定の流れ、当日利用、23時以降の深夜料金、アクセス、支払い、着替え、外国語予約など初めての方の疑問に回答します。">', 1)
t = add_before_head_end(t, breadcrumb_schema([('ホーム','https://shinyuuan.jp/'),('よくある質問','https://shinyuuan.jp/faq.html')]), 'BreadcrumbList')
write(p, t)

# 6) Old URL migration cleanup (meta-refresh remains a permanent redirect signal for static hosting)
for p in ['company.html','yoyaku.html']:
    t = read(p)
    t = t.replace('<meta name="robots" content="noindex,follow">\n','')
    write(p, t)

# 7) Recruitment hub from PR20: remove JobPosting from listing page, link detail pages
p = 'recruit.html'
t = read(p)
# remove every JobPosting JSON-LD block from hub
jp_pat = re.compile(r'<script type="application/ld\+json">\s*\{(?:(?!</script>).)*?"@type"\s*:\s*"JobPosting"(?:(?!</script>).)*?</script>\s*', re.S)
t, count = jp_pat.subn('', t)
print('removed JobPosting blocks from hub', count)
t = t.replace('<title>セラピスト募集｜経験者は最低報酬保証制度あり・未経験研修枠｜身悠晏 蒲田</title>', '<title>蒲田のセラピスト求人｜業務委託・正社員・アルバイト｜身悠晏</title>', 1)
t = t.replace('<meta name="description" content="蒲田駅東口徒歩1分、身悠晏のセラピスト採用情報。経験者は施術売上50％、条件により月額最低報酬30万円保証制度あり。未経験者は研修中も時給1,300円〜、交通費支給。店舗見学・条件相談からでも応募できます。">', '<meta name="description" content="蒲田駅東口徒歩1分、身悠晏のセラピスト求人。業務委託、正社員・契約社員、アルバイト・パート、未経験研修枠の条件を掲載。店舗見学・条件相談から応募できます。">', 1)
t = t.replace('<a class="rp-btn rp-btn-primary" href="#apply" data-route="経験者">経験者として相談する</a>', '<a class="rp-btn rp-btn-primary" href="/recruit/contractor.html">業務委託の募集要項を見る</a>', 1)
t = t.replace('<a class="rp-btn rp-btn-primary" href="#apply" data-route="未経験研修">研修枠について相談する</a>', '<a class="rp-btn rp-btn-primary" href="/recruit/part-time.html">アルバイト・研修枠を見る</a>', 1)
jobcards = dedent('''\
<section class="rp-section" aria-labelledby="job-detail-title">
  <div class="rp-container">
    <div class="rp-center"><span class="rp-eyebrow">Job Details</span><h2 class="rp-title" id="job-detail-title">雇用形態別の募集要項</h2><p class="rp-lead">Google求人検索にも正確に伝わるよう、各募集を1ページずつ分けています。応募前に条件をご確認ください。</p></div>
    <div class="rp-points">
      <article class="rp-point"><b>経験者・業務委託</b><p>施術売上50％〜。条件付き最低報酬保証制度、指名・深夜加算あり。</p><p style="margin-top:14px;"><a href="/recruit/contractor.html" class="rp-btn rp-btn-secondary">募集要項</a></p></article>
      <article class="rp-point"><b>正社員・契約社員</b><p>月給25万円〜32万円。経験・対応メニュー・勤務時間帯により決定。</p><p style="margin-top:14px;"><a href="/recruit/full-time.html" class="rp-btn rp-btn-secondary">募集要項</a></p></article>
      <article class="rp-point"><b>アルバイト・研修枠</b><p>経験者は時給1,400円〜1,700円。未経験研修は時給1,300円〜。</p><p style="margin-top:14px;"><a href="/recruit/part-time.html" class="rp-btn rp-btn-secondary">募集要項</a></p></article>
    </div>
  </div>
</section>
''')
if 'id="job-detail-title"' not in t:
    t = t.replace('<section class="rp-section rp-section-soft" id="apply">', jobcards + '\n<section class="rp-section rp-section-soft" id="apply">', 1)
t = add_before_head_end(t, breadcrumb_schema([('ホーム','https://shinyuuan.jp/'),('採用情報','https://shinyuuan.jp/recruit.html')]), 'BreadcrumbList')
write(p, t)

# ---- Reusable landing page generators ----
def jp_page(slug, title, desc, h1, lead, image, sections, cta='この内容で予約を相談する', alt_en=None):
    alt = ''
    if alt_en:
        alt = f'<link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/{slug}">\n<link rel="alternate" hreflang="en" href="{alt_en}">\n<link rel="alternate" hreflang="x-default" href="{alt_en}">'
    cards = ''.join(f'<section class="intent-section"><h2>{h}</h2>{b}</section>' for h,b in sections)
    bc = breadcrumb_schema([('ホーム','https://shinyuuan.jp/'),(h1,f'https://shinyuuan.jp/{slug}')])
    return dedent(f'''\
<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title><meta name="description" content="{desc}"><link rel="canonical" href="https://shinyuuan.jp/{slug}">{alt}
<meta property="og:type" content="article"><meta property="og:site_name" content="身悠晏 Shin Yuu An"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="https://shinyuuan.jp/{slug}"><meta property="og:image" content="https://shinyuuan.jp/{image}">
<link rel="stylesheet" href="assets/style.css"><link rel="icon" type="image/svg+xml" href="assets/favicon.svg">{bc}
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SWGGKR9K9W"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-SWGGKR9K9W');</script>
<style>.intent-wrap{{max-width:980px;margin:auto}}.intent-hero{{display:grid;grid-template-columns:1.05fr .95fr;gap:34px;align-items:center;padding:56px 0}}.intent-hero img{{width:100%;border-radius:18px;aspect-ratio:4/3;object-fit:cover}}.intent-hero h1{{font-size:clamp(1.9rem,4vw,3rem);line-height:1.45}}.intent-section{{padding:30px 0;border-top:1px solid rgba(74,55,40,.12)}}.intent-section h2{{font-size:1.45rem;margin:0 0 14px}}.intent-section p,.intent-section li{{line-height:1.95;color:#5f5750}}.intent-actions{{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}}.intent-facts{{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}}.intent-facts span{{padding:7px 11px;border-radius:999px;background:#eef7f3;font-size:.82rem;font-weight:800}}@media(max-width:760px){{.intent-hero{{grid-template-columns:1fr;padding:34px 0}}}}</style></head><body>
<header class="site-header" id="siteHeader"><div class="header-inner"><a href="/" class="site-logo"><span class="logo-mark">身悠晏</span><span class="logo-divider"></span><span class="logo-tagline">Shin Yuu An<br>Relaxation Salon</span></a><nav class="main-nav"><a href="/">ホーム</a><a href="/menu.html">メニュー</a><a href="/shop.html">アクセス</a><a href="/faq.html">FAQ</a><a href="/booking.html?lang=ja" class="nav-cta">ご予約</a><a href="/en/" class="nav-lang">English</a></nav></div></header>
<main><div class="container intent-wrap"><nav class="breadcrumb"><a href="/">ホーム</a><span>›</span>{h1}</nav><section class="intent-hero"><div><span class="section-en">Kamata Local Guide</span><h1>{h1}</h1><p class="section-lead" style="text-align:left">{lead}</p><div class="intent-facts"><span>JR蒲田駅東口徒歩1分</span><span>11:00〜翌2:00</span><span>当日予約可</span></div><div class="intent-actions"><a class="btn-primary" href="/booking.html?lang=ja">{cta}</a><a class="btn-secondary" href="/menu.html">料金を見る</a></div></div><img src="{image}" alt="{h1}" fetchpriority="high"></section>{cards}<section class="intent-section"><h2>身悠晏へのアクセス</h2><p>東京都大田区蒲田5-12-3 北島ビル4F。JR蒲田駅東口から徒歩1分、ファミリーマート隣の北島ビル奥のエレベーターで4Fへお越しください。</p><div class="intent-actions"><a class="btn-secondary" href="https://www.google.com/maps/search/?api=1&amp;query=身悠晏+蒲田" target="_blank" rel="noopener">Google Maps</a><a class="btn-secondary" href="/shop.html">写真付き道順</a></div></section></div></main>
<footer class="site-footer"><div class="container"><div class="footer-bottom"><span>© 2026 身悠晏</span><div class="footer-legal"><a href="/privacy.html">プライバシーポリシー</a></div></div></div></footer></body></html>''')


def en_page(path, title, desc, h1, lead, image, sections, ja_alt=None):
    alt = ''
    if ja_alt:
        alt = f'<link rel="alternate" hreflang="en" href="https://shinyuuan.jp/{path}">\n<link rel="alternate" hreflang="ja" href="{ja_alt}">\n<link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/{path}">'
    cards = ''.join(f'<section class="intent-section"><h2>{h}</h2>{b}</section>' for h,b in sections)
    bc = breadcrumb_schema([('English Home','https://shinyuuan.jp/en/'),(h1,f'https://shinyuuan.jp/{path}')])
    return dedent(f'''\
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>{title}</title><meta name="description" content="{desc}"><link rel="canonical" href="https://shinyuuan.jp/{path}">{alt}<meta property="og:type" content="article"><meta property="og:site_name" content="身悠晏 Shin Yuu An"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="https://shinyuuan.jp/{path}"><meta property="og:image" content="https://shinyuuan.jp/{image}"><link rel="stylesheet" href="../assets/style.css"><link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">{bc}<script async src="https://www.googletagmanager.com/gtag/js?id=G-SWGGKR9K9W"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-SWGGKR9K9W');</script><style>.intent-wrap{{max-width:980px;margin:auto}}.intent-hero{{display:grid;grid-template-columns:1.05fr .95fr;gap:34px;align-items:center;padding:56px 0}}.intent-hero img{{width:100%;border-radius:18px;aspect-ratio:4/3;object-fit:cover}}.intent-hero h1{{font-size:clamp(1.9rem,4vw,3rem);line-height:1.3}}.intent-section{{padding:30px 0;border-top:1px solid rgba(74,55,40,.12)}}.intent-section h2{{font-size:1.45rem;margin:0 0 14px}}.intent-section p,.intent-section li{{line-height:1.9;color:#5f5750}}.intent-actions{{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}}.intent-facts{{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}}.intent-facts span{{padding:7px 11px;border-radius:999px;background:#eef7f3;font-size:.82rem;font-weight:800}}@media(max-width:760px){{.intent-hero{{grid-template-columns:1fr;padding:34px 0}}}}</style></head><body class="en-page"><header class="site-header"><div class="header-inner"><a href="/en/" class="site-logo"><span class="logo-mark">身悠晏</span><span class="logo-divider"></span><span class="logo-tagline">Shin Yuu An<br>Relaxation Salon</span></a><nav class="main-nav"><a href="/en/">English Home</a><a href="/en/#menu">Menu</a><a href="/en/#access">Access</a><a href="/booking.html?lang=en" class="nav-cta">Book</a><a href="/">日本語</a></nav></div></header><main><div class="container intent-wrap"><nav class="breadcrumb"><a href="/en/">English Home</a><span>›</span>{h1}</nav><section class="intent-hero"><div><span class="section-en">Kamata, Tokyo</span><h1>{h1}</h1><p class="section-lead" style="text-align:left">{lead}</p><div class="intent-facts"><span>1 min from JR Kamata East Exit</span><span>Open 11 AM–2 AM</span><span>Same-day requests</span></div><div class="intent-actions"><a class="btn-primary" href="/booking.html?lang=en">Book Online</a><a class="btn-secondary" href="https://wa.me/817091659898?text=Hello%2C%20I%20would%20like%20to%20check%20availability%20at%20Shin%20Yuu%20An." target="_blank" rel="noopener">WhatsApp</a></div></div><img src="../{image}" alt="{h1}" fetchpriority="high"></section>{cards}<section class="intent-section"><h2>How to find us</h2><p>Kitajima Building 4F, 5-12-3 Kamata, Ota City, Tokyo 144-0052. From JR Kamata Station East Exit, walk about one minute. Enter Kitajima Building next to FamilyMart and take the elevator to 4F.</p><div class="intent-actions"><a class="btn-secondary" href="https://www.google.com/maps/search/?api=1&amp;query=Shin+Yuu+An+Kamata" target="_blank" rel="noopener">Open Google Maps</a><a class="btn-secondary" href="/en/#access">Access details</a></div></section></div></main><footer class="site-footer"><div class="container"><div class="footer-bottom"><span>© 2026 Shin Yuu An</span><div class="footer-legal"><a href="/privacy.html">Privacy Policy</a></div></div></div></footer></body></html>''')

# Japanese high-intent pages
write('ashitsubo-fukurahagi.html', jp_page('ashitsubo-fukurahagi.html','蒲田の足裏リフレ・ふくらはぎケア｜身悠晏','蒲田駅東口徒歩1分。足裏からふくらはぎまで丁寧にケアする身悠晏の足裏リフレ。30・45・60分、整体とのセットも掲載。11:00〜翌2:00。','蒲田の足裏リフレ・ふくらはぎケア','立ち仕事、歩き疲れ、旅行や買い物のあとなど、足裏からふくらはぎをゆっくり休めたい方へ。','assets/img/menu-foot-close.webp',[
('どんな方に選ばれていますか？','<ul><li>立ち仕事で足まわりを休めたい</li><li>観光や買い物でたくさん歩いた</li><li>足裏だけでなく、ふくらはぎまでケアしたい</li><li>整体ボディケアと組み合わせたい</li></ul>'),
('時間の選び方','<p><strong>30分 2,800円</strong>：短時間で足裏中心。<br><strong>45分 3,980円</strong>：足裏とふくらはぎをバランスよく。<br><strong>60分 4,980円</strong>：足まわりをゆっくり受けたい方に。</p><p>全身も気になる場合は、整体＋足裏のセットコースもご用意しています。</p>'),
('施術について','<p>その日の状態や力加減のご希望を確認しながら進めます。当店の施術はリラクゼーションを目的としたもので、医療行為ではありません。</p>')
], alt_en='https://shinyuuan.jp/en/foot-massage-kamata.html'))

write('kamata-late-night.html', jp_page('kamata-late-night.html','蒲田で夜遅くまで利用できるリラクゼーション｜深夜2時まで｜身悠晏','JR蒲田駅東口徒歩1分、11:00〜翌2:00。仕事帰りや遅い時間に利用しやすい身悠晏。23時以降のご来店は深夜料金800円。当日予約可。','蒲田で夜遅くまで利用できるリラクゼーション','仕事帰り、食事のあと、今から休みたい時にも。身悠晏はJR蒲田駅東口徒歩1分、11:00〜翌2:00まで営業しています。','assets/img/booking-treatment-waterwood-4k.webp',[
('深夜利用のポイント','<ul><li>営業時間 11:00〜翌2:00</li><li>23:00以降にご来店の場合、深夜料金800円</li><li>最終受付はコース時間と当日の空き状況により異なります</li><li>当日は予約ページ、LINEまたは電話で空き状況をご確認ください</li></ul>'),
('仕事帰りに選びやすいコース','<p>整体60分、足裏45〜60分、アロマ60分など、時間に合わせて選べます。短時間だけでなく、整体＋足裏のセットもご用意しています。</p>'),
('遅い時間の来店方法','<p>北島ビルに入り、奥のエレベーターで4Fへお越しください。初めての方は写真付きアクセスページをご確認いただくとスムーズです。</p>')
], alt_en='https://shinyuuan.jp/en/late-night-massage-kamata.html'))

write('headspa-kamata.html', jp_page('headspa-kamata.html','蒲田のドライヘッドスパ｜首肩と合わせたリラクゼーション｜身悠晏','蒲田駅東口徒歩1分。身悠晏のドライヘッドスパと首肩まわりのリラクゼーション。整体・足裏・アロマとの組み合わせも可能。11:00〜翌2:00。','蒲田のドライヘッドスパ','頭まわりをゆったり休めたい日や、首肩まわりと合わせて受けたい方へ。ドライで行うため、髪を濡らさず受けられます。','assets/img/shop-room.jpg',[
('ドライヘッドスパとは','<p>水やシャンプーを使わず、頭まわりをゆったりケアするリラクゼーションメニューです。美容室の洗髪を伴うヘッドスパとは内容が異なります。</p>'),
('組み合わせがおすすめの方','<ul><li>整体ボディケアと一緒に首肩・頭まわりを受けたい</li><li>足裏コースに短いヘッドケアを追加したい</li><li>仕事帰りに髪を濡らさずリラックスしたい</li></ul>'),
('予約時に確認してください','<p>ヘッドスパの対応時間・組み合わせはコースにより異なります。予約ページまたはLINEでご希望時間をお知らせください。</p>')
]))

# English high-intent pages
write('en/foot-massage-kamata.html', en_page('en/foot-massage-kamata.html','Foot Massage near JR Kamata Station, Tokyo | Shin Yuu An','Foot massage and reflexology 1 minute from JR Kamata Station East Exit. 30, 45 and 60 minute foot care with calf massage. Open until 2:00 AM. English booking and WhatsApp available.','Foot Massage near JR Kamata Station','Foot reflexology with calf care for tired legs after sightseeing, shopping, standing work or a long travel day.','assets/img/menu-foot-close.webp',[
('Choose your time','<p><strong>30 min ¥2,800</strong> — short foot-focused session.<br><strong>45 min ¥3,980</strong> — balanced foot and calf care.<br><strong>60 min ¥4,980</strong> — more time for tired feet and lower legs.</p>'),
('Good after a day of walking','<p>Many visitors spend long hours walking around Tokyo. If your feet feel tired, you can choose foot care alone or combine it with full-body massage.</p>'),
('Before you book','<p>Tell us your preferred pressure and any areas you want us to avoid. Treatments are for relaxation and are not medical care.</p>')
], ja_alt='https://shinyuuan.jp/ashitsubo-fukurahagi.html'))

write('en/late-night-massage-kamata.html', en_page('en/late-night-massage-kamata.html','Late-Night Massage in Kamata, Tokyo | Open until 2 AM | Shin Yuu An','Late-night massage near JR Kamata Station East Exit. Shin Yuu An is open 11:00 AM–2:00 AM. Same-day booking requests available in English and WhatsApp.','Late-Night Massage in Kamata, Tokyo','Need to relax after work, dinner or a late arrival? We are one minute from JR Kamata Station East Exit and open until 2:00 AM.','assets/img/booking-treatment-waterwood-4k.webp',[
('Late-night information','<ul><li>Open 11:00 AM–2:00 AM</li><li>An ¥800 late-night fee applies when you arrive at or after 11:00 PM</li><li>Final availability depends on treatment length and the day’s schedule</li><li>For late bookings, send a quick online or WhatsApp request first</li></ul>'),
('Popular choices at night','<p>Full-body massage, foot massage and aroma oil massage are available. If you are short on time, tell us how many minutes you have and we will suggest an available option.</p>'),
('Finding the salon at night','<p>Enter Kitajima Building next to FamilyMart and take the elevator to 4F. Use Google Maps or WhatsApp if you are already nearby.</p>')
], ja_alt='https://shinyuuan.jp/kamata-late-night.html'))

write('en/haneda-kamata-massage.html', en_page('en/haneda-kamata-massage.html','Massage near Haneda Airport Area | Kamata, Tokyo | Shin Yuu An','Relaxation massage in Kamata for travelers staying near Haneda Airport. 1 minute from JR Kamata Station, open until 2:00 AM, with English booking and WhatsApp.','Massage in Kamata for Haneda Airport Travelers','Staying in Kamata before an early flight or after arriving in Tokyo? Shin Yuu An is one minute from JR Kamata Station East Exit and open until 2:00 AM.','assets/img/shop-access.jpg',[
('Why Kamata works for travelers','<p>Kamata is a convenient area for travelers using Haneda Airport, with hotels, restaurants and transport connections. Travel time from the airport varies by terminal, route and traffic, so check your route before leaving.</p>'),
('JR Kamata and Keikyu Kamata are different stations','<p>Our salon is closest to <strong>JR Kamata Station East Exit</strong>. If you arrive at Keikyu Kamata Station, check Google Maps before walking to the salon.</p>'),
('After a flight or sightseeing','<p>Choose foot massage for tired legs, full-body massage for general relaxation, or aroma oil massage when you want more time to unwind. Same-day requests are welcome when availability allows.</p>'),
('English booking','<p>Use our English booking page or WhatsApp. Your appointment is confirmed only after the salon replies with availability.</p>')
]))

# ---- Job detail page generator ----
def job_page(filename, title, meta_desc, h1, lead, visible_rows, job_json):
    rows = ''.join(f'<div class="jd-row"><dt>{k}</dt><dd>{v}</dd></div>' for k,v in visible_rows)
    bc = breadcrumb_schema([('ホーム','https://shinyuuan.jp/'),('採用情報','https://shinyuuan.jp/recruit.html'),(h1,f'https://shinyuuan.jp/recruit/{filename}')])
    return dedent(f'''\
<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>{title}</title><meta name="description" content="{meta_desc}"><link rel="canonical" href="https://shinyuuan.jp/recruit/{filename}"><meta property="og:type" content="website"><meta property="og:site_name" content="身悠晏 Shin Yuu An"><meta property="og:title" content="{title}"><meta property="og:description" content="{meta_desc}"><meta property="og:image" content="https://shinyuuan.jp/assets/img/shop-front.jpg"><link rel="stylesheet" href="../assets/style.css"><link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">{bc}<script type="application/ld+json">{job_json}</script><script async src="https://www.googletagmanager.com/gtag/js?id=G-SWGGKR9K9W"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-SWGGKR9K9W');</script><style>.jd{{max-width:900px;margin:0 auto;padding:46px 0 70px}}.jd h1{{font-size:clamp(1.9rem,4vw,2.8rem);line-height:1.45}}.jd-lead{{font-size:1.06rem;line-height:1.95;color:#5f5750}}.jd-table{{margin-top:28px;border:1px solid rgba(32,112,95,.2);border-radius:14px;overflow:hidden}}.jd-row{{display:grid;grid-template-columns:190px 1fr;border-top:1px solid rgba(32,112,95,.16)}}.jd-row:first-child{{border-top:0}}.jd-row dt,.jd-row dd{{margin:0;padding:17px 20px;line-height:1.8}}.jd-row dt{{background:#eef7f3;font-weight:800;color:#20705f}}.jd-actions{{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}}.jd-note{{margin-top:24px;padding:18px;border-left:4px solid #20705f;background:#f7fbf9;line-height:1.8}}@media(max-width:650px){{.jd-row{{grid-template-columns:1fr}}.jd-row dt{{padding-bottom:7px}}.jd-row dd{{padding-top:7px}}}}</style></head><body><header class="site-header"><div class="header-inner"><a href="/" class="site-logo"><span class="logo-mark">身悠晏</span><span class="logo-divider"></span><span class="logo-tagline">Shin Yuu An<br>Recruit</span></a><nav class="main-nav"><a href="/recruit.html">採用トップ</a><a href="/shop.html">店舗情報</a><a href="/" class="nav-lang">店舗サイト</a></nav></div></header><main><div class="container jd"><div class="breadcrumb"><a href="/">ホーム</a><span>›</span><a href="/recruit.html">採用情報</a><span>›</span>{h1}</div><span class="section-en">Recruit / Kamata</span><h1>{h1}</h1><p class="jd-lead">{lead}</p><dl class="jd-table">{rows}</dl><div class="jd-actions"><a href="/recruit.html#apply" class="btn-primary">簡易フォームで相談する</a><a href="https://page.line.me/017hlpiu" target="_blank" rel="noopener" class="btn-secondary">LINEで相談する</a></div><div class="jd-note">応募前の店舗見学・条件確認だけでも構いません。最終的な雇用・委託条件は面談後、書面で確認します。</div></div></main><footer class="site-footer"><div class="container"><div class="footer-bottom"><span>© 2026 身悠晏</span></div></div></footer></body></html>''')

org = '"hiringOrganization":{"@type":"Organization","name":"凱鴻商事株式会社","sameAs":"https://shinyuuan.jp/"}'
loc = '"jobLocation":{"@type":"Place","name":"身悠晏 Shin Yuu An","address":{"@type":"PostalAddress","postalCode":"144-0052","addressRegion":"東京都","addressLocality":"大田区","streetAddress":"蒲田5-12-3 北島ビル4F","addressCountry":"JP"}}'

contractor_json = '{"@context":"https://schema.org","@type":"JobPosting","identifier":{"@type":"PropertyValue","name":"凱鴻商事株式会社","value":"SYA-CONTRACTOR-2026"},"title":"リラクゼーションセラピスト（業務委託・経験者）","description":"<p>蒲田駅東口徒歩1分の身悠晏で、もみほぐし・足つぼ・オイルトリートメントを担当できる経験者を募集します。</p><ul><li>施術売上50％〜</li><li>条件により月額最低報酬30万円保証制度あり</li><li>高稼働が可能な方は35万円まで個別相談</li><li>指名料全額、対象の深夜料金を加算</li><li>技術確認あり</li></ul><p>最低報酬保証の適用条件は面談後に書面で明示します。</p>","datePosted":"2026-06-13","employmentType":"CONTRACTOR",' + org + ',' + loc + ',"industry":"リラクゼーション","directApply":true}'
write('recruit/contractor.html', job_page('contractor.html','蒲田の業務委託セラピスト求人｜歩合50％〜｜身悠晏','蒲田駅東口徒歩1分。経験者の業務委託セラピスト募集。施術売上50％〜、条件付き最低報酬保証制度、指名・深夜加算。店舗見学可。','業務委託セラピスト募集（経験者）','もみほぐし・足つぼ・オイルを独立して担当できる経験者向けの募集です。',[
('勤務地','身悠晏｜東京都大田区蒲田5-12-3 北島ビル4F（JR蒲田駅東口徒歩1分）'),('契約形態','業務委託'),('報酬','施術売上50％〜。条件により月額最低報酬30万円保証制度あり。高稼働条件は35万円まで個別相談。'),('加算','指名料全額。23時以降に来店されたお客様1件につき800円を加算。'),('応募条件','もみほぐし・足つぼ・オイルを独立して担当でき、当店の技術確認に合格できる方。'),('保証制度','予約受付可能な曜日・時間帯、稼働日数、対応メニュー等を確認し、適用条件を契約書で明示します。歩合報酬が保証額を超えた場合は実績額を支払います。'),('応募方法','採用トップの簡易フォーム、LINE、または電話。初回は履歴書不要。店舗見学のみも可。')], contractor_json))

full_json = '{"@context":"https://schema.org","@type":"JobPosting","identifier":{"@type":"PropertyValue","name":"凱鴻商事株式会社","value":"SYA-FULLTIME-2026"},"title":"リラクゼーションセラピスト（正社員・契約社員）","description":"<p>蒲田駅東口徒歩1分のリラクゼーションサロン身悠晏で、もみほぐし・足つぼ・アロマトリートメント等を担当するセラピストを募集します。</p><ul><li>月給250,000円〜320,000円</li><li>経験・対応メニュー・勤務時間帯により決定</li><li>交通費支給（社内規定あり）</li><li>社会保険は法令に基づき加入</li><li>店舗見学可</li></ul>","datePosted":"2026-06-13","employmentType":["FULL_TIME","TEMPORARY"],"baseSalary":{"@type":"MonetaryAmount","currency":"JPY","value":{"@type":"QuantitativeValue","minValue":250000,"maxValue":320000,"unitText":"MONTH"}},' + org + ',' + loc + ',"industry":"リラクゼーション","directApply":true}'
write('recruit/full-time.html', job_page('full-time.html','蒲田のセラピスト正社員・契約社員求人｜身悠晏','蒲田駅東口徒歩1分、身悠晏の正社員・契約社員セラピスト求人。月給25万〜32万円、経験・勤務条件により決定。店舗見学可。','正社員・契約社員セラピスト募集','蒲田駅東口徒歩1分。経験と対応メニュー、希望時間帯を確認し、勤務条件を決定します。',[
('勤務地','身悠晏｜東京都大田区蒲田5-12-3 北島ビル4F（JR蒲田駅東口徒歩1分）'),('雇用形態','正社員・契約社員'),('給与','月給250,000円〜320,000円。経験、対応メニュー、勤務時間帯により決定。'),('勤務時間','11:00〜翌2:00の営業枠内で、雇用契約・シフトにより決定。'),('仕事内容','もみほぐし、足つぼ、アロマトリートメント等の施術、接客、店内業務。'),('待遇','交通費支給（社内規定あり）。社会保険は法令に基づき加入。'),('応募方法','採用トップの簡易フォーム、LINE、または電話。店舗見学・条件相談からでも可。')], full_json))

part_json = '{"@context":"https://schema.org","@type":"JobPosting","identifier":{"@type":"PropertyValue","name":"凱鴻商事株式会社","value":"SYA-PARTTIME-2026"},"title":"リラクゼーションセラピスト（アルバイト・パート／未経験研修枠あり）","description":"<p>蒲田駅東口徒歩1分の身悠晏で、アルバイト・パートのセラピストを募集します。未経験研修枠もあります。</p><ul><li>経験者：時給1,400円〜1,700円</li><li>未経験研修：時給1,300円〜</li><li>週2日〜、1日5時間〜相談可</li><li>研修・技術確認時間も時給支給</li><li>交通費支給（社内規定あり）</li></ul>","datePosted":"2026-06-13","employmentType":"PART_TIME","baseSalary":{"@type":"MonetaryAmount","currency":"JPY","value":{"@type":"QuantitativeValue","minValue":1300,"maxValue":1700,"unitText":"HOUR"}},' + org + ',' + loc + ',"industry":"リラクゼーション","directApply":true}'
write('recruit/part-time.html', job_page('part-time.html','蒲田のセラピスト アルバイト・パート求人｜未経験研修あり｜身悠晏','蒲田駅東口徒歩1分。アルバイト・パートのセラピスト求人。経験者時給1,400〜1,700円、未経験研修時給1,300円〜。店舗見学可。','アルバイト・パート／未経験研修枠','経験者は時給制、未経験・経験の浅い方は有給研修から相談できます。',[
('勤務地','身悠晏｜東京都大田区蒲田5-12-3 北島ビル4F（JR蒲田駅東口徒歩1分）'),('雇用形態','アルバイト・パート'),('時給','経験者 1,400円〜1,700円。未経験研修 1,300円〜。東京都最低賃金の改定時は、改定後の金額以上に見直します。'),('勤務日数','週2日〜、1日5時間〜相談可。土日・遅番に入れる方は優遇。'),('研修','研修・技術確認の時間も時給を支給。技術チェック合格後にお客様を担当します。'),('交通費','支給あり（社内規定あり）。'),('応募方法','採用トップの簡易フォーム、LINE、または電話。初回は履歴書不要。店舗見学のみも可。')], part_json))

# 8) Clean sitemap: only indexable canonical URLs + real lastmod dates
sitemap = dedent('''\
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>https://shinyuuan.jp/</loc><lastmod>2026-08-09</lastmod><xhtml:link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/"/><xhtml:link rel="alternate" hreflang="en" href="https://shinyuuan.jp/en/"/><xhtml:link rel="alternate" hreflang="zh-Hans" href="https://shinyuuan.jp/zh/"/><xhtml:link rel="alternate" hreflang="ko" href="https://shinyuuan.jp/ko/"/><xhtml:link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/en/"/></url>
  <url><loc>https://shinyuuan.jp/menu.html</loc><lastmod>2026-08-09</lastmod></url>
  <url><loc>https://shinyuuan.jp/shop.html</loc><lastmod>2026-08-09</lastmod></url>
  <url><loc>https://shinyuuan.jp/faq.html</loc><lastmod>2026-08-09</lastmod></url>
  <url><loc>https://shinyuuan.jp/recruit.html</loc><lastmod>2026-08-09</lastmod></url>
  <url><loc>https://shinyuuan.jp/ashitsubo-fukurahagi.html</loc><lastmod>2026-08-09</lastmod><xhtml:link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/ashitsubo-fukurahagi.html"/><xhtml:link rel="alternate" hreflang="en" href="https://shinyuuan.jp/en/foot-massage-kamata.html"/><xhtml:link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/en/foot-massage-kamata.html"/></url>
  <url><loc>https://shinyuuan.jp/kamata-late-night.html</loc><lastmod>2026-08-09</lastmod><xhtml:link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/kamata-late-night.html"/><xhtml:link rel="alternate" hreflang="en" href="https://shinyuuan.jp/en/late-night-massage-kamata.html"/><xhtml:link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/en/late-night-massage-kamata.html"/></url>
  <url><loc>https://shinyuuan.jp/headspa-kamata.html</loc><lastmod>2026-08-09</lastmod></url>
  <url><loc>https://shinyuuan.jp/en/</loc><lastmod>2026-08-09</lastmod><xhtml:link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/"/><xhtml:link rel="alternate" hreflang="en" href="https://shinyuuan.jp/en/"/><xhtml:link rel="alternate" hreflang="zh-Hans" href="https://shinyuuan.jp/zh/"/><xhtml:link rel="alternate" hreflang="ko" href="https://shinyuuan.jp/ko/"/><xhtml:link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/en/"/></url>
  <url><loc>https://shinyuuan.jp/en/foot-massage-kamata.html</loc><lastmod>2026-08-09</lastmod><xhtml:link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/ashitsubo-fukurahagi.html"/><xhtml:link rel="alternate" hreflang="en" href="https://shinyuuan.jp/en/foot-massage-kamata.html"/><xhtml:link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/en/foot-massage-kamata.html"/></url>
  <url><loc>https://shinyuuan.jp/en/late-night-massage-kamata.html</loc><lastmod>2026-08-09</lastmod><xhtml:link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/kamata-late-night.html"/><xhtml:link rel="alternate" hreflang="en" href="https://shinyuuan.jp/en/late-night-massage-kamata.html"/><xhtml:link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/en/late-night-massage-kamata.html"/></url>
  <url><loc>https://shinyuuan.jp/en/haneda-kamata-massage.html</loc><lastmod>2026-08-09</lastmod></url>
  <url><loc>https://shinyuuan.jp/zh/</loc><lastmod>2026-07-27</lastmod><xhtml:link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/"/><xhtml:link rel="alternate" hreflang="en" href="https://shinyuuan.jp/en/"/><xhtml:link rel="alternate" hreflang="zh-Hans" href="https://shinyuuan.jp/zh/"/><xhtml:link rel="alternate" hreflang="ko" href="https://shinyuuan.jp/ko/"/><xhtml:link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/en/"/></url>
  <url><loc>https://shinyuuan.jp/ko/</loc><lastmod>2026-07-27</lastmod><xhtml:link rel="alternate" hreflang="ja" href="https://shinyuuan.jp/"/><xhtml:link rel="alternate" hreflang="en" href="https://shinyuuan.jp/en/"/><xhtml:link rel="alternate" hreflang="zh-Hans" href="https://shinyuuan.jp/zh/"/><xhtml:link rel="alternate" hreflang="ko" href="https://shinyuuan.jp/ko/"/><xhtml:link rel="alternate" hreflang="x-default" href="https://shinyuuan.jp/en/"/></url>
  <url><loc>https://shinyuuan.jp/recruit/contractor.html</loc><lastmod>2026-08-09</lastmod></url>
  <url><loc>https://shinyuuan.jp/recruit/full-time.html</loc><lastmod>2026-08-09</lastmod></url>
  <url><loc>https://shinyuuan.jp/recruit/part-time.html</loc><lastmod>2026-08-09</lastmod></url>
</urlset>
''')
write('sitemap.xml', sitemap)

print('SEO optimization complete')

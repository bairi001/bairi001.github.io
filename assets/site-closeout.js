(() => {
  "use strict";
  if (globalThis.__SYA_SITE_CLOSEOUT_APPLIED) return;
  globalThis.__SYA_SITE_CLOSEOUT_APPLIED = true;
  document.documentElement.dataset.siteCloseout = "20260809";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const path = location.pathname.replace(/\/index\.html$/, "/");
  const HPB_COUPON = "https://beauty.hotpepper.jp/kr/slnH000397723/coupon/";
  const LINE = "https://page.line.me/017hlpiu";

  const setMeta = (selector, content) => {
    const el = $(selector);
    if (el && content) el.setAttribute("content", content);
  };

  const replaceTextNodes = (root, replacements) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|TEXTAREA)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let value = node.nodeValue;
      replacements.forEach(([from, to]) => { if (value.includes(from)) value = value.split(from).join(to); });
      node.nodeValue = value;
    });
  };

  const replaceLdJson = replacements => {
    $$('script[type="application/ld+json"]').forEach(script => {
      let value = script.textContent;
      replacements.forEach(([from, to]) => { if (value.includes(from)) value = value.split(from).join(to); });
      script.textContent = value;
    });
  };

  const setLink = (link, { text, href, track, external = false } = {}) => {
    if (!link) return;
    if (text) link.textContent = text;
    if (href) link.href = href;
    if (track) link.dataset.track = track;
    if (external) { link.target = "_blank"; link.rel = "noopener"; }
    else if (href && href.startsWith("/")) { link.removeAttribute("target"); link.removeAttribute("rel"); }
  };

  const injectStyle = () => {
    if ($("#siteCloseoutStyle")) return;
    const style = document.createElement("style");
    style.id = "siteCloseoutStyle";
    style.textContent = `
      .menu-global-actions{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 2px}
      .menu-global-actions .btn-primary,.menu-global-actions .btn-secondary{min-height:44px}
      .menu-option-photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0 22px}
      .menu-option-photo-grid figure{overflow:hidden;border:1px solid var(--goldline);border-radius:14px;background:var(--card)}
      .menu-option-photo-grid img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}
      .menu-option-photo-grid figcaption{padding:10px 12px;color:var(--heading);font-size:.78rem;font-weight:700}
      .menu-web-cta{text-align:center;margin-top:22px}
      @media(max-width:600px){.menu-global-actions{display:grid}.menu-global-actions a{width:100%}.menu-option-photo-grid{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  };

  const patchJapaneseHome = () => {
    const lead = $(".premium-hero-lead");
    if (lead && lead.textContent.includes("11:00〜翌2:00")) {
      lead.innerHTML = '足裏・整体ボディケア・アロマ・ヘッドケア、<span class="hero-hours">11:00〜翌2:00</span>。';
    }
    replaceTextNodes(document.body, [[
      "English menu, WhatsApp booking and directions for visitors to Tokyo.",
      "English menu, online booking and directions for visitors to Tokyo."
    ]]);
    const service = $$(".service-card").find(card => $("h3", card)?.textContent.includes("アロマ・ヘッドケア"));
    if (service) {
      $("h3", service).textContent = "アロマ・デコルテケア";
      const p = $("p", service);
      if (p) p.textContent = "香りに包まれてゆっくり過ごしたい日や、首・デコルテまわりをオイルでケアしたい日に。";
      const a = $("a", service);
      if (a) { a.href = "menu.html#aroma"; a.innerHTML = 'アロマメニューを見る <span aria-hidden="true">→</span>'; }
    }
  };

  const patchMenu = () => {
    injectStyle();
    $$(".menu-section .menu-actions").forEach(el => el.remove());

    const jump = $(".menu-jump");
    if (jump && !$(".menu-global-actions")) {
      const actions = document.createElement("div");
      actions.className = "menu-global-actions";
      actions.innerHTML = `
        <a class="btn-primary" href="/booking.html?lang=ja">ウェブで予約リクエスト</a>
        <a class="btn-secondary" href="${HPB_COUPON}" target="_blank" rel="noopener">HotPepperで空席・クーポンを見る</a>
        <a class="btn-secondary" href="${LINE}" target="_blank" rel="noopener">LINEで相談する</a>`;
      jump.insertAdjacentElement("afterend", actions);
    }

    const bodyImg = $("#bodycare .menu-photo img");
    if (bodyImg) {
      bodyImg.src = "/assets/img/body-shoulder-care-new.webp";
      bodyImg.alt = "肩・背中を丁寧にもみほぐす整体ボディケア";
      bodyImg.width = 600; bodyImg.height = 571;
    }
    const aromaImg = $("#aroma .menu-photo img");
    if (aromaImg) {
      aromaImg.src = "/assets/img/aroma-leg-care-new.webp";
      aromaImg.alt = "脚を丁寧に流すアロマオイルトリートメント";
      aromaImg.width = 600; aromaImg.height = 450;
    }

    const optionContent = $("#option .menu-content");
    const optionGrid = $("#option .option-grid");
    if (optionContent && optionGrid && !$(".menu-option-photo-grid", optionContent)) {
      const visual = document.createElement("div");
      visual.className = "menu-option-photo-grid";
      visual.innerHTML = `
        <figure><img src="/assets/img/leg-option-care-new.webp" width="600" height="600" loading="lazy" alt="ふくらはぎ・太もものアロマオイルケア"><figcaption>ふくらはぎ・太ももアロマ</figcaption></figure>
        <figure><img src="/assets/img/decollete-care-new.webp" width="600" height="600" loading="lazy" alt="首からデコルテを丁寧にケアする施術"><figcaption>首・デコルテケア</figcaption></figure>`;
      optionGrid.insertAdjacentElement("beforebegin", visual);
    }

    const hpbCard = $$(".cta-card").find(card => $("h3", card)?.textContent.includes("HotPepper"));
    if (hpbCard) {
      hpbCard.href = HPB_COUPON;
      const h3 = $("h3", hpbCard); if (h3) h3.textContent = "HotPepperで空席・クーポンを見る";
      const p = $("p", hpbCard); if (p) p.textContent = "現在の空き状況と掲載クーポンを確認";
    }
    const cards = $("#contact .cta-cards");
    if (cards && !$(".menu-web-cta")) {
      const web = document.createElement("p");
      web.className = "menu-web-cta";
      web.innerHTML = '<a class="btn-secondary" href="/booking.html?lang=ja">公式サイトから予約リクエスト</a>';
      cards.insertAdjacentElement("afterend", web);
    }
  };

  const patchShop = () => {
    $$(".info-chip").filter(el => el.textContent.trim() === "WhatsApp").forEach(el => el.remove());
    replaceTextNodes(document.body, [
      ["ウェブ・WhatsApp・HotPepper Beauty・LINE・お電話", "ウェブ・HotPepper Beauty・LINE・お電話"],
      ["ウェブ、WhatsApp、HotPepper Beauty、LINE、お電話", "ウェブ、HotPepper Beauty、LINE、お電話"]
    ]);
  };

  const FAQ_REPLACEMENTS = [
    ["WhatsApp、HotPepper Beauty、LINE、お電話もご利用いただけます。", "HotPepper Beauty、LINE、お電話もご利用いただけます。"],
    ["ウェブまたはWhatsAppからの送信は予約リクエストです。", "ウェブからの送信は予約リクエストです。"],
    ["ウェブまたはWhatsAppで予約リクエストを送信できます。", "ウェブで予約リクエストを送信できます。"],
    ["ウェブ・WhatsApp", "ウェブ"]
  ];
  const patchFaq = () => {
    replaceTextNodes(document.body, FAQ_REPLACEMENTS);
    replaceLdJson(FAQ_REPLACEMENTS);
  };

  const patchEnglishHome = () => {
    setMeta('meta[name="description"]', "Massage and relaxation salon 1 minute from JR Kamata Station East Exit, Tokyo. Foot reflexology, full-body massage and aroma oil massage. Open 11:00 AM–2:00 AM. Same-day requests and English online booking.");
    setMeta('meta[property="og:description"]', "1 min from JR Kamata Station East Exit. Foot, full-body and aroma oil massage. Open until 2:00 AM. English online booking available.");

    setLink($('[data-track="hero_whatsapp"]'), { text: "LINE booking support", href: LINE, track: "hero_line", external: true });
    setLink($('[data-track="visitor_whatsapp"]'), { text: "Open booking form →", href: "/booking.html?lang=en", track: "visitor_booking" });
    setLink($('[data-track="booking_whatsapp"]'), { text: "Ask on LINE", href: LINE, track: "booking_line", external: true });
    setLink($('[data-track="mobile_whatsapp"]'), { text: "LINE support", href: LINE, track: "mobile_line", external: true });

    const visitorCard = $$(".mini-note").find(el => $("strong", el)?.textContent.trim() === "WhatsApp");
    if (visitorCard) $("strong", visitorCard).textContent = "Booking";

    replaceTextNodes(document.body, [
      ["Open daily 11:00 – 2:00 AM", "Hours 11:00 AM – 2:00 AM · Closed January 1"],
      ["Open every day, 11:00 AM – 2:00 AM.", "Hours: 11:00 AM – 2:00 AM. Closed January 1."],
      ["Use the short English form and choose website booking or WhatsApp. LINE and phone are also available.", "Use the short English form to send a booking request. LINE and phone are also available."],
      ["Submit directly on the website or send the prepared request through WhatsApp.", "Submit directly on the website. We will reply after checking availability."],
      ["English menu, WhatsApp booking and directions for visitors to Tokyo.", "English menu, online booking and directions for visitors to Tokyo."],
      ["Private treatment room", "Private treatment space · curtain entrance"]
    ]);
  };

  const patchZh = () => {
    setMeta('meta[name="description"]', "东京蒲田站东口步行约1分钟。身悠晏提供足底护理、身体放松与香薰精油护理，营业时间11:00至次日凌晨2点，可用中文通过网页发送预约申请。");
    replaceTextNodes(document.body, [
      ["每天营业", "营业时间"],
      ["填写中文预约表单后，可直接通过网页提交，也可通过WhatsApp发送。", "填写中文预约表单后，可直接通过网页提交。"],
      ["网页或WhatsApp", "网页"]
    ]);
    const ribbon = $$(".trust-ribbon > div");
    if (ribbon[0] && ribbon.length >= 4) {
      const last = ribbon[ribbon.length - 1];
      const strong = $("strong", last), span = $("span", last);
      if (strong) strong.textContent = "1/1";
      if (span) span.textContent = "1月1日休息";
    }
  };

  const patchKo = () => {
    setMeta('meta[name="description"]', "도쿄 가마타역 동쪽 출구에서 도보 약 1분. 신유안은 발 케어, 바디 릴랙세이션, 아로마 오일 트리트먼트를 제공하며 영업시간은 11:00부터 다음 날 새벽 2시까지입니다. 한국어 웹 예약 신청이 가능합니다.");
    replaceTextNodes(document.body, [
      ["매일 영업", "영업시간"],
      ["한국어 예약 양식을 작성한 뒤 웹페이지에서 바로 제출하거나 WhatsApp으로 보낼 수 있습니다.", "한국어 예약 양식을 작성한 뒤 웹페이지에서 바로 제출할 수 있습니다."],
      ["웹페이지 또는 WhatsApp", "웹페이지"]
    ]);
    const ribbon = $$(".trust-ribbon > div");
    if (ribbon[0] && ribbon.length >= 4) {
      const last = ribbon[ribbon.length - 1];
      const strong = $("strong", last), span = $("span", last);
      if (strong) strong.textContent = "1/1";
      if (span) span.textContent = "1월 1일 휴무";
    }
  };

  const patchEnglishSeo = () => {
    const replacements = [
      ["English booking and WhatsApp available.", "English online booking available."],
      ["Same-day booking requests available in English and WhatsApp.", "Same-day booking requests available in English."],
      ["with English booking and WhatsApp.", "with English online booking."],
      ["For late bookings, send a quick online or WhatsApp request first", "For late bookings, send a quick online request or LINE message first"],
      ["Use Google Maps or WhatsApp if you are already nearby.", "Use Google Maps or LINE if you are already nearby."],
      ["Use our English booking page or WhatsApp.", "Use our English booking page or LINE."],
      ["online or WhatsApp request", "online request or LINE message"]
    ];
    replaceTextNodes(document.body, replacements);
    const desc = $('meta[name="description"]');
    const og = $('meta[property="og:description"]');
    [desc, og].forEach(meta => {
      if (!meta) return;
      let c = meta.content;
      replacements.forEach(([from, to]) => { c = c.split(from).join(to); });
      c = c.replace(/ and WhatsApp\.?/g, ".").replace(/, with English booking and WhatsApp\.?/g, ", with English online booking.");
      meta.content = c;
    });
    $$(".intent-actions a").forEach(a => {
      if (/WhatsApp/i.test(a.textContent)) setLink(a, { text: "Ask on LINE", href: LINE, external: true });
    });
  };

  if (path === "/") patchJapaneseHome();
  if (path === "/menu.html") patchMenu();
  if (path === "/shop.html") patchShop();
  if (path === "/faq.html") patchFaq();
  if (path === "/en/") patchEnglishHome();
  if (path === "/zh/") patchZh();
  if (path === "/ko/") patchKo();
  if (["/en/foot-massage-kamata.html", "/en/late-night-massage-kamata.html", "/en/haneda-kamata-massage.html"].includes(path)) patchEnglishSeo();
})();

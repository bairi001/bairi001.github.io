(() => {
  "use strict";

  if (!document.querySelector('script[data-site-closeout]')) {
    const siteCloseout = document.createElement("script");
    siteCloseout.src = "/assets/site-closeout.js";
    siteCloseout.async = false;
    siteCloseout.dataset.siteCloseout = "1";
    document.head.append(siteCloseout);
  }

  const STORAGE_KEY = "sya_lang";
  const DISMISSED_KEY = "sya_lang_dismissed";
  const ROUTES = { ja: "/", en: "/en/", zh: "/zh/", ko: "/ko/" };

  const normalizeLanguage = value => {
    const code = String(value || "").toLowerCase();
    if (code === "ja" || code.startsWith("ja-")) return { lang: "ja", traditional: false };
    if (code === "ko" || code.startsWith("ko-")) return { lang: "ko", traditional: false };
    if (["zh-tw", "zh-hk", "zh-mo"].includes(code)) {
      // Reserved for a future /zh-hant/ route. Until then, recommend Simplified Chinese.
      return { lang: "zh", traditional: true };
    }
    if (code === "zh" || code.startsWith("zh-")) return { lang: "zh", traditional: false };
    if (code === "en" || code.startsWith("en-")) return { lang: "en", traditional: false };
    return null;
  };

  const currentLanguage = () => normalizeLanguage(document.documentElement.lang)?.lang || "en";
  const safeGet = key => {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); } catch (_) { /* Navigation still works. */ }
  };
  const track = (name, parameters) => {
    if (typeof window.gtag === "function") window.gtag("event", name, parameters);
  };
  const destinationWithCurrentQuery = lang => {
    const destination = new URL(ROUTES[lang], location.origin);
    destination.search = location.search;
    return destination.href;
  };

  try {
    const utmKey = "sya_first_utm";
    if (!sessionStorage.getItem(utmKey)) {
      const params = new URLSearchParams(location.search);
      const firstTouch = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(name => {
        firstTouch[name] = (params.get(name) || "").slice(0, 120);
      });
      if (Object.values(firstTouch).some(Boolean)) {
        sessionStorage.setItem(utmKey, JSON.stringify(firstTouch));
      }
    }
  } catch (_) {
    // Tracking remains optional when browser storage is unavailable.
  }

  document.querySelectorAll("[data-language-code]").forEach(link => {
    link.addEventListener("click", event => {
      const lang = link.dataset.languageCode;
      if (!ROUTES[lang]) return;
      event.preventDefault();
      safeSet(STORAGE_KEY, lang);
      track("language_switch", { from_language: currentLanguage(), to_language: lang });
      location.href = destinationWithCurrentQuery(lang);
    });
  });

  if (safeGet(STORAGE_KEY) || safeGet(DISMISSED_KEY)) return;
  const detected = (navigator.languages || [navigator.language]).map(normalizeLanguage).find(Boolean);
  if (!detected || detected.lang === currentLanguage()) return;

  const copy = {
    ja: { message: "日本語ページをご覧になりますか？", action: "日本語で見る", close: "言語のおすすめを閉じる" },
    en: { message: "Would you like to view this page in English?", action: "View in English", close: "Close language suggestion" },
    zh: detected.traditional
      ? { message: "要查看中文页面（简体）吗？", action: "查看中文页面（简体）", close: "关闭语言建议" }
      : { message: "要查看中文页面吗？", action: "查看中文页面", close: "关闭语言建议" },
    ko: { message: "한국어 페이지를 보시겠어요?", action: "한국어로 보기", close: "언어 추천 닫기" }
  }[detected.lang];

  const banner = document.createElement("aside");
  banner.className = "language-recommendation";
  banner.setAttribute("aria-label", copy.message);
  banner.innerHTML = `<span>${copy.message}</span><a href="${ROUTES[detected.lang]}">${copy.action}</a><button type="button" aria-label="${copy.close}">×</button>`;

  banner.querySelector("a").addEventListener("click", event => {
    event.preventDefault();
    safeSet(STORAGE_KEY, detected.lang);
    track("language_switch", {
      from_language: currentLanguage(),
      to_language: detected.lang,
      source: "recommendation"
    });
    location.href = destinationWithCurrentQuery(detected.lang);
  });
  banner.querySelector("button").addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    safeSet(DISMISSED_KEY, "1");
    document.body.classList.remove("has-language-recommendation");
    document.body.style.removeProperty("--language-banner-height");
    banner.remove();
  });
  document.body.prepend(banner);
  document.body.classList.add("has-language-recommendation");
  const syncBannerHeight = () => {
    document.body.style.setProperty("--language-banner-height", `${banner.offsetHeight}px`);
  };
  syncBannerHeight();
  if ("ResizeObserver" in window) new ResizeObserver(syncBannerHeight).observe(banner);
})();
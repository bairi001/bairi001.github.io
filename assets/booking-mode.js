(() => {
  "use strict";

  if (typeof I18N !== "object" || typeof $ !== "function") return;

  // Temporary channel switch. Set to true after WhatsApp Business access is restored.
  const WHATSAPP_CHANNEL_ENABLED = false;

  Object.assign(I18N.en, {
    formLead: WHATSAPP_CHANNEL_ENABLED
      ? "Choose your course and preferred time, then send your request on this website or via WhatsApp. We will check availability and reply to confirm your appointment."
      : "Choose your course and preferred time, then send your request on this website. We will check availability and reply to confirm your appointment.",
    channelTitle: "Choose how to send your booking request",
    hoursHint: "Open daily 11:00 AM–2:00 AM. Last booking request 1:00 AM. An ¥800 late-night fee applies when you arrive at or after 11:00 PM. All times are JST."
  });
  Object.assign(I18N.zh, {
    formLead: WHATSAPP_CHANNEL_ENABLED
      ? "选择套餐和希望时间后，可通过本网页或WhatsApp发送预约申请。收到店铺回复后，预约才正式成立。"
      : "选择套餐和希望时间后，可通过本网页发送预约申请。收到店铺回复后，预约才正式成立。",
    channelTitle: "选择预约申请的发送方式",
    hoursHint: "每日11:00～次日2:00营业，最晚预约申请为次日1:00。若到店时间为23:00或之后，加收800日元深夜费用。所有时间均为日本标准时间（JST）。"
  });
  Object.assign(I18N.ja, {
    formLead: WHATSAPP_CHANNEL_ENABLED
      ? "コースと希望日時を入力し、ウェブまたはWhatsAppから予約リクエストを送信できます。空き状況を確認後、当店からの返信をもって予約確定となります。"
      : "コースと希望日時を入力し、ウェブから予約リクエストを送信できます。空き状況を確認後、当店からの返信をもって予約確定となります。",
    channelTitle: "予約リクエストの送信方法を選ぶ",
    hoursHint: "毎日11:00〜翌2:00営業。最終予約リクエストは翌1:00です。23:00以降にご来店の場合、深夜料金800円。すべて日本標準時（JST）です。"
  });
  Object.assign(I18N.ko, {
    formLead: WHATSAPP_CHANNEL_ENABLED
      ? "코스와 희망 시간을 입력한 뒤 웹페이지 또는 WhatsApp으로 예약 신청을 보낼 수 있습니다. 매장의 답변을 받은 뒤 예약이 확정됩니다."
      : "코스와 희망 시간을 입력한 뒤 웹페이지에서 예약 신청을 보낼 수 있습니다. 매장의 답변을 받은 뒤 예약이 확정됩니다.",
    channelTitle: "예약 신청을 보낼 방법을 선택하세요",
    hoursHint: "매일 11:00~다음 날 2:00 영업합니다. 마지막 예약 신청은 다음 날 1:00입니다. 23:00 이후 도착 시 심야 요금 800엔이 추가됩니다. 모든 시간은 일본 표준시(JST)입니다."
  });

  let bookingMode = WEB_FORM_ENABLED ? "web" : "whatsapp";
  const previewLabel = document.querySelector('[data-i18n="preview"]');
  const hideRedundantHpbBanner = () => {
    const banner = $("jaHpbBanner");
    if (banner) banner.hidden = true;
  };

  const setBookingMode = (mode, { focus = false } = {}) => {
    if (mode === "web" && WEB_FORM_ENABLED) bookingMode = "web";
    else if (mode === "whatsapp" && WHATSAPP_CHANNEL_ENABLED) bookingMode = "whatsapp";
    else bookingMode = WEB_FORM_ENABLED ? "web" : "whatsapp";
    const webMode = bookingMode === "web";

    $("webFields").hidden = !webMode;
    $("email").required = webMode;
    $("privacyConsent").required = webMode;
    if (previewLabel) previewLabel.hidden = webMode;
    $("preview").hidden = webMode;
    $("submitButton").hidden = webMode;
    $("webSubmitMount").hidden = !webMode;
    $("submitStatus").textContent = "";

    document.querySelectorAll("[data-channel]").forEach(link => {
      const active = link.dataset.channel === bookingMode;
      link.classList.toggle("active", active);
      link.classList.toggle("primary", active);
      if (link.dataset.channel === "web" || link.dataset.channel === "whatsapp") {
        link.setAttribute("aria-current", active ? "true" : "false");
      }
    });

    updatePreview();
    if (focus) $(webMode ? "email" : "course").focus({ preventScroll: true });
  };

  const renderChannels = () => {
    const definitions = {
      web: { label: I18N[lang].channelWeb, href: "#bookingForm", mode: "web" },
      whatsapp: { label: I18N[lang].channelWhatsApp, href: "#bookingForm", mode: "whatsapp" },
      line: { label: I18N[lang].channelLine, href: "https://page.line.me/017hlpiu", external: true },
      hpb: { label: I18N[lang].channelHpb, href: "https://beauty.hotpepper.jp/kr/slnH000397723/", external: true },
      phone: { label: I18N[lang].channelPhone, href: "tel:0368746808" }
    };
    const order = ["web", "whatsapp", "line", "hpb", "phone"].filter(key => {
      if (key === "web" && !WEB_FORM_ENABLED) return false;
      if (key === "whatsapp" && !WHATSAPP_CHANNEL_ENABLED) return false;
      return true;
    });

    $("channelActions").replaceChildren(...order.map(key => {
      const item = definitions[key];
      const link = document.createElement("a");
      link.className = "channel-button";
      link.href = item.href;
      link.textContent = item.label;
      link.dataset.channel = key;
      if (item.external) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      link.addEventListener("click", event => {
        trackEvent("booking_channel_click", { language: lang, channel: key });
        if (!item.mode) return;
        event.preventDefault();
        setBookingMode(item.mode, { focus: false });
        $("bookingForm").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return link;
    }));

    if (WEB_FORM_ENABLED && !$("webSubmitButton")) {
      const button = document.createElement("button");
      button.className = "submit-button web-submit";
      button.id = "webSubmitButton";
      button.type = "button";
      button.textContent = I18N[lang].webSubmit;
      button.addEventListener("click", submitWebForm);
      $("webSubmitMount").append(button);
    } else if ($("webSubmitButton")) {
      $("webSubmitButton").textContent = I18N[lang].webSubmit;
    }

    setBookingMode(bookingMode);
    hideRedundantHpbBanner();
  };

  buildChannels = renderChannels;

  const originalApplyLanguage = applyLanguage;
  applyLanguage = function(next, options = {}) {
    originalApplyLanguage(next, options);
    renderChannels();
    hideRedundantHpbBanner();
  };

  const style = document.createElement("style");
  style.textContent = `
    .channel-button.active{background:var(--sea-deep);border-color:var(--sea-deep);color:#fff}
    .channel-button.active:hover{background:var(--sea);border-color:var(--sea);color:#fff}
    .ja-hpb-banner{display:none!important}
    [hidden]{display:none!important}
  `;
  document.head.append(style);

  $("bookingForm").addEventListener("submit", event => {
    if (bookingMode !== "web") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitWebForm();
  }, true);

  applyLanguage(lang);
})();
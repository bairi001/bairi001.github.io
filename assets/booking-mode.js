(() => {
  "use strict";

  if (typeof I18N !== "object" || typeof $ !== "function") return;

  // WhatsApp Business access was restored on 2026-08-10.
  const WHATSAPP_CHANNEL_ENABLED = true;

  Object.assign(I18N.en, {
    formLead: WHATSAPP_CHANNEL_ENABLED
      ? "Choose your course and preferred time, then send your request on this website or via WhatsApp. We will check availability and reply to confirm your appointment."
      : "Choose your course and preferred time, then send your request on this website. We will check availability and reply to confirm your appointment.",
    channelTitle: "Choose how to send your booking request",
    hoursHint: "Hours: 11:00 AM–2:00 AM (closed January 1). Last booking request 1:00 AM. An ¥800 late-night fee applies when you arrive at or after 11:00 PM. All times are JST.",
    trustHours: "Hours",
    trustHoursSub: "11:00 AM–2:00 AM · Closed January 1",
    trustSpace: "Private treatment space · curtain entrance",
    trustSpaceSub: "A calm environment for relaxation"
  });
  Object.assign(I18N.zh, {
    formLead: WHATSAPP_CHANNEL_ENABLED
      ? "选择套餐和希望时间后，可通过本网页或WhatsApp发送预约申请。收到店铺回复后，预约才正式成立。"
      : "选择套餐和希望时间后，可通过本网页发送预约申请。收到店铺回复后，预约才正式成立。",
    channelTitle: "选择预约申请的发送方式",
    hoursHint: "营业时间11:00～次日2:00（1月1日休息），最晚预约申请为次日1:00。若到店时间为23:00或之后，加收800日元深夜费用。所有时间均为日本标准时间（JST）。",
    trustHours: "营业时间",
    trustHoursSub: "11:00－次日2:00 · 1月1日休息",
    trustSpace: "相对独立的护理空间 · 入口帘隔断",
    trustSpaceSub: "安静舒适的放松环境"
  });
  Object.assign(I18N.ja, {
    formLead: WHATSAPP_CHANNEL_ENABLED
      ? "コースと希望日時を入力し、ウェブまたはWhatsAppから予約リクエストを送信できます。空き状況を確認後、当店からの返信をもって予約確定となります。"
      : "コースと希望日時を入力し、ウェブから予約リクエストを送信できます。空き状況を確認後、当店からの返信をもって予約確定となります。",
    channelTitle: "予約リクエストの送信方法を選ぶ",
    hoursHint: "営業時間11:00〜翌2:00（1月1日休み）。最終予約リクエストは翌1:00です。23:00以降にご来店の場合、深夜料金800円。すべて日本標準時（JST）です。",
    trustHours: "営業時間",
    trustHoursSub: "11:00〜翌2:00 · 1月1日休み",
    trustSpace: "落ち着ける施術スペース · 入口カーテン",
    trustSpaceSub: "ゆっくり過ごせるリラクゼーション空間"
  });
  Object.assign(I18N.ko, {
    formLead: WHATSAPP_CHANNEL_ENABLED
      ? "코스와 희망 시간을 입력한 뒤 웹페이지 또는 WhatsApp으로 예약 신청을 보낼 수 있습니다. 매장의 답변을 받은 뒤 예약이 확정됩니다."
      : "코스와 희망 시간을 입력한 뒤 웹페이지에서 예약 신청을 보낼 수 있습니다. 매장의 답변을 받은 뒤 예약이 확정됩니다.",
    channelTitle: "예약 신청을 보낼 방법을 선택하세요",
    hoursHint: "영업시간은 11:00~다음 날 2:00이며 1월 1일은 휴무입니다. 마지막 예약 신청은 다음 날 1:00입니다. 23:00 이후 도착 시 심야 요금 800엔이 추가됩니다. 모든 시간은 일본 표준시(JST)입니다.",
    trustHours: "영업시간",
    trustHoursSub: "11:00~다음 날 2:00 · 1월 1일 휴무",
    trustSpace: "분리된 관리 공간 · 커튼 출입구",
    trustSpaceSub: "편안하게 쉴 수 있는 공간"
  });

  const requestedMode = new URLSearchParams(location.search).get("mode");
  let bookingMode = requestedMode === "whatsapp" && WHATSAPP_CHANNEL_ENABLED
    ? "whatsapp"
    : (WEB_FORM_ENABLED ? "web" : "whatsapp");
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

  if (!WHATSAPP_CHANNEL_ENABLED && typeof showWhatsAppStatus === "function") {
    showWhatsAppStatus = function() {
      const copy = {
        en: { lead: "Website submission could not be completed. Please use LINE or call us.", line: "Contact us on LINE", phone: "Call 03-6874-6808" },
        zh: { lead: "网页提交未完成，请改用LINE或电话联系我们。", line: "通过LINE联系我们", phone: "致电 03-6874-6808" },
        ja: { lead: "ウェブ送信を完了できませんでした。LINEまたはお電話をご利用ください。", line: "LINEで連絡する", phone: "03-6874-6808 に電話する" },
        ko: { lead: "웹 전송을 완료하지 못했습니다. LINE 또는 전화로 문의해 주세요.", line: "LINE으로 문의", phone: "03-6874-6808로 전화" }
      }[lang] || null;
      if (!copy) return;
      const status = $("submitStatus");
      status.replaceChildren();
      const lead = document.createElement("strong");
      lead.textContent = copy.lead;
      const line = document.createElement("a");
      line.href = "https://page.line.me/017hlpiu";
      line.target = "_blank";
      line.rel = "noopener";
      line.textContent = copy.line;
      const phone = document.createElement("a");
      phone.href = "tel:0368746808";
      phone.textContent = copy.phone;
      status.append(lead, document.createElement("br"), line, document.createElement("br"), phone);
    };
  }

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
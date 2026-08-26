(() => {
  "use strict";

  if (typeof I18N !== "object" || typeof $ !== "function") return;

  // Booking Simple Recovery V3: keep customer choices visible and remove
  // predictive filtering. The booking page collects intent; the salon confirms it.
  const WHATSAPP_CHANNEL_ENABLED = true;
  const params = new URLSearchParams(location.search);
  const safeToken = value => String(value || "").replace(/[^a-z0-9_./-]/gi, "").slice(0, 80);
  const courseExists = key => allCourses().some(item => item.key === key);
  const requestedCourse = courseExists(params.get("course")) ? params.get("course") : "";
  const bookingContext = Object.freeze({
    service: safeToken(params.get("service")) || "general",
    originPage: safeToken(params.get("origin")) || "direct",
    originCta: safeToken(params.get("cta")) || "unspecified"
  });

  Object.assign(I18N.en, {
    formLead: "Choose any course and preferred time, then send your request on this website or via WhatsApp. We will check availability and reply to confirm your appointment.",
    channelTitle: "Choose how to send your booking request",
    hoursHint: "Hours: 11:00 AM–2:00 AM (closed January 1). An ¥800 late-night fee applies only when you actually arrive at or after 11:00 PM. All times are JST.",
    trustHours: "Hours",
    trustHoursSub: "11:00 AM–2:00 AM · Closed January 1",
    trustSpace: "Private treatment spaces",
    trustSpaceSub: "Three walls with a curtain entrance"
  });
  Object.assign(I18N.zh, {
    formLead: "可自由选择全部套餐和希望时间，再通过本网页或WhatsApp发送预约申请。收到店铺回复后，预约才正式成立。",
    channelTitle: "选择预约申请的发送方式",
    hoursHint: "营业时间11:00～次日2:00（1月1日休息）。仅在实际23:00或之后到店时加收800日元深夜费用。所有时间均为日本标准时间（JST）。",
    trustHours: "营业时间",
    trustHoursSub: "11:00－次日2:00 · 1月1日休息",
    trustSpace: "独立护理空间",
    trustSpaceSub: "三面隔断墙，入口使用帘子"
  });
  Object.assign(I18N.ja, {
    formLead: "すべてのコースから自由に選び、ご希望日時を入力して、ウェブまたはWhatsAppから予約リクエストを送信できます。空き状況を確認後、当店からの返信をもって予約確定となります。",
    channelTitle: "予約リクエストの送信方法を選ぶ",
    hoursHint: "営業時間11:00〜翌2:00（1月1日休み）。23:00以降に実際にご来店の場合のみ深夜料金800円。すべて日本標準時（JST）です。",
    trustHours: "営業時間",
    trustHoursSub: "11:00〜翌2:00 · 1月1日休み",
    trustSpace: "個室仕様の施術スペース",
    trustSpaceSub: "三方を壁で仕切り、入口はカーテンです。"
  });
  Object.assign(I18N.ko, {
    formLead: "모든 코스에서 자유롭게 선택하고 희망 시간을 입력한 뒤 웹페이지 또는 WhatsApp으로 예약 신청을 보낼 수 있습니다. 매장의 답변을 받은 뒤 예약이 확정됩니다.",
    channelTitle: "예약 신청을 보낼 방법을 선택하세요",
    hoursHint: "영업시간은 11:00~다음 날 2:00이며 1월 1일은 휴무입니다. 실제 23시 이후 도착 시에만 심야 요금 800엔이 추가됩니다. 모든 시간은 일본 표준시(JST)입니다.",
    trustHours: "영업시간",
    trustHoursSub: "11:00~다음 날 2:00 · 1월 1일 휴무",
    trustSpace: "독립형 관리 공간",
    trustSpaceSub: "세 면이 벽으로 구분되어 있고 입구는 커튼입니다."
  });

  const requestedMode = params.get("mode");
  let bookingMode = requestedMode === "whatsapp" && WHATSAPP_CHANNEL_ENABLED
    ? "whatsapp"
    : (WEB_FORM_ENABLED ? "web" : "whatsapp");
  let requestedCourseApplied = false;
  let formStartSent = false;
  const previewLabel = document.querySelector('[data-i18n="preview"]');
  const originalTrackEvent = trackEvent;
  const originalWebPayload = webPayload;

  const tokyoParts = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    const get = type => parts.find(part => part.type === type)?.value || "00";
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      minutes: Number(get("hour")) * 60 + Number(get("minute"))
    };
  };
  const roundUp = (value, step) => Math.ceil(value / step) * step;
  const currentDayEarlyTimes = () => [
    { minutes: 0, label: "00:00" },
    { minutes: 30, label: "00:30" },
    { minutes: 60, label: "01:00" }
  ];
  const baseTimes = () => {
    const times = [];
    for (let hour = 11; hour <= 23; hour += 1) {
      for (const minute of [0, 30]) {
        times.push({ minutes: hour * 60 + minute, label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` });
      }
    }
    times.push(
      { minutes: 1440, label: "00:00 (next day)" },
      { minutes: 1470, label: "00:30 (next day)" },
      { minutes: 1500, label: "01:00 (next day)" }
    );
    return times;
  };
  const availableTimesFor = dateValue => {
    const now = tokyoParts();
    if (!dateValue) return baseTimes();
    if (dateValue < now.date) return [];
    if (dateValue > now.date) return baseTimes();
    const earliest = roundUp(now.minutes + 1, 30);
    if (now.minutes < 120) {
      const currentNight = currentDayEarlyTimes().filter(item => item.minutes >= earliest);
      return [...currentNight, ...baseTimes()];
    }
    return baseTimes().filter(item => item.minutes >= earliest);
  };
  const fillTimeSelect = (select, dateValue, placeholder) => {
    if (!select) return;
    const current = select.value;
    const available = availableTimesFor(dateValue);
    select.innerHTML = `<option value="">${placeholder}</option>` + available.map(item =>
      `<option value="${item.minutes}|${item.label}">${item.label}</option>`
    ).join("");
    select.disabled = false;
    if (current && [...select.options].some(option => option.value === current)) select.value = current;
  };

  buildTimes = function() {
    fillTimeSelect($("time"), $("date")?.value, I18N[lang].selectTime);
  };

  buildCourses = function() {
    const course = $("course");
    if (!course) return;
    const current = course.value;
    course.innerHTML = `<option value="">${I18N[lang].selectCourse}</option>` + COURSE_GROUPS.map(group =>
      `<optgroup label="${I18N[lang].groups[group.key]}">${group.items.map(item => `<option value="${item.key}">${item[lang]} — ${money(item.price)}</option>`).join("")}</optgroup>`
    ).join("");
    const preferred = (!requestedCourseApplied && requestedCourse) || current;
    if (preferred && [...course.options].some(option => option.value === preferred)) {
      course.value = preferred;
      if (preferred === requestedCourse) requestedCourseApplied = true;
    }
  };

  const appointmentDateTime = () => {
    const date = $("date")?.value;
    const raw = $("time")?.value;
    if (!date || !raw) return null;
    const label = raw.split("|")[1] || "";
    const match = label.match(/^(\d{2}):(\d{2})/);
    if (!match) return null;
    const start = new Date(`${date}T${match[1]}:${match[2]}:00+09:00`);
    if (label.includes("next day")) start.setTime(start.getTime() + 86400000);
    return start;
  };
  const leadTimeBucket = () => {
    const start = appointmentDateTime();
    if (!start) return "unknown";
    const hours = (start.getTime() - Date.now()) / 3600000;
    if (hours < 1) return "under_1h";
    if (hours < 3) return "1_to_3h";
    if (hours < 12) return "3_to_12h";
    if (hours < 24) return "12_to_24h";
    if (hours < 72) return "1_to_3d";
    return "over_3d";
  };
  const requestedTimeBucket = () => {
    const value = Number($("time")?.value?.split("|")[0]);
    if (!Number.isFinite(value)) return "unknown";
    const normalized = value % 1440;
    if (normalized < 120 || normalized >= 1380) return "late_night";
    if (normalized < 840) return "daytime";
    if (normalized < 1080) return "afternoon";
    return "evening";
  };
  const analyticsContext = () => ({
    language: lang,
    service_context: bookingContext.service,
    course_id: selectedCourse()?.key || "none",
    origin_page: bookingContext.originPage,
    origin_cta: bookingContext.originCta,
    guests_bucket: String(guests || "1"),
    lead_time_bucket: leadTimeBucket(),
    requested_time_bucket: requestedTimeBucket()
  });

  trackEvent = function(name, parameters = {}) {
    const eventParameters = { ...analyticsContext(), ...parameters };
    if (name === "booking_form_start") {
      if (formStartSent) return;
      formStartSent = true;
      eventParameters.channel = bookingMode;
    }
    if (name === "booking_form_submit_success" && eventParameters.duplicate === true) {
      originalTrackEvent("booking_form_duplicate", eventParameters);
      return;
    }
    originalTrackEvent(name, eventParameters);
  };

  webPayload = function() {
    const payload = originalWebPayload();
    const attribution = `origin: ${bookingContext.originPage} / cta: ${bookingContext.originCta}`;
    payload.note = [payload.note, attribution].filter(Boolean).join("\n").slice(0, 300);
    return payload;
  };

  const hideLegacyBanner = () => {
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
      phone: { label: I18N[lang].channelPhone, href: "tel:0368746808" }
    };
    const order = ["web", "whatsapp", "line", "phone"].filter(key => {
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
        trackEvent("booking_channel_click", { channel: key });
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
    hideLegacyBanner();
  };

  buildChannels = renderChannels;

  const originalApplyLanguage = applyLanguage;
  applyLanguage = function(next, options = {}) {
    originalApplyLanguage(next, options);
    buildCourses();
    buildTimes();
    renderChannels();
    hideLegacyBanner();
    updatePreview();
  };

  if (!WHATSAPP_CHANNEL_ENABLED && typeof showWhatsAppStatus === "function") {
    showWhatsAppStatus = function() {
      const copy = {
        en: { lead: "Website submission could not be completed. Please use LINE or call us.", line: "Contact us on LINE", phone: "Call 03-6874-6808" },
        zh: { lead: "网页提交未完成，请改用LINE或电话联系我们。", line: "通过LINE联系我们", phone: "致电03-6874-6808" },
        ja: { lead: "ウェブ送信を完了できませんでした。LINEまたはお電話をご利用ください。", line: "LINEで連絡する", phone: "03-6874-6808に電話する" },
        ko: { lead: "웹 전송을 완료하지 못했습니다. LINE 또는 전화로 문의해 주세요.", line: "LINE으로 문의", phone: "03-6874-6808 전화" }
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
    .channel-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
    .channel-button{width:100%;min-width:0}
    .channel-button.active{background:var(--sea-deep);border-color:var(--sea-deep);color:#fff}
    .channel-button.active:hover{background:var(--sea);border-color:var(--sea);color:#fff}
    .ja-hpb-banner{display:none!important}
    [hidden]{display:none!important}
    @media(max-width:640px){.channel-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.append(style);

  $("date")?.addEventListener("change", () => {
    buildTimes();
    updatePreview();
  });
  $("course")?.addEventListener("change", updatePreview);
  $("bookingForm").addEventListener("submit", event => {
    if (bookingMode !== "web") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitWebForm();
  }, true);

  applyLanguage(lang);
  updatePreview();
})();
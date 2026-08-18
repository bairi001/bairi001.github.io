(() => {
  "use strict";

  if (typeof I18N !== "object" || typeof $ !== "function") return;

  // Smart Booking Conversion V2. These operational defaults are intentionally
  // conservative: same-day web requests need 120 minutes of lead time, and
  // requests opened before 10:00 JST cannot select a time earlier than 12:00.
  const BOOKING_V2 = Object.freeze({
    minAdvanceMinutes: 120,
    quietHoursEndMinutes: 10 * 60,
    quietHoursEarliestMinutes: 12 * 60,
    slotMinutes: 30,
    hpbUrl: "https://beauty.hotpepper.jp/kr/slnH000397723/",
    phoneUrl: "tel:0368746808"
  });
  const WHATSAPP_CHANNEL_ENABLED = true;
  const params = new URLSearchParams(location.search);
  const safeToken = value => String(value || "").replace(/[^a-z0-9_./-]/gi, "").slice(0, 80);
  const courseExists = key => allCourses().some(item => item.key === key);
  const groupForCourse = key => COURSE_GROUPS.find(group => group.items.some(item => item.key === key))?.key || "";
  const filterableServices = new Set(["body", "foot", "aroma"]);
  const pathServiceMap = {
    "/bodycare-kamata.html": "body",
    "/aroma-oil-kamata.html": "aroma",
    "/ashitsubo-fukurahagi.html": "foot",
    "/headspa-kamata.html": "head",
    "/kamata-late-night.html": "late",
    "/en/foot-massage-kamata.html": "foot",
    "/en/late-night-massage-kamata.html": "late"
  };

  let referrerPath = "";
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer?.origin === location.origin) referrerPath = referrer.pathname;
  } catch (_) {}

  const requestedCourse = courseExists(params.get("course")) ? params.get("course") : "";
  const requestedService = safeToken(params.get("service"));
  const inferredService = filterableServices.has(requestedService)
    ? requestedService
    : (groupForCourse(requestedCourse) || pathServiceMap[referrerPath] || requestedService || "");
  const bookingContext = Object.freeze({
    service: inferredService,
    course: requestedCourse,
    originPage: safeToken(params.get("origin")) || safeToken(referrerPath) || "direct",
    originCta: safeToken(params.get("cta")) || "unspecified"
  });

  const COPY = {
    en: {
      channelTitle: "Recommended booking methods",
      otherChannels: "Other contact options",
      showAll: "Show all courses",
      showRelevant: "Show related courses only",
      alternativeSummary: "If your first choice is unavailable (optional)",
      secondDate: "Second preferred date",
      secondTime: "Second preferred time",
      flexibility: "Time flexibility",
      flexExact: "Only the selected time",
      flex30: "Up to 30 minutes earlier or later",
      flex60: "Up to 60 minutes earlier or later",
      flexAny: "Any available time that day",
      sameStart: "For multiple guests, everyone must start at the same time",
      noTimesOption: "No same-day web request times remain",
      earliest: time => `Earliest website request time today: ${time}.`,
      noTimes: "No suitable same-day website request times remain.",
      urgent: "For an earlier same-day appointment, check real-time availability on HotPepper or call us.",
      hpb: "Check HotPepper availability",
      phone: "Call 03-6874-6808",
      context: {
        body: "Body care courses are shown first.",
        foot: "Foot reflexology courses are shown first.",
        aroma: "Aroma oil courses are shown first.",
        head: "You came from the head care page.",
        late: "You came from the late-night guide."
      },
      story: {
        body: ["Body care booking", "Choose a body care course, then select your preferred date and time."],
        foot: ["Foot reflexology booking", "Choose a foot reflexology course, then select your preferred date and time."],
        aroma: ["Aroma oil booking", "Choose an aroma oil course, then select your preferred date and time."],
        head: ["Head care booking request", "Select a main course and add head care from the optional add-ons."],
        late: ["Late-night booking request", "Select a valid time. The ¥800 late-night fee applies only when you arrive at or after 11:00 PM."]
      },
      labels: { second: "Second choice", flexibility: "Flexibility", simultaneous: "Same start", yes: "Required", no: "Not required" }
    },
    ja: {
      channelTitle: "おすすめの予約方法",
      otherChannels: "その他の連絡方法",
      showAll: "すべてのコースを見る",
      showRelevant: "関連コースだけ表示",
      alternativeSummary: "第1希望が満席の場合（任意）",
      secondDate: "第2希望日",
      secondTime: "第2希望時間",
      flexibility: "時間の調整幅",
      flexExact: "選択した時間のみ",
      flex30: "前後30分まで可",
      flex60: "前後60分まで可",
      flexAny: "当日なら何時でも可",
      sameStart: "複数名の場合、全員同時スタートを希望する",
      noTimesOption: "本日のウェブ受付可能時間は終了しました",
      earliest: time => `本日のウェブ予約リクエストは、最短 ${time} から選べます。`,
      noTimes: "本日のウェブ予約リクエストで選べる時間は終了しました。",
      urgent: "より早い当日予約は、HotPepperのリアルタイム空席または電話でご確認ください。",
      hpb: "HotPepperで空席を見る",
      phone: "03-6874-6808に電話",
      context: {
        body: "整体ボディケアのコースを優先表示しています。",
        foot: "足裏・足つぼのコースを優先表示しています。",
        aroma: "アロマオイルのコースを優先表示しています。",
        head: "ヘッドケア案内ページから移動しました。",
        late: "深夜利用ガイドから移動しました。"
      },
      story: {
        body: ["整体ボディケアの予約リクエスト", "コースを選び、ご希望の日付と時間を入力してください。"],
        foot: ["足裏・足つぼの予約リクエスト", "足裏コースを選び、ご希望の日付と時間を入力してください。"],
        aroma: ["アロマオイルの予約リクエスト", "アロマコースを選び、ご希望の日付と時間を入力してください。"],
        head: ["ヘッドケアの予約リクエスト", "基本コースを選び、オプションからヘッドケアを追加できます。"],
        late: ["深夜時間帯の予約リクエスト", "有効な時間を選択してください。深夜料金800円は23時以降の実際のご来店時のみ加算されます。"]
      },
      labels: { second: "第2希望", flexibility: "時間調整", simultaneous: "同時開始", yes: "希望する", no: "希望しない" }
    },
    zh: {
      channelTitle: "推荐预约方式",
      otherChannels: "其他联系方式",
      showAll: "查看全部套餐",
      showRelevant: "只看相关套餐",
      alternativeSummary: "第一希望无空位时（选填）",
      secondDate: "第二希望日期",
      secondTime: "第二希望时间",
      flexibility: "时间可调整范围",
      flexExact: "仅限所选时间",
      flex30: "前后30分钟均可",
      flex60: "前后60分钟均可",
      flexAny: "当天任何有空时间均可",
      sameStart: "多人预约时，所有人必须同时开始",
      noTimesOption: "今天已无可提交的网页预约时间",
      earliest: time => `今天网页预约申请最早可选择 ${time}。`,
      noTimes: "今天已没有适合提交网页预约申请的时间。",
      urgent: "需要更早的当天预约，请查看HotPepper实时空位或致电店铺。",
      hpb: "查看HotPepper空位",
      phone: "致电03-6874-6808",
      context: {
        body: "已优先显示身体放松套餐。",
        foot: "已优先显示足底护理套餐。",
        aroma: "已优先显示精油护理套餐。",
        head: "您从头部护理页面进入预约。",
        late: "您从深夜营业指南进入预约。"
      },
      story: {
        body: ["身体放松预约申请", "选择套餐后，再选择希望日期和时间。"],
        foot: ["足底护理预约申请", "选择足底套餐后，再选择希望日期和时间。"],
        aroma: ["精油护理预约申请", "选择精油套餐后，再选择希望日期和时间。"],
        head: ["头部护理预约申请", "请选择基础套餐，并可在附加项目中加入头部护理。"],
        late: ["深夜时段预约申请", "请选择有效时间。仅在实际23点或之后到店时加收800日元深夜费。"]
      },
      labels: { second: "第二希望", flexibility: "时间调整", simultaneous: "同时开始", yes: "必须", no: "不必须" }
    },
    ko: {
      channelTitle: "추천 예약 방법",
      otherChannels: "기타 연락 방법",
      showAll: "모든 코스 보기",
      showRelevant: "관련 코스만 보기",
      alternativeSummary: "첫 번째 희망 시간이 불가한 경우(선택)",
      secondDate: "두 번째 희망 날짜",
      secondTime: "두 번째 희망 시간",
      flexibility: "시간 조정 범위",
      flexExact: "선택한 시간만 가능",
      flex30: "앞뒤 30분 가능",
      flex60: "앞뒤 60분 가능",
      flexAny: "당일 가능한 시간 모두 가능",
      sameStart: "여러 명 예약 시 전원이 동시에 시작해야 함",
      noTimesOption: "오늘 웹 예약 신청 가능 시간이 종료되었습니다",
      earliest: time => `오늘 웹 예약 신청은 가장 빠른 ${time}부터 선택할 수 있습니다.`,
      noTimes: "오늘 웹 예약 신청으로 선택할 수 있는 시간이 종료되었습니다.",
      urgent: "더 이른 당일 예약은 HotPepper 실시간 공석 또는 전화로 확인해 주세요.",
      hpb: "HotPepper 공석 확인",
      phone: "03-6874-6808 전화",
      context: {
        body: "바디 케어 코스를 우선 표시합니다.",
        foot: "발 케어 코스를 우선 표시합니다.",
        aroma: "아로마 오일 코스를 우선 표시합니다.",
        head: "헤드 케어 페이지에서 이동했습니다.",
        late: "심야 이용 안내에서 이동했습니다."
      },
      story: {
        body: ["바디 케어 예약 신청", "코스를 선택한 뒤 희망 날짜와 시간을 입력해 주세요."],
        foot: ["발 케어 예약 신청", "발 케어 코스를 선택한 뒤 희망 날짜와 시간을 입력해 주세요."],
        aroma: ["아로마 오일 예약 신청", "아로마 코스를 선택한 뒤 희망 날짜와 시간을 입력해 주세요."],
        head: ["헤드 케어 예약 신청", "기본 코스를 선택하고 추가 옵션에서 헤드 케어를 선택할 수 있습니다."],
        late: ["심야 시간대 예약 신청", "유효한 시간을 선택해 주세요. 심야 요금 800엔은 실제 23시 이후 도착 시에만 추가됩니다."]
      },
      labels: { second: "두 번째 희망", flexibility: "시간 조정", simultaneous: "동시 시작", yes: "필수", no: "필수 아님" }
    }
  };

  Object.assign(I18N.en, {
    formLead: "Choose a course and preferred time, then send your request on this website or via WhatsApp. We will check availability and reply to confirm your appointment.",
    channelTitle: COPY.en.channelTitle,
    hoursHint: "Hours: 11:00 AM–2:00 AM (closed January 1). An ¥800 late-night fee applies only when you actually arrive at or after 11:00 PM. All times are JST.",
    trustHours: "Hours",
    trustHoursSub: "11:00 AM–2:00 AM · Closed January 1",
    trustSpace: "Private treatment spaces",
    trustSpaceSub: "Three walls with a curtain entrance"
  });
  Object.assign(I18N.ja, {
    formLead: "コースと希望日時を入力し、ウェブまたはWhatsAppから予約リクエストを送信できます。空き状況を確認後、当店からの返信をもって予約確定となります。",
    channelTitle: COPY.ja.channelTitle,
    hoursHint: "営業時間11:00〜翌2:00（1月1日休み）。23:00以降に実際にご来店の場合のみ深夜料金800円。すべて日本標準時（JST）です。",
    trustHours: "営業時間",
    trustHoursSub: "11:00〜翌2:00 · 1月1日休み",
    trustSpace: "個室仕様の施術スペース",
    trustSpaceSub: "三方を壁で仕切り、入口はカーテンです。"
  });
  Object.assign(I18N.zh, {
    formLead: "选择套餐和希望时间后，可通过本网页或WhatsApp发送预约申请。收到店铺回复后，预约才正式成立。",
    channelTitle: COPY.zh.channelTitle,
    hoursHint: "营业时间11:00～次日2:00（1月1日休息）。仅在实际23:00或之后到店时加收800日元深夜费用。所有时间均为日本标准时间（JST）。",
    trustHours: "营业时间",
    trustHoursSub: "11:00－次日2:00 · 1月1日休息",
    trustSpace: "独立护理空间",
    trustSpaceSub: "三面隔断墙，入口使用帘子"
  });
  Object.assign(I18N.ko, {
    formLead: "코스와 희망 시간을 입력한 뒤 웹페이지 또는 WhatsApp으로 예약 신청을 보낼 수 있습니다. 매장의 답변을 받은 뒤 예약이 확정됩니다.",
    channelTitle: COPY.ko.channelTitle,
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
  let showAllCourses = false;
  let requestedCourseApplied = false;
  let formStartSent = false;
  const previewLabel = document.querySelector('[data-i18n="preview"]');
  const originalTrackEvent = trackEvent;
  const originalMessageText = messageText;
  const originalWebPayload = webPayload;
  const storyImage = document.querySelector(".story-photo img");

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
    let earliest = roundUp(now.minutes + BOOKING_V2.minAdvanceMinutes, BOOKING_V2.slotMinutes);
    if (now.minutes < BOOKING_V2.quietHoursEndMinutes) {
      earliest = Math.max(earliest, BOOKING_V2.quietHoursEarliestMinutes);
    }
    return baseTimes().filter(item => item.minutes >= earliest);
  };
  const firstAvailableLabel = dateValue => availableTimesFor(dateValue)[0]?.label || "";

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
  const courseGroup = () => groupForCourse(selectedCourse()?.key || "") || bookingContext.service || "unknown";
  const leadTimeBucket = () => {
    const start = appointmentDateTime();
    if (!start) return "unknown";
    const hours = (start.getTime() - Date.now()) / 3600000;
    if (hours < 3) return "under_3h";
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
    service_context: bookingContext.service || "general",
    course_id: selectedCourse()?.key || "none",
    course_group: courseGroup(),
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

  const copy = () => COPY[lang] || COPY.en;
  const contextCopy = () => copy().story[bookingContext.service] || null;
  const contextImageMap = {
    body: ["assets/img/premium-seitai.webp", "Body care treatment over clothing"],
    foot: ["assets/img/menu-foot-close.webp", "Foot reflexology treatment"],
    aroma: ["assets/img/menu-aroma-back.webp", "Aroma oil treatment"],
    head: ["assets/img/head-scalp-care.webp", "Dry head care treatment"],
    late: ["assets/img/booking-treatment-waterwood-4k.webp", "Late-night body care at Shin Yuu An"]
  };

  const ensureContextNote = () => {
    let note = $("bookingContextNote");
    if (!note) {
      note = document.createElement("p");
      note.id = "bookingContextNote";
      note.className = "booking-v2-context";
      document.querySelector(".form-intro")?.append(note);
    }
    const text = copy().context[bookingContext.service] || "";
    note.textContent = text;
    note.hidden = !text;
  };

  const renderStoryContext = () => {
    const content = contextCopy();
    if (content) {
      const title = document.querySelector('[data-i18n="storyTitle"]');
      const lead = document.querySelector('[data-i18n="storyLead"]');
      const formTitle = document.querySelector('[data-i18n="formTitle"]');
      if (title) title.textContent = content[0];
      if (lead) lead.textContent = content[1];
      if (formTitle) formTitle.textContent = content[0];
    }
    const image = contextImageMap[bookingContext.service];
    if (storyImage && image) {
      storyImage.src = image[0];
      storyImage.alt = image[1];
      storyImage.removeAttribute("data-alt-key");
    }
    ensureContextNote();
  };

  const ensureCourseToggle = () => {
    const course = $("course");
    if (!course) return null;
    let button = $("bookingCourseToggle");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.id = "bookingCourseToggle";
      button.className = "booking-v2-course-toggle";
      course.closest(".field-control")?.insertAdjacentElement("afterend", button);
      button.addEventListener("click", () => {
        showAllCourses = !showAllCourses;
        buildCourses();
        updatePreview();
      });
    }
    const canFilter = filterableServices.has(bookingContext.service) || Boolean(requestedCourse);
    button.hidden = !canFilter;
    button.textContent = showAllCourses ? copy().showRelevant : copy().showAll;
    return button;
  };

  buildCourses = function() {
    const course = $("course");
    if (!course) return;
    const current = course.value;
    const requestedGroup = groupForCourse(requestedCourse);
    const targetGroup = requestedGroup || (filterableServices.has(bookingContext.service) ? bookingContext.service : "");
    const visibleGroups = !showAllCourses && targetGroup
      ? COURSE_GROUPS.filter(group => group.key === targetGroup)
      : COURSE_GROUPS;
    course.innerHTML = `<option value="">${I18N[lang].selectCourse}</option>` + visibleGroups.map(group =>
      `<optgroup label="${I18N[lang].groups[group.key]}">${group.items.map(item => `<option value="${item.key}">${item[lang]} — ${money(item.price)}</option>`).join("")}</optgroup>`
    ).join("");
    const preferred = (!requestedCourseApplied && requestedCourse) || current;
    if (preferred && [...course.options].some(option => option.value === preferred)) {
      course.value = preferred;
      if (preferred === requestedCourse) requestedCourseApplied = true;
    }
    ensureCourseToggle();
  };

  const ensureTimeStatus = () => {
    let status = $("bookingV2TimeStatus");
    if (!status) {
      status = document.createElement("div");
      status.id = "bookingV2TimeStatus";
      status.className = "booking-v2-time-status";
      document.querySelector(".date-time-grid .hint")?.insertAdjacentElement("afterend", status);
    }
    return status;
  };

  const renderTimeStatus = () => {
    const status = ensureTimeStatus();
    if (!status) return;
    status.replaceChildren();
    const dateValue = $("date")?.value;
    const today = tokyoParts().date;
    if (!dateValue || dateValue !== today) {
      status.hidden = true;
      return;
    }
    status.hidden = false;
    const first = firstAvailableLabel(dateValue);
    const text = document.createElement("span");
    text.textContent = first ? copy().earliest(first.replace(" (next day)", "")) : copy().noTimes;
    status.append(text);
    if (!first || availableTimesFor(dateValue)[0]?.minutes > 11 * 60) {
      const detail = document.createElement("span");
      detail.className = "booking-v2-urgent-copy";
      detail.textContent = ` ${copy().urgent} `;
      const hpb = document.createElement("a");
      hpb.href = BOOKING_V2.hpbUrl;
      hpb.target = "_blank";
      hpb.rel = "noopener";
      hpb.textContent = copy().hpb;
      const phone = document.createElement("a");
      phone.href = BOOKING_V2.phoneUrl;
      phone.textContent = copy().phone;
      status.append(detail, hpb, document.createTextNode(" · "), phone);
    }
  };

  const fillTimeSelect = (select, dateValue, placeholder) => {
    if (!select) return;
    const current = select.value;
    const available = availableTimesFor(dateValue);
    select.innerHTML = `<option value="">${available.length ? placeholder : copy().noTimesOption}</option>` + available.map(item =>
      `<option value="${item.minutes}|${item.label}">${item.label}</option>`
    ).join("");
    select.disabled = !available.length;
    if (current && [...select.options].some(option => option.value === current)) select.value = current;
  };

  buildTimes = function() {
    fillTimeSelect($("time"), $("date")?.value, I18N[lang].selectTime);
    buildSecondTimes();
    renderTimeStatus();
  };

  const ensureAlternativeFields = () => {
    let details = $("bookingAlternative");
    if (details) return details;
    const dateGrid = document.querySelector(".date-time-grid");
    if (!dateGrid) return null;
    details = document.createElement("details");
    details.id = "bookingAlternative";
    details.className = "form-section booking-v2-alternative";
    details.innerHTML = `
      <summary class="extras-toggle"><span id="bookingAlternativeSummary"></span></summary>
      <div class="booking-v2-alt-grid">
        <div><label class="field-label" for="secondDate"><span id="secondDateLabel"></span><span class="required" data-v2-optional>optional</span></label><input id="secondDate" name="secondDate" type="date"></div>
        <div><label class="field-label" for="secondTime"><span id="secondTimeLabel"></span><span class="required" data-v2-optional>optional</span></label><select id="secondTime" name="secondTime"></select></div>
        <div class="booking-v2-flex"><label class="field-label" for="timeFlex"><span id="timeFlexLabel"></span><span class="required" data-v2-optional>optional</span></label><select id="timeFlex" name="timeFlex"></select></div>
      </div>
      <label class="booking-v2-same-start" id="sameStartRow" hidden><input id="sameStart" type="checkbox"><span id="sameStartLabel"></span></label>`;
    dateGrid.insertAdjacentElement("afterend", details);
    $("secondDate").min = $("date")?.min || tokyoParts().date;
    $("secondDate").addEventListener("change", buildSecondTimes);
    $("timeFlex").addEventListener("change", updatePreview);
    $("secondTime").addEventListener("change", updatePreview);
    $("sameStart").addEventListener("change", updatePreview);
    return details;
  };

  function buildSecondTimes() {
    if (!$("secondTime")) return;
    fillTimeSelect($("secondTime"), $("secondDate")?.value, I18N[lang].selectTime);
  }

  const updateAlternativeCopy = () => {
    if (!ensureAlternativeFields()) return;
    $("bookingAlternativeSummary").textContent = copy().alternativeSummary;
    $("secondDateLabel").textContent = copy().secondDate;
    $("secondTimeLabel").textContent = copy().secondTime;
    $("timeFlexLabel").textContent = copy().flexibility;
    $("sameStartLabel").textContent = copy().sameStart;
    document.querySelectorAll("[data-v2-optional]").forEach(node => { node.textContent = I18N[lang].optional || "optional"; });
    const flex = $("timeFlex");
    const current = flex.value || "exact";
    flex.innerHTML = [
      ["exact", copy().flexExact],
      ["30", copy().flex30],
      ["60", copy().flex60],
      ["any", copy().flexAny]
    ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    flex.value = current;
    $("secondDate").min = $("date")?.min || tokyoParts().date;
    buildSecondTimes();
  };

  const updateGroupOptions = () => {
    if (!ensureAlternativeFields()) return;
    const multiple = String(guests) !== "1";
    $("sameStartRow").hidden = !multiple;
    if (!multiple) $("sameStart").checked = false;
    if (multiple) $("bookingAlternative").open = true;
  };

  const alternativeState = () => ({
    secondDate: $("secondDate")?.value || "",
    secondTime: $("secondTime")?.value?.split("|")[1] || "",
    flexibility: $("timeFlex")?.value || "exact",
    simultaneous: String(guests) === "1" ? "not_applicable" : ($("sameStart")?.checked ? "required" : "not_required")
  });
  const flexibilityLabel = value => ({
    exact: copy().flexExact,
    "30": copy().flex30,
    "60": copy().flex60,
    any: copy().flexAny
  }[value] || copy().flexExact);
  const alternativeLines = () => {
    const state = alternativeState();
    const lines = [];
    if (state.secondDate || state.secondTime) {
      lines.push(`■ ${copy().labels.second}: ${[state.secondDate, state.secondTime].filter(Boolean).join(" ")}`);
    }
    if (state.flexibility !== "exact") lines.push(`■ ${copy().labels.flexibility}: ${flexibilityLabel(state.flexibility)}`);
    if (state.simultaneous !== "not_applicable") {
      lines.push(`■ ${copy().labels.simultaneous}: ${state.simultaneous === "required" ? copy().labels.yes : copy().labels.no}`);
    }
    return lines;
  };

  messageText = function() {
    const base = originalMessageText();
    const extra = alternativeLines();
    if (!extra.length) return base;
    const lines = base.split("\n");
    const viaIndex = lines.findIndex(line => line.startsWith("via shinyuuan.jp/booking.html"));
    const insertAt = viaIndex >= 0 ? viaIndex : lines.length;
    lines.splice(insertAt, 0, ...extra, "");
    return lines.join("\n");
  };

  webPayload = function() {
    const payload = originalWebPayload();
    const state = alternativeState();
    const internal = [
      state.secondDate || state.secondTime ? `${copy().labels.second}: ${[state.secondDate, state.secondTime].filter(Boolean).join(" ")}` : "",
      state.flexibility !== "exact" ? `${copy().labels.flexibility}: ${flexibilityLabel(state.flexibility)}` : "",
      state.simultaneous !== "not_applicable" ? `${copy().labels.simultaneous}: ${state.simultaneous === "required" ? copy().labels.yes : copy().labels.no}` : "",
      `origin: ${bookingContext.originPage}`,
      `cta: ${bookingContext.originCta}`
    ].filter(Boolean).join(" / ");
    payload.note = [payload.note, internal].filter(Boolean).join("\n").slice(0, 300);
    payload.secondDate = state.secondDate;
    payload.secondTime = state.secondTime;
    payload.timeFlexibility = state.flexibility;
    payload.simultaneousStart = state.simultaneous;
    payload.originPage = bookingContext.originPage;
    payload.originCta = bookingContext.originCta;
    return payload;
  };

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
      hpb: { label: I18N[lang].channelHpb, href: BOOKING_V2.hpbUrl, external: true },
      phone: { label: I18N[lang].channelPhone, href: BOOKING_V2.phoneUrl }
    };
    const allKeys = ["web", "whatsapp", "line", "hpb", "phone"].filter(key => {
      if (key === "web" && !WEB_FORM_ENABLED) return false;
      if (key === "whatsapp" && !WHATSAPP_CHANNEL_ENABLED) return false;
      return true;
    });
    const preferred = (lang === "ja" ? ["hpb", "web"] : ["web", "whatsapp"]).filter(key => allKeys.includes(key));
    const others = allKeys.filter(key => !preferred.includes(key));

    const makeLink = key => {
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
    };

    const actions = $("channelActions");
    actions.replaceChildren(...preferred.map(makeLink));
    if (others.length) {
      const details = document.createElement("details");
      details.className = "booking-v2-other-channels";
      const summary = document.createElement("summary");
      summary.textContent = copy().otherChannels;
      const list = document.createElement("div");
      list.className = "booking-v2-other-list";
      list.append(...others.map(makeLink));
      details.append(summary, list);
      actions.append(details);
    }

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
    ensureAlternativeFields();
    updateAlternativeCopy();
    updateGroupOptions();
    renderStoryContext();
    renderTimeStatus();
    ensureCourseToggle();
    hideRedundantHpbBanner();
  };

  if (!WHATSAPP_CHANNEL_ENABLED && typeof showWhatsAppStatus === "function") {
    showWhatsAppStatus = function() {
      const fallbackCopy = {
        en: { lead: "Website submission could not be completed. Please use LINE or call us.", line: "Contact us on LINE", phone: "Call 03-6874-6808" },
        zh: { lead: "网页提交未完成，请改用LINE或电话联系我们。", line: "通过LINE联系我们", phone: "致电03-6874-6808" },
        ja: { lead: "ウェブ送信を完了できませんでした。LINEまたはお電話をご利用ください。", line: "LINEで連絡する", phone: "03-6874-6808に電話する" },
        ko: { lead: "웹 전송을 완료하지 못했습니다. LINE 또는 전화로 문의해 주세요.", line: "LINE으로 문의", phone: "03-6874-6808 전화" }
      }[lang] || null;
      if (!fallbackCopy) return;
      const status = $("submitStatus");
      status.replaceChildren();
      const lead = document.createElement("strong");
      lead.textContent = fallbackCopy.lead;
      const line = document.createElement("a");
      line.href = "https://page.line.me/017hlpiu";
      line.target = "_blank";
      line.rel = "noopener";
      line.textContent = fallbackCopy.line;
      const phone = document.createElement("a");
      phone.href = BOOKING_V2.phoneUrl;
      phone.textContent = fallbackCopy.phone;
      status.append(lead, document.createElement("br"), line, document.createElement("br"), phone);
    };
  }

  const style = document.createElement("style");
  style.textContent = `
    .channel-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .channel-button.active{background:var(--sea-deep);border-color:var(--sea-deep);color:#fff}
    .channel-button.active:hover{background:var(--sea);border-color:var(--sea);color:#fff}
    .booking-v2-other-channels{grid-column:1/-1;margin-top:2px}
    .booking-v2-other-channels summary{cursor:pointer;color:var(--muted);font-size:.78rem;font-weight:700}
    .booking-v2-other-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
    .booking-v2-context{margin-top:12px;padding:9px 12px;border-left:3px solid var(--leaf);background:var(--mint-soft);color:var(--sea-deep);font-size:.78rem;font-weight:700}
    .booking-v2-course-toggle{margin-top:10px;padding:0;border:0;background:transparent;color:var(--sea-deep);font-size:.76rem;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
    .booking-v2-time-status{grid-column:1/-1;padding:11px 13px;border:1px solid var(--line);background:#fff;color:var(--muted);font-size:.76rem;line-height:1.7}
    .booking-v2-time-status a{color:var(--sea-deep);font-weight:800;text-decoration:underline;text-underline-offset:3px}
    .booking-v2-alternative{padding-top:18px}
    .booking-v2-alt-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:15px}
    .booking-v2-flex{grid-column:1/-1}
    .booking-v2-same-start{display:flex;align-items:flex-start;gap:9px;margin-top:13px;color:var(--muted);font-size:.78rem;font-weight:700}
    .booking-v2-same-start input{width:18px;height:18px;margin-top:2px;accent-color:var(--sea)}
    .ja-hpb-banner{display:none!important}
    [hidden]{display:none!important}
    @media(max-width:640px){
      .channel-actions,.booking-v2-other-list,.booking-v2-alt-grid{grid-template-columns:1fr}
      .booking-v2-flex{grid-column:auto}
    }
  `;
  document.head.append(style);

  $("date")?.addEventListener("change", () => {
    buildTimes();
    if (!$("secondDate")?.value) $("secondDate").value = $("date").value;
    buildSecondTimes();
    updatePreview();
  });
  $("course")?.addEventListener("change", () => {
    buildTimes();
    updatePreview();
  });
  $("guestButtons")?.addEventListener("click", () => setTimeout(updateGroupOptions, 0));
  $("bookingForm").addEventListener("submit", event => {
    if (bookingMode !== "web") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitWebForm();
  }, true);

  applyLanguage(lang);
  updatePreview();
})();

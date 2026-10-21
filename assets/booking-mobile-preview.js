// Preview-only progressive enhancement. Branch must not be merged before owner approval.
// Keep the deployed Apps Script v5 schema unchanged: put guest two's course in the note.
(() => {
  "use strict";
  if (typeof I18N !== "object" || typeof $ !== "function" || !$("secondCourseSection")) return;
  const copy = {
    ja: {
      diff:"2人目は別のコースを希望", label:"2人目のコース", choose:"2人目のコースを選択…",
      noSlots:"本日のウェブ予約で選べる時刻は終了しました。今夜のご来店をご希望の場合は、お電話で空き状況をご相談ください。",
      urgent:"本日お急ぎの場合は、電話で空き状況をご確認ください。",
      twoPrice:(first,second)=>"1人目の参考額 ¥"+first.toLocaleString()+"（選択した追加ケアを含む）／2人目のコース ¥"+second.toLocaleString()+"。深夜料金・追加ケア等を含む最終額は店舗返信時に確認します。",
      hours:"ウェブ・WhatsAppで選べる開始時刻は23:30までです。23:30以降のご来店はお電話でご相談ください。営業時間11:00〜翌2:00。実際のご来店が23:00以降の場合は深夜料金800円です。",
      room:"同室の追加料金はかかりません。2人目のコースが異なる場合は上で選べます。部屋・スタッフ・開始時間を確認し、同室利用は店舗からの返信で確定します。"
    },
    en: {
      diff:"Guest 2 would like a different course",label:"Guest 2 course",choose:"Choose guest 2's course…",
      noSlots:"No more web booking times are available today. To ask about coming later tonight, please call us.",
      urgent:"Need an appointment today? Call to check availability.",
      twoPrice:(first,second)=>"Guest 1 estimated ¥"+first.toLocaleString()+" (includes selected add-ons) / Guest 2 course ¥"+second.toLocaleString()+". We will confirm the final total, additional care and any late-night fee in our reply.",
      hours:"Web and WhatsApp selectable start times end at 11:30 PM. For later visits, please call to ask about availability. Open 11 AM–2 AM. An ¥800 late-night fee applies for actual arrival from 11 PM.",
      room:"Same-room requests have no additional room charge. Select guest 2's course above if different. We confirm the room, staff and start time in our reply."
    },
    zh: {
      diff:"第二位客人选择不同套餐",label:"第二位客人的套餐",choose:"请选择第二位客人的套餐…",
      noSlots:"今天网页可选的预约时间已结束。如希望今晚晚些到店，请打电话咨询能否安排。",
      urgent:"希望今天尽快到店？请电话确认是否有空位。",
      twoPrice:(first,second)=>"第一位参考价 ¥"+first.toLocaleString()+"（含当前选择的附加项目）；第二位套餐价 ¥"+second.toLocaleString()+"。最终合计及深夜费由店铺回复确认。",
      hours:"网页和WhatsApp可选择的开始时间截至23:30。希望之后到店，请电话咨询。营业时间11:00—次日2:00。实际23:00后到店加收深夜费¥800。",
      room:"双人同室不额外收费。第二位如选择不同套餐，可在上方直接选择。同室安排需确认房间、两位技师及开始时间，并以店铺回复为准。"
    },
    ko: {
      diff:"두 번째 고객은 다른 코스를 원해요",label:"두 번째 고객 코스",choose:"두 번째 고객 코스 선택…",
      noSlots:"오늘 웹 예약에서 선택 가능한 시간이 종료되었습니다. 오늘 밤 늦게 방문하려면 전화로 가능 여부를 확인해 주세요.",
      urgent:"오늘 급히 방문하시려면 전화로 가능한 시간을 확인해 주세요.",
      twoPrice:(first,second)=>"첫 번째 고객 예상 ¥"+first.toLocaleString()+" (선택한 옵션 포함) / 두 번째 고객 코스 ¥"+second.toLocaleString()+". 최종 금액과 심야 요금은 매장 답변으로 확인됩니다.",
      hours:"웹 및 WhatsApp에서 선택할 수 있는 시작 시간은 23:30까지입니다. 이후 방문은 전화로 가능 여부를 확인해 주세요. 영업시간 11:00~다음 날 2:00, 실제 23:00 이후 방문 시 심야 요금 800엔이 적용됩니다.",
      room:"같은 공간 요청에는 추가 객실 요금이 없습니다. 두 번째 고객의 코스가 다르면 위에서 선택해 주세요. 실제 동실 이용은 매장 답변으로 확정됩니다."
    }
  };
  const guestTwoDiff = () => guests === "2" && Boolean($("secondCourseDifferent")?.checked);
  const secondCourse = () => guestTwoDiff()
    ? allCourses().find(item => item.key === $("secondCourse").value)
    : null;
  const secondSummary = () => {
    const course = secondCourse();
    return course ? copy[lang].label + ": " + course[lang] + " (" + money(course.price) + ")" : "";
  };
  const syncSecond = () => {
    const forTwo = guests === "2";
    $("secondCourseSection").hidden = !forTwo;
    if (!forTwo) {
      $("secondCourseDifferent").checked = false;
      $("secondCourse").value = "";
    }
    $("secondCourseChoice").hidden = !forTwo || !$("secondCourseDifferent").checked;
    $("secondCourse").required = forTwo && $("secondCourseDifferent").checked;
    $("secondCourse").disabled = !forTwo || !$("secondCourseDifferent").checked;
  };
  const paintSecond = () => {
    const previous = $("secondCourse").value;
    $("secondCourse").innerHTML = '<option value="">' + copy[lang].choose + '</option>' +
      COURSE_GROUPS.map(group => '<optgroup label="' + I18N[lang].groups[group.key] + '">' +
        group.items.map(item => '<option value="' + item.key + '">' + item[lang] + ' — ' + money(item.price) + '</option>').join("") +
      '</optgroup>').join("");
    $("secondCourse").value = previous;
    document.querySelectorAll("[data-mobile-preview]").forEach(element => {
      element.textContent = copy[lang][element.dataset.mobilePreview];
    });
    I18N[lang].hoursHint = copy[lang].hours;
    I18N[lang].sameRoomHint = copy[lang].room;
    const hours = document.querySelector('[data-i18n="hoursHint"]');
    const room = document.querySelector('[data-i18n="sameRoomHint"]');
    if (hours) hours.textContent = copy[lang].hours;
    if (room) room.textContent = copy[lang].room;
    syncSecond();
  };
  const todayJst = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const get = key => parts.find(p => p.type === key)?.value || "";
    return get("year") + "-" + get("month") + "-" + get("day");
  };
  const updateCallHints = () => {
    const sameDay = $("date").value === todayJst();
    const noTimes = sameDay && $("time").options.length <= 1;
    const late = $("latePhoneHint"), urgent = $("sameDayCallHint");
    late.hidden = !noTimes;
    urgent.hidden = !sameDay || noTimes;
    late.querySelector(".phone-copy").textContent = copy[lang].noSlots;
    urgent.querySelector(".phone-copy").textContent = copy[lang].urgent;
  };
  const oldSetGuests = setGuests;
  setGuests = function(next) {
    oldSetGuests(next);
    syncSecond();
    updatePreview();
  };
  const oldUpdatePreview = updatePreview;
  updatePreview = function() {
    oldUpdatePreview();
    const missingSecond = guestTwoDiff() && !secondCourse();
    if (missingSecond) {
      $("submitButton").disabled = true;
      if ($("webSubmitButton")) $("webSubmitButton").disabled = true;
    }
    if (guestTwoDiff()) {
      const other = secondCourse();
      $("estimate").textContent = other
        ? copy[lang].twoPrice(currentPrice(),other.price)
        : copy[lang].choose;
    }
  };
  const oldMessageText = messageText;
  messageText = function() {
    const base = oldMessageText();
    if (!secondCourse()) return base;
    const nameMarker = "■ " + I18N[lang].msgLabels.name + ":";
    const at = base.indexOf(nameMarker);
    return at < 0 ? base + "\n■ " + secondSummary() : base.slice(0,at) + "■ " + secondSummary() + "\n" + base.slice(at);
  };
  const oldSignature = webSubmissionSignatureValue;
  webSubmissionSignatureValue = function() {
    const base = JSON.parse(oldSignature());
    base.secondCourseId = secondCourse()?.key || "";
    return JSON.stringify(base);
  };
  const oldPayload = webPayload;
  webPayload = function() {
    const payload = oldPayload();
    const second = secondSummary();
    if (second) payload.note = (second + "\n" + (payload.note || "")).slice(0,300);
    return payload;
  };
  const oldApplyLanguage = applyLanguage;
  applyLanguage = function(next,opts) {
    oldApplyLanguage(next,opts);
    paintSecond();
    updateCallHints();
    updatePreview();
  };
  $("secondCourseDifferent").addEventListener("change", () => {
    syncSecond();
    updatePreview();
  });
  $("secondCourse").addEventListener("change",updatePreview);
  $("date").addEventListener("change",updateCallHints);
  $("time").addEventListener("change",updateCallHints);
  paintSecond();
  updateCallHints();
  updatePreview();
})();

// Preview-only: smaller booking form; no new guest-course fields or backend changes.
// Booking selection is a preference, not an irrevocable course commitment.
(() => {
  "use strict";
  if (typeof I18N !== "object" || typeof $ !== "function" || !$("latePhoneHint")) return;
  const copy = {
    ja: {
      noSlots: "本日のウェブ予約で選べる時刻は終了しました。今夜のご来店をご希望の場合は、お電話で空き状況をご相談ください。",
      urgent: "本日お急ぎの場合は、電話で空き状況をご確認ください。",
      hours: "ウェブ・WhatsAppで選べる開始時刻は23:30までです。23:30以降のご来店はお電話でご相談ください。営業時間11:00〜翌2:00（1月1日休み）。実際のご来店が23:00以降の場合は深夜料金800円です。すべて日本標準時（JST）です。",
      room: "2名同室の追加料金はかかりません。別々のコースをご希望の場合はご要望欄に記入できます（任意）。お部屋・スタッフ・開始時間を確認し、同室利用の可否は店舗からの返信でお知らせします。"
    },
    en: {
      noSlots: "There are no selectable web booking times left today. Please call to check whether a later visit can be arranged.",
      urgent: "Need to visit today? Call to check availability.",
      hours: "Web and WhatsApp selectable start times are until 11:30 PM. For later visits, please call to check availability. Hours: 11 AM–2 AM (closed January 1). An ¥800 late-night fee applies if you actually arrive at or after 11 PM. All times are JST.",
      room: "There is no extra charge for requesting the same room. You can mention different course preferences in Notes (optional). Room, staff and time are subject to our confirmation."
    },
    zh: {
      noSlots: "今天网页可选的预约时间已结束。如希望今晚晚些到店，请电话咨询能否安排。",
      urgent: "今天希望尽快到店？请电话确认是否有空位。",
      hours: "网页和WhatsApp可选的开始时间截至23:30。希望更晚到店，请电话咨询。营业时间11:00—次日2:00（1月1日休息）。实际23:00或之后到店加收深夜费¥800。所有时间均为日本时间。",
      room: "双人同室不额外收费。如果两人希望选择不同套餐，可以在备注中说明（选填）。是否能同室及具体安排以店铺回复为准。"
    },
    ko: {
      noSlots: "오늘 웹 예약에서 선택 가능한 시간이 종료되었습니다. 오늘 밤 늦게 방문하려면 전화로 가능 여부를 확인해 주세요.",
      urgent: "오늘 급히 방문하시려면 전화로 가능한 시간을 확인해 주세요.",
      hours: "웹 및 WhatsApp에서 선택할 수 있는 시작 시간은 23:30까지입니다. 이후 방문은 전화로 가능 여부를 확인해 주세요. 영업시간 11:00~다음 날 2:00 (1월 1일 휴무). 실제 23:00 이후 방문 시 심야 요금 800엔이 적용됩니다. 일본 표준시 기준입니다.",
      room: "같은 공간 요청에는 추가 요금이 없습니다. 서로 다른 코스를 원하시면 메모에 남길 수 있습니다(선택 사항). 공간, 담당자 및 시간은 매장 답변으로 확정됩니다."
    }
  };
  const todayJst = () => {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const get = kind => p.find(item => item.type === kind)?.value || "";
    return get("year") + "-" + get("month") + "-" + get("day");
  };
  const updateCourseHint = () => {
    const note = document.querySelector(".arrival-choice-note");
    if (!note) return;
    const course = selectedCourse();
    note.hidden = !(course && course.key.toLowerCase().includes("aroma"));
  };
  const updatePhoneHints = () => {
    const sameDay = $("date").value === todayJst();
    const noSlots = sameDay && $("time").options.length <= 1;
    const late = $("latePhoneHint");
    const urgent = $("sameDayCallHint");
    late.hidden = !noSlots;
    urgent.hidden = !sameDay || noSlots;
    late.querySelector(".phone-copy").textContent = copy[lang].noSlots;
    urgent.querySelector(".phone-copy").textContent = copy[lang].urgent;
  };
  const originalApplyLanguage = applyLanguage;
  applyLanguage = function(next, options) {
    originalApplyLanguage(next, options);
    I18N[lang].hoursHint = copy[lang].hours;
    I18N[lang].sameRoomHint = copy[lang].room;
    const hours = document.querySelector('[data-i18n="hoursHint"]');
    const room = document.querySelector('[data-i18n="sameRoomHint"]');
    if (hours) hours.textContent = copy[lang].hours;
    if (room) room.textContent = copy[lang].room;
    updateCourseHint();
    updatePhoneHints();
  };
  $("course").addEventListener("change", updateCourseHint);
  $("date").addEventListener("change", updatePhoneHints);
  $("time").addEventListener("change", updatePhoneHints);
  updateCourseHint();
  updatePhoneHints();
})();

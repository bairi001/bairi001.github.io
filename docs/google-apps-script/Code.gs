/**
 * 身悠晏网页预约 Google Apps Script 模板。
 *
 * 必须通过 Script Properties 配置：
 * TO_MAIL, SHEET_ID, MAX_PER_HOUR, SALON_NAME, TIME_ZONE
 *
 * 不要在此文件写入真实邮箱、表格 ID、密码或 Webhook。
 */

var SERVICE_NAME = "shinyuuan-booking";
var SERVICE_VERSION = "2";
var MAX_PAYLOAD_BYTES = 20000;
var MIN_FORM_AGE_MS = 2000;
var MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
var SUBMISSION_CACHE_SECONDS = 21600;
var DUPLICATE_WINDOW_SECONDS = 300;
var SHEET_HEADERS = [
  "submission_id",
  "received_at_jst",
  "lang",
  "course_id",
  "course_label",
  "date",
  "time",
  "guests",
  "name",
  "email",
  "phone",
  "note",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "mail_status",
  "processing_status"
];

function doGet(e) {
  return jsonResponse_({
    ok: true,
    service: SERVICE_NAME,
    version: SERVICE_VERSION
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== "string") {
      return jsonResponse_({ ok: false, error: "invalid_request" });
    }
    if (Utilities.newBlob(e.postData.contents).getBytes().length > MAX_PAYLOAD_BYTES) {
      return jsonResponse_({ ok: false, error: "payload_too_large" });
    }

    var raw;
    try {
      raw = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse_({ ok: false, error: "invalid_json" });
    }

    // 蜜罐命中时返回表面成功，但不写表格、不发邮件。
    if (sanitizeText_(raw.website, 120)) {
      return jsonResponse_({ ok: true });
    }

    var payload = validatePayload_(raw);
    var config = getConfig_();
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      return jsonResponse_({ ok: false, error: "busy" });
    }

    try {
      if (isDuplicateSubmission_(payload.submissionId, config.sheetId)) {
        return jsonResponse_({ ok: true, duplicate: true });
      }
      if (isDuplicateBooking_(payload, config)) {
        return jsonResponse_({ ok: true, duplicate: true });
      }
      if (!checkRateLimit_(config.maxPerHour)) {
        return jsonResponse_({ ok: false, error: "rate_limited" });
      }

      var booking = appendBookingRow_(payload, config);
      var mailStatus = sendBookingMail_(payload, config);
      booking.sheet.getRange(booking.row, 17, 1, 2).setValues([[
        mailStatus,
        mailStatus === "sent" ? "recorded_mail_sent" : "recorded_mail_failed"
      ]]);
      if (mailStatus === "sent") {
        CacheService.getScriptCache().put(
          "submission:" + payload.submissionId,
          "1",
          SUBMISSION_CACHE_SECONDS
        );
        rememberBooking_(payload);
      }

      return jsonResponse_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    // 不记录完整 payload、个人信息、内部配置或堆栈。
    console.error("Booking request failed: " + String(error && error.message || "unknown"));
    return jsonResponse_({ ok: false, error: "request_failed" });
  }
}

function getConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var toMail = properties.getProperty("TO_MAIL");
  var sheetId = properties.getProperty("SHEET_ID");
  var maxPerHour = Number(properties.getProperty("MAX_PER_HOUR") || "20");
  var salonName = properties.getProperty("SALON_NAME") || "身悠晏";
  var timeZone = properties.getProperty("TIME_ZONE") || "Asia/Tokyo";

  if (!toMail || !sheetId) throw new Error("Required Script Properties are missing");
  if (!Number.isInteger(maxPerHour) || maxPerHour < 1 || maxPerHour > 500) {
    throw new Error("MAX_PER_HOUR is invalid");
  }
  if (timeZone !== "Asia/Tokyo") throw new Error("TIME_ZONE must be Asia/Tokyo");

  return {
    toMail: toMail,
    sheetId: sheetId,
    maxPerHour: maxPerHour,
    salonName: sanitizeText_(salonName, 80),
    timeZone: timeZone
  };
}

function validatePayload_(raw) {
  var limits = {
    courseId: 80,
    courseLabel: 160,
    date: 10,
    time: 40,
    guests: 4,
    name: 60,
    email: 160,
    phone: 40,
    note: 300,
    lang: 8,
    utm_source: 120,
    utm_medium: 120,
    utm_campaign: 120,
    utm_content: 120,
    submissionId: 80,
    startedAt: 40
  };
  var required = [
    "courseId", "courseLabel", "date", "time", "guests",
    "name", "email", "lang", "submissionId", "startedAt"
  ];
  var data = {};

  Object.keys(limits).forEach(function (key) {
    data[key] = sanitizeText_(raw[key], limits[key]);
  });
  required.forEach(function (key) {
    if (!data[key]) throw new Error("Required field missing");
  });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error("Email is invalid");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error("Date is invalid");
  }
  var dateParts = data.date.split("-").map(Number);
  var checkedDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
  if (
    checkedDate.getUTCFullYear() !== dateParts[0] ||
    checkedDate.getUTCMonth() !== dateParts[1] - 1 ||
    checkedDate.getUTCDate() !== dateParts[2]
  ) {
    throw new Error("Date is invalid");
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?: \(next day\))?$/.test(data.time)) {
    throw new Error("Time is invalid");
  }
  if (!/^(?:[1-3]|4\+)$/.test(data.guests)) {
    throw new Error("Guests is invalid");
  }
  if (!/^(?:ja|en|zh|ko)$/.test(data.lang)) {
    throw new Error("Language is invalid");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.submissionId)) {
    throw new Error("Submission ID is invalid");
  }

  var startedAt = Date.parse(data.startedAt);
  var age = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || age < MIN_FORM_AGE_MS || age > MAX_FORM_AGE_MS) {
    throw new Error("Form age is invalid");
  }

  return data;
}

function sanitizeText_(value, maxLength) {
  var text = String(value == null ? "" : value);
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  text = text.trim();
  if (text.length > maxLength) throw new Error("Field is too long");
  return text;
}

function sanitizeSheetValue_(value) {
  var text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function isDuplicateSubmission_(submissionId, sheetId) {
  if (CacheService.getScriptCache().get("submission:" + submissionId) === "1") return true;
  var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  if (sheet.getLastRow() < 2) return false;
  var matches = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(submissionId)
    .matchEntireCell(true)
    .findAll();
  for (var index = 0; index < matches.length; index++) {
    if (isHandledMailStatus_(sheet.getRange(matches[index].getRow(), 17).getValue())) return true;
  }
  return false;
}

function normalizeBookingKey_(value) {
  return String(value == null ? "" : value).trim().toLowerCase().replace(/\s+/g, " ");
}

function isHandledMailStatus_(value) {
  var status = normalizeBookingKey_(value);
  return status === "sent" || status === "pending";
}

function bookingFingerprint_(payload) {
  var source = [
    normalizeBookingKey_(payload.email),
    normalizeBookingKey_(payload.date),
    normalizeBookingKey_(payload.time),
    normalizeBookingKey_(payload.courseId),
    normalizeBookingKey_(payload.guests),
    normalizeBookingKey_(payload.name)
  ].join("|");
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source, Utilities.Charset.UTF_8).map(function(byte) {
    var value = (byte + 256) % 256;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function bookingRowMatches_(row, payload) {
  return normalizeBookingKey_(row[3]) === normalizeBookingKey_(payload.courseId) &&
    normalizeBookingKey_(row[5]) === normalizeBookingKey_(payload.date) &&
    normalizeBookingKey_(row[6]) === normalizeBookingKey_(payload.time) &&
    normalizeBookingKey_(row[7]) === normalizeBookingKey_(payload.guests) &&
    normalizeBookingKey_(row[8]) === normalizeBookingKey_(payload.name) &&
    normalizeBookingKey_(row[9]) === normalizeBookingKey_(payload.email);
}

function isDuplicateBooking_(payload, config) {
  var cacheKey = "booking:" + bookingFingerprint_(payload);
  if (CacheService.getScriptCache().get(cacheKey) === "1") return true;
  var sheet = SpreadsheetApp.openById(config.sheetId).getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var startRow = Math.max(2, lastRow - 99);
  var rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, 18).getValues();
  var cutoff = Date.now() - DUPLICATE_WINDOW_SECONDS * 1000;
  for (var index = rows.length - 1; index >= 0; index--) {
    var receivedText = String(rows[index][1] || "").trim();
    var receivedAt = Date.parse(receivedText.replace(" ", "T") + "+09:00");
    if (!Number.isFinite(receivedAt) || receivedAt < cutoff) continue;
    if (bookingRowMatches_(rows[index], payload) && isHandledMailStatus_(rows[index][16])) return true;
  }
  return false;
}

function rememberBooking_(payload) {
  CacheService.getScriptCache().put("booking:" + bookingFingerprint_(payload), "1", DUPLICATE_WINDOW_SECONDS);
}

function checkRateLimit_(maxPerHour) {
  var now = new Date();
  var bucket = Utilities.formatDate(now, "Asia/Tokyo", "yyyyMMddHH");
  var key = "rate:" + bucket;
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get(key) || "0");
  if (count >= maxPerHour) return false;
  cache.put(key, String(count + 1), 3700);
  return true;
}

function appendBookingRow_(payload, config) {
  var spreadsheet = SpreadsheetApp.openById(config.sheetId);
  var sheet = spreadsheet.getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(SHEET_HEADERS);

  var receivedAt = Utilities.formatDate(new Date(), config.timeZone, "yyyy-MM-dd HH:mm:ss");
  var row = [
    payload.submissionId,
    receivedAt,
    payload.lang,
    payload.courseId,
    payload.courseLabel,
    payload.date,
    payload.time,
    payload.guests,
    payload.name,
    payload.email,
    payload.phone,
    payload.note,
    payload.utm_source,
    payload.utm_medium,
    payload.utm_campaign,
    payload.utm_content,
    "pending",
    "recorded"
  ].map(sanitizeSheetValue_);

  sheet.appendRow(row);
  return { sheet: sheet, row: sheet.getLastRow() };
}

function buildBookingMail_(payload) {
  var templates = {
    ja: {subject: "【身悠晏】ご予約リクエスト ", title: "身悠晏 ご予約リクエスト", language: "言語", course: "コース", date: "日付", time: "時間", guests: "人数", name: "お名前", email: "メール", phone: "電話", note: "備考", noPhone: "未入力", noNote: "なし", closing: "最終料金は店舗からの返信にてご確認ください。"},
    en: {subject: "[Shin Yuu An] Booking Request ", title: "Shin Yuu An Booking Request", language: "Language", course: "Course", date: "Date", time: "Time", guests: "Guests", name: "Name", email: "Email", phone: "Phone", note: "Note", noPhone: "Not provided", noNote: "None", closing: "The final price will be confirmed in the salon's reply."},
    zh: {subject: "【身悠晏】预约申请 ", title: "身悠晏 网页预约申请", language: "语言", course: "套餐", date: "日期", time: "时间", guests: "人数", name: "姓名", email: "邮箱", phone: "电话", note: "备注", noPhone: "未填写", noNote: "无", closing: "最终价格请由店铺回复确认。"},
    ko: {subject: "[신유안] 예약 요청 ", title: "신유안 예약 요청", language: "언어", course: "코스", date: "날짜", time: "시간", guests: "인원", name: "이름", email: "이메일", phone: "전화번호", note: "메모", noPhone: "미입력", noNote: "없음", closing: "최종 요금은 매장의 답변에서 확인해 주세요."}
  };
  var text = templates[payload.lang] || templates.en;
  var subject = (text.subject + payload.date).replace(/[\r\n]+/g, " ").slice(0, 160);
  var body = [
    text.title,
    "",
    text.language + ": " + payload.lang,
    text.course + ": " + payload.courseLabel + " (" + payload.courseId + ")",
    text.date + ": " + payload.date,
    text.time + ": " + payload.time,
    text.guests + ": " + payload.guests,
    text.name + ": " + payload.name,
    text.email + ": " + payload.email,
    text.phone + ": " + (payload.phone || text.noPhone),
    text.note + ": " + (payload.note || text.noNote),
    "",
    text.closing
  ].join("\n");
  return { subject: subject, body: body };
}

function sendBookingMail_(payload, config) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return "quota_unavailable";
    var mail = buildBookingMail_(payload);
    MailApp.sendEmail({
      to: config.toMail,
      replyTo: payload.email,
      name: "身悠晏 Shin Yuu An",
      subject: mail.subject,
      body: mail.body
    });
    return "sent";
  } catch (error) {
    console.error("Booking notification mail failed");
    return "failed";
  }
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 身悠晏网页预约 Google Apps Script 模板。
 *
 * 必须通过 Script Properties 配置：
 * TO_MAIL, SHEET_ID, MAX_PER_HOUR, SALON_NAME, TIME_ZONE
 *
 * 不要在此文件写入真实邮箱、表格 ID、密码或 Webhook。
 */

var SERVICE_NAME = "shinyuuan-booking";
var SERVICE_VERSION = "1";
var MAX_PAYLOAD_BYTES = 20000;
var MIN_FORM_AGE_MS = 2000;
var MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
var SUBMISSION_CACHE_SECONDS = 21600;
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
      if (!checkRateLimit_(config.maxPerHour)) {
        return jsonResponse_({ ok: false, error: "rate_limited" });
      }

      var booking = appendBookingRow_(payload, config);
      CacheService.getScriptCache().put(
        "submission:" + payload.submissionId,
        "1",
        SUBMISSION_CACHE_SECONDS
      );

      var mailStatus = sendBookingMail_(payload, config);
      booking.sheet.getRange(booking.row, 17, 1, 2).setValues([[
        mailStatus,
        mailStatus === "sent" ? "recorded_mail_sent" : "recorded_mail_failed"
      ]]);

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
  return Boolean(
    sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(submissionId)
      .matchEntireCell(true)
      .findNext()
  );
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

function sendBookingMail_(payload, config) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return "quota_unavailable";

    var subject = ("【" + config.salonName + "】网页预约申请 " + payload.date)
      .replace(/[\r\n]+/g, " ")
      .slice(0, 160);
    var body = [
      "身悠晏 网页预约申请",
      "",
      "语言: " + payload.lang,
      "套餐: " + payload.courseLabel + " (" + payload.courseId + ")",
      "日期: " + payload.date,
      "时间: " + payload.time,
      "人数: " + payload.guests,
      "姓名: " + payload.name,
      "邮箱: " + payload.email,
      "电话: " + (payload.phone || "未填写"),
      "备注: " + (payload.note || "无"),
      "",
      "最终价格请由店铺回复确认。"
    ].join("\n");

    MailApp.sendEmail({
      to: config.toMail,
      replyTo: payload.email,
      name: "身悠晏予約受付",
      subject: subject,
      body: body
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

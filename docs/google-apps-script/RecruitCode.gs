/**
 * 身悠晏 採用相談フォーム専用 Google Apps Script。
 * 既存の预约受付とは別の Web App としてデプロイしてください。
 *
 * Script Properties:
 * TO_MAIL, SHEET_ID, MAX_PER_HOUR, SALON_NAME, TIME_ZONE, SHEET_NAME
 *
 * 秘密情報、実メールアドレス、Spreadsheet ID、Webhook はコードに書かないこと。
 */
var RECRUIT_SERVICE_NAME = "shinyuuan-recruit";
var RECRUIT_SERVICE_VERSION = "1";
var RECRUIT_MAX_PAYLOAD_BYTES = 20000;
var RECRUIT_MIN_FORM_AGE_MS = 1500;
var RECRUIT_MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
var RECRUIT_SUBMISSION_CACHE_SECONDS = 21600;
var RECRUIT_DUPLICATE_WINDOW_SECONDS = 600;
var RECRUIT_HEADERS = [
  "submission_id",
  "received_at_jst",
  "name",
  "contact_method",
  "contact_value",
  "experience",
  "work_style",
  "skills",
  "availability",
  "visit_date",
  "source",
  "message",
  "origin_job",
  "origin_page",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "store_mail_status",
  "applicant_receipt_status",
  "processing_status"
];

function doGet() {
  return recruitJsonResponse_({
    ok: true,
    service: RECRUIT_SERVICE_NAME,
    version: RECRUIT_SERVICE_VERSION
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== "string") {
      return recruitJsonResponse_({ ok: false, error: "invalid_request" });
    }
    if (Utilities.newBlob(e.postData.contents).getBytes().length > RECRUIT_MAX_PAYLOAD_BYTES) {
      return recruitJsonResponse_({ ok: false, error: "payload_too_large" });
    }

    var raw;
    try {
      raw = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return recruitJsonResponse_({ ok: false, error: "invalid_json" });
    }

    if (recruitSanitizeText_(raw.website, 120)) {
      return recruitJsonResponse_({ ok: true });
    }

    var payload = recruitValidatePayload_(raw);
    var config = recruitGetConfig_();
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return recruitJsonResponse_({ ok: false, error: "busy" });

    try {
      var sheet = recruitGetSheet_(config);
      if (recruitIsDuplicateSubmission_(sheet, payload.submissionId)) {
        return recruitJsonResponse_({ ok: true, duplicate: true });
      }
      if (recruitIsDuplicateApplication_(sheet, payload)) {
        return recruitJsonResponse_({ ok: true, duplicate: true });
      }
      if (!recruitCheckRateLimit_(config.maxPerHour)) {
        return recruitJsonResponse_({ ok: false, error: "rate_limited" });
      }

      var row = recruitAppendRow_(sheet, payload, config);
      var storeMailStatus = recruitSendStoreMail_(payload, config);
      var applicantReceiptStatus = recruitSendApplicantReceipt_(payload, config);
      sheet.getRange(row, 19, 1, 3).setValues([[
        storeMailStatus,
        applicantReceiptStatus,
        storeMailStatus === "sent" ? "received" : "mail_failed"
      ]]);

      if (storeMailStatus === "sent") {
        CacheService.getScriptCache().put(
          "recruit-submission:" + payload.submissionId,
          "1",
          RECRUIT_SUBMISSION_CACHE_SECONDS
        );
        recruitRememberApplication_(payload);
      }
      return recruitJsonResponse_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error("Recruit application failed: " + String(error && error.message || "unknown"));
    return recruitJsonResponse_({ ok: false, error: "request_failed" });
  }
}

function recruitGetConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var toMail = properties.getProperty("TO_MAIL");
  var sheetId = properties.getProperty("SHEET_ID");
  var maxPerHour = Number(properties.getProperty("MAX_PER_HOUR") || "20");
  var salonName = properties.getProperty("SALON_NAME") || "身悠晏";
  var timeZone = properties.getProperty("TIME_ZONE") || "Asia/Tokyo";
  var sheetName = properties.getProperty("SHEET_NAME") || "Recruit Applications";

  if (!toMail || !sheetId) throw new Error("Required Script Properties are missing");
  if (!Number.isInteger(maxPerHour) || maxPerHour < 1 || maxPerHour > 200) {
    throw new Error("MAX_PER_HOUR is invalid");
  }
  if (timeZone !== "Asia/Tokyo") throw new Error("TIME_ZONE must be Asia/Tokyo");

  return {
    toMail: toMail,
    sheetId: sheetId,
    maxPerHour: maxPerHour,
    salonName: recruitSanitizeText_(salonName, 80),
    timeZone: timeZone,
    sheetName: recruitSanitizeText_(sheetName, 80)
  };
}

function recruitValidatePayload_(raw) {
  var limits = {
    requestType: 20,
    name: 60,
    contactMethod: 20,
    contactValue: 160,
    experience: 40,
    workStyle: 60,
    skills: 200,
    availability: 200,
    visitDate: 10,
    source: 80,
    message: 500,
    originJob: 40,
    originPage: 120,
    utm_source: 120,
    utm_medium: 120,
    utm_campaign: 120,
    utm_content: 120,
    submissionId: 80,
    startedAt: 40
  };
  var data = {};
  Object.keys(limits).forEach(function (key) {
    data[key] = recruitSanitizeText_(raw[key], limits[key]);
  });

  ["requestType", "name", "contactMethod", "contactValue", "experience", "workStyle", "submissionId", "startedAt"].forEach(function (key) {
    if (!data[key]) throw new Error("Required field missing");
  });
  if (data.requestType !== "recruit") throw new Error("Request type is invalid");
  if (["LINE", "メール", "電話"].indexOf(data.contactMethod) === -1) throw new Error("Contact method is invalid");
  if (["未経験", "1年未満", "1年以上3年未満", "3年以上", "ブランクあり"].indexOf(data.experience) === -1) {
    throw new Error("Experience is invalid");
  }
  if (["業務委託", "正社員・契約社員", "アルバイト・パート", "未経験研修枠", "まだ決めていない"].indexOf(data.workStyle) === -1) {
    throw new Error("Work style is invalid");
  }
  if (data.contactMethod === "メール" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactValue)) {
    throw new Error("Contact email is invalid");
  }
  if (data.visitDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.visitDate)) throw new Error("Visit date is invalid");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.submissionId)) {
    throw new Error("Submission ID is invalid");
  }

  var startedAt = Date.parse(data.startedAt);
  var age = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || age < RECRUIT_MIN_FORM_AGE_MS || age > RECRUIT_MAX_FORM_AGE_MS) {
    throw new Error("Form age is invalid");
  }
  return data;
}

function recruitSanitizeText_(value, maxLength) {
  var text = String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (text.length > maxLength) throw new Error("Field is too long");
  return text;
}

function recruitSanitizeSheetValue_(value) {
  var text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function recruitGetSheet_(config) {
  var spreadsheet = SpreadsheetApp.openById(config.sheetId);
  var sheet = spreadsheet.getSheetByName(config.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(config.sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(RECRUIT_HEADERS);
  return sheet;
}

function recruitIsDuplicateSubmission_(sheet, submissionId) {
  if (CacheService.getScriptCache().get("recruit-submission:" + submissionId) === "1") return true;
  if (sheet.getLastRow() < 2) return false;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(submissionId)
    .matchEntireCell(true)
    .findNext() != null;
}

function recruitNormalize_(value) {
  return String(value == null ? "" : value).trim().toLowerCase().replace(/\s+/g, " ");
}

function recruitFingerprint_(payload) {
  var source = [
    recruitNormalize_(payload.name),
    recruitNormalize_(payload.contactValue),
    recruitNormalize_(payload.workStyle)
  ].join("|");
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source, Utilities.Charset.UTF_8)
    .map(function (byte) {
      var value = (byte + 256) % 256;
      return ("0" + value.toString(16)).slice(-2);
    }).join("");
}

function recruitIsDuplicateApplication_(sheet, payload) {
  var cacheKey = "recruit-fingerprint:" + recruitFingerprint_(payload);
  if (CacheService.getScriptCache().get(cacheKey) === "1") return true;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var startRow = Math.max(2, lastRow - 49);
  var rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, 21).getValues();
  var cutoff = Date.now() - RECRUIT_DUPLICATE_WINDOW_SECONDS * 1000;
  for (var index = rows.length - 1; index >= 0; index--) {
    var receivedAt = Date.parse(String(rows[index][1] || "").replace(" ", "T") + "+09:00");
    if (!Number.isFinite(receivedAt) || receivedAt < cutoff) continue;
    if (
      recruitNormalize_(rows[index][2]) === recruitNormalize_(payload.name) &&
      recruitNormalize_(rows[index][4]) === recruitNormalize_(payload.contactValue) &&
      recruitNormalize_(rows[index][6]) === recruitNormalize_(payload.workStyle)
    ) return true;
  }
  return false;
}

function recruitRememberApplication_(payload) {
  CacheService.getScriptCache().put(
    "recruit-fingerprint:" + recruitFingerprint_(payload),
    "1",
    RECRUIT_DUPLICATE_WINDOW_SECONDS
  );
}

function recruitCheckRateLimit_(maxPerHour) {
  var bucket = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMddHH");
  var key = "recruit-rate:" + bucket;
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get(key) || "0");
  if (count >= maxPerHour) return false;
  cache.put(key, String(count + 1), 3700);
  return true;
}

function recruitAppendRow_(sheet, payload, config) {
  var receivedAt = Utilities.formatDate(new Date(), config.timeZone, "yyyy-MM-dd HH:mm:ss");
  var row = [
    payload.submissionId,
    receivedAt,
    payload.name,
    payload.contactMethod,
    payload.contactValue,
    payload.experience,
    payload.workStyle,
    payload.skills,
    payload.availability,
    payload.visitDate,
    payload.source,
    payload.message,
    payload.originJob,
    payload.originPage,
    payload.utm_source,
    payload.utm_medium,
    payload.utm_campaign,
    payload.utm_content,
    "pending",
    "not_applicable",
    "recorded"
  ].map(recruitSanitizeSheetValue_);
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function recruitBuildStoreMail_(payload, config) {
  var subject = ("【採用相談】" + payload.workStyle + "｜" + payload.name + "様").replace(/[\r\n]+/g, " ").slice(0, 160);
  var body = [
    config.salonName + " 採用相談",
    "",
    "お名前: " + payload.name,
    "希望連絡方法: " + payload.contactMethod,
    "連絡先: " + payload.contactValue,
    "施術経験: " + payload.experience,
    "希望する働き方: " + payload.workStyle,
    "対応できる施術: " + (payload.skills || "未記入"),
    "希望曜日・時間帯: " + (payload.availability || "未記入"),
    "見学希望日: " + (payload.visitDate || "未定"),
    "募集を知った場所: " + (payload.source || "未記入"),
    "質問・相談内容: " + (payload.message || "なし"),
    "",
    "入口求人: " + (payload.originJob || "general"),
    "入口ページ: " + (payload.originPage || "未記入"),
    "流入: " + [payload.utm_source, payload.utm_medium, payload.utm_campaign, payload.utm_content].filter(Boolean).join(" / ")
  ].join("\n");
  return { subject: subject, body: body };
}

function recruitSendStoreMail_(payload, config) {
  var mail = recruitBuildStoreMail_(payload, config);
  try {
    MailApp.sendEmail({
      to: config.toMail,
      subject: mail.subject,
      body: mail.body,
      name: config.salonName + " 採用受付",
      replyTo: payload.contactMethod === "メール" ? payload.contactValue : config.toMail
    });
    return "sent";
  } catch (error) {
    console.error("Recruit store mail failed: " + String(error && error.message || "unknown"));
    return "failed";
  }
}

function recruitSendApplicantReceipt_(payload, config) {
  if (payload.contactMethod !== "メール") return "not_applicable";
  try {
    MailApp.sendEmail({
      to: payload.contactValue,
      subject: "【" + config.salonName + "】採用相談を受け付けました",
      body: [
        payload.name + "様",
        "",
        config.salonName + "への採用相談を受け付けました。",
        "内容を確認後、担当者よりご連絡します。",
        "同じ内容を繰り返し送信する必要はありません。",
        "",
        "希望する働き方: " + payload.workStyle,
        "施術経験: " + payload.experience,
        "",
        config.salonName,
        "03-6874-6808"
      ].join("\n"),
      name: config.salonName + " 採用受付",
      replyTo: config.toMail
    });
    return "sent";
  } catch (error) {
    console.error("Recruit applicant receipt failed: " + String(error && error.message || "unknown"));
    return "failed";
  }
}

function recruitJsonResponse_(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

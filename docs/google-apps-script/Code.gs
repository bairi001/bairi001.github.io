/**
 * 身悠晏网页预约 Google Apps Script 模板。
 *
 * 必须通过 Script Properties 配置：
 * TO_MAIL, SHEET_ID, MAX_PER_HOUR, SALON_NAME, TIME_ZONE
 *
 * 不要在此文件写入真实邮箱、表格 ID、密码或 Webhook。
 */

var SERVICE_NAME = "shinyuuan-booking";
var SERVICE_VERSION = "5";
var MAX_PAYLOAD_BYTES = 20000;
var MIN_FORM_AGE_MS = 2000;
var MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
var SUBMISSION_CACHE_SECONDS = 21600;
var DUPLICATE_WINDOW_SECONDS = 300;
var BOOKING_SHEET_NAME = "工作表1";
var STATUS_LOG_SHEET_NAME = "Booking_Status_Log";
var STATUS_COLUMN_START = 24; // X
var STATUS_COLUMN_COUNT = 6;  // X:AC
var STATUS_EDITABLE_COLUMNS = {
  24: "booking_status",
  25: "same_room_status",
  26: "scheduled_at_jst",
  28: "final_amount_yen"
};
var STATUS_DERIVED_COLUMNS = {
  27: "reschedule_count",
  29: "status_updated_at_jst"
};
var BOOKING_STATUS_VALUES = ["requested", "confirmed", "rescheduled", "cancelled", "arrived"];
var SAME_ROOM_STATUS_VALUES = ["not_requested", "pending", "confirmed", "unavailable", "alternative_agreed"];
var STATUS_LOG_SOURCE_VALUES = ["web_booking", "sheet_operator", "system"];
var STATUS_LOG_HEADERS = [
  "log_id",
  "event_at_jst",
  "submission_id",
  "event_type",
  "field_name",
  "old_value",
  "new_value",
  "booking_status",
  "same_room_status",
  "scheduled_at_jst",
  "reschedule_count",
  "final_amount_yen",
  "source",
  "note"
];
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
  "processing_status",
  "addons",
  "addons_label",
  "nomination",
  "nomination_label",
  "same_room_requested",
  "booking_status",
  "same_room_status",
  "scheduled_at_jst",
  "reschedule_count",
  "final_amount_yen",
  "status_updated_at_jst"
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

      // 客户预约主记录与邮件结果是主链路；created 日志失败不能让客户预约失败或重发。
      appendCreatedStatusLogBestEffort_(booking, payload, config);

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
    addons: 240,
    addonsLabel: 700,
    nomination: 40,
    nominationLabel: 160,
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
  data.sameRoomRequested = raw.sameRoomRequested === true;
  if (data.sameRoomRequested && data.guests !== "2") {
    throw new Error("Same-room request requires exactly two guests");
  }
  if (!/^(?:ja|en|zh|ko)$/.test(data.lang)) {
    throw new Error("Language is invalid");
  }
  if (data.addons && !/^(?:(?:calves|decollete|abdominal|callus|hand|head|facial|extension)(?:,(?:calves|decollete|abdominal|callus|hand|head|facial|extension))*)$/.test(data.addons)) {
    throw new Error("Add-ons are invalid");
  }
  if (data.nomination && !/^(?:none|therapist|manager)$/.test(data.nomination)) {
    throw new Error("Nomination is invalid");
  }
  if (!data.nomination) data.nomination = "none";
  if (!data.nominationLabel) data.nominationLabel = data.nomination === "none" ? "none" : data.nomination;
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

function getBookingSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(BOOKING_SHEET_NAME);
  if (!sheet) throw new Error("Booking sheet is missing: " + BOOKING_SHEET_NAME);
  return sheet;
}

function assertSheetHeaders_(sheet, expectedHeaders, label) {
  if (sheet.getMaxColumns() < expectedHeaders.length) {
    throw new Error(label + " requires at least " + expectedHeaders.length + " columns");
  }
  if (sheet.getLastRow() < 1) {
    throw new Error(label + " header row is missing");
  }
  var actual = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  for (var index = 0; index < expectedHeaders.length; index++) {
    if (String(actual[index] || "").trim() !== expectedHeaders[index]) {
      throw new Error(label + " header mismatch at column " + (index + 1));
    }
  }
}

function assertBookingSheetReady_(sheet) {
  assertSheetHeaders_(sheet, SHEET_HEADERS, "Booking sheet");
}

function getStatusLogSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(STATUS_LOG_SHEET_NAME);
  if (!sheet) throw new Error("Status log sheet is missing: " + STATUS_LOG_SHEET_NAME);
  assertSheetHeaders_(sheet, STATUS_LOG_HEADERS, "Booking status log");
  return sheet;
}

function isDuplicateSubmission_(submissionId, sheetId) {
  if (CacheService.getScriptCache().get("submission:" + submissionId) === "1") return true;
  var sheet = getBookingSheet_(SpreadsheetApp.openById(sheetId));
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

function normalizeSameRoomKey_(value) {
  var normalized = normalizeBookingKey_(value);
  return normalized === "true" || normalized === "yes" || normalized === "1" ? "true" : "false";
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
    normalizeBookingKey_(payload.addons),
    normalizeBookingKey_(payload.nomination || "none"),
    normalizeSameRoomKey_(payload.sameRoomRequested),
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
    normalizeBookingKey_(row[9]) === normalizeBookingKey_(payload.email) &&
    normalizeBookingKey_(row[18]) === normalizeBookingKey_(payload.addons) &&
    normalizeBookingKey_(row[20] || "none") === normalizeBookingKey_(payload.nomination || "none") &&
    normalizeSameRoomKey_(row[22]) === normalizeSameRoomKey_(payload.sameRoomRequested);
}

function isDuplicateBooking_(payload, config) {
  var cacheKey = "booking:" + bookingFingerprint_(payload);
  if (CacheService.getScriptCache().get(cacheKey) === "1") return true;
  var sheet = getBookingSheet_(SpreadsheetApp.openById(config.sheetId));
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var startRow = Math.max(2, lastRow - 99);
  var rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, 23).getValues();
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
  var sheet = getBookingSheet_(spreadsheet);
  assertBookingSheetReady_(sheet);

  var receivedAt = Utilities.formatDate(new Date(), config.timeZone, "yyyy-MM-dd HH:mm:ss");
  var initialBookingStatus = "requested";
  var initialSameRoomStatus = payload.sameRoomRequested ? "pending" : "not_requested";
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
    "recorded",
    payload.addons,
    payload.addonsLabel,
    payload.nomination,
    payload.nominationLabel,
    payload.sameRoomRequested ? "TRUE" : "FALSE",
    initialBookingStatus,
    initialSameRoomStatus,
    "",
    0,
    "",
    receivedAt
  ].map(sanitizeSheetValue_);

  sheet.appendRow(row);
  return {
    sheet: sheet,
    row: sheet.getLastRow(),
    bookingStatus: initialBookingStatus,
    sameRoomStatus: initialSameRoomStatus,
    scheduledAtJst: "",
    rescheduleCount: 0,
    finalAmountYen: "",
    statusUpdatedAtJst: receivedAt
  };
}

function appendStatusLog_(spreadsheet, entry, timeZone) {
  if (!containsValue_(STATUS_LOG_SOURCE_VALUES, entry.source)) {
    throw new Error("Status log source is invalid");
  }
  var sheet = getStatusLogSheet_(spreadsheet);
  var eventAt = Utilities.formatDate(new Date(), timeZone || "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  var row = [
    Utilities.getUuid(),
    eventAt,
    entry.submissionId,
    entry.eventType,
    entry.fieldName,
    entry.oldValue,
    entry.newValue,
    entry.bookingStatus,
    entry.sameRoomStatus,
    entry.scheduledAtJst,
    entry.rescheduleCount,
    entry.finalAmountYen,
    entry.source,
    entry.note
  ].map(sanitizeSheetValue_);
  sheet.appendRow(row);
  return { sheet: sheet, row: sheet.getLastRow() };
}

function appendCreatedStatusLogBestEffort_(booking, payload, config) {
  try {
    appendStatusLog_(booking.sheet.getParent(), {
      submissionId: payload.submissionId,
      eventType: "created",
      fieldName: "",
      oldValue: "",
      newValue: "requested",
      bookingStatus: booking.bookingStatus,
      sameRoomStatus: booking.sameRoomStatus,
      scheduledAtJst: booking.scheduledAtJst,
      rescheduleCount: booking.rescheduleCount,
      finalAmountYen: booking.finalAmountYen,
      source: "web_booking",
      note: ""
    }, config.timeZone);
  } catch (error) {
    // fail-open for created log: 客户预约主记录/邮件成功后，日志故障不能让前端报错或触发重试。
    console.error("Booking created status log failed: " + String(error && error.message || "unknown"));
  }
}

function statusStateFromRow_(values) {
  return {
    booking_status: String(values[0] == null ? "" : values[0]).trim(),
    same_room_status: String(values[1] == null ? "" : values[1]).trim(),
    scheduled_at_jst: String(values[2] == null ? "" : values[2]).trim(),
    reschedule_count: Number(values[3] || 0),
    final_amount_yen: values[4] == null ? "" : values[4],
    status_updated_at_jst: String(values[5] == null ? "" : values[5]).trim()
  };
}

function statusStateToRow_(state) {
  return [[
    state.booking_status,
    state.same_room_status,
    state.scheduled_at_jst,
    state.reschedule_count,
    state.final_amount_yen,
    state.status_updated_at_jst
  ]];
}

function containsValue_(values, value) {
  return values.indexOf(value) !== -1;
}

function normalizeScheduledAtJst_(value, timeZone) {
  if (value === "" || value == null) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, "yyyy-MM-dd HH:mm");
  }
  var text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
    throw new Error("scheduled_at_jst must be YYYY-MM-DD HH:MM");
  }
  var parsed = new Date(text.replace(" ", "T") + ":00+09:00");
  if (!Number.isFinite(parsed.getTime()) || Utilities.formatDate(parsed, timeZone, "yyyy-MM-dd HH:mm") !== text) {
    throw new Error("scheduled_at_jst is invalid");
  }
  return text;
}

function normalizeFinalAmountYen_(value) {
  if (value === "" || value == null) return "";
  var text = String(value).replace(/,/g, "").trim();
  if (!/^\d+$/.test(text)) throw new Error("final_amount_yen must be a non-negative integer");
  var amount = Number(text);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000) {
    throw new Error("final_amount_yen is out of range");
  }
  return amount;
}

function normalizeStatusEditValue_(fieldName, value, timeZone) {
  if (fieldName === "booking_status") {
    var bookingStatus = String(value == null ? "" : value).trim();
    if (!containsValue_(BOOKING_STATUS_VALUES, bookingStatus)) throw new Error("booking_status is invalid");
    return bookingStatus;
  }
  if (fieldName === "same_room_status") {
    var sameRoomStatus = String(value == null ? "" : value).trim();
    if (!containsValue_(SAME_ROOM_STATUS_VALUES, sameRoomStatus)) throw new Error("same_room_status is invalid");
    return sameRoomStatus;
  }
  if (fieldName === "scheduled_at_jst") {
    return normalizeScheduledAtJst_(value, timeZone);
  }
  if (fieldName === "final_amount_yen") {
    return normalizeFinalAmountYen_(value);
  }
  throw new Error("Unsupported status field");
}

function statusEventType_(fieldName, oldValue, newValue) {
  if (fieldName === "scheduled_at_jst") {
    return oldValue && newValue && oldValue !== newValue ? "rescheduled" : "scheduled_at_changed";
  }
  return fieldName + "_changed";
}

function notifyStatusEditError_(event, message) {
  try {
    if (event && event.source && typeof event.source.toast === "function") {
      event.source.toast("状态更新未保存：" + message, "预约状态", 8);
    }
  } catch (ignored) {}
}

function installBookingStatusTrigger() {
  var config = getConfig_();
  var handler = "onBookingStatusEdit";
  var triggers = ScriptApp.getProjectTriggers();
  var kept = null;

  triggers.forEach(function (trigger) {
    if (trigger.getHandlerFunction() !== handler) return;
    var sameSource = false;
    try {
      sameSource = trigger.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS &&
        trigger.getTriggerSourceId() === config.sheetId &&
        trigger.getEventType() === ScriptApp.EventType.ON_EDIT;
    } catch (ignored) {}

    if (!kept && sameSource) {
      kept = trigger;
    } else {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  if (!kept) {
    kept = ScriptApp.newTrigger(handler)
      .forSpreadsheet(config.sheetId)
      .onEdit()
      .create();
  }
  return kept.getUniqueId ? kept.getUniqueId() : "installed";
}

function onBookingStatusEdit(e) {
  if (!e || !e.range) return;
  var range = e.range;
  var sheet = range.getSheet();
  if (sheet.getName() !== BOOKING_SHEET_NAME) return;
  if (range.getRow() <= 1) return;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

  var column = range.getColumn();
  var fieldName = STATUS_EDITABLE_COLUMNS[column] || STATUS_DERIVED_COLUMNS[column];
  if (!fieldName) return;

  var oldValue = typeof e.oldValue === "undefined" ? "" : e.oldValue;
  var newRawValue = range.getValue();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    try { range.setValue(oldValue); } catch (ignored) {}
    notifyStatusEditError_(e, "其他状态更新正在处理中，请稍后重试");
    throw new Error("Booking status edit lock timeout");
  }

  var statusRange;
  var oldState;
  var logRecord = null;
  try {
    var spreadsheet = sheet.getParent();
    assertBookingSheetReady_(sheet);
    getStatusLogSheet_(spreadsheet); // fail-closed: 没有审计日志表就不接受人工状态编辑。

    statusRange = sheet.getRange(range.getRow(), STATUS_COLUMN_START, 1, STATUS_COLUMN_COUNT);
    oldState = statusStateFromRow_(statusRange.getValues()[0]);

    // e.range 已经被用户改写；先重建编辑前状态并恢复，再写审计日志。
    oldState[fieldName] = oldValue;
    if (STATUS_DERIVED_COLUMNS[column]) {
      statusRange.setValues(statusStateToRow_(oldState));
      throw new Error(fieldName + " is derived and cannot be edited directly");
    }
    statusRange.setValues(statusStateToRow_(oldState));

    var config = getConfig_();
    if (spreadsheet.getId() !== config.sheetId) throw new Error("Booking status trigger is attached to the wrong spreadsheet");

    var normalizedNewValue = normalizeStatusEditValue_(fieldName, newRawValue, config.timeZone);
    var newState = {
      booking_status: oldState.booking_status,
      same_room_status: oldState.same_room_status,
      scheduled_at_jst: oldState.scheduled_at_jst,
      reschedule_count: Number(oldState.reschedule_count || 0),
      final_amount_yen: oldState.final_amount_yen,
      status_updated_at_jst: oldState.status_updated_at_jst
    };
    newState[fieldName] = normalizedNewValue;

    if (
      fieldName === "scheduled_at_jst" &&
      oldState.scheduled_at_jst &&
      normalizedNewValue &&
      oldState.scheduled_at_jst !== normalizedNewValue
    ) {
      newState.reschedule_count += 1;
    }
    newState.status_updated_at_jst = Utilities.formatDate(new Date(), config.timeZone, "yyyy-MM-dd HH:mm:ss");

    var submissionId = String(sheet.getRange(range.getRow(), 1).getValue() || "").trim();
    if (!submissionId) throw new Error("submission_id is missing");

    logRecord = appendStatusLog_(spreadsheet, {
      submissionId: submissionId,
      eventType: statusEventType_(fieldName, String(oldState[fieldName] || ""), String(normalizedNewValue == null ? "" : normalizedNewValue)),
      fieldName: fieldName,
      oldValue: String(oldState[fieldName] == null ? "" : oldState[fieldName]),
      newValue: String(normalizedNewValue == null ? "" : normalizedNewValue),
      bookingStatus: newState.booking_status,
      sameRoomStatus: newState.same_room_status,
      scheduledAtJst: newState.scheduled_at_jst,
      rescheduleCount: newState.reschedule_count,
      finalAmountYen: newState.final_amount_yen,
      source: "sheet_operator",
      note: ""
    }, config.timeZone);

    try {
      statusRange.setValues(statusStateToRow_(newState));
    } catch (writeError) {
      try { logRecord.sheet.deleteRow(logRecord.row); } catch (cleanupError) {
        console.error("Booking status log rollback failed");
      }
      statusRange.setValues(statusStateToRow_(oldState));
      throw writeError;
    }
  } catch (error) {
    if (statusRange && oldState) {
      try { statusRange.setValues(statusStateToRow_(oldState)); } catch (restoreError) {
        console.error("Booking status rollback failed");
      }
    } else {
      try { range.setValue(oldValue); } catch (ignored) {}
    }
    console.error("Booking status edit rejected: " + String(error && error.message || "unknown"));
    notifyStatusEditError_(e, String(error && error.message || "unknown"));
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function buildBookingMail_(payload) {
  var templates = {
    ja: {subject: "【身悠晏】ご予約リクエスト ", title: "身悠晏 ご予約リクエスト", language: "言語", course: "コース", date: "日付", time: "時間", guests: "人数", sameRoom: "2名同室", sameRoomRequested: "希望あり（未確定）", noSameRoom: "希望なし", addons: "追加オプション", nomination: "指名", name: "お名前", email: "メール", phone: "電話", note: "備考", noPhone: "未入力", noNote: "なし", noAddons: "なし", noNomination: "指名なし", closing: "最終料金は店舗からの返信にてご確認ください。"},
    en: {subject: "[Shin Yuu An] Booking Request ", title: "Shin Yuu An Booking Request", language: "Language", course: "Course", date: "Date", time: "Time", guests: "Guests", sameRoom: "Same room", sameRoomRequested: "Requested (pending confirmation)", noSameRoom: "Not requested", addons: "Add-ons", nomination: "Nomination", name: "Name", email: "Email", phone: "Phone", note: "Note", noPhone: "Not provided", noNote: "None", noAddons: "None", noNomination: "No nomination", closing: "The final price will be confirmed in the salon's reply."},
    zh: {subject: "【身悠晏】预约申请 ", title: "身悠晏 网页预约申请", language: "语言", course: "套餐", date: "日期", time: "时间", guests: "人数", sameRoom: "双人同室", sameRoomRequested: "已提出需求（尚未确认）", noSameRoom: "未提出", addons: "附加项目", nomination: "指定技师", name: "姓名", email: "邮箱", phone: "电话", note: "备注", noPhone: "未填写", noNote: "无", noAddons: "无", noNomination: "不指定技师", closing: "最终价格请由店铺回复确认。"},
    ko: {subject: "[신유안] 예약 요청 ", title: "신유안 예약 요청", language: "언어", course: "코스", date: "날짜", time: "시간", guests: "인원", sameRoom: "같은 방", sameRoomRequested: "요청됨 (아직 미확정)", noSameRoom: "요청 없음", addons: "추가 옵션", nomination: "지명", name: "이름", email: "이메일", phone: "전화번호", note: "메모", noPhone: "미입력", noNote: "없음", noAddons: "없음", noNomination: "지명 없음", closing: "최종 요금은 매장의 답변에서 확인해 주세요."}
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
    text.sameRoom + ": " + (payload.sameRoomRequested ? text.sameRoomRequested : text.noSameRoom),
    text.addons + ": " + (payload.addonsLabel || text.noAddons),
    text.nomination + ": " + (payload.nominationLabel || text.noNomination),
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

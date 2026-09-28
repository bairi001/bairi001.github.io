import { readFile } from "node:fs/promises";
import process from "node:process";
import vm from "node:vm";

const errors = [];
const source = await readFile(new URL("../docs/google-apps-script/Code.gs", import.meta.url), "utf8");
const requireText = (text, label = text) => {
  if (!source.includes(text)) errors.push(`Code.gs: missing ${label}`);
};
const forbidText = (text, label = text) => {
  if (source.includes(text)) errors.push(`Code.gs: still contains ${label}`);
};

try {
  new vm.Script(source, { filename: "docs/google-apps-script/Code.gs" });
} catch (error) {
  errors.push(`Code.gs syntax error: ${error.message}`);
}

for (const [text, label] of [
  ['var SERVICE_VERSION = "5"', "schema version 5"],
  ['var BOOKING_SHEET_NAME = "工作表1"', "explicit booking sheet name"],
  ['var STATUS_LOG_SHEET_NAME = "Booking_Status_Log"', "status log sheet name"],
  ['var STATUS_LOG_SOURCE_VALUES = ["web_booking", "sheet_operator", "system"]', "status log source allowlist"],
  ['var STATUS_COLUMN_START = 24', "status fields start at X"],
  ['var STATUS_COLUMN_COUNT = 6', "status fields span X:AC"],
  ['24: "booking_status"', "booking status editable field"],
  ['25: "same_room_status"', "same-room status editable field"],
  ['26: "scheduled_at_jst"', "scheduled time editable field"],
  ['29: "final_amount_yen"', "final amount editable field"],
  ['27: "reschedule_count"', "reschedule count derived field"],
  ['28: "last_rescheduled_at_jst"', "last rescheduled timestamp derived field"],
  ['var BOOKING_STATUS_VALUES = ["requested", "confirmed", "cancelled", "arrived", "no_show"]', "booking status lifecycle without rescheduled terminal state"],
  ['"booking_status",\n  "same_room_status",\n  "scheduled_at_jst",\n  "reschedule_count",\n  "last_rescheduled_at_jst",\n  "final_amount_yen"', "X:AC v5 booking headers"],
  ['"log_id",\n  "event_at_jst",\n  "submission_id",\n  "event_type",\n  "field_name",\n  "old_value",\n  "new_value",\n  "booking_status",\n  "same_room_status",\n  "scheduled_at_jst",\n  "reschedule_count",\n  "final_amount_yen",\n  "source",\n  "note"', "append-only status log schema"],
  ['getSheetByName(BOOKING_SHEET_NAME)', "named booking sheet lookup"],
  ['getSheetByName(STATUS_LOG_SHEET_NAME)', "named log sheet lookup"],
  ['function installBookingStatusTrigger()', "idempotent trigger installer"],
  ['ScriptApp.getProjectTriggers()', "existing trigger enumeration"],
  ['ScriptApp.deleteTrigger(trigger)', "duplicate trigger cleanup"],
  ['.forSpreadsheet(config.sheetId)', "trigger bound to booking spreadsheet"],
  ['.onEdit()', "installable edit trigger"],
  ['function onBookingStatusEdit(e)', "booking status edit handler"],
  ['range.getNumRows() !== 1 || range.getNumColumns() !== 1', "single-cell edit guard"],
  ['rejectBatchStatusEdit_(e)', "batch status edit rejection path"],
  ['function restoreStatusRowAfterRejectedBatch_', "batch edit restoration"],
  ['function latestStatusStateFromLog_', "audit-log state restoration"],
  ['var STATUS_MODEL_START_ROW_PROPERTY = "BOOKING_STATUS_V5_START_ROW"', "v5 model start-row guard"],
  ['var lock = LockService.getScriptLock()', "status edit lock"],
  ['if (!lock.tryLock(10000))', "status edit lock timeout"],
  ['source: "web_booking"', "created-event source"],
  ['source: "sheet_operator"', "operator-event source"],
  ['containsValue_(STATUS_LOG_SOURCE_VALUES, entry.source)', "status log source validation"],
  ['oldValue:', "audit old value"],
  ['newValue:', "audit new value"],
  ['eventType: "created"', "created audit event"],
  ['fail-open for created log', "customer-booking log fail-open strategy"],
  ['fail-closed', "operator-edit audit fail-closed strategy"],
  ['logRecord.sheet.deleteRow(logRecord.row)', "log rollback if main status write fails"],
  ['statusRange.setValues(statusStateToRow_(oldState))', "main status rollback"],
  ['scheduled_at_jst: normalizeScheduledAtJst_(values[2], timeZone)', "Sheet Date normalization for scheduled time"],
  ['last_rescheduled_at_jst: normalizeLastRescheduledAtJst_(values[4], timeZone)', "Sheet Date normalization for last reschedule timestamp"],
  ['requestedScheduledAtJst_(payload.date, payload.time, config.timeZone)', "initial scheduled time derived from original requested date/time"],
  ['fieldName === "scheduled_at_jst"', "reschedule-count derivation trigger"],
  ['newState.reschedule_count += 1', "reschedule-count increment"],
  ['newState.last_rescheduled_at_jst = Utilities.formatDate', "last reschedule timestamp derivation"],
  ['if (STATUS_DERIVED_COLUMNS[column])', "derived-field direct-edit guard"]
]) requireText(text, label);

for (const [text, label] of [
  ['getSheets()[0]', "positional first-sheet lookup"],
  ['insertColumnsAfter(', "automatic production column expansion"],
  ['insertSheet(STATUS_LOG_SHEET_NAME', "automatic production log-sheet creation"],
  ['status_updated_at_jst', "rejected status-updated column"],
  ['"requested", "confirmed", "rescheduled", "cancelled", "arrived"', "rescheduled as a booking status"],
  ['if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;', "silent acceptance of batch status edits"]
]) forbidText(text, label);

// Exercise the trigger installer with a small Apps Script mock:
// repeated installation must leave exactly one target onEdit trigger and preserve unrelated triggers.
try {
  const context = vm.createContext({ console });
  new vm.Script(source).runInContext(context);
  context.getConfig_ = () => ({ sheetId: "BOOKING_SHEET_ID" });

  let nextId = 10;
  const makeTrigger = (handler, sourceId = "BOOKING_SHEET_ID", eventType = "ON_EDIT", triggerSource = "SPREADSHEETS") => ({
    id: `t${nextId++}`,
    getHandlerFunction: () => handler,
    getTriggerSourceId: () => sourceId,
    getEventType: () => eventType,
    getTriggerSource: () => triggerSource,
    getUniqueId() { return this.id; }
  });

  let projectTriggers = [
    makeTrigger("unrelatedHandler"),
    makeTrigger("onBookingStatusEdit"),
    makeTrigger("onBookingStatusEdit"),
    makeTrigger("onBookingStatusEdit", "WRONG_SHEET")
  ];

  context.ScriptApp = {
    TriggerSource: { SPREADSHEETS: "SPREADSHEETS" },
    EventType: { ON_EDIT: "ON_EDIT" },
    getProjectTriggers: () => projectTriggers.slice(),
    deleteTrigger: trigger => { projectTriggers = projectTriggers.filter(item => item !== trigger); },
    newTrigger: handler => ({
      forSpreadsheet: sheetId => ({
        onEdit: () => ({
          create: () => {
            const created = makeTrigger(handler, sheetId);
            projectTriggers.push(created);
            return created;
          }
        })
      })
    })
  };

  context.installBookingStatusTrigger();
  context.installBookingStatusTrigger();
  const targets = projectTriggers.filter(t => t.getHandlerFunction() === "onBookingStatusEdit");
  const unrelated = projectTriggers.filter(t => t.getHandlerFunction() === "unrelatedHandler");
  if (targets.length !== 1) errors.push(`trigger installer left ${targets.length} target triggers instead of 1`);
  if (unrelated.length !== 1) errors.push("trigger installer removed an unrelated project trigger");
} catch (error) {
  errors.push(`trigger installer mock failed: ${error.message}`);
}

if (errors.length) {
  console.error(`Booking status v5 check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Booking status v5 check passed: named-sheet access, X:AC lifecycle fields, single-cell/lock guards, idempotent trigger installation, audit log fields and fail-open/fail-closed behavior are protected.");

// Executes the booking handler with only in-memory Google services.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../docs/google-apps-script/Code.gs", import.meta.url), "utf8");
const payload = {
  submissionId: randomUUID(), startedAt: new Date(Date.now() - 5000).toISOString(),
  courseId: "aroma60", courseLabel: "Aroma 60", guests: "2", sameRoomRequested: true,
  date: "2026-12-01", time: "13:00", name: "Offline", email: "offline@example.invalid",
  phone: "000", note: "Separate intention A", addons: "head", nomination: "manager", lang: "ja"
};
function fixture(fault) {
  const rows = [[]], logs = [], emails = [], cache = new Map();
  let locked = false, collision;
  const post = (data) => ctx.doPost({postData: {contents: JSON.stringify(data)}});
  const sheet = {
    getLastRow: () => rows.length,
    getParent: () => spreadsheet,
    appendRow(row) {
      assert.ok(locked);
      if (fault === "write") throw Error("Simulated sheet failure");
      if (fault === "overlap" && !collision) collision = post(payload);
      rows.push(row);
    },
    getRange(r, c, n = 1, m = 1) {
      return {
        getValues: () => rows.slice(r-1, r-1+n).map(row => row.slice(c-1, c-1+m)),
        setValues(values) {
          if (fault === "status") throw Error("Simulated notification status failure");
          values.forEach((v, i) => rows[r-1+i].splice(c-1, v.length, ...v));
        },
        createTextFinder: id => ({matchEntireCell: () => ({findNext: () => rows.find(row => row[0] === id) || null})})
      };
    }
  };
  const spreadsheet = {getSheetByName: () => sheet};
  const ctx = vm.createContext({
    console,
    SpreadsheetApp: {openById: () => spreadsheet, flush: () => assert.ok(locked)},
    LockService: {getScriptLock: () => ({
      tryLock() { if (locked) return false; locked = true; return true; },
      releaseLock() { locked = false; }
    })},
    MailApp: {
      getRemainingDailyQuota: () => fault === "quota" ? 0 : 10,
      sendEmail(mail) { if (fault === "mail") throw Error("Simulated mail failure"); emails.push(mail); }
    },
    CacheService: {getScriptCache: () => ({get: k => cache.get(k), put: (k,v) => cache.set(k,v)})},
    Utilities: {getUuid: randomUUID, newBlob: s => ({getBytes: () => Buffer.from(s)}),
      formatDate: (d,tz,fmt) => new Date(d.valueOf()+9*3600000).toISOString().replace("T"," ").slice(0,fmt.endsWith("ss") ? 19 : 16)}
  });
  vm.runInContext(source, ctx);
  Object.assign(ctx, {
    getConfig_: () => ({sheetId:"TEST",toMail:"store@example.invalid",timeZone:"Asia/Tokyo",maxPerHour:20}),
    assertBookingSheetReady_() {}, ensureStatusModelStartRow_() {},
    getStatusLogSheet_: () => ({appendRow: r => logs.push(r), getLastRow: () => logs.length+1}),
    jsonResponse_: x => JSON.parse(JSON.stringify(x))
  });
  return {rows, logs, emails, post, collision: () => collision};
}
const fresh = {ok:true, recorded:true, duplicate:false};
const duplicate = {ok:true, duplicate:true};
for (const fault of ["normal", "mail", "quota", "status", "overlap", "lost-response"]) {
  const f = fixture(fault);
  assert.deepEqual(f.post(payload), fresh);
  const row = f.rows[1];
  assert.equal(row.length, 29);
  assert.equal(row[16], ({mail:"failed", quota:"quota_unavailable", status:"pending"})[fault] || "sent");
  assert.equal(row[23], "requested");
  assert.equal(f.logs[0][2], payload.submissionId);
  assert.equal(f.logs[0][3], "created");
  if (fault === "overlap") assert.deepEqual(f.collision(), {ok:false, error:"busy"});
  // Shop updates after the primary write must survive a retransmission.
  row[23] = "confirmed"; row[28] = "5500";
  assert.deepEqual(f.post(payload), duplicate);
  assert.equal(f.rows.length-1, 1);
  assert.equal(f.logs.length, 1);
  assert.equal(row[23], "confirmed");
  assert.equal(row[28], "5500");
  assert.equal(f.emails.length, ["mail","quota"].includes(fault) ? 0 : 1);
  console.log("PASS", fault);
}
const write = fixture("write");
assert.equal(write.post(payload).ok, false);
assert.equal(write.rows.length-1, 0); assert.equal(write.emails.length, 0);
const trap = fixture();
assert.deepEqual(trap.post({...payload, website:"filled"}), duplicate);
assert.equal(trap.rows.length-1, 0); assert.equal(trap.logs.length, 0);
const intent = fixture();
assert.deepEqual(intent.post(payload), fresh);
assert.deepEqual(intent.post({...payload,submissionId:randomUUID()}), duplicate);
for (const change of [{name:"Second guest"}, {time:"14:00"}, {note:"Separate intention B"},
  {phone:"001"}, {sameRoomRequested:false}, {addons:"hand"}, {nomination:"none"}]) {
  assert.deepEqual(intent.post({...payload,submissionId:randomUUID(),...change}), fresh);
}
console.log("PASS write failure, opaque acknowledgement, short-window duplicate and distinct intentions");

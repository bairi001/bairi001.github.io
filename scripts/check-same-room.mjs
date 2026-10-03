import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const booking = readFileSync(new URL("../booking.html", import.meta.url), "utf8");
const backend = readFileSync(new URL("../docs/google-apps-script/Code.gs", import.meta.url), "utf8");

for (const [needle, label] of [
  ['id="sameRoomSection" hidden', "same-room UI starts hidden"],
  ['id="sameRoom"', "same-room checkbox exists"],
  ['const sameRoomRequested=()=>guests==="2"&&Boolean($("sameRoom")?.checked);', "same-room request requires exactly two guests"],
  ['sameRoomRequested:sameRoomRequested()', "same-room request reaches signature and web payload"],
  ['params.get("guests")==="2"', "two-guest URL preselection"],
  ['params.get("room")==="pair"', "pair-room URL preselection"],
  ['I18N.en.msgLabels.sameRoom="Same room"', "English WhatsApp label"],
  ['I18N.ja.msgLabels.sameRoom="2名同室"', "Japanese WhatsApp label"],
  ['I18N.zh.msgLabels.sameRoom="双人同室"', "Chinese WhatsApp label"],
  ['I18N.ko.msgLabels.sameRoom="같은 방"', "Korean WhatsApp label"]
]) {
  assert.ok(booking.includes(needle), label);
}

for (const [needle, label] of [
  ["2名同室に追加料金はかかりません", "Japanese no-room-fee rule"],
  ["すべてのコースで同室をリクエストでき", "Japanese all-course same-room rule"],
  ["備考欄に2人目のコース", "Japanese different-course note guidance"],
  ["There is no extra room fee for a same-room request", "English no-room-fee rule"],
  ["requested for any course", "English all-course same-room rule"],
  ["second guest's course in the Note field", "English different-course note guidance"],
  ["双人同室不收取额外房间费用", "Chinese no-room-fee rule"],
  ["所有课程均可提出同室申请", "Chinese all-course same-room rule"],
  ["备注栏填写第2位客人的课程", "Chinese different-course note guidance"],
  ["별도 객실 추가 요금은 없습니다", "Korean no-room-fee rule"],
  ["모든 코스에서 같은 공간을 요청할 수 있고", "Korean all-course same-room rule"],
  ["비고란에 두 번째 고객님의 코스", "Korean different-course note guidance"]
]) {
  assert.ok(booking.includes(needle), label);
}

const context = vm.createContext({
  console,
  Date,
  Utilities: {
    DigestAlgorithm: { SHA_256: "sha256" },
    Charset: { UTF_8: "utf8" },
    computeDigest: (_algorithm, value) => [...createHash("sha256").update(String(value), "utf8").digest()]
  }
});
new vm.Script(backend, { filename: "Code.gs" }).runInContext(context);

assert.equal(vm.runInContext("SERVICE_VERSION", context), "5");
assert.equal(vm.runInContext("SHEET_HEADERS.length", context), 29);
assert.equal(vm.runInContext("SHEET_HEADERS[22]", context), "same_room_requested");

const base = {
  courseId: "body60",
  courseLabel: "Body Care 60 min",
  date: "2026-10-01",
  time: "13:00",
  guests: "2",
  name: "Same Room Test",
  email: "same-room-test@example.com",
  phone: "",
  note: "Automated validation only",
  addons: "head",
  addonsLabel: "Eye & head massage (+10 min / ¥1,000)",
  nomination: "therapist",
  nominationLabel: "Therapist nomination (¥500)",
  sameRoomRequested: true,
  lang: "en",
  utm_source: "github_actions",
  utm_medium: "internal_test",
  utm_campaign: "same_room_v5",
  utm_content: "",
  submissionId: "123e4567-e89b-42d3-a456-426614174000",
  startedAt: new Date(Date.now() - 5000).toISOString()
};
context.raw = base;
const valid = vm.runInContext("validatePayload_(raw)", context);
assert.equal(valid.sameRoomRequested, true, "backend preserves true same-room request");
assert.equal(valid.guests, "2");

context.raw = { ...base, guests: "1" };
assert.throws(
  () => vm.runInContext("validatePayload_(raw)", context),
  /Same-room request requires exactly two guests/,
  "backend rejects same-room request for one guest"
);

context.a = valid;
context.b = { ...valid, sameRoomRequested: false };
assert.notEqual(
  vm.runInContext("bookingFingerprint_(a)", context),
  vm.runInContext("bookingFingerprint_(b)", context),
  "same-room choice changes duplicate fingerprint"
);

const row = Array(29).fill("");
row[3] = valid.courseId;
row[5] = valid.date;
row[6] = valid.time;
row[7] = valid.guests;
row[8] = valid.name;
row[9] = valid.email;
row[18] = valid.addons;
row[20] = valid.nomination;
row[22] = "TRUE";
context.row = row;
assert.equal(vm.runInContext("bookingRowMatches_(row,a)", context), true, "column W true matches same-room request");
assert.equal(vm.runInContext("bookingRowMatches_(row,b)", context), false, "column W distinguishes same-room choice");
row[22] = "";
assert.equal(vm.runInContext("bookingRowMatches_(row,b)", context), true, "legacy blank W is treated as no same-room request");

const mail = vm.runInContext("buildBookingMail_(a)", context);
assert.match(mail.body, /Same room: Requested \(pending confirmation\)/, "store email marks same-room request as pending, not confirmed");

console.log("Same-room booking request passed: two-guest UI contract, URL preselection, v5 validation, duplicate identity, column W persistence contract and pending-confirmation email wording.");

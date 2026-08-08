import { readFile } from "node:fs/promises";
import process from "node:process";

const root = new URL("../", import.meta.url);
const prices = JSON.parse(await readFile(new URL("data/prices.json", root), "utf8"));
const files = Object.fromEntries(
  await Promise.all(
    ["menu.html", "en/index.html", "booking.html", "zh/index.html", "ko/index.html"].map(async file => [
      file,
      await readFile(new URL(file, root), "utf8")
    ])
  )
);

const byId = Object.fromEntries(prices.items.map(item => [item.id, item]));
const errors = [];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compact = value => value.replace(/,/g, "").replace(/\s+/g, " ");

function expect(file, description, pattern) {
  const source = file === "booking.html"
    ? files[file].replace(/\s+/g, " ")
    : compact(files[file]);
  if (!pattern.test(source)) errors.push(`${file}: ${description}`);
}

function price(id) {
  return byId[id].price;
}

function duration(id) {
  return byId[id].duration;
}

function htmlPattern(label, id) {
  return new RegExp(`${escape(label)}[\\s\\S]{0,180}?(?:${duration(id)}(?:分钟|분|分|min))?[\\s\\S]{0,100}?(?:¥)?${price(id)}(?:円)?`, "i");
}

// Japanese menu: only assert entries that are rendered there.
expect("menu.html", "整体60分价格不一致", /整体ボディケア[\s\S]{0,1200}?60分<\/th><td>3980円/i);
expect("menu.html", "足裏45分价格不一致", /足裏リフレクソロジー[\s\S]{0,1200}?45分<\/th><td>3980円/i);
expect("menu.html", "足裏60分价格不一致", /足裏リフレクソロジー[\s\S]{0,1200}?60分<\/th><td>4980円/i);
expect("menu.html", "香薰60分价格不一致", /アロマリンパ・オイル[\s\S]{0,1200}?60分<\/th><td>4980円/i);
expect("menu.html", "香薰90分价格不一致", /アロマリンパ・オイル[\s\S]{0,1200}?90分<\/th><td>7800円/i);
expect("menu.html", "香薰120分价格不一致", /アロマリンパ・オイル[\s\S]{0,1200}?120分<\/th><td>9980円/i);
expect("menu.html", "香薰＋足裏90分价格不一致", /アロマオイル60分 \+ 足裏30分[\s\S]{0,100}?90分 7800円/i);
expect("menu.html", "整体＋足裏90分价格不一致", /整体60分 \+ 足裏30分[\s\S]{0,100}?90分 6800円/i);
expect("menu.html", "深夜费不一致", new RegExp(`深夜料金 23:00以降[\\s\\S]{0,80}?${prices.lateNightFee.price}円`));

// English page intentionally does not list every course.
expect("en/index.html", "Foot reflexology 45 min price mismatch", htmlPattern("Foot reflexology — 45 min", "foot45"));
expect("en/index.html", "Foot reflexology 60 min price mismatch", htmlPattern("Foot reflexology — 60 min", "foot60"));
expect("en/index.html", "Full-body massage 60 min price mismatch", htmlPattern("Full-body massage / Japanese body care (seitai) — 60 min", "body60"));
expect("en/index.html", "Aroma 60 min price mismatch", htmlPattern("Aroma oil massage — 60 min", "aroma60"));
expect("en/index.html", "Aroma 90 min price mismatch", htmlPattern("Aroma oil massage — 90 min", "aroma90"));
expect("en/index.html", "Aroma + foot price mismatch", htmlPattern("Aroma oil 60 min + Foot 30 min（90 min）", "aromaFoot90"));
expect("en/index.html", "Seitai + foot price mismatch", htmlPattern("Seitai 60 min + Foot 30 min（90 min）", "bodyFoot90"));
expect("en/index.html", "Late-night fee mismatch", new RegExp(`late-night fee of ¥${prices.lateNightFee.price}`, "i"));

for (const item of prices.items) {
  const expectedKey = item.id === "bodyFoot90" ? "satisfaction90" : item.id;
  expect("booking.html", `${item.id} duration/price mismatch`, new RegExp(`key:"${expectedKey}",min:${item.duration},price:${item.price}`));
}
expect("booking.html", "Late-night start time mismatch", />=1380:false/);
expect("booking.html", "Late-night fee mismatch", new RegExp(`isLate\\(\\)\\?${prices.lateNightFee.price}:0`));

const localizedLabels = {
  "zh/index.html": {
    body60: "身体放松 60分钟", foot45: "足底护理 45分钟", foot60: "足底护理 60分钟",
    aroma60: "香薰精油护理 60分钟", aroma90: "香薰精油护理 90分钟", aroma120: "香薰精油护理 120分钟",
    aromaFoot90: "香薰精油60＋足底30（90分钟）", bodyFoot90: "身体放松60＋足底30（90分钟）"
  },
  "ko/index.html": {
    body60: "바디 릴랙세이션 60분", foot45: "발 케어 45분", foot60: "발 케어 60분",
    aroma60: "아로마 오일 트리트먼트 60분", aroma90: "아로마 오일 트리트먼트 90분", aroma120: "아로마 오일 트리트먼트 120분",
    aromaFoot90: "아로마 오일60＋발30 (90분)", bodyFoot90: "바디60＋발30 (90분)"
  }
};

for (const [file, labels] of Object.entries(localizedLabels)) {
  for (const [id, label] of Object.entries(labels)) {
    expect(file, `${id} duration/price mismatch`, htmlPattern(label, id));
  }
  expect(file, "Late-night fee mismatch", new RegExp(`(?:深夜费|심야 요금)[\\s\\S]{0,100}?¥${prices.lateNightFee.price}`));
}

if (errors.length) {
  console.error(`Price consistency check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Price consistency check passed for menu, English, booking, Chinese, and Korean pages.");

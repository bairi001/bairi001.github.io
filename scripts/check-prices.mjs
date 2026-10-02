import { readFile } from "node:fs/promises";
import process from "node:process";

const root = new URL("../", import.meta.url);
const prices = JSON.parse(await readFile(new URL("data/prices.json", root), "utf8"));
const files = Object.fromEntries(
  await Promise.all(
    ["menu.html", "aroma-oil-kamata.html", "ashitsubo-fukurahagi.html", "en/index.html", "en/foot-massage-kamata.html", "booking.html", "zh/index.html", "ko/index.html"].map(async file => [
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
expect("menu.html", "深夜费不一致", new RegExp(`深夜料金（23:00以降にご来店の場合）[\\s\\S]{0,80}?${prices.lateNightFee.price}円`));

// CRO value disclosures: keep free inclusions separate from paid options and preserve added time.
expect("menu.html", "Aroma 6-scent inclusion missing", /料金に含む[\s\S]{0,180}?6種の香りから選べるアロマオイル/i);
expect("menu.html", "Herbal oil option price mismatch", /漢方オイルへ変更[\s\S]{0,60}?\+500円/i);
expect("menu.html", "Hot stone 10-minute option mismatch", /ホットストーン[\s\S]{0,100}?10分 \+1000円/i);
expect("menu.html", "Hot stone 20-minute option mismatch", /ホットストーン[\s\S]{0,140}?20分 \+2000円/i);
expect("menu.html", "Hot stone added-time disclosure missing", /ホットストーン[\s\S]{0,260}?施術時間に10分または20分を追加/i);
expect("menu.html", "Free foot bath timing disclosure missing", /足湯 約3〜5分・無料[\s\S]{0,180}?コース時間に含まれず/i);
expect("menu.html", "Foot herbal cream option price mismatch", /和漢フットクリームへ変更 \+500円/i);

expect("aroma-oil-kamata.html", "Aroma scent inclusion missing", /6種の香りから選べるアロマオイル/i);
expect("aroma-oil-kamata.html", "Aroma herbal oil price mismatch", /漢方オイルへ変更[\s\S]{0,80}?\+500円/i);
expect("aroma-oil-kamata.html", "Aroma hot stone 10-minute price mismatch", /ホットストーン[\s\S]{0,120}?10分 \+1000円/i);
expect("aroma-oil-kamata.html", "Aroma hot stone 20-minute price mismatch", /ホットストーン[\s\S]{0,160}?20分 \+2000円/i);
expect("aroma-oil-kamata.html", "Aroma hot towel inclusion missing", /蒸しタオル（ホットタオル）/i);
expect("ashitsubo-fukurahagi.html", "Foot bath free timing missing", /足湯[\s\S]{0,120}?約3〜5分[\s\S]{0,100}?無料/i);
expect("ashitsubo-fukurahagi.html", "Foot herbal cream price mismatch", /和漢フットクリームへ変更[\s\S]{0,80}?\+500円/i);

// English page intentionally does not list every course.
expect("en/index.html", "Foot reflexology 45 min price mismatch", htmlPattern("Foot reflexology — 45 min", "foot45"));
expect("en/index.html", "Foot reflexology 60 min price mismatch", htmlPattern("Foot reflexology — 60 min", "foot60"));
expect("en/index.html", "Body Care 60 min price mismatch", htmlPattern("Body Care — 60 min", "body60"));
expect("en/index.html", "Aroma 60 min price mismatch", htmlPattern("Aroma oil massage — 60 min", "aroma60"));
expect("en/index.html", "Aroma 90 min price mismatch", htmlPattern("Aroma oil massage — 90 min", "aroma90"));
expect("en/index.html", "Aroma + foot price mismatch", htmlPattern("Aroma oil 60 min + Foot 30 min（90 min）", "aromaFoot90"));
expect("en/index.html", "Seitai + foot price mismatch", htmlPattern("Seitai 60 min + Foot 30 min（90 min）", "bodyFoot90"));
expect("en/index.html", "Late-night fee mismatch", new RegExp(`late-night fee of ¥${prices.lateNightFee.price}`, "i"));

for (const item of prices.items) {
  const expectedKey = item.id === "bodyFoot90" ? "satisfaction90" : item.id;
  expect("booking.html", `${item.id} duration/price mismatch`, new RegExp(`key:"${expectedKey}",min:${item.duration},price:${item.price}`));
}
if (/isLate\(\)/.test(files["booking.html"])) errors.push("booking.html: selected booking time must not trigger the late-night fee");
expect("booking.html", "Arrival-based late-night rule missing", /予約時刻ではなく実際のご来店時刻が基準です/);
expect("booking.html", "Japanese in-store option guidance missing", /香りはご来店時にお選びいただけます。有料の追加ケアは、空き状況・料金・所要時間を確認のうえご案内します。/);
expect("booking.html", "English in-store option guidance missing", /Choose your aroma scent when you arrive\. Paid add-on care is offered after we confirm availability, price and additional time\./);
expect("booking.html", "Chinese in-store option guidance missing", /香味可在到店后选择。付费追加护理会在确认当天空档、价格及所需时间后为您说明。/);
expect("booking.html", "Korean in-store option guidance missing", /아로마 향은 방문 후 고르실 수 있습니다\. 유료 추가 케어는 당일 가능 여부, 요금, 추가 소요 시간을 확인한 뒤 안내드립니다\./);
expect("booking.html", "English Body Care group name missing", /groups:\{popular:"Popular Set Courses",body:"Body Care",foot:"Foot Reflexology",aroma:"Aroma Oil Treatment"\}/);
expect("booking.html", "Body Care 30 ID/price/duration or label mismatch", /key:"body30",min:30,price:2400,en:"Body Care 30 min \(upper or lower body\)",zh:"身体放松30分钟（上半身／下半身二选一）",ko:"바디 릴랙세이션 30분 \(상반신\/하반신 중 선택\)",ja:"整体ボディケア30分（半身）"/);
expect("booking.html", "Body Care 60 label mismatch", /key:"body60",min:60,price:3980,en:"Body Care 60 min"/);
expect("booking.html", "Body Care 90 label mismatch", /key:"body90",min:90,price:6800,en:"Body Care 90 min"/);

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

expect("en/index.html", "English 6-scent inclusion missing", /6 aroma scents at no extra charge[\s\S]{0,220}?Rose Geranium[\s\S]{0,220}?Bergamot/i);
expect("en/index.html", "English herbal oil option missing", /Herbal Oil \+¥500/i);
expect("en/index.html", "English Hot Stone timing/price missing", /Hot Stone \+10 min ¥1000 \/ \+20 min ¥2000/i);
expect("en/index.html", "English foot bath timing missing", /foot bath of about 3–5 minutes[\s\S]{0,120}?not counted in your treatment time/i);
expect("en/index.html", "English shared free-value note missing", /Treatment wear is provided free of charge[\s\S]{0,180}?Hot or cold tea/i);
expect("en/foot-massage-kamata.html", "English foot guide free foot bath timing missing", /Free foot bath · about 3–5 min[\s\S]{0,260}?not counted in your treatment time/i);
expect("en/foot-massage-kamata.html", "English foot guide herbal cream option missing", /Herbal Foot Cream \+¥500/i);

expect("zh/index.html", "Chinese 6-scent inclusion missing", /6种香味免费选择[\s\S]{0,240}?玫瑰天竺葵[\s\S]{0,240}?佛手柑/i);
expect("zh/index.html", "Chinese herbal oil option missing", /汉方油 \+¥500/i);
expect("zh/index.html", "Chinese Hot Stone timing/price missing", /Hot Stone 热石 10分钟 \+¥1000 \/ 20分钟 \+¥2000/i);
expect("zh/index.html", "Chinese free foot bath timing missing", /免费足浴约3–5分钟[\s\S]{0,120}?不计入套餐护理时长/i);
expect("zh/index.html", "Chinese Body Care 30 scope missing", /30分钟为上半身或下半身二选一[\s\S]{0,80}?60分钟以上/i);

expect("ko/index.html", "Korean 6-scent inclusion missing", /6가지 향 무료 선택[\s\S]{0,240}?로즈 제라늄[\s\S]{0,240}?베르가못/i);
expect("ko/index.html", "Korean herbal oil option missing", /한방 오일 변경 \+¥500/i);
expect("ko/index.html", "Korean Hot Stone timing/price missing", /핫스톤 \+10분 ¥1000 \/ \+20분 ¥2000/i);
expect("ko/index.html", "Korean free foot bath timing missing", /무료 족욕 약 3–5분[\s\S]{0,120}?관리 시간에 포함되지 않습니다/i);
expect("ko/index.html", "Korean Body Care 30 scope missing", /30분은 상반신 또는 하반신 중 하나를 선택[\s\S]{0,90}?전신은 60분 이상/i);
if (/Pressure Point Body Massage/.test(files["booking.html"])) errors.push("booking.html: legacy Pressure Point Body Massage label must not remain in customer-facing booking copy");
if (/Pressure Point Body Massage/.test(files["zh/index.html"])) errors.push("zh/index.html: legacy Pressure Point Body Massage label must not remain");
if (/Pressure Point Body Massage/.test(files["ko/index.html"])) errors.push("ko/index.html: legacy Pressure Point Body Massage label must not remain");

if (errors.length) {
  console.error(`Price consistency check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Price consistency check passed for menu, service CRO disclosures, booking, English, Chinese, and Korean pages.");

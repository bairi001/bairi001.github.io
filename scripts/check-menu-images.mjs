import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const errors = [];
const fail = message => errors.push(message);
const readText = relative => readFile(path.join(root, relative), "utf8");
const readBinary = relative => readFile(path.join(root, relative));

function section(html, id) {
  return html.match(new RegExp(`<section\\b[^>]*id=["']${id}["'][\\s\\S]*?<\\/section>`, "i"))?.[0] || "";
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("invalid WebP header");
  }
  let pos = 12;
  while (pos + 8 <= buffer.length) {
    const type = buffer.toString("ascii", pos, pos + 4);
    const size = buffer.readUInt32LE(pos + 4);
    const data = pos + 8;
    if (type === "VP8X" && data + 10 <= buffer.length) {
      return [1 + buffer.readUIntLE(data + 4, 3), 1 + buffer.readUIntLE(data + 7, 3)];
    }
    if (type === "VP8L" && data + 5 <= buffer.length && buffer[data] === 0x2f) {
      const bits = buffer.readUInt32LE(data + 1);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    if (type === "VP8 ") {
      const end = Math.min(data + size, data + 64, buffer.length - 7);
      for (let i = data; i < end; i++) {
        if (buffer[i] === 0x9d && buffer[i + 1] === 0x01 && buffer[i + 2] === 0x2a) {
          return [buffer.readUInt16LE(i + 3) & 0x3fff, buffer.readUInt16LE(i + 5) & 0x3fff];
        }
      }
    }
    pos = data + size + (size & 1);
  }
  throw new Error("cannot determine WebP dimensions");
}

const html = await readText("menu.html");
const locks = {
  bodycare: {
    file: "assets/img/premium-seitai.webp",
    alt: "施術着を着たまま肩・背中を丁寧にもみほぐす整体ボディケア",
    minWidth: 1200,
    minHeight: 800,
    forbidden: ["body-shoulder-care-new.webp", "booking-treatment-waterwood-4k.webp"]
  },
  aroma: {
    file: "assets/img/menu-aroma-back.webp",
    alt: "背中をオイルでゆっくり流すアロマリンパ・オイルトリートメント",
    minWidth: 1200,
    minHeight: 1200,
    forbidden: ["aroma-leg-care-new.webp", "leg-option-care-new.webp"]
  },
  head: {
    file: "assets/img/head-scalp-care.webp",
    alt: "頭まわりを両手で丁寧にほぐすドライヘッドケア",
    minWidth: 1200,
    minHeight: 1200,
    forbidden: ["decollete-care.webp", "decollete-care-new.webp"]
  }
};

for (const [id, lock] of Object.entries(locks)) {
  const block = section(html, id);
  if (!block) {
    fail(`#${id} section missing`);
    continue;
  }
  const name = lock.file.split("/").pop();
  if (!block.includes(lock.file)) fail(`#${id} must use ${lock.file}`);
  if (!block.includes(`alt="${lock.alt}"`)) fail(`#${id} alt text must describe the approved treatment photo`);
  for (const wrong of lock.forbidden) {
    if (block.includes(wrong)) fail(`#${id} must not reference ${wrong}`);
  }

  try {
    const image = await readBinary(lock.file);
    const [width, height] = webpDimensions(image);
    const info = await stat(path.join(root, lock.file));
    if (width < lock.minWidth || height < lock.minHeight) {
      fail(`${name} is too small for the menu card: ${width}x${height}`);
    }
    if (info.size < 60000) fail(`${name} is suspiciously small/compressed: ${info.size} bytes`);
  } catch (error) {
    fail(`${name}: ${error.message}`);
  }
}

const option = section(html, "option");
if (!option.includes("assets/img/leg-option-care-new.webp")) {
  fail("leg oil photo must remain in Option/subcontent, not as the Aroma Oil main image");
}

const mainSections = [section(html, "set"), section(html, "foot"), section(html, "bodycare"), section(html, "aroma"), section(html, "head")].join("\n");
if (mainSections.includes("leg-option-care-new.webp")) {
  fail("leg-option-care-new.webp must not be used as a main menu image");
}

if (errors.length) {
  console.error(`Menu image check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Menu image check passed: Body Care=dressed dry body care, Aroma Oil=back oil treatment, Head & Facial=head care; approved WebP assets meet high-resolution thresholds and the leg-oil photo remains Option-only.");

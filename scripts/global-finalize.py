from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
def path(p): return ROOT/p
def read(p): return path(p).read_text(encoding='utf-8')
def write(p,s): path(p).write_text(s,encoding='utf-8')

def webp_dimensions(p):
    b=path(p).read_bytes()
    if len(b)<30 or b[:4]!=b'RIFF' or b[8:12]!=b'WEBP': raise RuntimeError(f'bad WebP: {p}')
    pos=12
    while pos+8<=len(b):
        typ=b[pos:pos+4]; n=int.from_bytes(b[pos+4:pos+8],'little'); d=pos+8
        if typ==b'VP8X' and d+10<=len(b): return 1+int.from_bytes(b[d+4:d+7],'little'),1+int.from_bytes(b[d+7:d+10],'little')
        if typ==b'VP8L' and d+5<=len(b) and b[d]==0x2f:
            x=int.from_bytes(b[d+1:d+5],'little'); return (x&0x3fff)+1,((x>>14)&0x3fff)+1
        if typ==b'VP8 ':
            for i in range(d,min(d+n,d+64,len(b)-7)):
                if b[i:i+3]==b'\x9d\x01\x2a': return int.from_bytes(b[i+3:i+5],'little')&0x3fff,int.from_bytes(b[i+5:i+7],'little')&0x3fff
        pos=d+n+(n&1)
    raise RuntimeError(f'cannot read WebP dimensions: {p}')

images={
 'body':['assets/img/premium-seitai.webp','施術着を着たまま肩・背中を丁寧にもみほぐす整体ボディケア'],
 'aroma':['assets/img/menu-aroma-back.webp','背中をオイルでゆっくり流すアロマリンパ・オイルトリートメント'],
 'head':['assets/img/head-scalp-care.webp','頭まわりを両手で丁寧にほぐすドライヘッドケア'],
}
for k,v in images.items():
    w,h=webp_dimensions(v[0]); v.extend([w,h])
    if w<1200 or h<800: raise RuntimeError(f'{v[0]} too small: {w}x{h}')
    print('IMAGE',k,v[0],w,h,path(v[0]).stat().st_size)

def replace_menu_image(s,ident,v):
    file,alt,w,h=v
    m=re.search(rf'<section\b[^>]*id=["\']{re.escape(ident)}["\'][^>]*>[\s\S]*?</section>',s,re.I)
    if not m: raise RuntimeError(f'missing menu section #{ident}')
    block=m.group(0)
    block2,n=re.subn(r'(<div\s+class=["\']menu-photo["\']>)[\s\S]*?(</div>)',rf'\1<img src="{file}" alt="{alt}" loading="lazy" width="{w}" height="{h}">\2',block,count=1,flags=re.I)
    if n!=1: raise RuntimeError(f'missing menu-photo in #{ident}')
    return s[:m.start()]+block2+s[m.end():]

# MENU: actual mapping + source clarity + unified Japanese mobile CTA
s=read('menu.html')
for ident,key in [('bodycare','body'),('aroma','aroma'),('head','head')]: s=replace_menu_image(s,ident,images[key])
s=s.replace('<meta property="og:image" content="https://shinyuuan.jp/assets/img/shop-front.jpg">','<meta property="og:image" content="https://shinyuuan.jp/assets/img/premium-seitai.webp">',1)
if '.menu-photo img{filter:none!important}' not in s:
    anchor='.menu-web-cta{text-align:center;margin-top:22px}'
    if anchor not in s: raise RuntimeError('menu style anchor missing')
    s=s.replace(anchor,anchor+'.menu-photo img{filter:none!important}',1)
mobile='<div class="mobile-fixed-cta" aria-label="固定予約ボタン"><a href="https://beauty.hotpepper.jp/kr/slnH000397723/" target="_blank" rel="noopener" data-channel="hpb">HotPepper予約</a><a href="/booking.html?lang=ja" data-channel="web">ウェブ予約</a><a href="https://page.line.me/017hlpiu" target="_blank" rel="noopener" data-channel="line">LINE相談</a></div>'
s,n=re.subn(r'<div class="mobile-fixed-cta"[^>]*>[\s\S]*?</div>',mobile,s,count=1)
if n!=1: raise RuntimeError('menu mobile CTA missing')
write('menu.html',s)

# HOME: preserve hero; align service cards only
s=read('index.html')
file,alt,w,h=images['body']
pat=re.compile(r'(<article class="service-card">\s*)<img\b[^>]*>([\s\S]*?<div class="service-card-num">Service 02</div>\s*<h3>整体ボディケア</h3>)')
s,n=pat.subn(rf'\1<img src="{file}" alt="{alt}" loading="lazy" width="{w}" height="{h}">\2',s,count=1)
if n!=1: raise RuntimeError('home Service 02 missing')
file,alt,w,h=images['aroma']
pat=re.compile(r'(<article class="service-card">\s*)<img\b[^>]*>([\s\S]*?<div class="service-card-num">Service 03</div>\s*<h3>)([^<]+)(</h3>\s*<p>)([^<]+)(</p>)')
s,n=pat.subn(rf'\1<img src="{file}" alt="{alt}" loading="lazy" width="{w}" height="{h}">\2アロマリンパ・オイル\4香りに包まれながら、背中や脚などをオイルでゆっくりケア。全身をゆったり受けたい日におすすめです。\6',s,count=1)
if n!=1: raise RuntimeError('home Service 03 missing')
write('index.html',s)

# Shop / FAQ mobile CTA consistency
for p in ['shop.html','faq.html']:
    s=read(p); s,n=re.subn(r'<div class="mobile-fixed-cta"[^>]*>[\s\S]*?</div>',mobile,s,count=1)
    if n!=1: raise RuntimeError(f'{p} mobile CTA missing')
    write(p,s)

# Head search-intent page: correct hero and OG photo
s=read('headspa-kamata.html'); file,_,w,h=images['head']
s=s.replace('<meta property="og:image" content="https://shinyuuan.jp/assets/img/shop-room.jpg">',f'<meta property="og:image" content="https://shinyuuan.jp/{file}">',1)
s,n=re.subn(r'<img src="/assets/img/shop-room\.jpg" alt="身悠晏の落ち着いた施術スペース" fetchpriority="high">',f'<img src="/{file}" alt="蒲田の身悠晏で行う髪を濡らさないドライヘッドケア" fetchpriority="high" width="{w}" height="{h}">',s,count=1)
if n!=1 and f'src="/{file}"' not in s: raise RuntimeError('headspa hero missing')
write('headspa-kamata.html',s)

# Local entity: representative, crawlable shop + service imagery
entity_images='["https://shinyuuan.jp/assets/img/shop-front.jpg","https://shinyuuan.jp/assets/img/premium-seitai.webp","https://shinyuuan.jp/assets/img/menu-aroma-back.webp","https://shinyuuan.jp/assets/img/menu-foot-close.webp","https://shinyuuan.jp/assets/img/head-scalp-care.webp"]'
for p in ['index.html','shop.html','en/index.html']:
    s=read(p)
    old='"image":"https://shinyuuan.jp/assets/img/shop-front.jpg"'
    if old in s: s=s.replace(old,f'"image":{entity_images}',1)
    elif f'"image":{entity_images}' not in s: raise RuntimeError(f'{p} LocalBusiness image missing')
    write(p,s)

# BOOKING: raw truth + arrival-based fee. No course/date/time/message architecture changes.
s=read('booking.html')
repls={
 'trustHours:"Open daily"':'trustHours:"Hours"',
 'trustHoursSub:"11:00 AM – 2:00 AM (next day)"':'trustHoursSub:"11:00 AM – 2:00 AM · Closed January 1"',
 'trustSpace:"Private room space · Female friendly"':'trustSpace:"Private treatment space · curtain entrance"',
 'formLead:"Complete the form and send it via WhatsApp. We will check availability and reply to confirm your appointment."':'formLead:"Choose your course and preferred time, then send your request on this website or via WhatsApp. We will check availability and reply to confirm your appointment."',
 'hoursHint:"Open daily 11:00 AM – 2:00 AM. Last booking request 1:00 AM. Late-night fee ¥800 after 11:00 PM."':'hoursHint:"Hours: 11:00 AM–2:00 AM (closed January 1). Last booking request 1:00 AM. An ¥800 late-night fee applies when you arrive at or after 11:00 PM. All times are JST."',
 'estimateSingle:n=>`Estimated price for 1 guest: ¥${n.toLocaleString()}${isLate()?" (including the ¥800 late-night fee)":""}. Final price is confirmed by the salon.`':'estimateSingle:n=>`Estimated price for 1 guest: ¥${n.toLocaleString()}. An ¥800 late-night fee applies only if you arrive at or after 11:00 PM. Final price is confirmed by the salon.`',
 'estimateGroup:n=>`Listed amount per guest: ¥${n.toLocaleString()}${isLate()?" + ¥800 late-night fee":""}. We will confirm the group total.`':'estimateGroup:n=>`Listed amount per guest: ¥${n.toLocaleString()}. An ¥800 late-night fee applies per guest only if arrival is at or after 11:00 PM. We will confirm the group total.`',
 'trustHours:"每天营业"':'trustHours:"营业时间"',
 'trustHoursSub:"11:00－次日凌晨2:00"':'trustHoursSub:"11:00－次日2:00 · 1月1日休息"',
 'formLead:"填写后通过WhatsApp发送预约申请。我们确认空位后会回复，收到回复后预约才正式成立。"':'formLead:"选择套餐和希望时间后，可通过本网页或WhatsApp发送预约申请。收到店铺回复后，预约才正式成立。"',
 'hoursHint:"每天11:00－次日凌晨2:00营业，最晚预约申请时间为凌晨1:00。23:00以后加收深夜费¥800。"':'hoursHint:"营业时间11:00～次日2:00（1月1日休息），最晚预约申请为次日1:00。若实际到店时间为23:00或之后，每位加收800日元深夜费；以实际到店时间为准。所有时间均为日本标准时间（JST）。"',
 'estimateSingle:n=>`1位客人预估价格：¥${n.toLocaleString()}${isLate()?"（已包含深夜费¥800）":""}。最终价格由店铺回复确认。`':'estimateSingle:n=>`1位客人所选项目预估价格：¥${n.toLocaleString()}。若实际到店时间为23:00或之后，另加深夜费¥800。最终价格由店铺回复确认。`',
 'estimateGroup:n=>`每位客人所选项目价格：¥${n.toLocaleString()}${isLate()?"，另加深夜费¥800":""}。团体总价将在回复时确认。`':'estimateGroup:n=>`每位客人所选项目价格：¥${n.toLocaleString()}。若实际到店时间为23:00或之后，每位另加深夜费¥800。团体总价将在回复时确认。`',
 'trustHours:"毎日営業"':'trustHours:"営業時間"',
 'trustHoursSub:"11:00〜翌2:00"':'trustHoursSub:"11:00〜翌2:00 · 1月1日休み"',
 'trustSpace:"個室空間 · 女性も通いやすい"':'trustSpace:"落ち着ける施術スペース · 入口カーテン"',
 'formLead:"フォーム入力後、WhatsAppで予約リクエストを送信します。空き状況を確認し、当店からの返信をもって予約確定となります。"':'formLead:"コースと希望日時を入力し、ウェブまたはWhatsAppから予約リクエストを送信できます。空き状況を確認後、当店からの返信をもって予約確定となります。"',
 'hoursHint:"毎日11:00〜翌2:00営業、最終予約リクエストは翌1:00です。23時以降は深夜料金800円。"':'hoursHint:"営業時間11:00〜翌2:00（1月1日休み）。最終予約リクエストは翌1:00です。実際のご来店が23:00以降の場合、深夜料金800円。予約時刻ではなく実際のご来店時刻が基準です。"',
 'estimateSingle:n=>`1名様の概算料金：¥${n.toLocaleString()}${isLate()?"（深夜料金800円を含む）":""}。最終料金は当店からの返信でご確認ください。`':'estimateSingle:n=>`1名様の選択料金：¥${n.toLocaleString()}。実際のご来店が23:00以降の場合は深夜料金800円が加算されます。最終料金は当店からの返信でご確認ください。`',
 'estimateGroup:n=>`1名様あたりの選択料金：¥${n.toLocaleString()}${isLate()?"＋深夜料金800円":""}。合計は返信時に確認いたします。`':'estimateGroup:n=>`1名様あたりの選択料金：¥${n.toLocaleString()}。実際のご来店が23:00以降の場合は1名様につき深夜料金800円が加算されます。合計は返信時に確認いたします。`',
 'trustHours:"매일 영업"':'trustHours:"영업시간"',
 'trustHoursSub:"11:00－다음 날 2:00"':'trustHoursSub:"11:00－다음 날 2:00 · 1월 1일 휴무"',
 'hoursHint:"매일 11:00－다음 날 2:00 영업, 마지막 예약 신청은 다음 날 1:00입니다. 23:00 이후에는 심야 요금 ¥800이 추가됩니다. 모든 시간은 일본 표준시(JST)입니다."':'hoursHint:"영업시간은 11:00~다음 날 2:00이며 1월 1일은 휴무입니다. 마지막 예약 신청은 다음 날 1:00입니다. 실제 도착 시간이 23:00 이후인 경우 1인당 심야 요금 800엔이 추가되며, 예약 시간이 아닌 실제 도착 시간을 기준으로 합니다. 모든 시간은 일본 표준시(JST)입니다."',
 'formLead:"양식을 작성한 뒤 WhatsApp으로 예약 신청을 보내 주세요. 매장에서 가능 여부를 확인해 답변드리며, 답변을 받은 뒤 예약이 확정됩니다."':'formLead:"코스와 희망 시간을 입력한 뒤 웹페이지 또는 WhatsApp으로 예약 신청을 보낼 수 있습니다. 매장의 답변을 받은 뒤 예약이 확정됩니다."',
}
for old,new in repls.items():
    if old in s: s=s.replace(old,new,1)
s=re.sub(r'const isLate=\(\)=>\{const value=\$\("time"\)\.value;return value\?Number\(value\.split\("\|"\)\[0\]\)>=1380:false\};\n','',s,count=1)
s=s.replace('return course.price+selectedAddons().reduce((sum,item)=>sum+item.price,0)+selectedNomination().price+(isLate()?800:0);','return course.price+selectedAddons().reduce((sum,item)=>sum+item.price,0)+selectedNomination().price;',1)
s=s.replace('  if(isLate())lines.push(`■ ${labels.fee}: ¥800`);\n','',1)
for bad in ['Open daily','毎日営業','每天营业','매일 영업','Private room space','個室空間','isLate()']:
    if bad in s: raise RuntimeError(f'booking stale/incorrect dependency remains: {bad}')
for good in ['予約時刻ではなく実際のご来店時刻が基準です','arrive at or after 11:00 PM','1月1日休み','入口カーテン']:
    if good not in s: raise RuntimeError(f'booking truthful wording missing: {good}')
write('booking.html',s)

# Price test must protect arrival-basis rule, not selected-time calculation
s=read('scripts/check-prices.mjs')
s=re.sub(r'expect\("booking\.html", "Late-night start time mismatch", />=1380:false/\);\nexpect\("booking\.html", "Late-night fee mismatch", new RegExp\(`isLate\\\\\(\\\\\)\\\\\?\$\{prices\.lateNightFee\.price\}:0`\)\);',
'''if (/isLate\\(\\)/.test(files["booking.html"])) errors.push("booking.html: selected booking time must not trigger the late-night fee");
expect("booking.html", "Arrival-based late-night rule missing", /予約時刻ではなく実際のご来店時刻が基準です/);''',s,count=1)
if '>=1380:false' in s or 'isLate\\(\\)' in s and 'selected booking time' not in s: raise RuntimeError('old price late-night guard remains')
write('scripts/check-prices.mjs',s)

# SEO guard: approved images, Japanese CTAs, booking raw truth, entity images, inert legacy compatibility
s=read('scripts/check-seo.mjs')
s=s.replace('for (const image of ["body-shoulder-care-new.webp", "aroma-leg-care-new.webp", "leg-option-care-new.webp", "decollete-care-new.webp"]) {','for (const image of ["premium-seitai.webp", "menu-aroma-back.webp", "head-scalp-care.webp", "leg-option-care-new.webp", "decollete-care-new.webp"]) {',1)
needle='  "index.html": [\'data-channel="hpb">HotPepper予約\', \'data-channel="web">ウェブ予約\', \'data-channel="line">LINE相談\'],'
if '"menu.html": [\'data-channel="hpb">HotPepper予約\'' not in s:
    if needle not in s: raise RuntimeError('SEO static CTA anchor missing')
    s=s.replace(needle,needle+'\n  "menu.html": [\'data-channel="hpb">HotPepper予約\', \'data-channel="web">ウェブ予約\', \'data-channel="line">LINE相談\'],\n  "shop.html": [\'data-channel="hpb">HotPepper予約\', \'data-channel="web">ウェブ予約\', \'data-channel="line">LINE相談\'],\n  "faq.html": [\'data-channel="hpb">HotPepper予約\', \'data-channel="web">ウェブ予約\', \'data-channel="line">LINE相談\'],',1)
anchor='for (const required of ["labels.course", "labels.date", "labels.time", "labels.guests", "labels.name", "via shinyuuan.jp/booking.html"]) {\n  if (!booking.includes(required)) fail("booking.html", `structured WhatsApp message field missing: ${required}`);\n}\n'
if 'stale raw booking claim remains' not in s:
    extra='''\nfor (const phrase of ["Open daily","毎日営業","每天营业","매일 영업","Private room space","個室空間"]) { if (booking.includes(phrase)) fail("booking.html", `stale raw booking claim remains: ${phrase}`); }\nfor (const phrase of ["予約時刻ではなく実際のご来店時刻が基準です","arrive at or after 11:00 PM","1月1日休み","入口カーテン"]) { if (!booking.includes(phrase)) fail("booking.html", `truthful raw booking wording missing: ${phrase}`); }\nif (booking.includes("isLate()")) fail("booking.html", "selected booking time must not calculate or append the late-night fee");\nfor (const file of ["index.html","shop.html","en/index.html"]) { const html=indexableHtml[file]; for (const image of ["shop-front.jpg","premium-seitai.webp","menu-aroma-back.webp","menu-foot-close.webp","head-scalp-care.webp"]) if (!html.includes(image)) fail(file, `LocalBusiness representative image missing: ${image}`); }\nconst legacyCloseout = await read("assets/site-closeout.js");\nfor (const stale of ["body-shoulder-care-new.webp","aroma-leg-care-new.webp","Open daily","Private room space","patchMenu","patchFaq"]) if (legacyCloseout.includes(stale)) fail("assets/site-closeout.js", `legacy compatibility shim still contains stale DOM patch: ${stale}`);\n'''
    if anchor not in s: raise RuntimeError('SEO booking insertion anchor missing')
    s=s.replace(anchor,anchor+extra,1)
write('scripts/check-seo.mjs',s)

# Strong image semantics checker
check=r'''import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
const root=path.resolve(new URL("../",import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1"));
const errors=[]; const fail=m=>errors.push(m); const text=async p=>readFile(path.join(root,p),"utf8"); const bin=async p=>readFile(path.join(root,p));
function section(html,id){return html.match(new RegExp(`<section\\b[^>]*id=["']${id}["'][\\s\\S]*?<\\/section>`,"i"))?.[0]||""}
function dims(b){if(b.length<30||b.toString("ascii",0,4)!=="RIFF"||b.toString("ascii",8,12)!=="WEBP")throw new Error("invalid WebP header");let p=12;while(p+8<=b.length){const t=b.toString("ascii",p,p+4),n=b.readUInt32LE(p+4),d=p+8;if(t==="VP8X")return[1+b.readUIntLE(d+4,3),1+b.readUIntLE(d+7,3)];if(t==="VP8L"&&b[d]===0x2f){const x=b.readUInt32LE(d+1);return[(x&0x3fff)+1,((x>>14)&0x3fff)+1]}if(t==="VP8 "){for(let i=d;i<Math.min(d+n,d+64,b.length-7);i++)if(b[i]===0x9d&&b[i+1]===1&&b[i+2]===0x2a)return[b.readUInt16LE(i+3)&0x3fff,b.readUInt16LE(i+5)&0x3fff]}p=d+n+(n&1)}throw new Error("cannot determine WebP dimensions")}
const menu=await text("menu.html");
const locks={bodycare:{file:"assets/img/premium-seitai.webp",alt:"施術着を着たまま肩・背中を丁寧にもみほぐす整体ボディケア",forbidden:["body-shoulder-care-new.webp","booking-treatment-waterwood-4k.webp"]},aroma:{file:"assets/img/menu-aroma-back.webp",alt:"背中をオイルでゆっくり流すアロマリンパ・オイルトリートメント",forbidden:["aroma-leg-care-new.webp","leg-option-care-new.webp"]},head:{file:"assets/img/head-scalp-care.webp",alt:"頭まわりを両手で丁寧にほぐすドライヘッドケア",forbidden:["decollete-care.webp","decollete-care-new.webp"]}};
for(const[id,l]of Object.entries(locks)){const b=section(menu,id);if(!b){fail(`#${id} missing`);continue}if(!b.includes(l.file))fail(`#${id} must use ${l.file}`);if(!b.includes(`alt="${l.alt}"`))fail(`#${id} alt mismatch`);for(const x of l.forbidden)if(b.includes(x))fail(`#${id} wrong image ${x}`);try{const image=await bin(l.file),[w,h]=dims(image),info=await stat(path.join(root,l.file));if(w<1200||h<800)fail(`${l.file} too small ${w}x${h}`);if(info.size<60000)fail(`${l.file} suspiciously compressed ${info.size}`);if(!b.includes(`width="${w}"`)||!b.includes(`height="${h}"`))fail(`#${id} HTML intrinsic dimensions do not match ${w}x${h}`)}catch(e){fail(`${l.file}: ${e.message}`)}}
const option=section(menu,"option");if(!option.includes("leg-option-care-new.webp"))fail("leg oil photo must remain Option-only");const mains=["set","foot","bodycare","aroma","head"].map(id=>section(menu,id)).join("\n");if(mains.includes("leg-option-care-new.webp"))fail("leg oil photo used as main image");if(!menu.includes(".menu-photo img{filter:none!important}"))fail("menu main photos must preserve source clarity");
const home=await text("index.html");if(!home.includes("premium-seitai.webp")||!home.includes("Service 02"))fail("home body-care service photo mapping missing");if(!home.includes("menu-aroma-back.webp")||!home.includes("アロマリンパ・オイル"))fail("home aroma service mapping missing");
const head=await text("headspa-kamata.html");if(!head.includes("head-scalp-care.webp"))fail("headspa page must use head-care image");if(head.includes('og:image" content="https://shinyuuan.jp/assets/img/shop-room.jpg"'))fail("headspa OG still uses room photo");
if(errors.length){console.error(`Menu/image semantic check failed:\n- ${errors.join("\n- ")}`);process.exit(1)}console.log("Menu/image semantic check passed: service-intent photos, intrinsic dimensions, clarity, homepage cards and head-care visual are locked.");
'''
write('scripts/check-menu-images.mjs',check)

# Real pull-request CI executes image checker
s=read('.github/workflows/site-check.yml')
if 'node scripts/check-menu-images.mjs' not in s:
    anchor='      - name: Check SEO consistency\n        run: node scripts/check-seo.mjs\n'
    if anchor not in s: raise RuntimeError('site-check workflow anchor missing')
    s=s.replace(anchor,anchor+'      - name: Check menu image semantics\n        run: node scripts/check-menu-images.mjs\n',1)
write('.github/workflows/site-check.yml',s)

# Keep legacy filename for old cached loaders, but make it inert; it must never patch current HTML.
write('assets/site-closeout.js','(() => {\n  "use strict";\n  globalThis.__SYA_SITE_CLOSEOUT_APPLIED = true;\n})();\n')

# Correct sitemap lastmod for materially modified indexable pages
s=read('sitemap.xml')
for url in ['https://shinyuuan.jp/menu.html','https://shinyuuan.jp/headspa-kamata.html']:
    s,n=re.subn(rf'(<url><loc>{re.escape(url)}</loc><lastmod>)[^<]+(</lastmod>)',rf'\g<1>2026-08-10\2',s,count=1)
    if n!=1: raise RuntimeError(f'sitemap lastmod missing: {url}')
write('sitemap.xml',s)

# Remove failed previous deployment artifacts and the unused push workflow from this branch.
for p in ['.github/workflows/apply-menu-photo-lock.yml','.menu-photo-fix/READY','.menu-photo-ci-trigger','.github/workflows/global-finalize.yml','.global-finalize/READY']:
    q=path(p)
    if q.exists(): q.unlink()
for d in ['.menu-photo-fix','.global-finalize']:
    q=path(d)
    if q.exists() and q.is_dir():
        try:q.rmdir()
        except OSError:pass

print('GLOBAL FINALIZATION APPLIED')

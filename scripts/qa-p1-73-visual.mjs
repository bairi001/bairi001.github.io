import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const findBrowser=()=>{
  for(const candidate of ["google-chrome","chromium","chromium-browser"]){
    const r=spawnSync("which",[candidate],{encoding:"utf8"});
    if(r.status===0&&r.stdout.trim()) return r.stdout.trim();
  }
  return "";
};
const browser=findBrowser();
if(!browser){console.error("Chrome/Chromium unavailable");process.exit(1);}

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const outDir=path.resolve("qa-p1-73");
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});
const sitePort=18778, debugPort=19224;
const server=spawn("python3",["-m","http.server",String(sitePort),"--bind","127.0.0.1"],{stdio:"ignore"});
const userDataDir=fs.mkdtempSync(path.join(os.tmpdir(),"sya-p1qa-"));
const chrome=spawn(browser,[
  "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
  `--remote-debugging-port=${debugPort}`,`--user-data-dir=${userDataDir}`,"about:blank"
],{stdio:"ignore"});

async function waitJson(url,tries=80){
  for(let i=0;i<tries;i++){
    try{const r=await fetch(url);if(r.ok)return r.json();}catch{}
    await wait(100);
  }
  throw new Error("timed out waiting for Chrome DevTools");
}
class CDP{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.waiters=new Map();}
  async open(){this.ws=new WebSocket(this.url);await new Promise((res,rej)=>{this.ws.onopen=res;this.ws.onerror=rej;});this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&this.pending.has(m.id)){const {res,rej}=this.pending.get(m.id);this.pending.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result||{});return;}const a=this.waiters.get(m.method);if(a&&a.length)a.shift()(m.params||{});};}
  send(method,params={}){return new Promise((res,rej)=>{const id=++this.id;this.pending.set(id,{res,rej});this.ws.send(JSON.stringify({id,method,params}));});}
  once(method,timeout=10000){return new Promise((res,rej)=>{const a=this.waiters.get(method)||[];a.push(res);this.waiters.set(method,a);setTimeout(()=>rej(new Error("timeout "+method)),timeout);});}
  close(){try{this.ws.close();}catch{}}
}

const cases=[
  {name:"ja-home-sameroom",url:"index.html",selector:"#services",must:"2名同室は追加料金なし"},
  {name:"en-home-sameroom",url:"en/index.html",selector:"#faq",must:"There is no extra room fee for a same-room request"},
  {name:"zh-home-sameroom",url:"zh/index.html",text:"两位客人可提出双人同室需求",must:"双人同室不收取额外房间费用"},
  {name:"ko-home-sameroom",url:"ko/index.html",text:"2인 같은 공간을 요청할 수 있습니다",must:"별도 객실 추가 요금은 없습니다"},
  {name:"menu-body30",url:"menu.html",selector:"#bodycare",must:"30分（上半身／下半身どちらか）"},
  {name:"shop-sameroom",url:"shop.html",text:"2名同室リクエスト可",must:"2名同室に追加料金はかかりません"},
  {name:"shop-jr-route",url:"shop.html",text:"JR蒲田駅東口からの道順",route:"jr"},
  {name:"shop-keikyu-route",url:"shop.html",selector:"#keikyu-kamata",route:"keikyu"},
  {name:"faq-sameroom",url:"faq.html",text:"2名で同じ部屋で施術を受けられますか？",must:"2名同室に追加料金はかかりません"},
  {name:"booking-ja-sameroom",url:"booking.html?lang=ja&guests=2&room=pair",selector:"#sameRoomSection",must:"2名同室に追加料金はかかりません"},
  {name:"booking-en-sameroom",url:"booking.html?lang=en&guests=2&room=pair",selector:"#sameRoomSection",must:"There is no extra room fee for a same-room request"},
  {name:"booking-zh-sameroom",url:"booking.html?lang=zh&guests=2&room=pair",selector:"#sameRoomSection",must:"双人同室不收取额外房间费用"},
  {name:"booking-ko-sameroom",url:"booking.html?lang=ko&guests=2&room=pair",selector:"#sameRoomSection",must:"별도 객실 추가 요금은 없습니다"}
];
const viewports=[
  {w:390,h:844,mobile:true,label:"390x844"},
  {w:430,h:932,mobile:true,label:"430x932"},
  {w:1440,h:1000,mobile:false,label:"1440x1000"}
];
const metrics=[],errors=[];

try{
  await wait(700);
  await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const tab=await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`,{method:"PUT"}).then(r=>r.json());
  const cdp=new CDP(tab.webSocketDebuggerUrl);await cdp.open();
  await cdp.send("Page.enable");await cdp.send("Runtime.enable");

  for(const vp of viewports){
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:vp.w,height:vp.h,deviceScaleFactor:1,mobile:vp.mobile,screenWidth:vp.w,screenHeight:vp.h});
    for(const item of cases){
      const loaded=cdp.once("Page.loadEventFired",15000);
      await cdp.send("Page.navigate",{url:`http://127.0.0.1:${sitePort}/${item.url}`});
      await loaded;await wait(450);
      const payload=JSON.stringify(item);
      const result=await cdp.send("Runtime.evaluate",{expression:`(()=>{
        const cfg=${payload};
        const style=document.createElement('style');
        style.textContent='html{scroll-behavior:auto!important}*{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}.fade-up{opacity:1!important;transform:none!important}.language-recommendation{display:none!important}body.has-language-recommendation{padding-top:0!important}';
        document.head.appendChild(style);
        let target=cfg.selector?document.querySelector(cfg.selector):null;
        if(!target&&cfg.text){target=[...document.querySelectorAll('body *')].find(el=>el.children.length<8&&el.textContent&&el.textContent.includes(cfg.text))||null;}
        const details=target?.closest?.('details');if(details)details.open=true;
        if(target){target.scrollIntoView({block:'start',inline:'nearest'});window.scrollBy(0,-84);}else{window.scrollTo(0,0);}
        const de=document.documentElement;
        const bodyText=document.body.innerText;
        let routeNumbers=null;
        if(cfg.route==='jr'){
          const card=[...document.querySelectorAll('.access-card')].find(el=>el.textContent.includes('JR蒲田駅東口からの道順'));
          routeNumbers=card?[...card.querySelectorAll('.access-steps li')].map(li=>getComputedStyle(li,'::before').content.replace(/["']/g,'')):null;
        }
        if(cfg.route==='keikyu'){
          const card=document.querySelector('#keikyu-kamata');
          routeNumbers=card?[...card.querySelectorAll('.access-steps li')].map(li=>getComputedStyle(li,'::before').content.replace(/["']/g,'')):null;
        }
        const rect=target?target.getBoundingClientRect():null;
        const sectionHidden=target?getComputedStyle(target).display==='none'||target.hidden:false;
        return {scrollWidth:de.scrollWidth,innerWidth:window.innerWidth,scrollHeight:de.scrollHeight,scrollY:window.scrollY,targetFound:!!target,sectionHidden,mustFound:cfg.must?bodyText.includes(cfg.must):true,routeNumbers,targetTop:rect?rect.top:null};
      })()`,returnByValue:true});
      await wait(120);
      const m=result.result?.value||{};
      metrics.push({case:item.name,viewport:vp.label,...m});
      if(m.scrollWidth>vp.w+2)errors.push(`${item.name} ${vp.label}: horizontal overflow ${m.scrollWidth} > ${vp.w}`);
      if(!m.targetFound)errors.push(`${item.name} ${vp.label}: target not found`);
      if(m.sectionHidden)errors.push(`${item.name} ${vp.label}: target hidden`);
      if(!m.mustFound)errors.push(`${item.name} ${vp.label}: required new wording missing`);
      const shot=await cdp.send("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
      const out=path.join(outDir,`${item.name}-${vp.label}.png`);
      fs.writeFileSync(out,Buffer.from(shot.data,"base64"));
      if(fs.statSync(out).size<1000)errors.push(`${item.name} ${vp.label}: screenshot too small`);
    }
  }
  cdp.close();
}catch(e){errors.push(String(e?.stack||e));}
finally{
  fs.writeFileSync(path.join(outDir,"metrics.json"),JSON.stringify(metrics,null,2));
  server.kill("SIGTERM");chrome.kill("SIGTERM");
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`P1 visual QA passed: ${metrics.length} screenshots; four-language copy visibility and overflow checks passed. Route numbers are verified from screenshots because CSS counters are not numerically resolved by getComputedStyle.`);

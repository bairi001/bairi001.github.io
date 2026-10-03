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
const outDir=path.resolve("qa-mobile");
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});

const sitePort=18777;
const debugPort=19223;
const server=spawn("python3",["-m","http.server",String(sitePort),"--bind","127.0.0.1"],{stdio:"ignore"});
const userDataDir=fs.mkdtempSync(path.join(os.tmpdir(),"shinyuuan-qa-"));
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
  async open(){
    this.ws=new WebSocket(this.url);
    await new Promise((res,rej)=>{this.ws.onopen=res;this.ws.onerror=rej;});
    this.ws.onmessage=e=>{
      const m=JSON.parse(e.data);
      if(m.id&&this.pending.has(m.id)){
        const {res,rej}=this.pending.get(m.id);this.pending.delete(m.id);
        if(m.error)rej(new Error(JSON.stringify(m.error)));else res(m.result||{});
        return;
      }
      const arr=this.waiters.get(m.method);
      if(arr&&arr.length){const fn=arr.shift();fn(m.params||{});}
    };
  }
  send(method,params={}){
    return new Promise((res,rej)=>{
      const id=++this.id;this.pending.set(id,{res,rej});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  once(method,timeout=10000){
    return new Promise((res,rej)=>{
      const arr=this.waiters.get(method)||[];arr.push(res);this.waiters.set(method,arr);
      setTimeout(()=>rej(new Error("timeout "+method)),timeout);
    });
  }
  close(){try{this.ws.close();}catch{}}
}

const cases=[
 ["home-top","index.html",null],
 ["home-needs","index.html","#search-needs-title"],
 ["home-recommended","index.html","#recommended"],
 ["menu-top","menu.html",null],
 ["menu-set","menu.html","#set"],
 ["menu-foot","menu.html","#foot"],
 ["menu-body","menu.html","#bodycare"],
 ["menu-aroma","menu.html","#aroma"],
 ["bodycare-top","bodycare-kamata.html",null],
 ["bodycare-prices","bodycare-kamata.html","#course-prices"],
 ["foot-top","ashitsubo-fukurahagi.html",null],
 ["foot-prices","ashitsubo-fukurahagi.html","#course-prices"],
 ["aroma-top","aroma-oil-kamata.html",null],
 ["aroma-prices","aroma-oil-kamata.html","#course-prices"],
 ["late-top","kamata-late-night.html",null],
 ["late-prices","kamata-late-night.html","#late-course-prices"],
 ["shop-top","shop.html",null],
 ["shop-keikyu","shop.html","#keikyu-kamata"]
];
const viewports=[[390,844],[430,932]];
const metrics=[];
const errors=[];

try{
  await wait(700);
  await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const tab=await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`,{method:"PUT"}).then(r=>r.json());
  const cdp=new CDP(tab.webSocketDebuggerUrl);await cdp.open();
  await cdp.send("Page.enable");await cdp.send("Runtime.enable");

  for(const [w,h] of viewports){
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:1,mobile:true,screenWidth:w,screenHeight:h});
    for(const [name,file,selector] of cases){
      const url=`http://127.0.0.1:${sitePort}/${file}`;
      const loaded=cdp.once("Page.loadEventFired",15000);
      await cdp.send("Page.navigate",{url});
      await loaded;
      await wait(500);
      const selectorLiteral=JSON.stringify(selector);
      const evalResult=await cdp.send("Runtime.evaluate",{
        expression:`(()=>{
          const style=document.createElement('style');
          style.textContent='html{scroll-behavior:auto!important}*{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}.fade-up{opacity:1!important;transform:none!important}.language-recommendation{display:none!important}body.has-language-recommendation{padding-top:0!important}';
          document.head.appendChild(style);
          const selector=${selectorLiteral};
          const target=selector?document.querySelector(selector):null;
          if(target){target.scrollIntoView({block:'start',inline:'nearest'});window.scrollBy(0,-72);}else{window.scrollTo(0,0);}
          const de=document.documentElement;
          const rect=target?target.getBoundingClientRect():null;
          return {scrollWidth:de.scrollWidth,innerWidth:window.innerWidth,scrollHeight:de.scrollHeight,scrollY:window.scrollY,targetFound:selector?!(!target):true,targetTop:rect?rect.top:null,targetBottom:rect?rect.bottom:null};
        })()`,
        returnByValue:true
      });
      await wait(150);
      const m=evalResult.result?.value||{};
      metrics.push({name,width:w,height:h,...m});
      if(m.scrollWidth>w+2) errors.push(`${name} ${w}: horizontal overflow scrollWidth=${m.scrollWidth}`);
      if(selector&&!m.targetFound) errors.push(`${name}: target missing ${selector}`);
      const shot=await cdp.send("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
      const out=path.join(outDir,`${name}-${w}x${h}.png`);
      fs.writeFileSync(out,Buffer.from(shot.data,"base64"));
      if(fs.statSync(out).size<1000) errors.push(`${name} ${w}x${h}: screenshot too small`);
    }
  }
  cdp.close();
}catch(e){errors.push(String(e?.stack||e));}
finally{
  fs.writeFileSync(path.join(outDir,"metrics.json"),JSON.stringify(metrics,null,2));
  server.kill("SIGTERM");chrome.kill("SIGTERM");
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`Mobile visual QA passed: ${metrics.length} screenshots, no horizontal overflow, all target anchors resolved.`);

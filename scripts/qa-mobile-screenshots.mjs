import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const findBrowser = () => {
  for (const candidate of ["google-chrome", "chromium", "chromium-browser"]) {
    const r = spawnSync("which", [candidate], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return "";
};
const browser=findBrowser();
if(!browser){console.error("Chrome/Chromium unavailable");process.exit(1);}
const outDir=path.resolve("qa-mobile");
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});
const port=18777;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const pages=[
  ["home","index.html"],
  ["menu","menu.html"],
  ["bodycare","bodycare-kamata.html"],
  ["foot","ashitsubo-fukurahagi.html"],
  ["aroma","aroma-oil-kamata.html"],
  ["late-night","kamata-late-night.html"],
  ["shop","shop.html"]
];
const viewports=[[390,844],[430,932]];
const errors=[];
try{
  await wait(700);
  for(const [name,url] of pages){
    for(const [w,h] of viewports){
      const file=path.join(outDir,`${name}-${w}x${h}.png`);
      const r=spawnSync(browser,[
        "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
        "--hide-scrollbars",`--window-size=${w},${h}`,`--screenshot=${file}`,
        `http://127.0.0.1:${port}/${url}`
      ],{encoding:"utf8",timeout:30000,maxBuffer:8*1024*1024});
      if(r.status!==0||!fs.existsSync(file)||fs.statSync(file).size<10000){
        errors.push(`${name} ${w}x${h}: screenshot failed (${r.status}) ${(r.stderr||"").slice(0,300)}`);
      }
    }
  }
}finally{server.kill("SIGTERM");}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`Generated ${pages.length*viewports.length} mobile QA screenshots in ${outDir}`);

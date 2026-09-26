import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=promisify(execFile);
const browser=['google-chrome','chromium','chromium-browser'].find(name=>spawnSync('which',[name]).status===0);
if(!browser)throw new Error('Chrome/Chromium is required for the actual booking-page test.');
const fixture=await readFile(path.join(root,'scripts/fixtures/booking-details-browser.js'),'utf8');
const errors=[];
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    let file=path.resolve(root,'.'+url.pathname);
    if(!file.startsWith(root+path.sep))throw new Error('Outside root');
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    let data=await readFile(file);
    const ext=path.extname(file);
    if(ext==='.html'){
      let html=data.toString().replace(/<script\b[^>]*src="https:\/\/www\.googletagmanager[^>]*><\/script>/g,'').replace(/<link[^>]*href="https:\/\/fonts\.[^>]*>/g,'');
      // CSP ensures tests cannot call live APIs or send analytics.
      html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\' data:; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; connect-src \'none\'; frame-src \'none\'">');
      if(url.searchParams.get('qa')==='booking')html=html.replace('</body>',`<script>${fixture}</script></body>`);
      data=Buffer.from(html);
    }
    const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
try{
  for(const lang of ['ja','en','zh','ko']){
    const {stdout}=await run(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=6000','--dump-dom',`http://127.0.0.1:${port}/booking.html?lang=${lang}&qa=booking`],{timeout:30000,maxBuffer:4*1024*1024});
    const result=stdout.match(/<output id="booking-details-qa"[^>]*>[\s\S]*?<\/output>/)?.[0]||'No result';
    if(!result.includes('data-status="passed"'))errors.push(`${lang}: ${result}`);
    else console.log(`${lang}: actual booking form passed all interaction checks at mobile width.`);
  }
  await mkdir(path.join(root,'qa-screenshots'),{recursive:true});
  for(const [name,url] of [['home','/'],['menu','/menu.html#pair-room'],['english','/en/#pair-room'],['chinese','/zh/#pair-room'],['korean','/ko/#pair-room'],['booking','/booking.html?lang=ja&guests=2&room=pair']]){
    await run(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,1000','--virtual-time-budget=3000',`--screenshot=${path.join(root,'qa-screenshots',name+'.png')}`,`http://127.0.0.1:${port}${url}`],{timeout:30000,maxBuffer:2*1024*1024});
  }
}finally{server.close();}
if(errors.length)throw new Error(errors.join('\n'));
console.log('Actual booking-page checks passed; screenshots saved for visual review. No live requests were sent.');

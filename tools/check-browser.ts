import {build} from 'esbuild';
import puppeteer from 'puppeteer-core';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {validateProject} from '../src/engine/validate';
import {frameCount,sampleToFrame} from '../src/engine/time';
import {resolveTime} from '../src/engine/state';
import {spatialIssues} from '../src/engine/spatial';
import {root,publicDir,verifyAssets} from './media';
import {browserExecutable} from './render';
async function main(){
  const file=process.argv[2],data=JSON.parse(readFileSync(file,'utf8')),p=validateProject(data.project);verifyAssets(p);
  const out=path.join(root,'projects/remotion-checks',p.id);mkdirSync(out,{recursive:true});
  await build({entryPoints:['src/remotion/BrowserCheck.tsx'],outfile:path.join(out,'check.js'),bundle:true,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
  const server=createServer((req,res)=>{
    const route=decodeURIComponent(new URL(req.url!,'http://localhost').pathname);
    if(route==='/'){res.setHeader('Content-Type','text/html');res.end('<html><head><style>body{margin:0}</style></head><body><div id="root"></div><script src="/check.js"></script></body></html>');return;}
    if(route==='/project.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;}
    const target=route==='/check.js'?path.join(out,'check.js'):path.resolve(publicDir,'.'+route);
    if(route!=='/check.js'&&!target.startsWith(publicDir+path.sep)||!existsSync(target)){res.statusCode=404;res.end();return;}
    const ext=path.extname(target),types:Record<string,string>={'.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.m4a':'audio/mp4'};
    res.setHeader('Content-Type',types[ext]??'application/octet-stream');res.end(readFileSync(target));
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const address=server.address() as {port:number},url=`http://127.0.0.1:${address.port}`;
  const browser=await puppeteer.launch({executablePath:browserExecutable(),headless:true,args:['--disable-gpu']});
  try{
    const page=await browser.newPage();await page.evaluateOnNewDocument('globalThis.__name = (fn) => fn;');
    await page.setViewport({width:p.frame.width,height:p.frame.height,deviceScaleFactor:1});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(url)||/^(data|blob):/.test(r.url())?r.continue():r.abort());
    const load=async()=>{await page.goto(url,{waitUntil:'networkidle0'});await page.waitForSelector('[data-fonts-ready="true"]');await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});};
    const seek=async(frame:number)=>{await page.evaluate(f=>window.seek(f),frame);await page.waitForFunction(f=>document.querySelector('[data-render-frame]')?.getAttribute('data-render-frame')===String(f),{},frame);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));};
    await load();const total=frameCount(p.audio.sampleCount,p.audio.sampleRate,p.frame.fps);
    const times=[0,p.audio.sampleCount-1,...p.scenes.flatMap(s=>[s.start,(s.start+s.end)/2,s.end-1]),...p.motions.flatMap(m=>{const t=resolveTime(m.at,p.events);return[t,t+m.duration/2,t+m.duration];})];
    const frames=[...new Set(times.map(t=>Math.min(total-1,sampleToFrame(Math.max(0,Math.round(t)),p.audio.sampleRate,p.frame.fps))))].sort((a,b)=>a-b);
    const violations:unknown[]=[],samples:unknown[]=[];
    for(const frame of frames){await seek(frame);
      const observed=await page.evaluate(()=>{
        const box=(e:Element)=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
        return {objects:[...document.querySelectorAll('[data-object][data-visible="true"]')].map(e=>({id:e.getAttribute('data-object')!,box:box(e),owner:e.getAttribute('data-owner'),
          minText:Math.min(...[...e.querySelectorAll('[data-text]')].map(n=>parseFloat(getComputedStyle(n).fontSize)*e.getBoundingClientRect().width/(e as HTMLElement).offsetWidth)),
          clipped:[...e.querySelectorAll('[data-text]')].some(n=>(n as HTMLElement).scrollWidth>(n as HTMLElement).clientWidth+1||(n as HTMLElement).scrollHeight>(n as HTMLElement).clientHeight+1)})),
          caption:document.querySelector('[data-caption]')?{box:box(document.querySelector('[data-caption]')!),text:box(document.querySelector('[data-caption] [data-text]')!)}:null};
      });samples.push({frame,...observed});
      for(const issue of spatialIssues(p,observed.objects))violations.push({frame,...issue});
      if(observed.caption){const [x,y,w,h]=observed.caption.text,[zx,zy,zw,zh]=p.layout.captionZone.map((v,i)=>v*(i%2?p.frame.height:p.frame.width));if(Math.abs(x+w/2-p.frame.width/2)>2||x<zx-2||y<zy-2||x+w>zx+zw+2||y+h>zy+zh+2)violations.push({frame,kind:'caption-bounds'});}
    }
    const hashes:unknown[]=[];
    for(const frame of [...new Set([0,Math.floor(total/3),Math.floor(total*2/3),total-1])]){
      const structure=()=>page.evaluate(()=>[...document.querySelectorAll('[data-object], [data-caption]')].map(e=>({html:e.outerHTML,box:JSON.stringify(e.getBoundingClientRect())})));
      await seek(total-1);await seek(frame);const before=await structure(),history=await page.screenshot();await load();await seek(frame);const after=await structure(),fresh=await page.screenshot();
      const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
      const [a,b]=await Promise.all([sharp(history).raw().toBuffer(),sharp(fresh).raw().toBuffer()]);let changed=0,maxDelta=0;
      for(let i=0;i<a.length;i++)if(a[i]!==b[i]){changed++;maxDelta=Math.max(maxDelta,Math.abs(a[i]-b[i]));}
      // Chromium may rerasterize SVG mask edge pixels after zooming. Require exact DOM/state/geometry,
      // and permit only <=0.01% channel differences with <=32/255 delta; never layout or motion drift.
      const equal=JSON.stringify(before)===JSON.stringify(after)&&changed/a.length<=.0001&&maxDelta<=32;
      hashes.push({frame,equal,exact:digest(history)===digest(fresh),changedChannels:changed,maxDelta});
      if(!equal){violations.push({frame,kind:'seek-difference'});writeFileSync(path.join(out,`history-${frame}.png`),history);}
      writeFileSync(path.join(out,`frame-${frame}.png`),fresh);
    }
    writeFileSync(path.join(out,'browser.json'),JSON.stringify({errors,violations,samples,hashes},null,2));
    if(errors.length||violations.length)throw Error(`Browser check: ${errors.length} runtime errors, ${violations.length} violations. ${out}`);
    console.log(`Browser passed ${frames.length} sampled frames; four history/fresh comparisons. ${out}`);
  }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

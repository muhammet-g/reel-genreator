// Browser regression for atomic component entry/exit, clean construction, and logo containment.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer-core');
(async()=>{
 const [fixture,chrome,output]=process.argv.slice(2);
 if(!fixture||!chrome||!output)throw Error('Usage: node check-motion-components.cjs FIXTURE CHROME REPORT');
 const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage(),errors=[];
  await page.setViewport({width:1080,height:1920});
  await page.setRequestInterception(true);
  page.on('request',r=>/^(file:|data:)/.test(r.url())?r.continue():r.abort());
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(path.resolve(fixture,'index.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  const samples={};
  for(const time of [.05,1.2,1.6,4.1,4.95,7.85,8.05,8.5]){
   await page.evaluate(t=>{window.__timelines.reel.pause().time(t,false);},time);
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   samples[time]=await page.evaluate(()=>{
    const visible=e=>{if(!e)return false;let alpha=1;
     for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.visibility==='hidden'||s.display==='none')return false;alpha*=Number(s.opacity);}
     return alpha>.05;};
    const q=s=>document.querySelector(s),rect=e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]};
    const image=q('#scene-2 .brand-logo');
    return {variable:visible(q('.program-variable')),rail:visible(q('.program-container')),
      cells:[...document.querySelectorAll('.program-cell')].filter(visible).length,
      ring:visible(q('.selection-ring')),connector:visible(q('.count-connector')),
      motif:visible(q('#scene-0 .scene-brand-motif')),
      expressionShell:visible(q('#scene-0 .program-expression')),
      editor:visible(q('#scene-1 .teaching-editor')),
      comments:[...document.querySelectorAll('#scene-1 .editor-comment')].filter(visible).length,
      editorBorder:visible(q('#scene-1 .teaching-editor'))&&parseFloat(getComputedStyle(q('#scene-1 .teaching-editor')).borderTopWidth)>0,
      logo:visible(image),logoRect:rect(image),logoFit:getComputedStyle(image).objectFit,
      logoNatural:[image.naturalWidth,image.naturalHeight],logoSource:image.getAttribute('src')};
   });
  }
  const a=samples[.05],b=samples[1.2],c=samples[1.6],d=samples[4.1],e=samples[4.95],f=samples[7.85],g=samples[8.05],h=samples[8.5];
  const logoBox=h.logoRect;
  const checks={
   cleanPreEntry:!a.variable&&!a.rail&&a.cells===0&&!a.ring&&!a.connector&&!a.motif&&!a.expressionShell,
   noEmptyRail:b.variable&&!b.rail&&b.cells===0,
   cellAndRailEnterTogether:c.rail&&c.cells>=1,
   noEmptyEditor:d.editor===false&&d.editorBorder===false&&d.comments===0,
   editorLifecycleAtomic:e.editor&&e.editorBorder&&e.comments>=1&&f.editor&&f.editorBorder&&!g.editor&&!g.editorBorder,
   noStackedConnector:!d.connector&&!e.connector&&!f.connector,
   logoOnlyOnRequest:!e.logo&&h.logo,
   completeLogo:h.logoFit==='contain'&&h.logoNatural[0]===3000&&h.logoNatural[1]===3000&&
     h.logoSource==='assets/brand-logo.png'&&logoBox[0]>=76&&logoBox[2]<=1004&&logoBox[1]>=220&&logoBox[3]<=1360,
  };
  const report={ok:Object.values(checks).every(Boolean)&&!errors.length,checks,errors,samples};
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:report.ok,checks,errors}));
  if(!report.ok)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

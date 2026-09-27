// Browser regression for the exact Arabic plus LTR arithmetic editor comment.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer-core');
(async()=>{
 const [dir,chrome,output]=process.argv.slice(2);
 if(!dir||!chrome||!output)throw Error('Usage: node check-editor-bidi.cjs COMPOSITION CHROME REPORT');
 const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage();
  await page.setViewport({width:1080,height:1920});
  await page.goto(pathToFileURL(path.resolve(dir,'index.html')).href);
  const report=await page.evaluate(async()=>{
   await document.fonts.ready;
   const scene=MOTION.scenes.findIndex(s=>s.id==='why-minus-one');
   if(scene<0)throw Error('Missing why-minus-one scene');
   const root=document.getElementById('scene-'+scene),lines=[...root.querySelectorAll('.editor-comment')];
   if(lines.length!==3)throw Error('Expected three teaching comments');
   const last=lines[2],arabic=last.querySelector('.comment-arabic'),math=last.querySelector('.comment-ltr');
   const mathText=math.firstChild;
   const charX=[...mathText.textContent].map((_,i)=>{
    const range=document.createRange();range.setStart(mathText,i);range.setEnd(mathText,i+1);
    const rect=range.getBoundingClientRect();return rect.x+rect.width/2;
   });
   const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
   const markerX=lines.map(line=>rect(line.querySelector('.comment-marker')).left);
   const checks={
    exactArabic:arabic.textContent==='آخر فهرس =',
    exactMath:math.textContent==='3 - 1 = 2',
    arabicRTL:getComputedStyle(arabic).direction==='rtl',
    mathLTR:getComputedStyle(math).direction==='ltr',
    mathIsolated:getComputedStyle(math).unicodeBidi==='isolate',
    cairoLoaded:document.fonts.check('600 29px Cairo','آخر فهرس'),
    monoLoaded:document.fonts.check('400 29px "JetBrains Mono"','3 - 1 = 2'),
    mathCharacterOrder:charX.every((x,i)=>i===0||x>=charX[i-1]),
    arabicBeforeMathInRTL:rect(arabic).left>=rect(math).right-1,
    editorMarkerAligned:Math.max(...markerX)-Math.min(...markerX)<.5,
    sameCommentBaseline:Math.abs(rect(arabic).bottom-rect(math).bottom)<10,
   };
   const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const samples=[];
   for(const time of [17.2,17.55,19.65,20.4,21.2]){
    window.__timelines.reel.pause().time(time,false);await wait();
    samples.push({time,opacity:lines.map(line=>Number(getComputedStyle(line).opacity))});
   }
   checks.stagedReveal=samples[0].opacity.every(x=>x<.05)&&samples[1].opacity[0]>.9&&
    samples[1].opacity.slice(1).every(x=>x<.05)&&samples[2].opacity[1]>.1&&
    samples[2].opacity[2]<.05&&samples[3].opacity[2]>.1;
   return {checks,samples,geometry:{arabic:rect(arabic),math:rect(math),markerX,charX}};
  });
  report.ok=Object.values(report.checks).every(Boolean);
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:report.ok,checks:report.checks}));
  if(!report.ok)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

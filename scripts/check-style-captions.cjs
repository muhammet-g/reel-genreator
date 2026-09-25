// Actual shaped caption geometry, offline font loading and mixed-direction regression.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer-core');
(async()=>{
 const [dir,chrome,output]=process.argv.slice(2);
 if(!dir||!chrome||!output)throw Error('Usage: node check-style-captions.cjs COMPOSITION CHROME REPORT');
 const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage(),errors=[],blocked=[];
  await page.setViewport({width:1080,height:1920});
  await page.setRequestInterception(true);
  page.on('request',r=>{if(/^(file:|data:)/.test(r.url()))r.continue();else{blocked.push(r.url());r.abort();}});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(path.resolve(dir,'index.html')).href);
  const faces=JSON.parse(fs.readFileSync(path.join(dir,'font-manifest.json'))).faces;
  const fonts=await page.evaluate(async faces=>{
   const result=[];
   for(const f of faces){const sample=f.subset==='arabic'?'النتيجة العربية':'scores.at(-1)';
    const loaded=await document.fonts.load(`${f.weight} 48px "${f.family}"`,sample);
    result.push({family:f.family,weight:f.weight,loaded:loaded.length>0&&loaded.every(x=>x.status==='loaded')});}
   await document.fonts.ready;return result;
  },faces);
  const report=await page.evaluate(async()=>{
   const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const measure=(i,name)=>{
    const cap=MOTION.captions[i],root=document.getElementById('caption-'+i),span=root.firstElementChild;
    const zones=MOTION.composition.scenes.filter(s=>cap.start<s.end&&cap.end>s.start).map(s=>s.caption_zone);
    const left=Math.max(...zones.map(z=>z[0])),right=Math.min(...zones.map(z=>z[0]+z[2]));
    const box=span.getBoundingClientRect(),center=box.x+box.width/2,expected=(left+right)/2;
    return {name,text:span.textContent,center,expected,error:Math.abs(center-expected),width:box.width,
     inside:box.left>=left-.5&&box.right<=right+.5,
     bidi:[...span.querySelectorAll('bdi')].every(e=>getComputedStyle(e).direction==='ltr'&&getComputedStyle(e).unicodeBidi==='isolate')};
   };
   const real=[];
   for(let i=0;i<MOTION.captions.length;i++){const c=MOTION.captions[i];window.__timelines.reel.pause().time((c.start+c.end)/2,false);await wait();real.push(measure(i,'caption-'+i));}
   const cases=[['Arabic','هذه جملة عربية واضحة'],['Mixed','تعلم <bdi dir="ltr">JavaScript</bdi> بخطوات واضحة'],
    ['Expression','القيمة <bdi class="code-island" dir="ltr"><code>fruits.at(-1)</code></bdi> من المصفوفة'],
    ['Numbers','لدينا 3 عناصر والنتيجة 87%'],['Two lines','عنوان عربي في السطر الأول\nوتوضيح مقروء في السطر الثاني'],
    ['Two lines mixed','نستخدم <bdi dir="ltr">Array</bdi> في المثال\nثم نقرأ <bdi class="code-island" dir="ltr"><code>fruits.at(-2)</code></bdi>']];
   const stress=[],root=document.getElementById('caption-0');
   window.__timelines.reel.pause().time((MOTION.captions[0].start+MOTION.captions[0].end)/2,false);
   for(const [name,html] of cases){for(const direction of ['rtl','ltr','auto']){root.dir=direction;root.firstElementChild.innerHTML=html;await wait();stress.push(measure(0,name+'-'+direction));}}
   return {real,stress};
  });
  report.fonts=fonts;report.errors=errors;report.blocked_requests=blocked;
  report.ok=fonts.length>0&&fonts.every(f=>f.loaded)&&!errors.length&&!blocked.length&&[...report.real,...report.stress].every(c=>c.error<=.5&&c.inside&&c.bidi);
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:report.ok,real:report.real.length,stress:report.stress.length,fonts:fonts.length,max_center_error:Math.max(...[...report.real,...report.stress].map(c=>c.error)),errors,blocked}));
  if(!report.ok)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

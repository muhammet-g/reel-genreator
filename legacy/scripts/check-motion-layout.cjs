// Read-only local geometry/RTL observations. Python supplies domain-neutral policy.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer-core');
(async()=>{
 const [dir,chrome,output]=process.argv.slice(2);
 if(!dir||!chrome||!output)throw Error('Usage: node check-motion-layout.cjs COMPOSITION CHROME REPORT');
 const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage(),errors=[],samples=[];
  await page.setRequestInterception(true);page.on('request',r=>/^(file:|data:)/.test(r.url())?r.continue():r.abort());
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(path.resolve(dir,'index.html')).href);await page.evaluate(()=>document.fonts.ready);
  const model=await page.evaluate(()=>MOTION.composition);
  await page.setViewport({width:model.frame.width,height:model.frame.height});
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
  for(const scene of model.scenes){
   for(const fraction of [.25,.5,.75,.9]){
    const time=scene.start+(scene.end-scene.start)*fraction;
    await page.evaluate(t=>{window.__timelines.reel.pause().time(t,false);},time);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const sample=await page.evaluate(({scene,time})=>{
     const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
     const visible=e=>{let opacity=1;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);opacity*=Number(s.opacity);if(s.visibility==='hidden'||s.display==='none')return false;}const r=e.getBoundingClientRect();return opacity>.05&&r.width>0&&r.height>0;};
     const measure=(e,id,role)=>{
      const texts=[e,...e.querySelectorAll('*')].filter(n=>visible(n)&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim()));
      const fonts=texts.map(n=>parseFloat(getComputedStyle(n).fontSize));
      let clipped=false;
      for(const n of texts){
       const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();
       for(let a=n;a;a=a.parentElement){const s=getComputedStyle(a),b=a.getBoundingClientRect();
        if((['hidden','clip'].includes(s.overflowX)&&(r.left<b.left-2||r.right>b.right+2))||(['hidden','clip'].includes(s.overflowY)&&(r.top<b.top-2||r.bottom>b.bottom+2)))clipped=true;
       }
      }
      const painted=[e,...e.querySelectorAll('*')].some(n=>{
       if(!visible(n))return false;
       const s=getComputedStyle(n);
       return n.matches('img,svg,canvas,video')||[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())||
        (s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent')||parseFloat(s.borderTopWidth)>0;
      });
      return {id,role,box:rect(e),visible:visible(e)&&painted,min_font:fonts.length?Math.min(...fonts):1000,max_font:fonts.length?Math.max(...fonts):0,clipped};
     };
     const objects=scene.elements.flatMap(b=>[...document.querySelectorAll(b.selector)].map((e,i)=>measure(e,b.id+(i?'#'+i:''),b.role)));
     const captions=[...document.querySelectorAll('.caption>span')].map((e,i)=>measure(e,'caption-'+i,'caption'));
     const bidi_errors=[...document.querySelectorAll('bdi[dir=ltr],code[dir=ltr],.current-expression,.previous-expression')].filter(visible).filter(e=>{
      const s=getComputedStyle(e);return s.direction!=='ltr'||(!['isolate','isolate-override'].includes(s.unicodeBidi)&&e.tagName!=='BDI');
     }).map(e=>e.textContent);
     return {scene:scene.id,time,objects,captions,bidi_errors};
    },{scene,time});
    samples.push(sample);
    if(fraction===.5)await page.screenshot({path:output+'.scene-'+scene.id.replace(/[^a-zA-Z0-9_-]/g,'_')+'.png'});
   }
  }
  fs.writeFileSync(output,JSON.stringify({samples,errors},null,2));console.log(JSON.stringify({scenes:model.scenes.length,samples:samples.length,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

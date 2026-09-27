// Local browser regression: same picture after a fresh seek and arbitrary history.
// Usage: node scripts/check-motion-seek.cjs COMPOSITION_DIR CHROME_PATH REPORT_JSON
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const crypto=require('node:crypto'),puppeteer=require('puppeteer-core');
(async()=>{
 const [dir,chrome,output]=process.argv.slice(2);
 if(!dir||!chrome||!output)throw Error('Provide composition directory, local Chrome executable, and report path.');
 const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage();await page.setViewport({width:1080,height:1920});
  await page.setRequestInterception(true);page.on('request',r=>/^(file:|data:)/.test(r.url())?r.continue():r.abort());
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(path.resolve(dir,'index.html')).href);await page.evaluate(()=>document.fonts.ready);
  const data=await page.evaluate(()=>({duration:MOTION.duration,scenes:MOTION.scenes}));
  const times=process.argv[5]?process.argv[5].split(',').map(Number):[...new Set(data.scenes.flatMap(s=>[s.start+.3,(s.start+s.end)/2,s.end-.1,...Object.values(s.choreography?.beats||{}).map(b=>Math.min(s.end-.1,s.start+b+.35))]).map(t=>Math.round(t*1000)/1000))];
  const seek=async t=>{await page.evaluate(t=>{window.__timelines.reel.pause().time(t,false);},t);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
  const hash=png=>crypto.createHash('sha256').update(png).digest('hex');
  const mismatches=[];
  for(const t of times){
   await seek(data.duration-.001);await seek(.001);await seek(t);const a=await page.screenshot(),history=hash(a);
   await page.reload();await page.evaluate(()=>document.fonts.ready);await seek(t);const b=await page.screenshot(),fresh=hash(b);
   if(history!==fresh){
    mismatches.push({time:t,history,fresh});
    fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
    fs.writeFileSync(output+`-${t}-history.png`,a);fs.writeFileSync(output+`-${t}-fresh.png`,b);
   }
  }
  const report={samples:times.length,times,errors,mismatches,ok:!errors.length&&!mismatches.length};
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));if(!report.ok)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

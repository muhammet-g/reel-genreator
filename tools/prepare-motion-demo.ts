import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {motionLanguageDemo} from '../src/examples/motion-language-demo';
import {motionActivity} from '../src/engine/planning';
import {root,ffmpeg,inspectAudio,stage,prepareAudio} from './media';
async function main(){
  const result=motionLanguageDemo(),p=result.project,dir=path.join(root,'projects/motion-language-demo');mkdirSync(dir,{recursive:true});
  const master=path.join(dir,'silent-master.wav');
  if(!existsSync(master))ffmpeg(['-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','30','-c:a','pcm_s16le',master]);
  p.audio=await inspectAudio(master,p.id);
  for(const [family,pkg,subset] of [['Cairo','cairo','arabic'],['Inter','inter','latin'],['JetBrains Mono','jetbrains-mono','latin']])
    p.style.fontFiles.push({...stage(path.join(root,`node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-600-normal.woff2`),p.id),family,weight:600});
  await prepareAudio(p);
  writeFileSync(path.join(dir,'project.json'),JSON.stringify({project:p},null,2));
  writeFileSync(path.join(dir,'recipes.json'),JSON.stringify(result.recipes,null,2));
  const source=structuredClone(result.source);source.audio=p.audio;source.style=p.style;
  writeFileSync(path.join(dir,'source.json'),JSON.stringify({project:source},null,2));
  // Control uses identical layout, fonts, audio and durations, with only the old fade-in-and-hold pattern.
  const baseline=structuredClone(result.source);baseline.id='MotionLanguageBefore';baseline.audio=p.audio;baseline.style=p.style;
  for(const o of baseline.objects){o.initial.opacity=0;const s=baseline.scenes.find(s=>s.id===o.scene)!;baseline.motions.push({target:o.id,at:s.start,duration:24000,to:{opacity:1},intent:'entrance',ease:'smooth'});}
  writeFileSync(path.join(dir,'before.json'),JSON.stringify({project:baseline},null,2));
  writeFileSync(path.join(dir,'motion-report.json'),JSON.stringify({phases:result.phases,warnings:result.warnings,activity:result.activity,before:motionActivity(baseline)},null,2));
  console.log(path.join(dir,'project.json'));console.log(result.warnings);
}
main().catch(e=>{console.error(e);process.exitCode=1;});

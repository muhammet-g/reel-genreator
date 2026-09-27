import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fixture} from '../src/examples/fixture';
import {validateProject} from '../src/engine/validate';
import {root,ffmpeg,inspectAudio,stage,prepareAudio} from './media';
async function main(){
  const p=structuredClone(fixture),dir=path.join(root,'projects/remotion-fixture');mkdirSync(dir,{recursive:true});
  const audio=path.join(dir,'synthetic-master.wav');
  if(!existsSync(audio))ffmpeg(['-f','lavfi','-i','sine=frequency=220:sample_rate=48000:duration=6','-af','volume=0.03','-ac','2','-c:a','pcm_s16le',audio]);
  p.audio=await inspectAudio(audio,p.id);
  for(const [family,pkg,subset,weight] of [['Cairo','cairo','arabic',600],['Inter','inter','latin',600],['JetBrains Mono','jetbrains-mono','latin',600]] as const){
    const font=stage(path.join(root,`node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-${weight}-normal.woff2`),p.id);
    p.style.fontFiles.push({...font,family,weight});
  }
  const icon=stage(path.join(root,'resources/icons/arrow-forward.svg'),p.id);
  p.resources.push({id:'arrow',...icon,type:'svg',source:'Original local engine resource',license:'CC0-1.0',reviewed:true,tags:['arrow'],sceneTypes:['process'],energy:'calm',styles:[],loopable:false});
  p.objects.push({id:'arrow',kind:'image',label:'',role:'context',size:[.08,.04],resource:'arrow',tint:'accent',direction:'ltr',depth:0,allowOverlap:[],initial:{x:.87,y:.70,opacity:1,scale:1,rotation:0,focus:0,owner:null}});
  const sound=stage(path.join(root,'resources/sfx/clicks/soft-tap.wav'),p.id);
  p.resources.push({id:'tap',...sound,type:'audio',source:'Original local synthetic transient',license:'CC0-1.0',reviewed:true,tags:['tap'],sceneTypes:[],energy:'calm',styles:[],loopable:false});
  p.sfx.push({resource:'tap',at:{event:'focus',offset:0},gain:.12,trimStart:0,duration:4800});
  validateProject(p);await prepareAudio(p);
  writeFileSync(path.join(dir,'project.json'),JSON.stringify({project:p},null,2));console.log(path.join(dir,'project.json'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});

import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {validateProject} from '../src/engine/validate';
import {frameCount,sampleToFrame} from '../src/engine/time';
import {root,publicDir,verifyAssets} from './media';
import {browserExecutable} from './render';

export function previewFrames(project:ReturnType<typeof validateProject>,selection:string[]){
  if(!selection.length)throw Error('Select --scene ID, --event ID, or --frame N');
  const total=frameCount(project.audio.sampleCount,project.audio.sampleRate,project.frame.fps),frames=new Set<number>();
  const add=(frame:number)=>{if(!Number.isInteger(frame)||frame<0||frame>=total)throw Error(`Preview frame outside video: ${frame}`);frames.add(frame);};
  for(let i=0;i<selection.length;i+=2){const flag=selection[i],value=selection[i+1];if(!value)throw Error(`Missing value for ${flag}`);
    if(flag==='--frame')add(Number(value));
    else if(flag==='--event'){
      if(!(value in project.events))throw Error(`Unknown preview event: ${value}`);
      add(Math.min(total-1,sampleToFrame(project.events[value],project.audio.sampleRate,project.frame.fps)));
    }else if(flag==='--scene'){
      const scene=project.scenes.find(s=>s.id===value);if(!scene)throw Error(`Unknown preview scene: ${value}`);
      for(const sample of [scene.start,Math.floor((scene.start+scene.end)/2)])add(Math.min(total-1,sampleToFrame(sample,project.audio.sampleRate,project.frame.fps)));
      add(Math.min(total-1,sampleToFrame(scene.end-1,project.audio.sampleRate,project.frame.fps,'floor')));
    }else throw Error(`Unknown preview option: ${flag}`);
  }
  return [...frames].sort((a,b)=>a-b);
}

async function main(){
  const file=process.argv[2];if(!file)throw Error('Pass project.json and frame selection');
  const args=process.argv.slice(3),index=args.indexOf('--composition');
  const compositionId=index<0?'MotionProject':args[index+1];
  if(index>=0)args.splice(index,2);
  const debugIndex=args.indexOf('--debug'),debugOverlays=debugIndex>=0;
  if(debugIndex>=0)args.splice(debugIndex,1);
  if(!['MotionProject','ForEachFilm'].includes(compositionId))throw Error('Unknown composition');
  const project=validateProject(JSON.parse(readFileSync(file,'utf8')).project),frames=previewFrames(project,args);
  verifyAssets(project);
  const parent=path.join(root,'projects/remotion-previews',project.id);mkdirSync(parent,{recursive:true});
  const out=mkdtempSync(path.join(parent,'run-'));
  const serveUrl=await bundle({entryPoint:path.join(root,'src/remotion/index.ts'),publicDir,outDir:path.join(out,'bundle')});
  const options={serveUrl,inputProps:{project,debugOverlays:debugOverlays&&compositionId==='ForEachFilm'},browserExecutable:browserExecutable()};
  const composition=await selectComposition({...options,id:compositionId});
  for(const frame of frames)await renderStill({...options,composition,frame,output:path.join(out,`frame-${frame}.png`)});
  writeFileSync(path.join(out,'selection.json'),JSON.stringify({project:project.id,composition:compositionId,debugOverlays,source:path.resolve(file),frames},null,2));
  console.log(`Previewed ${frames.length} frames without a full video render: ${out}`);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});

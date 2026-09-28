import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,copyFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {validateProject} from '../src/engine/validate';
import {root,publicDir,prepareAudio,verifyOutput,ffmpeg,hash,verifyAssets} from './media';
export const browserExecutable=()=>process.env.REMOTION_BROWSER??(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined);
async function main(){
  const file=process.argv[2];if(!file)throw Error('Pass project props JSON');
  const flag=process.argv.indexOf('--composition');
  const compositionId=flag<0?'MotionProject':process.argv[flag+1];
  if(!['MotionProject','ForEachFilm'].includes(compositionId))throw Error('Unknown composition');
  const project=validateProject(JSON.parse(readFileSync(file,'utf8')).project);
  const dependencyLockHash=hash(path.join(root,'package-lock.json'));
  const audio=await prepareAudio(project),inputProps={project};
  const parent=path.join(root,'projects/remotion-renders',project.id);mkdirSync(parent,{recursive:true});
  const out=mkdtempSync(path.join(parent,'run-'));
  const snapshot=path.join(out,'project.json');writeFileSync(snapshot,JSON.stringify(inputProps,null,2));
  const renderAssets=path.join(out,'assets');
  const selected=new Set([project.audio.src,project.audio.derivative!.src,...project.resources.map(r=>r.file),...project.style.fontFiles.map(f=>f.file)]);
  for(const font of project.style.fontFiles){const folder=path.dirname(font.file);for(const name of readdirSync(path.join(publicDir,folder)))if(/^font-license-.*\.txt$/.test(name))selected.add(path.join(folder,name));}
  for(const file of selected){const target=path.join(renderAssets,file);mkdirSync(path.dirname(target),{recursive:true});copyFileSync(path.join(publicDir,file),target);}
  const bundleDir=await bundle({entryPoint:path.join(root,'src/remotion/index.ts'),publicDir:renderAssets,outDir:path.join(out,'bundle')});
  const options={serveUrl:bundleDir,inputProps,browserExecutable:browserExecutable()};
  const composition=await selectComposition({...options,id:compositionId});
  const picture=path.join(out,'picture.mp4'),final=path.join(out,'final.mp4');
  if(existsSync(final)||existsSync(picture))throw Error('Output exists; choose a new project id to preserve exports');
  let reported=-1;
  await renderMedia({...options,composition,outputLocation:picture,codec:'h264',pixelFormat:'yuv420p',colorSpace:'bt709',muted:true,concurrency:2,
    onProgress:({progress})=>{const step=Math.floor(progress*10);if(step>reported){reported=step;console.log(`${step*10}%`);}}});
  ffmpeg(['-i',picture,'-i',audio,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',final]);
  const report=await verifyOutput(project,final);
  for(const frame of [0,Math.floor(composition.durationInFrames/2),composition.durationInFrames-1])
    await renderStill({...options,composition,frame,output:path.join(out,`frame-${frame}.png`)});
  verifyAssets(project);
  writeFileSync(path.join(out,'verification.json'),JSON.stringify({...report,projectHash:hash(snapshot),dependencyLockHash,renderer:'Remotion',composition:compositionId,version:1},null,2));
  console.log('\n'+final);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});

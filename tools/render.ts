import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {validateProject} from '../src/engine/validate';
import {root,publicDir,prepareAudio,verifyOutput,ffmpeg,hash,verifyAssets} from './media';
export const browserExecutable=()=>process.env.REMOTION_BROWSER??(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined);
async function main(){
  const file=process.argv[2];if(!file)throw Error('Pass project props JSON');
  const project=validateProject(JSON.parse(readFileSync(file,'utf8')).project);
  const audio=await prepareAudio(project),inputProps={project};
  const parent=path.join(root,'projects/remotion-renders',project.id);mkdirSync(parent,{recursive:true});
  const out=mkdtempSync(path.join(parent,'run-'));
  const bundleDir=await bundle({entryPoint:path.join(root,'src/remotion/index.ts'),publicDir,outDir:path.join(out,'bundle')});
  const options={serveUrl:bundleDir,inputProps,browserExecutable:browserExecutable()};
  const composition=await selectComposition({...options,id:'MotionProject'});
  const picture=path.join(out,'picture.mp4'),final=path.join(out,'final.mp4');
  if(existsSync(final)||existsSync(picture))throw Error('Output exists; choose a new project id to preserve exports');
  await renderMedia({...options,composition,outputLocation:picture,codec:'h264',pixelFormat:'yuv420p',colorSpace:'bt709',muted:true,concurrency:2,
    onProgress:({progress})=>{if(Math.floor(progress*100)%20===0)process.stdout.write('.');}});
  ffmpeg(['-i',picture,'-i',audio,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',final]);
  const report=await verifyOutput(project,final);
  for(const frame of [0,Math.floor(composition.durationInFrames/2),composition.durationInFrames-1])
    await renderStill({...options,composition,frame,output:path.join(out,`frame-${frame}.png`)});
  verifyAssets(project);
  writeFileSync(path.join(out,'verification.json'),JSON.stringify({...report,projectHash:hash(file),renderer:'Remotion',version:1},null,2));
  console.log('\n'+final);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});

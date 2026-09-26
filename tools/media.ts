import {createHash} from 'node:crypto';
import {existsSync,readFileSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import type {Project} from '../src/engine/contracts';
import {frameCount} from '../src/engine/time';
import {resolveTime} from '../src/engine/state';
export const root=process.cwd();
export const publicDir=path.join(root,'projects/remotion-public');
export const hash=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
export function executable(name:'ffmpeg'|'ffprobe'){
  const override=process.env[name.toUpperCase()+'_PATH'];
  if(override)return override;
  const bundled=path.join(root,'node_modules/@remotion/compositor-win32-x64-msvc',name+'.exe');
  return process.platform==='win32'&&existsSync(bundled)?bundled:name;
}
export function run(exe:string,args:string[]){
  const result=spawnSync(exe,args,{encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});
  if(result.error||result.status!==0)throw Error(`${path.basename(exe)} failed: ${result.error??result.stderr.slice(-3000)}`);
  return result.stdout;
}
export const probe=(file:string)=>JSON.parse(run(executable('ffprobe'),['-v','error','-show_format','-show_streams','-of','json',file]));
export const ffmpeg=(args:string[])=>run(executable('ffmpeg'),['-v','error','-nostdin','-n',...args]);
export async function decoded(file:string,channels:number){
  const digest=createHash('sha256');let bytes=0,errors='',header=Buffer.alloc(0),dataStarted=false;
  await new Promise<void>((resolve,reject)=>{
    const p=spawn(executable('ffmpeg'),['-v','error','-nostdin','-i',file,'-map','0:a:0','-f','wav','-c:a','pcm_s24le','-'],{windowsHide:true});
    p.stdout.on('data',(data:Buffer)=>{
      if(!dataStarted){
        header=Buffer.concat([header,data]);let offset=12;
        while(offset+8<=header.length){
          const size=header.readUInt32LE(offset+4);
          if(header.toString('ascii',offset,offset+4)==='data'){data=header.subarray(offset+8);dataStarted=true;header=Buffer.alloc(0);break;}
          offset+=8+size+(size%2);
        }
        if(!dataStarted)return;
      }
      bytes+=data.length;digest.update(data);
    });
    p.stderr.on('data',data=>errors+=data);p.on('error',reject);
    p.on('close',code=>code===0?resolve():reject(Error(`Audio decode failed: ${errors}`)));
  });
  if(!dataStarted||bytes%(channels*3))throw Error('Incomplete decoded sample');
  return {hash:digest.digest('hex'),sampleCount:bytes/(channels*3)};
}
export function stage(file:string,folder:string){
  const digest=hash(file),relative=`${folder}/${digest.slice(0,16)}${path.extname(file).toLowerCase()}`;
  const target=path.join(publicDir,relative);mkdirSync(path.dirname(target),{recursive:true});
  if(existsSync(target)){if(hash(target)!==digest)throw Error('Staged asset collision');}else copyFileSync(file,target);
  return {file:relative,sha256:digest};
}
export async function inspectAudio(file:string,folder:string):Promise<Project['audio']>{
  const info=probe(file),stream=info.streams.find((s:any)=>s.codec_type==='audio');
  if(!stream||info.streams.some((s:any)=>s.codec_type==='video'))throw Error('Expected finished audio only');
  const before=hash(file),pcm=await decoded(file,stream.channels),asset=stage(file,folder);
  if(hash(file)!==before)throw Error('Master changed during intake');
  return {src:asset.file,sha256:before,sampleRate:Number(stream.sample_rate),sampleCount:pcm.sampleCount,channels:stream.channels,
    codec:stream.codec_name,durationSource:'decoded-samples'};
}
export function verifyAssets(p:Project){
  const assets=[{file:p.audio.src,sha256:p.audio.sha256},...p.resources,...p.style.fontFiles];
  if(p.audio.derivative)assets.push({file:p.audio.derivative.src,sha256:p.audio.derivative.sha256});
  for(const asset of assets){if(!asset.file||hash(path.join(publicDir,asset.file))!==asset.sha256)throw Error(`Asset changed: ${asset.file}`);}
}
export async function prepareAudio(p:Project){
  verifyAssets(p);
  const master=path.join(publicDir,p.audio.src),folder=path.dirname(master);
  const identity=createHash('sha256').update(JSON.stringify({master:p.audio.sha256,sfx:p.sfx,events:p.events,resources:p.resources})).digest('hex').slice(0,16);
  const output=path.join(folder,`audio-${identity}.m4a`);
  const record=output+'.json';
  if(existsSync(output)){
    if(!existsSync(record)||JSON.parse(readFileSync(record,'utf8')).sha256!==hash(output))throw Error('Unregistered or changed audio derivative');
  }else{
    const args=['-i',master],filters:string[]=[],labels=['[0:a]'];
    p.sfx.forEach((cue,i)=>{
      const resource=p.resources.find(r=>r.id===cue.resource)!;
      args.push('-i',path.join(publicDir,resource.file));
      const start=resolveTime(cue.at,p.events),label=`fx${i}`;
      filters.push(`[${i+1}:a]aresample=${p.audio.sampleRate},atrim=start_sample=${cue.trimStart}:end_sample=${cue.trimStart+cue.duration},asetpts=PTS-STARTPTS,volume=${cue.gain},adelay=${start}S:all=1[${label}]`);
      labels.push(`[${label}]`);
    });
    if(filters.length){filters.push(`${labels.join('')}amix=inputs=${labels.length}:duration=first:normalize=0[out]`);args.push('-filter_complex',filters.join(';'),'-map','[out]');}
    else args.push('-map','0:a:0');
    ffmpeg([...args,'-c:a','aac','-b:a','192k','-ar',String(p.audio.sampleRate),'-ac',String(p.audio.channels),'-f','mp4',output]);
    writeFileSync(record,JSON.stringify({sha256:hash(output),master:p.audio.sha256,sfx:p.sfx},null,2));
  }
  const pcm=await decoded(output,p.audio.channels);
  p.audio.derivative={src:path.relative(publicDir,output).replaceAll('\\','/'),sha256:hash(output),decodedHash:pcm.hash,sourceHash:p.audio.sha256};
  verifyAssets(p);return output;
}
export async function verifyOutput(p:Project,file:string){
  verifyAssets(p);const info=probe(file),v=info.streams.find((s:any)=>s.codec_type==='video'),a=info.streams.find((s:any)=>s.codec_type==='audio');
  const frames=frameCount(p.audio.sampleCount,p.audio.sampleRate,p.frame.fps),fps=p.frame.fps.num/p.frame.fps.den;
  if(!v||v.width!==p.frame.width||v.height!==p.frame.height||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p')throw Error('Video format mismatch');
  const [num,den]=String(v.avg_frame_rate).split('/').map(Number);
  if(Math.abs(num/den-fps)>1e-6||Number(v.nb_frames)!==frames)throw Error('Frame count or FPS mismatch');
  if(!a||a.codec_name!=='aac'||Number(a.sample_rate)!==p.audio.sampleRate||a.channels!==p.audio.channels)throw Error('Audio format mismatch');
  const duration=Number(info.format.duration),expected=p.audio.sampleCount/p.audio.sampleRate;
  if(duration<expected-.001||duration-expected>1/fps+.05)throw Error('Output duration mismatch');
  ffmpeg(['-i',file,'-f','null','-']);
  const pcm=await decoded(file,p.audio.channels);
  if(pcm.hash!==p.audio.derivative?.decodedHash)throw Error('Final audio differs from derivative');
  return {frames,fps,dimensions:[v.width,v.height],duration,masterDuration:expected,masterSha256:p.audio.sha256,
    derivativeSha256:p.audio.derivative.sha256,decodedAudioSha256:pcm.hash,outputSha256:hash(file),completeDecode:true,creatorAcceptance:false};
}

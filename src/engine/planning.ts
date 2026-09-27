import type {Project,Resource} from './contracts';
import {resolveTime,objectStateAt,cameraAt} from './state';

/** Track coverage, not a perceptual quality score. Tiny motion still counts as movement. */
export function motionActivity(p:Project){
  return p.scenes.map(scene=>{
    const spans:Array<[number,number]>=[];
    const include=(start:number,end:number)=>{if(end>scene.start&&start<scene.end)spans.push([Math.max(scene.start,start),Math.min(scene.end,end)]);};
    for(const motion of p.motions){
      const object=p.objects.find(o=>o.id===motion.target)!;
      if(!motion.duration||object.scene&&object.scene!==scene.id)continue;
      const start=resolveTime(motion.at,p.events),before={...objectStateAt(object,p.motions,p.events,start-1),...motion.from};
      if(Object.entries(motion.to).some(([key,value])=>key!=='selected'&&typeof value==='number'&&Math.abs(value-Number(before[key as keyof typeof before]))>1e-6))include(start,start+motion.duration);
    }
    for(const cue of p.camera){const start=resolveTime(cue.at,p.events),a=cameraAt(p,start),b=cameraAt(p,start+cue.duration);
      if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.zoom-b.zoom)>1e-6)include(start,start+cue.duration);}
    for(const transition of p.transitions)if(['fade','focus','push','wipe','reveal'].includes(transition.kind)){
      const start=resolveTime(transition.at,p.events);include(start,start+transition.duration);
    }
    spans.sort((a,b)=>a[0]-b[0]);let cursor=scene.start,moving=0,longest=0;
    for(const [start,end] of spans){longest=Math.max(longest,start-cursor);if(end>cursor)moving+=end-Math.max(cursor,start);cursor=Math.max(cursor,end);}
    longest=Math.max(longest,scene.end-cursor);
    return {scene:scene.id,movingFraction:moving/(scene.end-scene.start),longestStillSeconds:longest/p.audio.sampleRate};
  });
}
export function rankResources(resources:Resource[],request:{tags:string[];sceneType:string;energy:string;style?:string;type?:string;durationSamples?:number}){
  return resources.filter(r=>r.reviewed&&r.source&&r.license&&(!request.type||r.type===request.type)&&
    (request.type||r.type!=='audio')&&(!r.sceneTypes.length||r.sceneTypes.includes(request.sceneType))&&
    (!request.durationSamples||!r.durationSamples||r.durationSamples>=request.durationSamples||r.loopable))
    .map(resource=>{
      const tags=request.tags.filter(t=>resource.tags.includes(t)).length,scene=resource.sceneTypes.includes(request.sceneType),
        energy=resource.energy===request.energy,style=!!request.style&&resource.styles.includes(request.style);
      return {resource,score:tags*8+Number(scene)*6+Number(energy)*3+Number(style)*3,reasons:{tags,scene,energy,style}};
    }).filter(r=>r.reasons.tags||r.reasons.scene).sort((a,b)=>b.score-a.score||a.resource.id.localeCompare(b.resource.id));
}
export function motionDefaults(energy:'calm'|'balanced'|'energetic',density:'low'|'medium'|'high',rate:number){
  const speed={calm:.83,balanced:1,energetic:1.12}[energy]*{low:.8,medium:1,high:1.12}[density];
  return {entrance:Math.round(.42*rate/speed),exit:Math.round(.25*rate/speed),hold:Math.round(.6*rate),ease:'smooth' as const};
}
export function motionAdvisories(p:Project){
  const findings:Array<{code:string;target?:string;message:string}>=[];
  const entrances=p.motions.filter(m=>m.intent==='entrance');
  for(let i=2;i<entrances.length;i++)if(entrances.slice(i-2,i+1).every(m=>JSON.stringify(Object.keys(m.to))===JSON.stringify(Object.keys(entrances[i].to))))
    findings.push({code:'repeated-entrance',target:entrances[i].target,message:'Review three repeated entrance patterns.'});
  if(p.camera.filter(c=>c.kind!=='static'&&c.kind!=='settle').length>p.scenes.length)
    findings.push({code:'camera-density',message:'More camera moves than semantic scenes; review attention demands.'});
  return findings;
}

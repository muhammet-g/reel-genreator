import type {Project,Resource} from './contracts';
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

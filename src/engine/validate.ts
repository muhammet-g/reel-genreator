import {projectSchema,type Project} from './contracts';
import {objectStateAt,resolveTime} from './state';
const unique=(values:string[],what:string)=>{if(new Set(values).size!==values.length)throw Error(`Duplicate ${what}`);};
const local=(file:string)=>{if(file&&(/(^[\\/]|:|\\|(^|\/)\.\.($|\/))/.test(file)))throw Error(`Unsafe local asset path: ${file}`);};
export function validateProject(input:unknown):Project {
  const p=projectSchema.parse(input),end=p.audio.sampleCount;
  unique(p.scenes.map(x=>x.id),'scene');unique(p.objects.map(x=>x.id),'object');unique(p.captions.map(x=>x.id),'caption');unique(p.resources.map(x=>x.id),'resource');
  local(p.audio.src);p.style.fontFiles.forEach(f=>local(f.file));
  if(p.audio.derivative){local(p.audio.derivative.src);if(p.audio.derivative.sourceHash!==p.audio.sha256)throw Error('Audio derivative lineage mismatch');}
  const objects=new Set(p.objects.map(o=>o.id)),scenes=new Set(p.scenes.map(s=>s.id));
  const ref=(key:string,set:Set<string>,kind:string)=>{if(!set.has(key))throw Error(`Unknown ${kind}: ${key}`);};
  let cursor=0;
  for(const scene of p.scenes){
    if(scene.start!==cursor||scene.end<=scene.start||scene.end>end)throw Error('Scene coverage must be contiguous and cover all audio');
    scene.hierarchy.forEach(x=>ref(x,objects,'hierarchy object'));cursor=scene.end;
  }
  if(cursor!==end)throw Error('Scene coverage misses audio tail');
  for(const [name,time] of Object.entries(p.events))if(time>end)throw Error(`Out-of-range event: ${name}`);
  cursor=0;
  for(const phrase of p.captions){if(phrase.start<cursor||phrase.end<=phrase.start||phrase.end>end)throw Error('Caption overlap or out of range');cursor=phrase.end;}
  const bounds=(at:Parameters<typeof resolveTime>[0],duration:number)=>{
    const start=resolveTime(at,p.events);if(start<0||start+duration>end)throw Error('Track outside audio duration');return start;
  };
  const tracks=new Map<string,Array<[number,number]>>();
  for(const motion of p.motions){
    ref(motion.target,objects,'motion target');const start=bounds(motion.at,motion.duration);
    if(motion.to.owner)ref(motion.to.owner,objects,'owner');
    for(const key of Object.keys(motion.to)){
      const id=`${motion.target}/${key}`,spans=tracks.get(id)??[];
      if(spans.some(([a,b])=>start<b&&start+motion.duration>a||start===a))throw Error(`Motion overlap: ${id}`);
      spans.push([start,start+motion.duration]);tracks.set(id,spans);
    }
  }
  for(const object of p.objects){if(object.scene)ref(object.scene,scenes,'scene');if(object.initial.owner)ref(object.initial.owner,objects,'owner');}
  // Ownership is checked at every possible state change, not only at frame zero.
  for(const time of [0,...p.motions.map(m=>resolveTime(m.at,p.events))]){
    const states=new Map(p.objects.map(o=>[o.id,objectStateAt(o,p.motions,p.events,time)]));
    for(const object of p.objects){const seen=new Set<string>();let id:string|null=object.id;
      while(id){if(seen.has(id))throw Error('Cyclic ownership');seen.add(id);id=states.get(id)!.owner;}}
  }
  let cameraEnd=0;
  for(const camera of p.camera){const start=bounds(camera.at,camera.duration);if(start<cameraEnd)throw Error('Camera overlap');cameraEnd=start+camera.duration;if(camera.target)ref(camera.target,objects,'camera target');}
  for(const transition of p.transitions){
    const i=p.scenes.findIndex(s=>s.id===transition.from);
    if(i<0||p.scenes[i+1]?.id!==transition.to)throw Error('Transition must connect adjacent scenes');
    if(bounds(transition.at,transition.duration)!==p.scenes[i+1].start)throw Error('Transition must begin at incoming boundary');
    transition.shared.forEach(x=>{ref(x,objects,'shared object');if(p.objects.find(o=>o.id===x)!.scene)throw Error('Shared object must be persistent');});
  }
  const resources=new Set(p.resources.map(r=>r.id));
  for(const r of p.resources){local(r.file);if(!r.reviewed)throw Error(`Unreviewed selected resource: ${r.id}`);}
  for(const o of p.objects)if(o.resource)ref(o.resource,resources,'resource');
  for(const cue of p.sfx){bounds(cue.at,cue.duration);ref(cue.resource,resources,'SFX resource');if(p.resources.find(r=>r.id===cue.resource)!.type!=='audio')throw Error('SFX requires audio resource');}
  for(const box of [p.layout.safeArea,p.layout.captionZone])if(box[0]+box[2]>1||box[1]+box[3]>1)throw Error('Layout zone outside frame');
  return p;
}

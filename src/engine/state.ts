import type {Motion,ObjectState,Project,Trigger,VisualObject} from './contracts';
import {ease} from './easing';
export {ease} from './easing';
export function resolveTime(at:Trigger,events:Record<string,number>):number {
  if (typeof at==='number') return at;
  if (!(at.event in events)) throw Error(`Unknown event: ${at.event}`);
  return events[at.event]+at.offset;
}
export function objectStateAt(object:VisualObject,motions:Motion[],events:Record<string,number>,sample:number):ObjectState {
  const state={...object.initial};
  for(const motion of motions.filter(m=>m.target===object.id).sort((a,b)=>resolveTime(a.at,events)-resolveTime(b.at,events))){
    const start=resolveTime(motion.at,events);
    if(sample<start) break;
    const p=ease(motion.duration===0?1:(sample-start)/motion.duration,motion.ease);
    const before={...state,...motion.from};
    for(const [key,value] of Object.entries(motion.to)){
      const old=before[key as keyof ObjectState];
      (state as Record<string,unknown>)[key]=key!=='selected'&&typeof value==='number'&&typeof old==='number'?old+(value-old)*p:value;
    }
    if(motion.control){
      const [cx,cy]=motion.control;
      state.x=(1-p)**2*before.x+2*(1-p)*p*cx+p*p*(motion.to.x??before.x);
      state.y=(1-p)**2*before.y+2*(1-p)*p*cy+p*p*(motion.to.y??before.y);
    }
  }
  return state;
}
export function cameraAt(project:Project,sample:number){
  let state={x:.5,y:.5,zoom:1};
  for(const cue of project.camera){
    const start=resolveTime(cue.at,project.events); if(sample<start) break;
    const p=ease(cue.duration===0?1:(sample-start)/cue.duration,cue.ease)*cue.intensity;
    const target=cue.target?project.objects.find(o=>o.id===cue.target):undefined;
    const subject=target?objectStateAt(target,project.motions,project.events,cue.kind==='follow'?Math.min(sample,start+cue.duration):start):undefined;
    state={x:state.x+((subject?.x??cue.x)-state.x)*p,y:state.y+((subject?.y??cue.y)-state.y)*p,
      zoom:state.zoom+(cue.zoom-state.zoom)*p};
  }
  return state;
}

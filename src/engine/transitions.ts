import type {Project,VisualObject} from './contracts';
import {ease,resolveTime} from './state';
export function transitionState(project:Project,object:VisualObject,sample:number){
  if(!object.scene)return {opacity:1,x:0,scale:1,clip:0};
  const scene=project.scenes.find(s=>s.id===object.scene)!;
  let visible=sample>=scene.start&&sample<scene.end;
  let opacity=1,x=0,scale=1,clip=0;
  for(const cue of project.transitions){
    const at=resolveTime(cue.at,project.events);
    if(sample<at||sample>=at+cue.duration||!cue.duration)continue;
    const incoming=cue.to===object.scene,outgoing=cue.from===object.scene;
    if(!incoming&&!outgoing)continue;
    visible=true;const p=ease((sample-at)/cue.duration,'smooth');
    if(['fade','focus'].includes(cue.kind)){opacity=incoming?p:1-p;if(cue.kind==='focus')scale=incoming?.95+.05*p:1+.05*p;}
    else if(cue.kind==='push')x=incoming?1-p:-p;
    else if(['wipe','reveal'].includes(cue.kind))clip=incoming?1-p:p;
    else if(outgoing)visible=false;
  }
  return {opacity:visible?opacity:0,x,scale,clip};
}

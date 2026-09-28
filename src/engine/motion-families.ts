/** Local, sample-driven treatments layered over ordinary object motion tracks. */
import type {Motion,Project,VisualObject} from './contracts';
import {ease} from './easing';
import {resolveTime} from './state';

export type LocalEffect={clipPath?:string;filter?:string;edge?:number;edgeOpacity?:number;visibleFraction?:number};
export function localEffectAt(project:Project,object:VisualObject,sample:number):LocalEffect{
  const cue=project.motions.find((m:Motion)=>m.target===object.id&&m.effect&&
    sample>=resolveTime(m.at,project.events)&&sample<resolveTime(m.at,project.events)+m.duration);
  if(!cue?.effect)return {};
  const progress=Math.max(0,Math.min(1,ease((sample-resolveTime(cue.at,project.events))/cue.duration,cue.ease)));
  if(cue.effect==='code.scan')return {
    clipPath:`inset(0 ${100*(1-progress)}% 0 0)`,edge:100*progress,
    edgeOpacity:.7*Math.sin(Math.PI*progress),visibleFraction:progress,
  };
  if(cue.effect==='code.deconstruct'){
    const x=100*progress,offset=2.4*Math.sin(progress*Math.PI);
    return {clipPath:`polygon(${x}% 0,100% 0,100% 100%,${x}% 100%,${Math.max(0,x-offset)}% 72%,${Math.min(100,x+offset)}% 45%,${Math.max(0,x-offset)}% 24%)`,
      edge:x,edgeOpacity:.5*Math.sin(Math.PI*progress),visibleFraction:1-progress};
  }
  if(cue.effect==='hero.depth')return {filter:`blur(${(1-progress)*6}px)`};
  return {filter:`blur(${progress*3}px)`};
}

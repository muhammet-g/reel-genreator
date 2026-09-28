import {spring} from 'remotion';
import {ease} from '../../engine/easing';
import type {Intensity,Timing} from './types';

export const clamp=(value:number)=>Math.max(0,Math.min(1,value));
export const strength=(value:Intensity='medium')=>({low:.55,medium:1,high:1.5})[value];
export const mix=(from:number,to:number,progress:number)=>from+(to-from)*progress;

export function progressAt(frame:number,fps:number,cue:Timing,defaultDuration=18){
  const start=(cue.startFrame??0)+(cue.delayFrames??0),duration=cue.durationFrames??defaultDuration;
  if(!Number.isFinite(frame)||!Number.isFinite(fps)||fps<=0||!Number.isFinite(start)||
    !Number.isFinite(duration)||duration<=0)throw Error('Motion timing requires finite frames, positive fps and duration');
  if(frame<=start)return 0;
  if(frame>=start+duration)return 1;
  const raw=(frame-start)/duration;
  if(cue.easing!=='spring')return ease(raw,cue.easing??'settled');
  const config={mass:cue.spring?.mass??.8,stiffness:cue.spring?.stiffness??120,damping:cue.spring?.damping??16};
  if(Object.values(config).some(value=>!Number.isFinite(value)||value<=0))throw Error('Spring values must be positive');
  return spring({frame:frame-start,fps,durationInFrames:duration,config});
}

export function offset(direction:Timing['direction'],distance:number){
  switch(direction??'up'){
    case 'up':return {x:0,y:distance};
    case 'down':return {x:0,y:-distance};
    case 'left':return {x:distance,y:0};
    case 'right':return {x:-distance,y:0};
  }
}

export function mask(direction:Timing['direction'],hidden:number){
  const amount=`${100*clamp(hidden)}%`;
  switch(direction??'right'){
    case 'left':return `inset(0 0 0 ${amount})`;
    case 'right':return `inset(0 ${amount} 0 0)`;
    case 'up':return `inset(${amount} 0 0 0)`;
    case 'down':return `inset(0 0 ${amount} 0)`;
  }
}

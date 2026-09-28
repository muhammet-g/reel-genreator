import type {CSSProperties} from 'react';
import type {ElementMotion,ElementState} from './types';
import {identity} from './types';
import {progressAt,clamp} from './timing';
import {entranceState} from './entrance';
import {exitState} from './exit';
import {emphasisState} from './emphasis';
import {ambientState} from './ambient';

export type MotionSample={style:CSSProperties;scanEdge?:number};
export function sampleElementMotion(frame:number,fps:number,motion:ElementMotion):MotionSample{
  const enter=motion.enter?entranceState(motion.enter,progressAt(frame,fps,motion.enter)):identity();
  const leave=motion.exit?exitState(motion.exit,progressAt(frame,fps,motion.exit)):identity();
  const emphasis=motion.emphasis?emphasisState(motion.emphasis,progressAt(frame,fps,motion.emphasis,12)):identity();
  const ambient=motion.ambient?ambientState(motion.ambient,frame):identity();
  const states:ElementState[]=[enter,leave,emphasis,ambient];
  const sum=(key:'x'|'y'|'rotate'|'rotateX'|'rotateY'|'blur')=>states.reduce((n,state)=>n+state[key],0);
  const product=(key:'scale'|'opacity'|'brightness')=>states.reduce((n,state)=>n*state[key],1);
  const x=sum('x'),y=sum('y'),scale=product('scale'),rotate=sum('rotate'),
    rotateX=sum('rotateX'),rotateY=sum('rotateY'),blur=sum('blur'),brightness=product('brightness');
  const exitStart=motion.exit?(motion.exit.startFrame+(motion.exit.delayFrames??0)):Infinity;
  const clipPath=frame>=exitStart?leave.clipPath??enter.clipPath:enter.clipPath;
  const shadows=[emphasis.shadow,ambient.shadow].filter(Boolean);
  return {style:{opacity:clamp(product('opacity')),transform:
      `perspective(900px) translate3d(${x}px,${y}px,0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotate(${rotate}deg) scale(${scale})`,
    filter:blur||brightness!==1?`blur(${Math.max(0,blur)}px) brightness(${brightness})`:undefined,
    clipPath,boxShadow:shadows.length?shadows.join(', '):undefined,backfaceVisibility:'hidden'},
    scanEdge:motion.enter?.type==='scan'&&enter.scanEdge!==undefined&&enter.scanEdge>0&&enter.scanEdge<100?enter.scanEdge:undefined};
}

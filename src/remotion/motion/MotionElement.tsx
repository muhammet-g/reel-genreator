import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import type {ElementMotion} from './types';
import {sampleElementMotion} from './sample';

export type MotionElementProps={children:React.ReactNode;motion:ElementMotion;
  style?:React.CSSProperties;className?:string;shadowMode?:'box'|'text'};

/** Frame-based wrapper for arbitrary React content. Timing is relative to its Sequence. */
export const MotionElement:React.FC<MotionElementProps>=({children,motion,style,className,shadowMode='box'})=>{
  const frame=useCurrentFrame(),{fps}=useVideoConfig(),sample=sampleElementMotion(frame,fps,motion);
  const direction=motion.enter?.direction??'down',edge=sample.scanEdge;
  const vertical=direction==='left'||direction==='right';
  const sampledStyle=shadowMode==='text'&&sample.style.boxShadow?
    {...sample.style,textShadow:sample.style.boxShadow,boxShadow:undefined}:sample.style;
  return <div className={className} style={{display:'inline-block',position:'relative',...style,...sampledStyle}}>
    {children}
    {edge!==undefined&&<span aria-hidden style={{position:'absolute',pointerEvents:'none',
      ...(vertical?{top:0,bottom:0,left:`${direction==='right'?edge:100-edge}%`,width:2}:
        {left:0,right:0,top:`${direction==='down'?edge:100-edge}%`,height:2}),
      background:'currentColor',opacity:.6,boxShadow:'0 0 12px currentColor'}}/>}
  </div>;
};

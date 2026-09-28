import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {MixedText} from '../Text';
import {MotionElement} from './MotionElement';
import {segmentGraphemes,motionTextUnits} from './graphemes';
import {clamp,progressAt} from './timing';
import type {ElementMotion} from './types';

export type TextEffectProps={
  text:string;mode?:'block'|'typewriter'|'stagger'|'wave';motion?:ElementMotion;
  startFrame?:number;durationFrames?:number;staggerFrames?:number;showCursor?:boolean;
  direction?:'rtl'|'ltr'|'auto';style?:React.CSSProperties;
};

/** One text API: generic element effects compose with grapheme-safe text behaviors. */
export const TextEffect:React.FC<TextEffectProps>=({text,mode='block',motion,startFrame=0,durationFrames,
  staggerFrames=2,showCursor=false,direction='auto',style})=>{
  const frame=useCurrentFrame(),{fps}=useVideoConfig();
  let content:React.ReactNode=<MixedText text={text} direction={direction}/>;
  if(mode==='typewriter'){
    const parts=segmentGraphemes(text),duration=durationFrames??Math.max(1,parts.length*2);
    const progress=progressAt(frame,fps,{startFrame,durationFrames:duration,easing:'linear'});
    content=<><MixedText text={parts.slice(0,Math.floor(clamp(progress)*parts.length)).join('')} direction={direction}/>
      {showCursor&&progress<1&&<span aria-hidden style={{marginInlineStart:3,opacity:Math.floor(frame/12)%2?0:1}}>▌</span>}</>;
  }else if(mode==='stagger'||mode==='wave'){
    const units=motionTextUnits(text),duration=durationFrames??14;
    content=units.map((unit,i)=>{
      const p=progressAt(frame,fps,{startFrame:startFrame+i*staggerFrames,durationFrames:duration});
      const rest=mode==='wave'&&p>=1?7*Math.sin((frame-startFrame-i*staggerFrames)/10):0;
      return <span key={i} style={{display:'inline-block',whiteSpace:'pre',opacity:clamp(p),
        transform:`translateY(${18*(1-p)+rest}px)`}}><MixedText text={unit} direction={direction}/></span>;
    });
  }
  return <MotionElement motion={motion??{}} shadowMode="text" style={{whiteSpace:'pre-wrap',...style}}>
    <span dir={direction}>{content}</span>
  </MotionElement>;
};

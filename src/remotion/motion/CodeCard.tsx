import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {MotionElement} from './MotionElement';
import {CodeTypewriter,type CodeToken} from './CodeTypewriter';
import type {ElementMotion} from './types';
import {progressAt} from './timing';

export type CodeCardProps={title:string;lines?:CodeToken[][];children?:React.ReactNode;
  typingStartFrame?:number;typingDurationFrames?:number;motion?:ElementMotion;width?:number;
  fontSize?:number;accent?:string;style?:React.CSSProperties;cardStyle?:React.CSSProperties;glow?:number};

/** Reusable editor-style shell; code, motion and colors come from the caller. */
export const CodeCard:React.FC<CodeCardProps>=({title,lines,children,typingStartFrame=0,typingDurationFrames=1,
  motion={},width=880,fontSize=34,accent='#FFB800',style,cardStyle,glow=0})=>{
  const frame=useCurrentFrame(),{fps}=useVideoConfig();
  const sweep=progressAt(frame,fps,{startFrame:typingStartFrame,durationFrames:typingDurationFrames});
  return <MotionElement motion={motion} style={{width,maxWidth:'100%',...style}}>
    <div style={{position:'relative',overflow:'hidden',borderRadius:26,padding:'30px 40px 38px',
      border:`2px solid ${sweep>.1?accent+'88':'#3b414d'}`,
      background:'linear-gradient(150deg,#1a1b22,#0f1117 72%)',
      boxShadow:`0 26px 76px #000b,0 0 ${25*sweep+30*glow}px ${accent}22`,...cardStyle}}>
      <div style={{display:'flex',gap:10,alignItems:'center',height:25,marginBottom:26}}>
        {['#fb7185','#fbbf24','#34d399'].map(color=><span key={color} style={{width:12,height:12,borderRadius:'50%',background:color}}/>)}
        <span style={{marginLeft:'auto',fontFamily:'"Inter",sans-serif',fontSize:21,fontWeight:600,color:'#a8aeba'}}>{title}</span>
      </div>
      {lines&&<CodeTypewriter lines={lines} startFrame={typingStartFrame} durationFrames={typingDurationFrames}
        fontSize={fontSize} cursorColor={accent}/>}
      {children}
    </div>
  </MotionElement>;
};

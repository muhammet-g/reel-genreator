import React,{useMemo} from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {segmentGraphemes} from './graphemes';
import {progressAt} from './timing';

export type CodeToken={text:string;color?:string};
export type CodeTypewriterProps={lines:CodeToken[][];startFrame:number;durationFrames:number;
  fontSize?:number;lineHeight?:number;cursorColor?:string};

/** Syntax-colored code typed by complete graphemes; React escapes every token. */
export const CodeTypewriter:React.FC<CodeTypewriterProps>=({lines,startFrame,durationFrames,
  fontSize=34,lineHeight=1.7,cursorColor='#FFB800'})=>{
  const frame=useCurrentFrame(),{fps}=useVideoConfig();
  const glyphs=useMemo(()=>lines.map(line=>line.map(token=>({...token,units:segmentGraphemes(token.text)}))),[lines]);
  const lengths=glyphs.map(line=>line.reduce((sum,token)=>sum+token.units.length,0));
  const total=lengths.reduce((sum,length)=>sum+length,0);
  const shown=Math.floor(progressAt(frame,fps,{startFrame,durationFrames,easing:'linear'})*total);
  let before=0;
  return <div dir="ltr" style={{fontFamily:'"JetBrains Mono",monospace',fontSize,lineHeight,textAlign:'left',whiteSpace:'pre'}}>
    {glyphs.map((line,i)=>{
      const count=Math.max(0,Math.min(lengths[i],shown-before)),cursor=shown<total&&shown>=before&&shown<before+lengths[i];
      let used=0;before+=lengths[i];
      return <div key={i} style={{height:`${lineHeight}em`}}>{line.map((token,j)=>{
        const visible=token.units.slice(0,Math.max(0,count-used)).join('');used+=token.units.length;
        return <span key={j} style={{color:token.color}}>{visible}</span>;
      })}{cursor&&<span aria-hidden style={{color:cursorColor,opacity:Math.floor(frame/12)%2?0:1}}>▌</span>}</div>;
    })}
  </div>;
};

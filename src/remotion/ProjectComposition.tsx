import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Audio,Img,staticFile,useCurrentFrame,delayRender,continueRender,cancelRender} from 'remotion';
import type {Project,VisualObject,ObjectState} from '../engine/contracts';
import {frameToSample} from '../engine/time';
import {cameraAt,objectStateAt} from '../engine/state';
import {transitionState} from '../engine/transitions';
import {MixedText} from './Text';

const Fonts:React.FC<{project:Project}>=({project})=>{
  const [handle]=useState(()=>delayRender('Local fonts'));
  useEffect(()=>{Promise.all(project.style.fontFiles.map(async f=>{
    const face=new FontFace(f.family,`url("${staticFile(f.file)}")`,{weight:String(f.weight)});
    await face.load();document.fonts.add(face);
  })).then(()=>continueRender(handle)).catch(cancelRender);},[handle,project.style.fontFiles]);
  return null;
};
const Shape:React.FC<{object:VisualObject;state:ObjectState;project:Project}>=({object:o,state:s,project:p})=>{
  const palette=p.style.palette,label=s.label??o.label;
  const base:React.CSSProperties={width:'100%',height:'100%',boxSizing:'border-box',display:'flex',alignItems:'center',justifyContent:'center',
    borderRadius:p.style.radius,color:palette.text,fontSize:o.fontSize??42,fontWeight:600,lineHeight:1.3,textAlign:'center',
    fontFamily:o.direction==='ltr'?p.style.fonts.code:p.style.fonts.arabic};
  if(o.kind==='image'){
    const resource=p.resources.find(r=>r.id===o.resource)!;
    return <Img src={staticFile(resource.file)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>;
  }
  if(o.kind==='text')return <div data-text style={base}><MixedText text={label} direction={o.direction}/></div>;
  if(o.kind==='array')return <div style={{...base,flexDirection:'column',gap:18}} dir="ltr"><div data-text>{label}</div><div style={{display:'flex',gap:10,width:'100%'}}>{o.cells?.map((cell,i)=><div key={i} style={{flex:1,minWidth:0}}><small style={{fontSize:28,color:palette.muted}}>{i}</small><div data-text style={{padding:'20px 8px',border:`2px solid ${s.selected===i?palette.accent:palette.muted}`,borderRadius:12,background:palette.surface}}>{cell}</div></div>)}</div></div>;
  return <div data-text style={{...base,padding:18,border:`${s.focus>.4?3:2}px solid ${s.focus>.4?palette.accent:palette.muted}`,
    background:palette.surface,boxShadow:s.focus?`0 0 ${20*s.focus}px ${palette.accent}55`:undefined,
    ...(o.kind==='container'?{alignItems:'flex-start',paddingTop:20}:{}),fontSize:o.kind==='container'?30:o.fontSize??42}}>
    <MixedText text={o.kind==='function'?`${label} ( ) { }`:label} direction={o.direction}/>
  </div>;
};
export const ProjectComposition:React.FC<{project:Project}>=({project:p})=>{
  const frame=useCurrentFrame(),sample=frameToSample(frame,p.audio.sampleRate,p.frame.fps),camera=cameraAt(p,sample);
  const {width,height}=p.frame;
  const caption=p.captions.find(c=>sample>=c.start&&sample<c.end),zone=p.layout.captionZone;
  return <AbsoluteFill style={{background:p.style.palette.background,color:p.style.palette.text,overflow:'hidden'}}>
    <Fonts project={p}/>
    {p.audio.src&&<Audio src={staticFile(p.audio.derivative?.src??p.audio.src)}/>}
    {p.objects.map(o=>{
      const s=objectStateAt(o,p.motions,p.events,sample),transition=transitionState(p,o,sample);
      const parallax=1-o.depth*.35,x=.5+(s.x-camera.x)*camera.zoom+(camera.x-.5)*(1-parallax),y=.5+(s.y-camera.y)*camera.zoom;
      return <div key={o.id} data-object={o.id} data-role={o.role} data-owner={s.owner??''} data-visible={s.opacity*transition.opacity>.01}
        style={{position:'absolute',left:(x+transition.x)*width,top:y*height,width:o.size[0]*width,height:o.size[1]*height,
          opacity:s.opacity*transition.opacity,transform:`translate(-50%,-50%) scale(${s.scale*camera.zoom*transition.scale}) rotate(${s.rotation}deg)`,
          clipPath:transition.clip?`inset(0 ${transition.clip*100}% 0 0)`:undefined}}><Shape object={o} state={s} project={p}/></div>;
    })}
    {caption&&<div data-caption style={{position:'absolute',left:zone[0]*width,top:zone[1]*height,width:zone[2]*width,height:zone[3]*height,
      display:'flex',justifyContent:'center',alignItems:'center',textAlign:'center',fontFamily:p.style.fonts.arabic,fontSize:p.style.captionSize,lineHeight:1.5,fontWeight:600}}>
      <div data-text style={{maxWidth:'100%',padding:'12px 24px',borderRadius:p.style.radius,background:p.style.palette.surface}}><MixedText text={caption.text} direction={caption.direction}/></div>
    </div>}
  </AbsoluteFill>;
};

import React from 'react';
import {Img,staticFile,useVideoConfig} from 'remotion';
import type {Project} from '../engine/contracts';
import {MotionElement} from './motion';

/** Code Dragon's persistent upper-left signature, measured on a 1080×1920 canvas. */
export const codeDragonBrandLayout={left:78,top:55,logoSize:66,gap:17,usernameSize:27} as const;

export const CodeDragonBrand:React.FC<{project:Project}>=({project})=>{
  const {width,height,fps}=useVideoConfig(),brand=project.branding;
  if(!brand||brand.template&&brand.template!=='code-dragon')return null;
  const logo=project.resources.find(resource=>resource.id===brand.logo);
  if(!logo)throw Error(`Missing Code Dragon logo resource: ${brand.logo}`);
  const scale=Math.min(width/1080,height/1920);
  const frame=(at30:number)=>Math.round(at30*fps/30);
  return <div data-brand-template="code-dragon" style={{position:'absolute',zIndex:5,pointerEvents:'none',
    left:codeDragonBrandLayout.left*width/1080,top:codeDragonBrandLayout.top*height/1920,
    display:'flex',alignItems:'center',gap:codeDragonBrandLayout.gap*scale}}>
    <MotionElement motion={{enter:{type:'pop',startFrame:frame(4),durationFrames:frame(18),intensity:'low'}}}>
      <Img src={staticFile(logo.file)} style={{width:codeDragonBrandLayout.logoSize*scale,
        height:codeDragonBrandLayout.logoSize*scale,objectFit:'contain',
        filter:`drop-shadow(0 0 ${14*scale}px #FFB80044)`}}/>
    </MotionElement>
    <MotionElement motion={{enter:{type:'slide',startFrame:frame(10),durationFrames:frame(20),direction:'left',intensity:'low'}}}
      style={{fontFamily:`"${project.style.fonts.latin}",sans-serif`,fontWeight:600,
        fontSize:codeDragonBrandLayout.usernameSize*scale,color:'#E9D8AC',letterSpacing:.3*scale}}>
      {brand.username}
    </MotionElement>
  </div>;
};

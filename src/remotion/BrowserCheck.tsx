import React,{createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Player,type PlayerRef} from '@remotion/player';
import {ProjectComposition} from './ProjectComposition';
import {ForEachFilm} from './ForEachFilm';
import {validateProject} from '../engine/validate';
import {frameCount} from '../engine/time';
declare global {interface Window {seek:(frame:number)=>void;}}
fetch('/project.json').then(r=>r.json()).then(data=>{
  const project=validateProject(data.project),ref=createRef<PlayerRef>();
  const component=data.composition==='ForEachFilm'?ForEachFilm:ProjectComposition;
  window.seek=frame=>ref.current?.seekTo(frame);
  createRoot(document.getElementById('root')!).render(<Player ref={ref} component={component} inputProps={{project}}
    compositionWidth={project.frame.width} compositionHeight={project.frame.height}
    fps={project.frame.fps.num/project.frame.fps.den} durationInFrames={frameCount(project.audio.sampleCount,project.audio.sampleRate,project.frame.fps)}
    style={{width:project.frame.width,height:project.frame.height}} controls={false}/>);
});

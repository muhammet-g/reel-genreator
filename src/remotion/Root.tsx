import React from 'react';
import {Composition} from 'remotion';
import {ProjectComposition} from './ProjectComposition';
import {ForEachFilm} from './ForEachFilm';
import {fixture} from '../examples/fixture';
import {validateProject} from '../engine/validate';
import {frameCount} from '../engine/time';
import {MotionPrimitivesShowcase} from '../examples/motion-primitives-showcase';
export const Root:React.FC=()=> <><Composition id="MotionProject" component={ProjectComposition}
  defaultProps={{project:fixture}} width={1080} height={1920} fps={30} durationInFrames={180}
  calculateMetadata={({props})=>{const project=validateProject(props.project);return {props:{project},
    width:project.frame.width,height:project.frame.height,fps:project.frame.fps.num/project.frame.fps.den,
    durationInFrames:frameCount(project.audio.sampleCount,project.audio.sampleRate,project.frame.fps)};}}/>
  <Composition id="ForEachFilm" component={ForEachFilm}
    defaultProps={{project:fixture,debugOverlays:false}} width={1080} height={1920} fps={30} durationInFrames={180}
    calculateMetadata={({props})=>{const project=validateProject(props.project);return {props:{project,debugOverlays:props.debugOverlays===true},
      width:project.frame.width,height:project.frame.height,fps:project.frame.fps.num/project.frame.fps.den,
      durationInFrames:frameCount(project.audio.sampleCount,project.audio.sampleRate,project.frame.fps)};}}/>
  <Composition id="MotionPrimitivesShowcase" component={MotionPrimitivesShowcase}
    width={1080} height={1920} fps={30} durationInFrames={270}/>
</>;

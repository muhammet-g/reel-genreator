import React from 'react';
import {Composition} from 'remotion';
import {ProjectComposition} from './ProjectComposition';
import {fixture} from '../examples/fixture';
import {validateProject} from '../engine/validate';
import {frameCount} from '../engine/time';
export const Root:React.FC=()=> <Composition id="MotionProject" component={ProjectComposition}
  defaultProps={{project:fixture}} width={1080} height={1920} fps={30} durationInFrames={180}
  calculateMetadata={({props})=>{const project=validateProject(props.project);return {props:{project},
    width:project.frame.width,height:project.frame.height,fps:project.frame.fps.num/project.frame.fps.den,
    durationInFrames:frameCount(project.audio.sampleCount,project.audio.sampleRate,project.frame.fps)};}}/>;

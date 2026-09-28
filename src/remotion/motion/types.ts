export type Direction='up'|'down'|'left'|'right';
export type Intensity='low'|'medium'|'high';
export type MotionEasing='settled'|'linear'|'spring';
export type SpringConfig={mass?:number;stiffness?:number;damping?:number};

export type Timing={
  startFrame?:number;
  delayFrames?:number;
  durationFrames?:number;
  easing?:MotionEasing;
  spring?:SpringConfig;
  intensity?:Intensity;
  direction?:Direction;
  distance?:number;
};

export type EntranceType='fade'|'pop'|'slide'|'rotate'|'flip'|'blur-pop'|'mask'|'scan'|'cube';
export type ExitType='fade'|'slide'|'scale'|'rotate'|'flip'|'blur'|'mask'|'zoom';
export type EmphasisType='punch'|'shake'|'glitch'|'glow';
export type AmbientType='float'|'tilt'|'neon'|'hologram';

export type EntranceCue=Timing&{type:EntranceType};
export type ExitCue=Timing&{type:ExitType;startFrame:number};
export type EmphasisCue=Timing&{type:EmphasisType;startFrame:number};
export type AmbientCue=Omit<Timing,'durationFrames'|'easing'|'spring'|'direction'>&{
  type:AmbientType;periodFrames?:number;endFrame?:number;color?:string;
};
export type ElementMotion={enter?:EntranceCue;exit?:ExitCue;emphasis?:EmphasisCue;ambient?:AmbientCue};

export type ElementState={
  opacity:number;x:number;y:number;scale:number;rotate:number;rotateX:number;rotateY:number;
  blur:number;brightness:number;clipPath?:string;shadow?:string;scanEdge?:number;
};
export const identity=():ElementState=>({opacity:1,x:0,y:0,scale:1,rotate:0,rotateX:0,rotateY:0,blur:0,brightness:1});

import type {ElementState,EmphasisCue} from './types';
import {identity} from './types';
import {clamp,strength} from './timing';

export function emphasisState(cue:EmphasisCue,progress:number):ElementState{
  const p=clamp(progress),s=strength(cue.intensity),envelope=Math.sin(Math.PI*p),state=identity();
  switch(cue.type){
    case 'punch':state.scale=1+.09*s*envelope;break;
    case 'shake':state.x=Math.sin(16*Math.PI*p)*8*s*envelope;break;
    case 'glitch':state.x=Math.sin(27*Math.PI*p)*5*s*envelope;
      state.shadow=`${4*s*envelope}px 0 #ff006e, ${-4*s*envelope}px 0 #00e5ff`;break;
    case 'glow':state.shadow=`0 0 ${24*s*envelope}px rgba(255,184,0,${.65*envelope})`;break;
  }
  return state;
}

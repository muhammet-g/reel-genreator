import type {ElementState,ExitCue} from './types';
import {identity} from './types';
import {clamp,mask,offset,strength} from './timing';

export function exitState(cue:ExitCue,progress:number):ElementState{
  const p=clamp(progress),s=strength(cue.intensity),state=identity();
  const distance=cue.distance??32*s;
  switch(cue.type){
    case 'fade':state.opacity=1-p;break;
    case 'slide':{
      const to=offset(cue.direction,distance);state.x=-to.x*p;state.y=-to.y*p;state.opacity=1-p;break;
    }
    case 'scale':state.scale=1-.18*s*p;state.opacity=1-p;break;
    case 'rotate':state.rotate=16*s*p;state.opacity=1-p;break;
    case 'flip':state.rotateY=78*s*p;state.opacity=1-p;break;
    case 'blur':state.blur=8*s*p;state.opacity=1-p;break;
    case 'mask':state.clipPath=mask(cue.direction,p);break;
    case 'zoom':state.scale=1+.18*s*p;state.opacity=1-p;break;
  }
  return state;
}

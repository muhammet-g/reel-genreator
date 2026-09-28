import type {ElementState,EntranceCue} from './types';
import {identity} from './types';
import {clamp,mask,mix,offset,strength} from './timing';

export function entranceState(cue:EntranceCue,progress:number):ElementState{
  const p=clamp(progress),s=strength(cue.intensity),state=identity();
  const distance=cue.distance??32*s;
  switch(cue.type){
    case 'fade':state.opacity=p;break;
    case 'pop':state.opacity=p;state.scale=mix(1-.16*s,1,progress);break;
    case 'slide':{
      const from=offset(cue.direction,distance);state.opacity=p;
      state.x=from.x*(1-progress);state.y=from.y*(1-progress);break;
    }
    case 'rotate':state.opacity=p;state.rotate=-16*s*(1-progress);state.scale=mix(.92,1,progress);break;
    case 'flip':state.opacity=p;state.rotateY=-78*s*(1-progress);break;
    case 'blur-pop':state.opacity=p;state.scale=mix(1-.12*s,1,progress);state.blur=8*s*(1-p);break;
    case 'mask':state.clipPath=mask(cue.direction,1-p);break;
    case 'scan':state.clipPath=mask(cue.direction??'down',1-p);state.scanEdge=100*p;break;
    case 'cube':state.opacity=p;state.rotateX=-65*s*(1-progress);state.rotateY=-20*s*(1-progress);
      state.scale=mix(.9,1,progress);break;
  }
  return state;
}

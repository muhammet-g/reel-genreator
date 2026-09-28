import type {AmbientCue,ElementState} from './types';
import {identity} from './types';
import {strength} from './timing';

export function ambientState(cue:AmbientCue,frame:number):ElementState{
  const state=identity(),start=(cue.startFrame??0)+(cue.delayFrames??0);
  if(frame<start||cue.endFrame!==undefined&&frame>=cue.endFrame)return state;
  const period=cue.periodFrames??90;
  if(!Number.isFinite(period)||period<=0)throw Error('Ambient period must be positive');
  const phase=2*Math.PI*(frame-start)/period,s=strength(cue.intensity);
  switch(cue.type){
    case 'float':state.y=-5*s*Math.sin(phase);break;
    case 'tilt':state.rotate=2*s*Math.sin(phase);break;
    case 'neon':state.shadow=`0 0 ${12+10*s*(.5+.5*Math.sin(phase))}px ${cue.color??'rgba(34,211,238,.65)'}`;break;
    case 'hologram':{
      const flicker=.5+.5*Math.sin(phase*7)*Math.sin(phase*11);
      state.opacity=1-.2*s*flicker;state.brightness=1+.16*s*flicker;
      state.shadow=`0 0 ${10+10*s*flicker}px rgba(34,211,238,.4)`;break;
    }
  }
  return state;
}

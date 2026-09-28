import {z} from 'zod';

// Motion principles supplied in the design brief. Names describe intent; no visual branding.
export const curves = {
  'productive.enter': [0, 0, .38, .9],
  'expressive.enter': [0, 0, .3, 1],
  'productive.standard': [.2, 0, .38, .9],
  'expressive.standard': [.4, .14, .3, 1],
  'productive.exit': [.2, 0, 1, .9],
  'expressive.exit': [.4, .14, 1, 1],
} as const;
export const easingSchema=z.enum(['linear','smooth','out','in','spring','settled',...Object.keys(curves) as Array<keyof typeof curves>]);
const cubic=(t:number,a:number,b:number)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;
export function ease(t:number,kind:string):number {
  const v=Math.max(0,Math.min(1,t));
  if(v===0||v===1)return v;
  // Critically damped arrival, normalized to a finite cue. The endpoint correction
  // gives both ends zero velocity, so adjacent cues meet without a visible jolt.
  if(kind==='settled'){
    const rate=6.5,raw=(x:number)=>1-(1+rate*x)*Math.exp(-rate*x);
    const end=raw(1),endSlope=rate*rate*Math.exp(-rate);
    return raw(v)+(1-end)*v*v*(3-2*v)-endSlope*v*v*(v-1);
  }
  // A finite, deterministic spring-like arrival. Use only on spatial properties;
  // opacity/focus should keep monotone easing.
  if(kind==='spring')return (1-Math.exp(-7*v)*Math.cos(3*Math.PI*v))/(1+Math.exp(-7));
  const curve=curves[kind as keyof typeof curves];
  if(!curve)return kind==='smooth'?v*v*(3-2*v):kind==='out'?1-(1-v)**3:kind==='in'?v**3:v;
  // Solve x(u)=time, then evaluate y(u). Evaluating y(time) is not CSS bezier easing.
  let low=0,high=1;
  for(let i=0;i<22;i++){const u=(low+high)/2;if(cubic(u,curve[0],curve[2])<v)low=u;else high=u;}
  return cubic((low+high)/2,curve[1],curve[3]);
}

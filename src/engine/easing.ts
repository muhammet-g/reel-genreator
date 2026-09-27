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
export const easingSchema=z.enum(['linear','smooth','out','in',...Object.keys(curves) as Array<keyof typeof curves>]);
const cubic=(t:number,a:number,b:number)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;
export function ease(t:number,kind:string):number {
  const v=Math.max(0,Math.min(1,t));
  if(v===0||v===1)return v;
  const curve=curves[kind as keyof typeof curves];
  if(!curve)return kind==='smooth'?v*v*(3-2*v):kind==='out'?1-(1-v)**3:kind==='in'?v**3:v;
  // Solve x(u)=time, then evaluate y(u). Evaluating y(time) is not CSS bezier easing.
  let low=0,high=1;
  for(let i=0;i<22;i++){const u=(low+high)/2;if(cubic(u,curve[0],curve[2])<v)low=u;else high=u;}
  return cubic((low+high)/2,curve[1],curve[3]);
}

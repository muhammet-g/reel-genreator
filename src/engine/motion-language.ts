/** Authoring-time compiler. The only runtime remains the existing motion/camera/transition tracks. */
import {z} from 'zod';
import {trigger,type Project,type VisualObject,type ObjectState,type Motion} from './contracts';
import {validateProject} from './validate';
import {cameraAt,objectStateAt,resolveTime} from './state';
import {motionDefaults,motionActivity} from './planning';

const styleSchema=z.enum(['productive','expressive','cinematic']);
const directionSchema=z.enum(['left','right','up','down']);
const staggerSchema=z.object({strategy:z.enum(['start','end','center','wave','directional','hierarchy','semantic']).default('hierarchy'),
  strength:z.enum(['subtle','normal','expressive']).default('normal'),order:z.array(z.string()).optional(),direction:directionSchema.optional()}).strict();
export const choreographySchema=z.array(z.object({
  scene:z.string(),preset:z.enum(['softReveal','expressiveReveal','cascade','focusPush','directionalFlow']),
  style:styleSchema.optional(),targets:z.array(z.string()).min(1).optional(),stagger:staggerSchema.optional(),
  active:z.discriminatedUnion('kind',[
    z.object({kind:z.literal('rest'),reason:z.string().trim().min(1)}).strict(),
    z.object({kind:z.enum(['push','pull','drift','focus']),target:z.string().optional(),at:trigger.optional()}).strict(),
  ]).optional(),
  emphasis:z.array(z.object({target:z.string(),at:trigger,strength:z.enum(['subtle','strong']).default('subtle')}).strict()).optional(),
  transition:z.object({direction:directionSchema,reason:z.string().optional()}).strict().optional(),
}).strict());
export type SceneMotion=z.input<typeof choreographySchema>[number];
type Stagger=z.input<typeof staggerSchema>;
type Camera=ReturnType<typeof cameraAt>;
export type MotionPhase={scene:string;phase:'enter'|'settle'|'active'|'shift'|'exit';start:number;end:number;reason:string};

// Generated-motion limits, not restrictions on independently authored physical/diagram motion.
export const motionLimits={translation:.025,scaleDelta:.035,cameraZoomMin:.98,cameraZoomMax:1.06,cameraOffset:.025,staggerSeconds:.45} as const;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const roleWeight={primary:1,secondary:.62,context:.3};

export function staggerOffsets(objects:VisualObject[],input:Stagger,rate:number,budget:number):Record<string,number>{
  const options=staggerSchema.parse(input),ids=objects.map(o=>o.id);
  if(options.strategy==='semantic'&&(!options.order||options.order.length!==ids.length||new Set(options.order).size!==ids.length||options.order.some(id=>!ids.includes(id))))throw Error('Semantic stagger order must name every target exactly once');
  const center={x:objects.reduce((n,o)=>n+o.initial.x,0)/(objects.length||1),y:objects.reduce((n,o)=>n+o.initial.y,0)/(objects.length||1)};
  const score=(o:VisualObject,i:number)=>{
    switch(options.strategy){
      case 'end':return objects.length-1-i;
      case 'center':return Math.abs(i-(objects.length-1)/2);
      case 'wave':return Math.hypot(o.initial.x-center.x,o.initial.y-center.y);
      case 'directional':return ['up','down'].includes(options.direction??'right')?o.initial.y*(options.direction==='up'?-1:1):o.initial.x*(options.direction==='left'?-1:1);
      case 'hierarchy':return (1-roleWeight[o.role])*10+i/Math.max(1,objects.length);
      case 'semantic':return options.order!.indexOf(o.id);
      default:return i;
    }
  };
  const scores=objects.map(score),unique=[...new Set(scores)].sort((a,b)=>a-b);
  const step={subtle:.045,normal:.09,expressive:.14}[options.strength]*rate;
  const total=Math.max(0,Math.min(budget,motionLimits.staggerSeconds*rate,step*(unique.length-1)));
  return Object.fromEntries(objects.map((o,i)=>[o.id,Math.round(total*unique.indexOf(scores[i])/Math.max(1,unique.length-1))]));
}

function inside(p:Project,o:VisualObject,s:ObjectState,c:Camera){
  const [x,y,w,h]=p.layout.safeArea,parallax=1-o.depth*.35;
  const cx=.5+(s.x-c.x)*c.zoom+(c.x-.5)*(1-parallax),cy=.5+(s.y-c.y)*c.zoom;
  const hw=o.size[0]*s.scale*c.zoom/2,hh=o.size[1]*s.scale*c.zoom/2;
  return cx-hw>=x&&cx+hw<=x+w&&cy-hh>=y&&cy+hh<=y+h;
}
function safeCamera(p:Project,scene:string,at:number,start:Camera,wanted:Camera):Camera{
  const subjects=p.objects.filter(o=>!o.scene||o.scene===scene).map(o=>({o,s:objectStateAt(o,p.motions,p.events,at)})).filter(v=>v.s.opacity>.01);
  // Do not "correct" an independently authored close-up into our restrained preset range.
  if(!subjects.length||start.zoom<motionLimits.cameraZoomMin||start.zoom>motionLimits.cameraZoomMax||Math.abs(start.x-.5)>motionLimits.cameraOffset||Math.abs(start.y-.5)>motionLimits.cameraOffset)return start;
  const mix=(t:number)=>({x:start.x+(wanted.x-start.x)*t,y:start.y+(wanted.y-start.y)*t,zoom:start.zoom+(wanted.zoom-start.zoom)*t});
  // Check a bounded path as well as its destination; measured browser checks remain authoritative.
  for(let amount=1;amount>=.03125;amount/=2){const end=mix(amount);
    if([0,.25,.5,.75,1].every(t=>subjects.every(({o,s})=>inside(p,o,s,{x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,zoom:start.zoom+(end.zoom-start.zoom)*t}))))return end;
  }
  return start;
}

export function choreograph(input:Project,recipes:SceneMotion[]){
  const project=validateProject(structuredClone(input));
  const plans=choreographySchema.parse(recipes),phases:MotionPhase[]=[],warnings:string[]=[];
  if(new Set(plans.map(p=>p.scene)).size!==plans.length)throw Error('Duplicate choreography scene');
  for(const plan of plans)if(!project.scenes.some(s=>s.id===plan.scene))throw Error(`Unknown choreography scene: ${plan.scene}`);
  plans.sort((a,b)=>project.scenes.findIndex(s=>s.id===a.scene)-project.scenes.findIndex(s=>s.id===b.scene));
  const rate=project.audio.sampleRate,seconds=(v:number)=>Math.round(v*rate);
  const add=(motion:Motion)=>project.motions.push(motion);
  const phase=(scene:string,kind:MotionPhase['phase'],start:number,end:number,reason:string)=>{if(end>start)phases.push({scene,phase:kind,start,end,reason});};
  for(const plan of plans){
    const scene=project.scenes.find(s=>s.id===plan.scene)!,index=project.scenes.indexOf(scene),next=project.scenes[index+1];
    const targets=(plan.targets??project.objects.filter(o=>o.scene===scene.id).map(o=>o.id));
    if(new Set(targets).size!==targets.length)throw Error('Duplicate motion target');
    const objects=targets.map(id=>{const o=project.objects.find(o=>o.id===id);if(!o||o.scene&&o.scene!==scene.id)throw Error(`Target is outside scene: ${id}`);return o;});
    const incoming=project.transitions.find(t=>t.to===scene.id);
    const bridge=plan.transition??(plan.preset==='directionalFlow'&&next?{direction:'left' as const}:undefined);
    if(bridge&&!next)throw Error('Directional flow requires an incoming scene');
    if(bridge&&project.transitions.some(t=>t.from===scene.id))throw Error('Scene already has an outgoing transition');
    const transitionDuration=bridge?Math.min(seconds(.6),Math.floor((next!.end-next!.start)/3)):0;
    const lead=bridge?Math.min(seconds(.55),Math.floor((scene.end-scene.start)/4)):0;
    const availableStart=Math.max(scene.start,incoming?resolveTime(incoming.at,project.events)+incoming.duration:scene.start);
    const availableEnd=scene.end-lead,span=Math.max(0,availableEnd-availableStart);
    const style=plan.style??(['expressiveReveal','cascade','directionalFlow'].includes(plan.preset)?'expressive':plan.preset==='focusPush'?'cinematic':'productive');
    const family=style==='productive'?'productive':'expressive';
    const defaults=motionDefaults(project.style.motionEnergy,scene.density,rate);
    const duration=Math.max(1,Math.min(Math.round(defaults.entrance*(style==='productive'?.75:style==='cinematic'?1.5:1.1)),Math.floor(span/4)));
    const offsets=staggerOffsets(objects,plan.stagger??{strategy:'hierarchy',strength:plan.preset==='cascade'?'expressive':'normal'},rate,Math.min(seconds(.45),Math.floor(span/8)));
    let entered=availableStart;
    for(const o of objects){
      // Existing animation and persistent identity belong to their author; never overwrite them.
      const authored=project.motions.filter(m=>m.target===o.id);
      for(const motion of authored)if(motion.intent==='entrance'){
        const end=resolveTime(motion.at,project.events)+motion.duration;
        if(end>scene.start&&resolveTime(motion.at,project.events)<availableEnd)entered=Math.max(entered,Math.min(availableEnd,end));
      }
      if(!o.scene||authored.length)continue;
      if(incoming&&['push','fade','focus','wipe','reveal'].includes(incoming.kind)){
        if(o.initial.opacity!==1)add({target:o.id,at:scene.start,duration:0,to:{opacity:1},ease:'linear',intent:'state'});
        continue;
      }
      if(span<4)continue;
      const start=availableStart+offsets[o.id],base={...o.initial},weight=roleWeight[o.role];
      const displacement=motionLimits.translation*weight*(style==='productive'?.45:1);
      const camera=cameraAt(project,start),candidate={...base,y:base.y+displacement,scale:base.scale*(style==='productive'?1:1-.018*weight)};
      if(!inside(project,o,candidate,camera)){candidate.y=base.y;candidate.scale=base.scale;}
      o.initial.opacity=0;
      add({target:o.id,at:start,duration,from:{opacity:0,y:candidate.y,scale:candidate.scale},to:{opacity:1,y:base.y,scale:base.scale},ease:`${family}.enter`,intent:'entrance'});
      entered=Math.max(entered,start+duration);
    }
    phase(scene.id,'enter',scene.start,entered,incoming?'Incoming relationship leads; no duplicate entrance':'Primary leads; other roles respond');
    const activeStart=Math.min(availableEnd,entered+Math.min(seconds(.22),Math.floor(span/10)));
    phase(scene.id,'settle',entered,activeStart,'Leave a readable landing before moving attention');
    const active=plan.active??{kind:plan.preset==='focusPush'?'focus' as const:cameraAt(project,activeStart).zoom>=1.035?'pull' as const:'push' as const};
    if(active.kind==='rest')phase(scene.id,'active',activeStart,availableEnd,`Intentional rest: ${active.reason}`);
    else if(availableEnd-activeStart>=seconds(.6)){
      const at=active.at===undefined?activeStart:resolveTime(active.at,project.events);
      if(at<activeStart||at>=availableEnd)throw Error('Camera trigger must follow entrance/settle and precede exit');
      const subject=active.target??scene.teachingObject??scene.hierarchy[0];
      const object=project.objects.find(o=>o.id===subject);
      if(active.target&&!object)throw Error(`Unknown camera subject: ${active.target}`);
      const start=cameraAt(project,at),wanted={...start};
      if(active.kind==='focus'&&object){const target=objectStateAt(object,project.motions,project.events,at);wanted.x+=clamp((target.x-start.x)*.1,-.018,.018);wanted.y+=clamp((target.y-start.y)*.1,-.018,.018);}
      if(active.kind==='drift')wanted.x+=.008;
      else wanted.zoom+=active.kind==='pull'?-.02:style==='cinematic'?.035:.022;
      wanted.zoom=clamp(wanted.zoom,motionLimits.cameraZoomMin,motionLimits.cameraZoomMax);
      wanted.x=clamp(wanted.x,.5-motionLimits.cameraOffset,.5+motionLimits.cameraOffset);wanted.y=clamp(wanted.y,.5-motionLimits.cameraOffset,.5+motionLimits.cameraOffset);
      const end=safeCamera(project,scene.id,availableEnd,start,wanted);
      if(JSON.stringify(end)!==JSON.stringify(start))project.camera.push({at,duration:availableEnd-at,kind:active.kind==='focus'?'focus':active.kind,...end,intensity:1,ease:`${family}.standard`,settle:true});
      else warnings.push(`${scene.id}: camera has no safe travel; use an emphasis beat or an explicit reading rest.`);
      phase(scene.id,'active',at,availableEnd,`Bounded ${active.kind} supports ${subject??'scene hierarchy'}`);
    }else phase(scene.id,'active',activeStart,availableEnd,'Brief scene: preserve reading time instead of adding motion');
    for(const beat of plan.emphasis??[]){
      const object=project.objects.find(o=>o.id===beat.target);if(!object||object.scene&&object.scene!==scene.id)throw Error('Emphasis target is outside scene');
      const at=resolveTime(beat.at,project.events),duration=seconds(beat.strength==='strong'?.28:.2),release=seconds(.4);
      if(at<activeStart||at+duration+release>availableEnd)throw Error('Emphasis must fit after settling and before exit');
      const base=objectStateAt(object,project.motions,project.events,at),camera=cameraAt(project,at+duration);
      const scale=base.scale*(1+(beat.strength==='strong'?.03:.012));
      const safeScale=inside(project,object,{...base,scale},camera)?scale:base.scale;
      add({target:object.id,at:beat.at,duration,to:{scale:safeScale,focus:beat.strength==='strong'?1:.55},ease:'expressive.standard',intent:'emphasis'});
      add({target:object.id,at:at+duration,duration:release,to:{scale:base.scale,focus:base.focus},ease:'productive.exit',intent:'emphasis'});
      phase(scene.id,'shift',at,at+duration+release,`Attention to ${object.id}, then release; no looping pulse`);
    }
    if(bridge){
      project.transitions.push({from:scene.id,to:next!.id,at:scene.end,duration:transitionDuration,kind:'push',direction:bridge.direction,ease:'productive.standard',shared:[],reason:bridge.reason??'Carry directional energy into the incoming section'});
      const at=scene.end-lead,start=cameraAt(project,at),wanted={...start};
      const axis=['up','down'].includes(bridge.direction)?'y':'x';
      wanted[axis]=clamp(wanted[axis]+(['left','up'].includes(bridge.direction)?.012:-.012),.5-motionLimits.cameraOffset,.5+motionLimits.cameraOffset);
      const end=safeCamera(project,scene.id,at,start,wanted);
      project.camera.push({at,duration:lead+transitionDuration,kind:'pan',...end,intensity:1,ease:'linear',settle:true});
      phase(scene.id,'exit',at,scene.end+transitionDuration,'Camera anticipates and continues across the cut; transition owns element travel');
    }
    project.camera.sort((a,b)=>resolveTime(a.at,project.events)-resolveTime(b.at,project.events));
  }
  // Conflicts with authored cues are errors, never silently shifted or discarded.
  validateProject(project);
  const activity=motionActivity(project).map(value=>({...value,intentionalRest:plans.some(p=>p.scene===value.scene&&p.active?.kind==='rest')}));
  for(const value of activity)if(plans.some(p=>p.scene===value.scene)&&!value.intentionalRest&&value.longestStillSeconds>Math.max(1.5,(project.scenes.find(s=>s.id===value.scene)!.end-project.scenes.find(s=>s.id===value.scene)!.start)/rate*.45))
    warnings.push(`${value.scene}: ${value.longestStillSeconds.toFixed(2)}s still interval; declare a reading rest or author a meaningful focus beat.`);
  return {project,phases,warnings,activity};
}

/** Authoring-time compiler. The only runtime remains the existing motion/camera/transition tracks. */
import {z} from 'zod';
import {trigger,type Project,type VisualObject,type ObjectState,type Motion} from './contracts';
import {validateProject} from './validate';
import {cameraAt,objectStateAt,resolveTime} from './state';
import {motionDefaults,motionActivity} from './planning';
import {easingSchema,ease} from './easing';
import {frameToSample,sampleToFrame} from './time';

const styleSchema=z.enum(['productive','expressive','cinematic']);
const directionSchema=z.enum(['left','right','up','down']);
const staggerSchema=z.object({strategy:z.enum(['start','end','center','wave','directional','hierarchy','semantic']).default('hierarchy'),
  strength:z.enum(['subtle','normal','expressive']).default('normal'),order:z.array(z.string()).optional(),direction:directionSchema.optional()}).strict();
export const choreographySchema=z.array(z.object({
  scene:z.string(),preset:z.enum(['softReveal','expressiveReveal','cascade','focusPush','directionalFlow']),
  entryFamily:z.enum(['spatial','codeScan','heroDepth','groupAssemble']).optional(),
  exitFamily:z.enum(['none','codeDeconstruct','heroDepart','groupCascade']).optional(),
  style:styleSchema.optional(),targets:z.array(z.string()).min(1).optional(),stagger:staggerSchema.optional(),
  active:z.discriminatedUnion('kind',[
    z.object({kind:z.literal('rest'),reason:z.string().trim().min(1)}).strict(),
    z.object({kind:z.enum(['push','pull','drift','focus']),target:z.string().optional(),at:trigger.optional()}).strict(),
  ]).optional(),
  emphasis:z.array(z.object({target:z.string(),at:trigger,strength:z.enum(['subtle','strong']).default('subtle')}).strict()).optional(),
  transition:z.object({direction:directionSchema,kind:z.enum(['push','focus','continuation']).optional(),reason:z.string().optional()}).strict().optional(),
  creative:z.object({weight:z.enum(['restrained','normal','expressive','cinematic','hero']),reason:z.string().trim().min(1),
    entrance:z.object({travel:z.number().finite().nonnegative().optional(),scaleFrom:z.number().finite().positive().optional(),
      rotationFrom:z.number().finite().optional(),ease:easingSchema.optional()}).strict().optional(),
    camera:z.object({zoomDelta:z.number().finite().optional(),x:z.number().finite().optional(),y:z.number().finite().optional()}).strict().optional(),
  }).strict().optional(),
}).strict());
export type SceneMotion=z.input<typeof choreographySchema>[number];
type Stagger=z.input<typeof staggerSchema>;
type Camera=ReturnType<typeof cameraAt>;
export type MotionPhase={scene:string;phase:'enter'|'settle'|'active'|'shift'|'exit';start:number;end:number;reason:string};

// Quiet starting points for old recipes. They are never creative ceilings.
export const motionPreferences={translation:.025,cameraZoomMin:.98,cameraZoomMax:1.06,cameraOffset:.025,staggerSeconds:.45} as const;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const roleWeight={primary:1,secondary:.62,context:.3};
const weightValue={restrained:.45,normal:1,expressive:1.6,cinematic:2.1,hero:2.7};
function renderSamples(p:Project,start:number,end:number){
  const times=[start,end],first=sampleToFrame(start,p.audio.sampleRate,p.frame.fps,'floor');
  const last=sampleToFrame(end,p.audio.sampleRate,p.frame.fps,'ceil');
  for(let frame=first;frame<=last;frame++){
    const sample=frameToSample(frame,p.audio.sampleRate,p.frame.fps);
    if(sample>=start&&sample<=end)times.push(sample);
  }
  return [...new Set(times)].sort((a,b)=>a-b);
}

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
  const total=Math.max(0,Math.min(budget,step*(unique.length-1)));
  return Object.fromEntries(objects.map((o,i)=>[o.id,Math.round(total*unique.indexOf(scores[i])/Math.max(1,unique.length-1))]));
}

function projectedBox(o:VisualObject,s:ObjectState,c:Camera){
  const parallax=1-o.depth*.35;
  const cx=.5+(s.x-c.x)*c.zoom+(c.x-.5)*(1-parallax),cy=.5+(s.y-c.y)*c.zoom;
  const angle=s.rotation*Math.PI/180,halfW=o.size[0]*s.scale*c.zoom/2,halfH=o.size[1]*s.scale*c.zoom/2;
  const hw=Math.abs(Math.cos(angle))*halfW+Math.abs(Math.sin(angle))*halfH;
  const hh=Math.abs(Math.sin(angle))*halfW+Math.abs(Math.cos(angle))*halfH;
  return {left:cx-hw,right:cx+hw,top:cy-hh,bottom:cy+hh};
}
function inside(p:Project,o:VisualObject,s:ObjectState,c:Camera){
  const [x,y,w,h]=p.layout.safeArea,b=projectedBox(o,s,c);
  return b.left>=x&&b.right<=x+w&&b.top>=y&&b.bottom<=y+h;
}
function collision(p:Project,o:VisualObject,s:ObjectState,other:VisualObject,otherState:ObjectState,c:Camera){
  if(o.allowOverlap.includes(other.id)||other.allowOverlap.includes(o.id)||s.owner===other.id||otherState.owner===o.id)return false;
  const a=projectedBox(o,s,c),b=projectedBox(other,otherState,c);
  return (Math.min(a.right,b.right)-Math.max(a.left,b.left))*p.frame.width>2&&
    (Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))*p.frame.height>2;
}
function safeEntry(p:Project,o:VisualObject,base:ObjectState,wanted:ObjectState,c:Camera,easing:string,start:number,duration:number):ObjectState{
  const samples=renderSamples(p,start,start+duration).map(sample=>(sample-start)/duration);
  const candidate=(amount:number)=>{
    const from={...base,y:base.y+(wanted.y-base.y)*amount,scale:base.scale+(wanted.scale-base.scale)*amount,
      rotation:base.rotation+(wanted.rotation-base.rotation)*amount};
    return {from,valid:samples.every(t=>{
      const progress=ease(t,easing);
      const s={...base,y:from.y+(base.y-from.y)*progress,scale:from.scale+(base.scale-from.scale)*progress,
        rotation:from.rotation+(base.rotation-from.rotation)*progress};
      if(!inside(p,o,s,c))return false;
      if(t===0)return true;
      const sample=start+t*duration;
      return p.objects.filter(other=>other.id!==o.id&&(!other.scene||other.scene===o.scene)).every(other=>{
        const state=objectStateAt(other,p.motions,p.events,sample);
        return state.opacity<=.01||!collision(p,o,s,other,state,c);
      });
    })};
  };
  if(candidate(1).valid)return candidate(1).from;
  let low=0,high=1;
  for(let i=0;i<12;i++){const middle=(low+high)/2;if(candidate(middle).valid)low=middle;else high=middle;}
  return low>1/1024?candidate(low).from:base;
}
function safeCamera(p:Project,scene:string,at:number,until:number,start:Camera,wanted:Camera,easing='linear'):Camera{
  const index=p.scenes.findIndex(s=>s.id===scene),sceneEnd=p.scenes[index].end;
  const later=p.scenes.slice(index+1);
  const samples=renderSamples(p,at,Math.min(until,sceneEnd-1));
  const mix=(t:number)=>({x:start.x+(wanted.x-start.x)*t,y:start.y+(wanted.y-start.y)*t,zoom:start.zoom+(wanted.zoom-start.zoom)*t});
  // Test the eased path against changing object states, then reduce only when needed.
  const fits=(amount:number)=>{const end=mix(amount);
    if(end.zoom<=0)return false;
    if(samples.every(sample=>{
      const t=until===at?1:(sample-at)/(until-at),c=mix(amount*ease(t,easing));
      return p.objects.filter(o=>!o.scene||o.scene===scene).every(o=>{
        const s=objectStateAt(o,p.motions,p.events,sample);
        return s.opacity<=.01||inside(p,o,s,c);
      });
    })){
      // This camera state persists until another cue changes it. Future scene
      // layouts are guarded even if their choreography has not yet been compiled.
      if(!later.every(next=>{const incoming=p.transitions.find(t=>t.to===next.id),sample=next.start+(incoming?.duration??0),camera=mix(amount);
        return p.objects.filter(o=>!o.scene||o.scene===next.id).every(o=>inside(p,o,objectStateAt(o,p.motions,p.events,sample),camera));
      }))return false;
      return true;
    }
    return false;
  };
  if(fits(1))return wanted;
  let low=0,high=1;
  for(let i=0;i<12;i++){const middle=(low+high)/2;if(fits(middle))low=middle;else high=middle;}
  return low>1/1024?mix(low):start;
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
    const exitDuration=plan.exitFamily&&plan.exitFamily!=='none'?Math.max(1,lead+transitionDuration||Math.min(seconds(.42),Math.floor((scene.end-scene.start)/6))):0;
    const availableStart=Math.max(scene.start,incoming?resolveTime(incoming.at,project.events)+incoming.duration:scene.start);
    const availableEnd=scene.end-Math.max(lead,bridge?lead:exitDuration),span=Math.max(0,availableEnd-availableStart);
    const style=plan.style??(['expressiveReveal','cascade','directionalFlow'].includes(plan.preset)?'expressive':plan.preset==='focusPush'?'cinematic':'productive');
    const family=style==='productive'?'productive':'expressive';
    const creative=plan.creative,impact=creative?weightValue[creative.weight]*clamp(span/seconds(2.5),.55,1.15):1;
    const defaults=motionDefaults(project.style.motionEnergy,scene.density,rate);
    const duration=Math.max(1,Math.min(Math.round(defaults.entrance*(style==='productive'?.75:style==='cinematic'?1.5:1.1)),Math.floor(span/4)));
    const offsets=staggerOffsets(objects,plan.stagger??{strategy:'hierarchy',strength:plan.preset==='cascade'?'expressive':'normal'},rate,
      creative?Math.floor(span/6):Math.min(seconds(motionPreferences.staggerSeconds),Math.floor(span/8)));
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
      const [,, ,safeH]=project.layout.safeArea,safeTop=project.layout.safeArea[1],safeBottom=safeTop+safeH;
      const down=Math.max(0,safeBottom-base.y-o.size[1]*base.scale/2),up=Math.max(0,base.y-o.size[1]*base.scale/2-safeTop);
      const displacement=creative?(creative.entrance?.travel??Math.max(up,down)*.22*impact)*weight*(down>=up?1:-1):motionPreferences.translation*weight*(style==='productive'?.45:1);
      const wanted={...base,y:base.y+displacement,
        scale:creative?(creative.entrance?.scaleFrom??base.scale*(1-.095*impact*weight)):base.scale*(style==='productive'?1:1-.018*weight),
        rotation:creative?.entrance?.rotationFrom??base.rotation};
       const entryEase=creative?.entrance?.ease??'settled';
       const camera=cameraAt(project,start),candidate=safeEntry(project,o,base,wanted,camera,entryEase,start,duration);
      if(creative&&Math.abs(candidate.y-wanted.y)+Math.abs(candidate.scale-wanted.scale)+Math.abs(candidate.rotation-wanted.rotation)>1e-6)
        warnings.push(`${scene.id}/${o.id}: entrance adapted to safe area; review the intended impact.`);
       o.initial.opacity=0;
       if(plan.entryFamily==='codeScan'){
         add({target:o.id,at:start,duration:0,to:{opacity:1},ease:'linear',intent:'state'});
         add({target:o.id,at:start,duration,from:{y:candidate.y,scale:candidate.scale,rotation:candidate.rotation},
           to:{y:base.y,scale:base.scale,rotation:base.rotation},ease:entryEase,intent:'entrance',effect:'code.scan'});
       }else if(entryEase==='spring'){
         add({target:o.id,at:start,duration,from:{opacity:0},to:{opacity:1},ease:`${family}.enter`,intent:'entrance'});
         add({target:o.id,at:start,duration,from:{y:candidate.y,scale:candidate.scale,rotation:candidate.rotation},
           to:{y:base.y,scale:base.scale,rotation:base.rotation},ease:'spring',intent:'entrance',
           effect:plan.entryFamily==='heroDepth'?'hero.depth':undefined});
       }else add({target:o.id,at:start,duration,from:{opacity:0,y:candidate.y,scale:candidate.scale,rotation:candidate.rotation},
         to:{opacity:1,y:base.y,scale:base.scale,rotation:base.rotation},ease:entryEase,intent:'entrance',
         effect:plan.entryFamily==='heroDepth'?'hero.depth':undefined});
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
      if(active.kind==='focus'&&object){const target=objectStateAt(object,project.motions,project.events,at);
        const attention=creative?Math.min(1,.26*impact):.1;
        wanted.x+=(target.x-start.x)*attention;wanted.y+=(target.y-start.y)*attention;
      }
      if(active.kind==='drift')wanted.x+=.008*impact;
      else wanted.zoom+=creative?.camera?.zoomDelta??(active.kind==='pull'?- .02*impact:(style==='cinematic'?.035:.022)*impact);
      if(creative?.camera?.x!==undefined)wanted.x=creative.camera.x;
      if(creative?.camera?.y!==undefined)wanted.y=creative.camera.y;
      if(!creative){wanted.zoom=clamp(wanted.zoom,motionPreferences.cameraZoomMin,motionPreferences.cameraZoomMax);
        wanted.x=clamp(wanted.x,.5-motionPreferences.cameraOffset,.5+motionPreferences.cameraOffset);
        wanted.y=clamp(wanted.y,.5-motionPreferences.cameraOffset,.5+motionPreferences.cameraOffset);}
      if(wanted.zoom<=0)throw Error('Creative camera zoom must stay positive');
      const end=safeCamera(project,scene.id,at,availableEnd,start,wanted,'settled');
      const moved=JSON.stringify(end)!==JSON.stringify(start);
      if(creative&&moved&&Math.abs(end.x-wanted.x)+Math.abs(end.y-wanted.y)+Math.abs(end.zoom-wanted.zoom)>1e-6)
        warnings.push(`${scene.id}: camera travel adapted to visible content; review focus and readability.`);
      if(moved)project.camera.push({at,duration:availableEnd-at,kind:active.kind==='focus'?'focus':active.kind,...end,intensity:1,ease:'settled',settle:true});
      else warnings.push(`${scene.id}: camera has no safe travel; use an emphasis beat or an explicit reading rest.`);
      phase(scene.id,'active',at,availableEnd,moved?`Bounded ${active.kind} supports ${subject??'scene hierarchy'}`:'Spatial rest: safe camera travel is unavailable');
    }else phase(scene.id,'active',activeStart,availableEnd,'Brief scene: preserve reading time instead of adding motion');
    for(const beat of plan.emphasis??[]){
      const object=project.objects.find(o=>o.id===beat.target);if(!object||object.scene&&object.scene!==scene.id)throw Error('Emphasis target is outside scene');
      const at=resolveTime(beat.at,project.events),duration=seconds(beat.strength==='strong'?.28:.2),release=seconds(.4);
      if(at<activeStart||at+duration+release>availableEnd)throw Error('Emphasis must fit after settling and before exit');
      const base=objectStateAt(object,project.motions,project.events,at),camera=cameraAt(project,at+duration);
      const scale=base.scale*(1+(beat.strength==='strong'?.03:.012)*impact);
      let safeScale=base.scale;
      for(let amount=1;amount>=1/64;amount/=2){const candidate=base.scale+(scale-base.scale)*amount;
        if(inside(project,object,{...base,scale:candidate},camera)){safeScale=candidate;break;}}
      add({target:object.id,at:beat.at,duration,to:{scale:safeScale,focus:beat.strength==='strong'?1:.55},ease:'settled',intent:'emphasis'});
      add({target:object.id,at:at+duration,duration:release,to:{scale:base.scale,focus:base.focus},ease:'settled',intent:'emphasis'});
      phase(scene.id,'shift',at,at+duration+release,`Attention to ${object.id}, then release; no looping pulse`);
    }
    if(exitDuration&&span>=4){
      const exitStart=scene.end-(bridge?lead:exitDuration),exitEnd=bridge?scene.end+transitionDuration:scene.end;
      const exitObjects=objects.filter(o=>o.scene===scene.id);
      const offsets=plan.exitFamily==='groupCascade'?staggerOffsets(exitObjects,{strategy:'end',strength:'subtle'},rate,Math.floor(exitDuration/3)):
        Object.fromEntries(exitObjects.map(o=>[o.id,0]));
      for(const o of exitObjects){
        const at=exitStart+offsets[o.id],length=Math.max(1,exitEnd-at);
        if(project.motions.some(m=>m.target===o.id&&m.intent==='exit'))continue;
        const base=objectStateAt(o,project.motions,project.events,at);
        const inward=clamp((.5-base.y)*.08,-.015,.015);
        const to=plan.exitFamily==='codeDeconstruct'?{scale:base.scale*.98}:
          plan.exitFamily==='heroDepart'?{opacity:0,scale:base.scale*.86,y:base.y+inward}:
          {opacity:0,scale:base.scale*.94,y:base.y+inward};
        add({target:o.id,at,duration:length,to,ease:'smooth',intent:'exit',
          effect:plan.exitFamily==='codeDeconstruct'?'code.deconstruct':plan.exitFamily==='heroDepart'?'hero.depart':undefined});
        if(plan.exitFamily==='codeDeconstruct')add({target:o.id,at:exitEnd,duration:0,to:{opacity:0},ease:'linear',intent:'state'});
      }
      phase(scene.id,'exit',exitStart,exitEnd,`${plan.exitFamily} finishes the local role${bridge?' while attention hands off':''}`);
    }
    if(bridge){
      const shared=project.objects.filter(o=>!o.scene&&scene.hierarchy.includes(o.id)&&next!.hierarchy.includes(o.id)).map(o=>o.id);
      project.transitions.push({from:scene.id,to:next!.id,at:scene.end,duration:transitionDuration,kind:bridge.kind??'push',direction:bridge.direction,ease:'settled',shared,reason:bridge.reason??'Carry directional energy into the incoming section'});
      const at=scene.end-lead,start=cameraAt(project,at),wanted={...start};
      const axis=['up','down'].includes(bridge.direction)?'y':'x';
      wanted[axis]+=((['left','up'].includes(bridge.direction)?.012:-.012)*impact);
      if(!creative)wanted[axis]=clamp(wanted[axis],.5-motionPreferences.cameraOffset,.5+motionPreferences.cameraOffset);
      const end=safeCamera(project,scene.id,at,scene.end+transitionDuration,start,wanted);
      project.camera.push({at,duration:lead+transitionDuration,kind:'pan',...end,intensity:1,ease:'settled',settle:true});
      phase(scene.id,'exit',at,scene.end+transitionDuration,'Camera anticipates and continues across the cut without a reset');
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

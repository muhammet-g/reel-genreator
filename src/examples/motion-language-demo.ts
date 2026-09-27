import type {Project,VisualObject} from '../engine/contracts';
import {fixture} from './fixture';
import {choreograph,type SceneMotion} from '../engine/motion-language';
import {secondsToSamples} from '../engine/time';

/** Same Code Dragon tokens/primitives. Synthetic silent comparison; not a narrated customer reel. */
export function motionLanguageDemo(){
  const p:Project=structuredClone(fixture);p.id='MotionLanguage';p.audio.sampleCount=30*48000;
  p.audio.src='';delete p.audio.derivative;p.objects=[];p.motions=[];p.camera=[];p.transitions=[];p.captions=[];
  const tick=(seconds:number)=>secondsToSamples(seconds,p.audio.sampleRate);
  p.events={meaning:tick(14.4),cardFocus:tick(8.6),cardResult:tick(10.7)};p.scenes=[];
  const scene=(id:string,i:number,purpose:string)=>p.scenes.push({id,start:i*6*48000,end:(i+1)*6*48000,narration:'Synthetic silent motion demonstration',purpose,hierarchy:[],visualReason:purpose,density:'low',source:'Authored existing-system demonstration',uncertainty:[]});
  const object=(sceneId:string,id:string,label:string,role:VisualObject['role'],y:number,kind:VisualObject['kind']='text',x=.5,size:[number,number]=[.72,.09],fontSize=48)=>{
    p.objects.push({id,scene:sceneId,kind,label,role,initial:{x,y,opacity:1,scale:1,rotation:0,focus:0,owner:null},size,direction:'rtl',depth:role==='context'?.3:0,allowOverlap:[],fontSize});
    p.scenes.find(s=>s.id===sceneId)!.hierarchy.push(id);
  };
  scene('headline',0,'Headline leads; subtitle responds, then bounded presentation motion');
  object('headline','headline-title','الحركة توضّح الفكرة','primary',.29,'text',.5,[.74,.13],64);
  object('headline','headline-subtitle','كل عنصر يدخل عندما يصبح مهمًا','secondary',.46);
  object('headline','headline-note','تسلسل واضح • إيقاع هادئ','context',.62,'text',.5,[.7,.07],32);
  scene('cards',1,'Hierarchy-led list with a spatial cascade');
  object('cards','cards-title','خطوة تقود إلى التالية','primary',.18,'text',.5,[.74,.1],58);
  object('cards','card-one','١  الفكرة','secondary',.34,'value',.5,[.62,.085],40);
  object('cards','card-two','٢  التركيز','secondary',.49,'value',.5,[.62,.085],40);
  object('cards','card-three','٣  الاستمرار','context',.64,'value',.5,[.62,.085],40);
  scene('emphasis',2,'A named semantic beat emphasizes the key message, followed by deliberate rest');
  object('emphasis','key-text','المعنى أولًا','primary',.35,'text',.5,[.72,.15],88);
  object('emphasis','key-support','التأكيد مرة واحدة، ثم مساحة للقراءة','secondary',.57,'text',.5,[.75,.10],38);
  scene('camera',3,'A restrained camera focus supports the teaching object and anticipates the next section');
  object('camera','camera-title','اتبع الفكرة','primary',.22,'text',.5,[.72,.1],58);
  object('camera','camera-subject','function','secondary',.45,'function',.5,[.52,.095],46);
  p.objects.at(-1)!.direction='ltr';
  object('camera','camera-note','الكاميرا توجّه الانتباه','context',.65,'text',.5,[.66,.07],36);
  p.scenes[3].teachingObject='camera-subject';
  scene('continuation',4,'Incoming content continues the established direction without another entrance');
  object('continuation','next-title','نفس الاتجاه، فكرة جديدة','primary',.3,'text',.5,[.74,.13],58);
  object('continuation','next-subtitle','الانتقال جزء من الشرح','secondary',.5);
  object('continuation','next-note','استمرار، ثم استقرار','context',.66,'text',.5,[.66,.07],32);
  const recipes:SceneMotion[]=[
    {scene:'headline',preset:'expressiveReveal'},
    {scene:'cards',preset:'cascade',stagger:{strategy:'directional',direction:'down',strength:'expressive'},emphasis:[
      {target:'card-two',at:{event:'cardFocus',offset:0},strength:'subtle'},
      {target:'card-three',at:{event:'cardResult',offset:0},strength:'subtle'}]},
    {scene:'emphasis',preset:'expressiveReveal',active:{kind:'rest',reason:'Let the key statement be read after its single emphasis'},emphasis:[{target:'key-text',at:{event:'meaning',offset:0},strength:'strong'}]},
    {scene:'camera',preset:'focusPush',active:{kind:'focus',target:'camera-subject'},transition:{direction:'left',reason:'The camera starts the direction before the incoming scene continues it'}},
    {scene:'continuation',preset:'softReveal',active:{kind:'pull'}},
  ];
  return {source:p,recipes,...choreograph(p,recipes)};
}

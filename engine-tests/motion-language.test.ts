import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from '../src/examples/fixture';
import {ease,objectStateAt,cameraAt} from '../src/engine/state';
import {transitionState} from '../src/engine/transitions';
import {choreograph,staggerOffsets} from '../src/engine/motion-language';
import {validateProject} from '../src/engine/validate';
import {motionActivity} from '../src/engine/planning';
import {motionLanguageDemo} from '../src/examples/motion-language-demo';
import {localEffectAt} from '../src/engine/motion-families';

function source(){
  const p=structuredClone(fixture);p.motions=[];p.camera=[];p.transitions=[];
  p.objects=p.objects.filter(o=>o.id==='title');p.objects[0].role='primary';
  p.objects.push({...structuredClone(p.objects[0]),id:'subtitle',role:'secondary',size:[.6,.08],initial:{...p.objects[0].initial,y:.45}});
  p.scenes.forEach(s=>s.hierarchy=['title','subtitle']);return p;
}
test('semantic bezier easing solves time on the x axis and preserves endpoints',()=>{
  assert.equal(ease(0,'expressive.enter'),0);assert.equal(ease(1,'expressive.exit'),1);
  assert.ok(ease(.5,'expressive.enter')>.7);assert.ok(ease(.5,'productive.exit')<.5);
  for(const name of ['productive.enter','expressive.enter','productive.standard','expressive.standard','productive.exit','expressive.exit']){
    const values=Array.from({length:101},(_,i)=>ease(i/100,name));
    assert.ok(values.every((v,i)=>v>=0&&v<=1&&(!i||v>=values[i-1])));
  }
});
test('settled motion is seek-stable, monotone and lands without a velocity jump',()=>{
  const values=Array.from({length:1001},(_,i)=>ease(i/1000,'settled'));
  assert.equal(values[0],0);assert.equal(values.at(-1),1);
  assert.ok(values.every((value,i)=>value>=0&&value<=1&&(!i||value>=values[i-1])));
  assert.ok(values[1]<.0001&&1-values.at(-2)!<.0001);
  const compiled=choreograph(source(),[{scene:'intro',preset:'expressiveReveal'}]).project;
  assert.ok(compiled.motions.some(m=>m.intent==='entrance'&&m.ease==='settled'));
  assert.ok(compiled.camera.some(c=>c.ease==='settled'));
});
test('compiler leaves audio/style/timing/input untouched and emits ordinary validated tracks',()=>{
  const p=source(),before=structuredClone(p),result=choreograph(p,[{scene:'intro',preset:'expressiveReveal'}]);
  assert.deepEqual(p,before);assert.deepEqual(result.project.audio,p.audio);assert.deepEqual(result.project.style,p.style);
  assert.deepEqual(result.project.scenes,p.scenes);assert.equal(validateProject(result.project).version,1);
  const entrances=result.project.motions.filter(m=>m.intent==='entrance');
  assert.ok(Number(entrances[0].at)<Number(entrances[1].at));
  assert.ok(result.project.camera.length>0);assert.ok(result.phases.some(p=>p.phase==='active'));
  const c=cameraAt(result.project,110000);assert.notDeepEqual(c,cameraAt(result.project,90000));
});
test('intentional rest is explicit and short scenes degrade without overrunning',()=>{
  const p=source();const result=choreograph(p,[{scene:'intro',preset:'softReveal',active:{kind:'rest',reason:'Read the exact formula'}}]);
  assert.equal(result.project.camera.length,0);assert.ok(result.phases.some(p=>p.reason.includes('exact formula')));
  p.scenes[0].end=4800;p.scenes[1].start=4800;
  const short=choreograph(p,[{scene:'intro',preset:'cascade'}]);validateProject(short.project);
  assert.ok(short.project.motions.every(m=>Number(m.at)+m.duration<=4800));
});
test('stagger is spatial/semantic, bounded, stable and never random',()=>{
  const objects=source().objects;
  const center=staggerOffsets(objects,{strategy:'center',strength:'normal'},48000,5000);
  assert.deepEqual(center,staggerOffsets(objects,{strategy:'center',strength:'normal'},48000,5000));
  const end=staggerOffsets(objects,{strategy:'end',strength:'expressive'},48000,1000);
  assert.equal(end.subtitle,0);assert.ok(end.title<=1000);
  assert.throws(()=>staggerOffsets(objects,{strategy:'semantic',order:['missing'],strength:'normal'},48000,1000),/order/);
});
test('explicit from-state is seek deterministic and conflicts still fail',()=>{
  const p=source(),o=p.objects[0];p.motions=[{target:o.id,at:0,duration:100,from:{y:.25},to:{y:.2},ease:'linear',intent:'entrance'}];
  assert.equal(objectStateAt(o,p.motions,p.events,50).y,.225);
  assert.equal(objectStateAt(o,p.motions,p.events,200).y,.2);
  p.motions.push({...p.motions[0],at:10});assert.throws(()=>validateProject(p),/overlap/);
});
test('directional transition carries camera across boundary without resetting or double entrances',()=>{
  const p=source();p.objects.push({...structuredClone(p.objects[0]),id:'next',scene:'result'});p.scenes[1].hierarchy=['next'];
  const result=choreograph(p,[{scene:'intro',preset:'directionalFlow',transition:{direction:'right'}},{scene:'result',preset:'softReveal'}]).project;
  validateProject(result);const t=result.transitions[0];assert.equal(t.direction,'right');
  const outgoing=transitionState(result,result.objects[0],144000+10000);assert.ok(outgoing.x>0);
  assert.ok(result.camera.some(c=>Number(c.at)<144000&&Number(c.at)+c.duration>144000));
  assert.equal(result.motions.filter(m=>m.target==='next'&&m.intent==='entrance').length,0);
  assert.ok(Math.abs(cameraAt(result,144001).x-cameraAt(result,143999).x)<.001);
});
test('activity diagnostics distinguish frozen presentation from explicit reading rest',()=>{
  const p=source();assert.equal(motionActivity(p)[0].movingFraction,0);
  const result=choreograph(p,[{scene:'intro',preset:'softReveal',active:{kind:'rest',reason:'Read'}}]);
  assert.equal(result.activity[0].intentionalRest,true);
  const alive=choreograph(p,[{scene:'intro',preset:'expressiveReveal'}]);
  assert.ok(alive.activity[0].movingFraction>.7);
});
test('authored entrances settle before generated camera, and existing camera conflicts are explicit',()=>{
  const p=source();p.objects[0].initial.opacity=0;
  p.motions=[{target:'title',at:0,duration:72000,to:{opacity:1},ease:'smooth',intent:'entrance'}];
  const result=choreograph(p,[{scene:'intro',preset:'softReveal'}]).project;
  assert.deepEqual(result.motions[0],p.motions[0]);assert.ok(Number(result.camera[0].at)>=72000);
  p.camera=[{at:80000,duration:50000,kind:'push',x:.5,y:.5,zoom:1.02,intensity:1,ease:'smooth',settle:true}];
  assert.throws(()=>choreograph(p,[{scene:'intro',preset:'softReveal'}]),/Camera overlap/);
});
test('five demonstration scenes keep identity and bounds, and preserve the explicit reading hold',()=>{
  const demo=motionLanguageDemo();validateProject(demo.project);
  assert.equal(demo.project.scenes.length,5);assert.deepEqual(demo.warnings,[]);
  assert.deepEqual(demo.project.style,demo.source.style);assert.deepEqual(demo.project.captions,demo.source.captions);
  assert.ok(demo.activity.filter(a=>!a.intentionalRest).every(a=>a.longestStillSeconds<.3));
  assert.ok(demo.activity.find(a=>a.intentionalRest)!.longestStillSeconds>2);
  for(const cue of demo.project.camera){assert.ok(cue.zoom>=.98&&cue.zoom<=1.06);assert.ok(Math.abs(cue.x-.5)<=.025&&Math.abs(cue.y-.5)<=.025);}
  const title=demo.project.objects[0],snapshot=objectStateAt(title,demo.project.motions,demo.project.events,9000);
  objectStateAt(title,demo.project.motions,demo.project.events,1000000);
  assert.deepEqual(objectStateAt(title,demo.project.motions,demo.project.events,9000),snapshot);
});
test('contextual hero motion can exceed old preferences while preserving deterministic state',()=>{
  const p=source();p.objects=p.objects.filter(o=>o.id==='title');p.objects[0].size=[.3,.08];
  p.scenes.forEach(s=>s.hierarchy=['title']);p.scenes[0].teachingObject='title';
  const result=choreograph(p,[{scene:'intro',preset:'focusPush',active:{kind:'push'},
    creative:{weight:'hero',reason:'The teaching concept is the scene hero',
      entrance:{travel:.1,scaleFrom:.7,rotationFrom:8,ease:'spring'},camera:{zoomDelta:2}}}]);
  validateProject(result.project);
  const entry=result.project.motions.find(m=>m.ease==='spring')!;
  assert.ok(Math.abs(entry.from!.y!-entry.to.y!)>.025);
  assert.ok(entry.from!.rotation!>0);
  assert.ok(result.project.camera[0].zoom>1.06);
  assert.ok(result.project.camera[0].zoom<3);
  assert.ok(result.warnings.some(w=>w.includes('camera travel adapted')));
  const title=result.project.objects[0],time=Number(entry.at)+Math.floor(entry.duration/2);
  const snapshot=objectStateAt(title,result.project.motions,result.project.events,time);
  objectStateAt(title,result.project.motions,result.project.events,time+entry.duration);
  assert.deepEqual(objectStateAt(title,result.project.motions,result.project.events,time),snapshot);
});
test('spring-like overshoot is spatial only',()=>{
  const p=source();p.motions=[{target:'title',at:0,duration:1000,to:{opacity:1},ease:'spring',intent:'entrance'}];
  assert.throws(()=>validateProject(p),/spatial properties/);
  p.motions[0].to={rotation:8};validateProject(p);
  assert.ok(ease(.3,'spring')>1);
  assert.equal(ease(1,'spring'),1);
});

test('authored code entrance scans locally and exits by deconstruction, without a fade-only default',()=>{
  const p=source();p.objects=p.objects.filter(o=>o.id==='title');p.objects[0].kind='code';
  p.objects[0].size=[.42,.1];p.scenes[0].hierarchy=['title'];p.scenes[1].hierarchy=['title'];
  const result=choreograph(p,[{scene:'intro',preset:'expressiveReveal',entryFamily:'codeScan',exitFamily:'codeDeconstruct'}]).project;
  validateProject(result);
  const entry=result.motions.find(m=>m.effect==='code.scan')!,out=result.motions.find(m=>m.effect==='code.deconstruct')!;
  assert.equal(entry.intent,'entrance');assert.equal(out.intent,'exit');
  assert.ok(!('opacity' in entry.to));assert.ok(!('opacity' in out.to));
  assert.ok(Number(out.at)>Number(entry.at)+entry.duration);
  assert.equal(objectStateAt(result.objects[0],result.motions,result.events,144000).opacity,0);
});

test('code exit remains visible at a handoff and finishes with the incoming transition',()=>{
  const p=source();p.objects=p.objects.filter(o=>o.id==='title');p.objects[0].kind='code';p.objects[0].size=[.42,.1];
  p.objects.push({...structuredClone(p.objects[0]),id:'next',scene:'result',kind:'text'});
  p.scenes[0].hierarchy=['title'];p.scenes[1].hierarchy=['next'];
  const project=choreograph(p,[{scene:'intro',preset:'expressiveReveal',entryFamily:'codeScan',exitFamily:'codeDeconstruct',
    transition:{direction:'left',kind:'push'}},{scene:'result',preset:'softReveal'}]).project;
  validateProject(project);
  const boundary=p.scenes[0].end,object=project.objects[0],bridge=project.transitions[0];
  const exit=project.motions.find(m=>m.target===object.id&&m.effect==='code.deconstruct')!;
  assert.ok(Number(exit.at)<boundary&&Number(exit.at)+exit.duration>boundary);
  assert.equal(objectStateAt(object,project.motions,project.events,boundary).opacity,1);
  assert.ok(localEffectAt(project,object,boundary).visibleFraction!>.3);
  assert.equal(objectStateAt(object,project.motions,project.events,boundary+bridge.duration).opacity,0);
});

test('hero concept can arrive with depth and depart with a different, settled family',()=>{
  const p=source();p.objects=p.objects.filter(o=>o.id==='title');p.objects[0].size=[.32,.08];
  p.scenes.forEach(s=>s.hierarchy=['title']);
  const project=choreograph(p,[{scene:'intro',preset:'expressiveReveal',entryFamily:'heroDepth',exitFamily:'heroDepart',
    creative:{weight:'hero',reason:'Primary concept changes role'}}]).project;
  validateProject(project);
  const entry=project.motions.find(m=>m.effect==='hero.depth')!,out=project.motions.find(m=>m.effect==='hero.depart')!;
  assert.ok(entry&&out);assert.equal(out.to.opacity,0);assert.ok(out.to.scale!<1);
  const at=Number(entry.at)+entry.duration,object=project.objects[0];
  assert.ok(Math.abs(objectStateAt(object,project.motions,project.events,at).scale-1)<1e-9);
});

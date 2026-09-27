import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from '../src/examples/fixture';
import {ease,objectStateAt,cameraAt} from '../src/engine/state';
import {transitionState} from '../src/engine/transitions';
import {choreograph,staggerOffsets} from '../src/engine/motion-language';
import {validateProject} from '../src/engine/validate';
import {motionActivity} from '../src/engine/planning';

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

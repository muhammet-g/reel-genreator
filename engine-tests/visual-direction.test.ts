import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from '../src/examples/fixture';
import {directScenes} from '../src/engine/visual-direction';
import {choreograph} from '../src/engine/motion-language';
import {placeObjects} from '../src/engine/layout-primitives';
import {previewFrames} from '../tools/preview';

test('visual direction maps explicit scene meaning to reusable recipes without touching project',()=>{
  const project=structuredClone(fixture),before=structuredClone(project);
  const [compare,inspect]=directScenes(project,[{scene:'intro',intent:'compare'},{scene:'result',intent:'inspect',focus:'token'}]);
  assert.deepEqual(project,before);
  assert.equal(compare.recipe.preset,'softReveal');assert.equal(compare.recipe.stagger?.strategy,'center');
  assert.equal(inspect.recipe.preset,'focusPush');assert.deepEqual(inspect.recipe.active,{kind:'focus',target:'token'});
  assert.throws(()=>directScenes(project,[{scene:'result',intent:'connect'}]),/following scene/);
  assert.throws(()=>directScenes(project,[{scene:'intro',intent:'inspect',focus:'missing'}]),/outside scene/);
});

test('semantic priority and scene context choose strength without matching spoken words',()=>{
  const project=structuredClone(fixture);project.scenes[0].importance='key';
  const first=directScenes(project,[{scene:'intro',intent:'reveal',focus:'token',priority:'hero'}])[0];
  assert.equal(first.recipe.creative?.weight,'hero');
  assert.deepEqual(first.recipe.active,{kind:'focus',target:'token'});
  project.scenes[0].narration='An unrelated phrase with the same teaching purpose';
  const second=directScenes(project,[{scene:'intro',intent:'reveal',focus:'token',priority:'hero'}])[0];
  assert.deepEqual(first.recipe,second.recipe);
  assert.equal(directScenes(project,[{scene:'intro',intent:'reveal',priority:'passing'}])[0].recipe.creative,undefined);
});

test('director chooses families from meaning, role, neighboring scene, and allows a continuation handoff',()=>{
  const p=structuredClone(fixture);p.transitions=[];p.motions=[];p.camera=[];
  p.objects.find(o=>o.id==='token')!.initial.opacity=1;
  const [continuing]=directScenes(p,[{scene:'intro',intent:'connect',relationship:'continuation',priority:'important'}]);
  assert.equal(continuing.recipe.transition?.kind,'continuation');
  assert.equal(continuing.recipe.exitFamily,'none');
  const result=choreograph(p,[continuing.recipe]).project;
  assert.deepEqual(result.transitions[0].shared,['token']);
  assert.equal(result.motions.filter(m=>m.target==='token'&&m.intent==='entrance').length,0);
  const first=directScenes(p,[{scene:'intro',intent:'reveal',priority:'hero',relationship:'replacement'}])[0];
  assert.equal(first.recipe.entryFamily,'codeScan');
  assert.equal(first.recipe.exitFamily,'codeDeconstruct');
  assert.equal(first.recipe.transition?.kind,'push');
});

test('layout keeps objects immutable, respects RTL order, and rejects overflow',()=>{
  const a=structuredClone(fixture.objects[0]),b={...structuredClone(a),id:'second'};
  a.size=[.2,.1];b.size=[.2,.1];
  const placed=placeObjects([a,b],{mode:'row',zone:[.1,.1,.8,.3],gap:.04,direction:'rtl'});
  assert.ok(placed[0].initial.x>placed[1].initial.x);
  assert.equal(placed[0].initial.y,placed[1].initial.y);
  assert.equal(a.initial.x,.5);
  assert.throws(()=>placeObjects([a,b],{mode:'grid',zone:[.1,.1,.2,.2],columns:2}),/does not fit/);
});

test('targeted previews select scene boundaries and named events with exact frame checks',()=>{
  const frames=previewFrames(fixture,['--scene','intro','--event','focus','--frame','179']);
  assert.deepEqual(frames,[0,45,89,90,179]);
  assert.throws(()=>previewFrames(fixture,['--frame','180']),/outside video/);
  assert.throws(()=>previewFrames(fixture,[]),/Select/);
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {rankResources,motionDefaults,motionAdvisories} from '../src/engine/planning';
import {fixture} from '../src/examples/fixture';
test('resource ranking excludes unreviewed media and explains stable results',()=>{
  const base={id:'a',file:'a.svg',sha256:'a'.repeat(64),type:'svg',source:'authored',license:'CC0',reviewed:true,tags:['process'],sceneTypes:['process'],energy:'calm',styles:[],loopable:false};
  const results=rankResources([{...base,id:'z'},base,{...base,id:'bad',reviewed:false}] as any,{tags:['process'],sceneType:'process',energy:'calm'});
  assert.deepEqual(results.map(r=>r.resource.id),['a','z']);assert.equal(results[0].reasons.tags,1);
});
test('default motion depends on energy and density; repetition remains advisory',()=>{
  assert.ok(motionDefaults('calm','low',48000).entrance>motionDefaults('energetic','high',48000).entrance);
  const p=structuredClone(fixture);p.motions=[0,30000,60000].map(at=>({...p.motions[0],at,intent:'entrance'}));
  assert.ok(motionAdvisories(p).some(x=>x.code==='repeated-entrance'));
});

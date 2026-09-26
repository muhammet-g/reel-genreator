import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from '../src/examples/fixture';
import {validateProject} from '../src/engine/validate';
const copy=()=>structuredClone(fixture);
test('rejects missing scene coverage, out-of-range events and stale audio lineage',()=>{
  const gap=copy(); gap.scenes[1].start+=100; assert.throws(()=>validateProject(gap),/coverage/);
  const event=copy();event.events.focus=event.audio.sampleCount+1;assert.throws(()=>validateProject(event),/event/);
  const lineage=copy();lineage.audio.derivative={src:'audio.m4a',sha256:'b'.repeat(64),decodedHash:'x',sourceHash:'b'.repeat(64)};
  assert.throws(()=>validateProject(lineage),/lineage/);
});
test('rejects unknown triggers, conflicting property animation and ownership cycles',()=>{
  const missing=copy();missing.motions[0].at={event:'absent',offset:0};assert.throws(()=>validateProject(missing),/Unknown event/);
  const overlap=copy();overlap.motions.push({...overlap.motions[0],at:1});assert.throws(()=>validateProject(overlap),/overlap/);
  const cycle=copy();cycle.objects[0].initial.owner=cycle.objects[0].id;assert.throws(()=>validateProject(cycle),/ownership/);
});
test('accepts an independent project with persistent objects and explicit silence',()=>{
  assert.equal(validateProject(copy()).version,1);
});

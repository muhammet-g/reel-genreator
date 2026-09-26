import assert from 'node:assert/strict';
import {test} from 'node:test';
import {frameCount, sampleToFrame, frameToSample} from '../src/engine/time';
import {objectStateAt} from '../src/engine/state';

test('duration rounds up and absolute boundaries do not accumulate drift', () => {
  assert.equal(frameCount(4559099, 48000, {num:30, den:1}), 2850);
  assert.equal(sampleToFrame(48000, 48000, {num:30000, den:1001}, 'ceil'), 30);
  assert.equal(frameToSample(30, 48000, {num:30000, den:1001}), 48048);
  assert.throws(() => frameCount(-1, 48000, {num:30, den:1}));
});

test('persistent object state is reconstructed from time, not playback history', () => {
  const object = {id:'token', kind:'function', label:'function', role:'primary',
    size:[.3,.1], initial:{x:.2,y:.3,scale:1,opacity:0,rotation:0,focus:0,owner:null}};
  const motions = [
    {target:'token', at:0, duration:100, to:{opacity:1}, ease:'linear'},
    {target:'token', at:100, duration:100, to:{x:.8,owner:'container'}, ease:'linear'},
  ];
  const sample = () => objectStateAt(object as any, motions as any, {}, 150);
  assert.equal(sample().x, .5);
  objectStateAt(object as any, motions as any, {}, 199);
  assert.deepEqual(sample(), sample());
  assert.equal(objectStateAt(object as any, motions as any, {}, 250).owner,'container');
});

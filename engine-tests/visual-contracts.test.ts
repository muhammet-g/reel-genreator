import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from '../src/examples/fixture';
import {MixedText} from '../src/remotion/Text';
import {spatialIssues} from '../src/engine/spatial';
import {transitionState} from '../src/engine/transitions';
import {validateProject} from '../src/engine/validate';
test('mixed Arabic isolates complete expressions and signed indices and escapes markup',()=>{
  const html=renderToStaticMarkup(React.createElement(MixedText,{text:'القيمة fruits.at(-2) ثم −2 <script>',direction:'rtl'}));
  assert.match(html,/<bdi[^>]+>fruits.at\(-2\)<\/bdi>/);assert.match(html,/<bdi[^>]+>−2<\/bdi>/);assert.ok(!html.includes('<script>'));
});
test('shared object stays continuous while scene-owned objects fade',()=>{
  const p=structuredClone(fixture);p.transitions[0].kind='fade';
  const at=144000+7200;
  assert.equal(transitionState(p,p.objects[0],at).opacity,1);
  assert.equal(transitionState(p,p.objects[2],at).opacity,.5);
  assert.equal(transitionState(p,p.objects[2],180000).opacity,0);
});
test('measured layout rejects unintended collision and illegible text, permits ownership',()=>{
  const p=structuredClone(fixture);p.objects[0].allowOverlap=[];p.objects[1].allowOverlap=[];
  const items=[{id:'token',box:[300,400,300,200],clipped:false,minText:20},{id:'container',box:[400,500,300,200],clipped:false}];
  assert.deepEqual(spatialIssues(p,items).map(x=>x.kind),['readability','collision']);
  assert.deepEqual(spatialIssues(p,[{...items[0],minText:32,owner:'container'},items[1]]),[]);
});
test('selected resources cannot silently use unsupported media or unsafe paths',()=>{
  const p=structuredClone(fixture);p.audio.src='../source.wav';assert.throws(()=>validateProject(p),/Unsafe/);
  const q=structuredClone(fixture);q.objects[0].kind='image';assert.throws(()=>validateProject(q),/requires resource/);
});

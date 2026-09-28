import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sampleElementMotion} from '../src/remotion/motion/sample';
import type {AmbientType,ElementMotion,EmphasisType,EntranceType,ExitType} from '../src/remotion/motion/types';
import {segmentGraphemes,motionTextUnits} from '../src/remotion/motion/graphemes';

test('generic element has independent entrance and exit and exact endpoints',()=>{
  const motion:ElementMotion={enter:{type:'pop',startFrame:10,durationFrames:20},
    exit:{type:'blur',startFrame:60,durationFrames:15}};
  assert.equal(sampleElementMotion(0,30,motion).style.opacity,0);
  assert.equal(sampleElementMotion(30,30,motion).style.opacity,1);
  assert.equal(sampleElementMotion(60,30,motion).style.opacity,1);
  assert.equal(sampleElementMotion(75,30,motion).style.opacity,0);
  assert.match(String(sampleElementMotion(67,30,motion).style.filter),/blur\(/);
});

test('frame sampling is seek independent, finite and has no CSS timing',()=>{
  const motion:ElementMotion={enter:{type:'cube',durationFrames:24,easing:'spring'},
    emphasis:{type:'glitch',startFrame:38,durationFrames:12},
    ambient:{type:'float',periodFrames:75}};
  const sample=sampleElementMotion(42,30,motion);
  sampleElementMotion(99,30,motion);
  assert.deepEqual(sampleElementMotion(42,30,motion),sample);
  assert.ok(!JSON.stringify(sample).includes('transition'));
  assert.ok(!JSON.stringify(sample).includes('NaN'));
  assert.throws(()=>sampleElementMotion(10,30,{enter:{type:'fade',durationFrames:0}}),/duration/);
});

test('scan has a real moving reveal edge while mask has no synthetic scan',()=>{
  const scan=sampleElementMotion(10,30,{enter:{type:'scan',durationFrames:20}});
  const mask=sampleElementMotion(10,30,{enter:{type:'mask',durationFrames:20}});
  assert.ok(scan.scanEdge!>0&&scan.scanEdge!<100);
  assert.match(String(scan.style.clipPath),/inset/);
  assert.equal(mask.scanEdge,undefined);
});

test('text units preserve Arabic shaping clusters and Unicode emoji',()=>{
  for(const fallback of [false,true]){
    assert.deepEqual(segmentGraphemes('سَ',!fallback),['سَ']);
    assert.deepEqual(segmentGraphemes('👩‍💻',!fallback),['👩‍💻']);
    assert.deepEqual(segmentGraphemes('🇯🇴',!fallback),['🇯🇴']);
  }
  assert.deepEqual(motionTextUnits('السَلام عليكم'),['السَلام',' ','عليكم']);
  assert.deepEqual(motionTextUnits('A👩‍💻B'),['A','👩‍💻','B']);
});

test('every advertised effect samples without invalid CSS values',()=>{
  const entrances:EntranceType[]=['fade','pop','slide','rotate','flip','blur-pop','mask','scan','cube'];
  const exits:ExitType[]=['fade','slide','scale','rotate','flip','blur','mask','zoom'];
  const emphasis:EmphasisType[]=['punch','shake','glitch','glow'];
  const ambient:AmbientType[]=['float','tilt','neon','hologram'];
  const motions:ElementMotion[]=[
    ...entrances.map(type=>({enter:{type,durationFrames:20}})),
    ...exits.map(type=>({exit:{type,startFrame:0,durationFrames:20}})),
    ...emphasis.map(type=>({emphasis:{type,startFrame:0,durationFrames:20}})),
    ...ambient.map(type=>({ambient:{type,periodFrames:20}})),
  ];
  for(const motion of motions)for(const frame of [0,10,20]){
    const style=sampleElementMotion(frame,30,motion).style;
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(style)));
    assert.ok(Number(style.opacity)>=0&&Number(style.opacity)<=1);
  }
});

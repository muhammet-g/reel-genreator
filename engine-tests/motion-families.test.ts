import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from '../src/examples/fixture';
import {localEffectAt} from '../src/engine/motion-families';
import {validateProject} from '../src/engine/validate';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DebugMode,DebugOnly} from '../src/remotion/ForEachFilm';

test('code scan and deconstruction stay local, deterministic, and phase distinct',()=>{
  const p=structuredClone(fixture),code=p.objects.find(o=>o.id==='token')!;
  code.kind='code';p.motions=[];
  p.motions.push({target:code.id,at:1000,duration:1000,intent:'entrance',to:{opacity:1},ease:'smooth',effect:'code.scan'});
  p.motions.push({target:code.id,at:4000,duration:1000,intent:'exit',to:{opacity:0},ease:'smooth',effect:'code.deconstruct'});
  validateProject(p);
  const entering=localEffectAt(p,code,1500),exiting=localEffectAt(p,code,4500);
  assert.match(entering.clipPath!,/^inset/);assert.match(exiting.clipPath!,/^polygon/);
  assert.ok(entering.edgeOpacity!>0&&exiting.edgeOpacity!>0);
  assert.deepEqual(entering,localEffectAt(p,code,1500));
  assert.deepEqual(localEffectAt(p,code,3000),{});
});

test('hero depth and departure use separate local treatments without changing source state',()=>{
  const p=structuredClone(fixture),hero=p.objects.find(o=>o.id==='title')!;
  p.motions=[];
  p.motions.push({target:hero.id,at:0,duration:1000,intent:'entrance',to:{opacity:1},ease:'smooth',effect:'hero.depth'});
  p.motions.push({target:hero.id,at:2000,duration:1000,intent:'exit',to:{opacity:0},ease:'smooth',effect:'hero.depart'});
  assert.match(localEffectAt(p,hero,250).filter!,/^blur/);
  assert.notEqual(localEffectAt(p,hero,250).filter,localEffectAt(p,hero,2250).filter);
  assert.equal(hero.initial.opacity,1);
});

test('authoring scene and frame labels are absent by default and require explicit debug mode',()=>{
  const overlay=React.createElement(DebugOnly,null,'Scene 13 / Frame 2366');
  assert.equal(renderToStaticMarkup(overlay),'');
  const debug=renderToStaticMarkup(React.createElement(DebugMode.Provider,{value:true},overlay));
  assert.match(debug,/Scene 13 \/ Frame 2366/);
  assert.match(debug,/data-debug-overlay/);
});

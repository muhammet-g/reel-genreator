/** Private-data integration check. Requires the two original local project folders. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {validateProject} from '../src/engine/validate';
import {objectStateAt} from '../src/engine/state';
import {secondsToSamples,frameCount} from '../src/engine/time';
import {hash,verifyAssets} from './media';
const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
const functions=validateProject(read('projects/remotion-projects/FunctionsRemotion/project.json').project);
const arrays=validateProject(read('projects/remotion-projects/ArraysRemotion/project.json').project);
const timing=read('projects/js-functions-v2/timing-map.json'),oldArray=read('projects/array-last-element-ar/motion-plan.json');
assert.equal(functions.audio.sha256,hash('projects/js-functions-v2/master-audio.wav'));
assert.equal(arrays.audio.sha256,hash('projects/array-last-element-ar/master-audio.mp3'));
assert.equal(functions.audio.sampleCount,4559099);
for(const [name,seconds] of Object.entries(timing.events))assert.equal(functions.events[name],secondsToSamples(seconds as number,functions.audio.sampleRate));
for(const [p,phrases] of [[functions,timing.captions],[arrays,oldArray.captions]] as const){
  verifyAssets(p);assert.equal(p.captions.length,phrases.length);
  p.captions.forEach((c,i)=>{assert.equal(c.text,phrases[i].text);assert.equal(c.start,secondsToSamples(phrases[i].start,p.audio.sampleRate));assert.equal(c.end,secondsToSamples(phrases[i].end,p.audio.sampleRate));});
}
functions.scenes.forEach((s,i)=>assert.equal(s.start,secondsToSamples(timing.boundaries[i],functions.audio.sampleRate)));
const state=(id:string,time:number)=>objectStateAt(functions.objects.find(o=>o.id===id)!,functions.motions,functions.events,secondsToSamples(time,functions.audio.sampleRate));
for(const name of ['pass','receive','compare_receive','memory_receive'])assert.equal(state('fn',timing.events[name]+.7).owner,'outer',name);
for(const name of ['return','higher_return','compare_return','memory_return'])assert.equal(state('fn',timing.events[name]+.7).owner,null,name);
assert.equal(state('fn',timing.events.syntax_braces+.1).label,'function(){}');
assert.equal(state('dependency-arrow',timing.events.dependency_lock+1).opacity,1);
assert.equal(state('logo',94.9).opacity,1);
for(const scene of oldArray.scenes){
  const a=scene.code_array;if(a?.selected_index===undefined)continue;
  const sample=secondsToSamples(scene.start+(scene.choreography?.beats?.focus??.2)+.01,arrays.audio.sampleRate);
  assert.equal(objectStateAt(arrays.objects.find(o=>o.id==='array')!,arrays.motions,arrays.events,sample).selected,a.selected_index);
}
const report={passed:true,scope:'Conceptual timing and continuity equivalence; not pixel-identical reproduction or creator acceptance',
  functions:{masterSamples:functions.audio.sampleCount,frames:frameCount(functions.audio.sampleCount,functions.audio.sampleRate,functions.frame.fps),events:Object.keys(functions.events).length,phrases:functions.captions.length,scenes:functions.scenes.length},
  arrays:{phrases:arrays.captions.length,scenes:arrays.scenes.length},checks:['original source hashes','all phrase text and ranges','all named function events','scene boundaries','receive/return ownership','progressive function syntax','final relationship','array selection']};
mkdirSync('projects/remotion-checks',{recursive:true});writeFileSync('projects/remotion-checks/reference-equivalence.json',JSON.stringify(report,null,2));console.log(report);

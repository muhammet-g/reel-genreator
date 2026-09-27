/** One-time migration adapters. Read project DATA; never execute legacy Python/JS. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import type {Project,VisualObject,ObjectState} from '../src/engine/contracts';
import {fixture} from '../src/examples/fixture';
import {validateProject} from '../src/engine/validate';
import {secondsToSamples} from '../src/engine/time';
import {root,inspectAudio,stage,prepareAudio} from './media';
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
async function base(id:string,master:string){
  const p=structuredClone(fixture);p.id=id;p.audio=await inspectAudio(master,id);
  p.objects=[];p.motions=[];p.camera=[];p.transitions=[];p.captions=[];p.resources=[];p.events={};p.scenes=[];
  p.style.fontFiles=[];
  for(const [family,pkg,subset,weight] of [['Cairo','cairo','arabic',600],['Inter','inter','latin',600],['JetBrains Mono','jetbrains-mono','latin',600]] as const)
    p.style.fontFiles.push({...stage(path.join(root,`node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-${weight}-normal.woff2`),id),family,weight});
  const logo=stage(path.join(root,'assets/brand/code-dragon-logo.png'),id);
  p.resources.push({id:'logo',...logo,type:'image',source:'Approved Code Dragon logo from existing style profile',license:'Creator supplied brand asset',reviewed:true,tags:['brand'],sceneTypes:[],energy:'calm',styles:['code-dragon-v1'],loopable:false});
  return p;
}
function author(p:Project){
  const tick=(s:number)=>secondsToSamples(s,p.audio.sampleRate);
  const object=(id:string,kind:VisualObject['kind'],label:string,x:number,y:number,size:[number,number],extra:Partial<VisualObject>={})=>{
    const o:VisualObject={id,kind,label,role:'primary',size,direction:'ltr',depth:0,allowOverlap:[],initial:{x,y,scale:1,opacity:0,rotation:0,focus:0,owner:null},...extra};p.objects.push(o);return o;
  };
  const move=(target:string,seconds:number,duration:number,to:Partial<ObjectState>,intent:Project['motions'][number]['intent']='move')=>
    p.motions.push({target,at:tick(seconds),duration:tick(duration),to,ease:'smooth',intent});
  const show=(target:string,at:number)=>move(target,at,.25,{opacity:1},'entrance');
  const hide=(target:string,at:number)=>move(target,at,.2,{opacity:0},'exit');
  return {tick,object,move,show,hide};
}
async function functionsProject(){
  const folder=path.join(root,'projects/js-functions-v2'),timing=read(path.join(folder,'timing-map.json'));
  const p=await base('FunctionsRemotion',path.join(folder,'master-audio.wav')),{tick,object,move,show,hide}=author(p),E=timing.events;
  p.events=Object.fromEntries(Object.entries(E).map(([k,v])=>[k,tick(v as number)]));
  const names=['terms','values','consolidation','receives','returns','comparison','dependency'];
  const reasons=['Introduce the two terms without treating them as exclusive types','One function receives the same value treatment as number and text','Consolidate the value property','Demonstrate receiving another function','Demonstrate returning another function','Compare language capability with function behavior','Build the causal dependency and retain a calm final hold'];
  p.scenes=names.map((id,i)=>({id,start:tick(timing.boundaries[i]),end:i===6?p.audio.sampleCount:tick(timing.boundaries[i+1]),
    narration:timing.captions.filter((c:any)=>c.start>=timing.boundaries[i]&&c.start<timing.boundaries[i+1]).map((c:any)=>c.text).join(' '),
    purpose:i===6?'cause-effect':i===5?'comparison':'explanation',hierarchy:['fn'],visualReason:reasons[i],density:'low',uncertainty:['Timing was authored from local ASR and waveform; wording review remains separate'],source:'js-functions-v2 timing-map.json'}));
  p.captions=timing.captions.map((c:any,i:number)=>({id:`phrase${i}`,start:tick(c.start),end:tick(c.end),text:c.text,direction:'rtl',status:'proposed',source:'Existing measured project phrase map'}));
  object('fn','function','function',.5,.43,[.44,.09],{fontSize:48,allowOverlap:['outer']});
  object('outer','container','HIGHER-ORDER FUNCTION',.5,.48,[.66,.22],{role:'secondary',allowOverlap:['fn']});
  object('first','text','FIRST-CLASS',.28,.21,[.38,.10],{fontSize:40});
  object('higher','text','HIGHER-ORDER',.72,.21,[.38,.10],{fontSize:40});
  object('number','value','42',.22,.55,[.20,.09],{fontSize:48});
  object('string','value','"Hello"',.48,.55,[.24,.09],{fontSize:42});
  object('value','text','FUNCTION = VALUE',.5,.66,[.72,.08],{fontSize:38});
  object('stored','text','const greet =',.5,.30,[.65,.08],{fontSize:44});
  object('question','text','شو هي الـ Higher-Order Function؟',.5,.2,[.78,.13],{direction:'rtl',fontSize:48});
  object('behavior','text','RECEIVES / RETURNS',.5,.68,[.75,.08],{fontSize:36});
  object('relation','text','FIRST-CLASS\nFUNCTIONS ARE VALUES',.5,.23,[.78,.15],{fontSize:40});
  object('dependency-arrow','text','↓',.5,.459,[.07,.055],{fontSize:64,tint:'accent',role:'secondary'});
  object('logo','image','',.5,.706,[.11,.07],{resource:'logo',role:'context'});
  move('fn',0,0,{label:'function'},'state');move('fn',E.syntax_params,0,{label:'function()'},'state');move('fn',E.syntax_braces,0,{label:'function(){}'},'state');
  show('fn',E.open);show('first',E.first_term);show('higher',E.higher_term);
  hide('first',timing.boundaries[1]-.3);hide('higher',timing.boundaries[1]-.3);
  show('number',E.values);show('string',E.values+.15);move('fn',E.value_state,.5,{x:.77,y:.55,scale:.65,focus:1});p.motions.at(-1)!.control=[.72,.25];show('value',E.value_label);
  hide('number',E.store-.3);hide('string',E.store-.3);hide('value',E.store-.3);show('stored',E.store);move('fn',E.store+.1,.5,{x:.5,y:.43,scale:1});
  hide('stored',E.pass-.5);show('outer',E.pass-.3);move('fn',E.pass,.6,{x:.5,y:.51,scale:.65,owner:'outer'});
  move('fn',E.return,.6,{x:.5,y:.66,scale:.8,owner:null});hide('outer',E.consolidate-.3);
  move('fn',E.consolidate,.5,{x:.5,y:.42,scale:1});show('value',E.consolidate+.2);
  hide('value',E.higher_question-.3);show('question',E.higher_question);hide('question',E.receive-.5);
  show('outer',E.receive-.4);move('fn',E.receive,.6,{x:.5,y:.51,scale:.65,owner:'outer'});move('outer',E.higher_definition,.3,{focus:1});
  move('fn',E.higher_return,.6,{y:.66,scale:.8,owner:null});
  show('first',E.comparison);show('higher',E.comparison+.25);move('outer',E.comparison,.6,{x:.70,y:.50,scale:.62,opacity:.3});
  move('fn',E.comparison,.6,{x:.28,y:.43,scale:.7});
  show('value',E.compare_value);move('value',E.compare_value,0,{x:.28,y:.63,scale:.56});
  move('first',E.compare_higher,.4,{opacity:.35});move('higher',E.compare_higher,.4,{focus:1});move('outer',E.compare_higher,.4,{opacity:1});
  move('fn',E.compare_receive,.55,{x:.70,y:.52,scale:.65,owner:'outer'});
  move('fn',E.compare_return,.55,{x:.72,y:.67,scale:.65,owner:null});
  hide('first',E.memory_first-.4);hide('higher',E.memory_first-.4);hide('outer',E.memory_first-.4);hide('value',E.memory_first-.4);
  move('fn',E.memory_first,.5,{x:.5,y:.42,scale:1});move('value',E.memory_value,0,{x:.5,y:.26,scale:1});show('value',E.memory_value);
  move('outer',E.memory_higher,0,{x:.5,y:.56,scale:.85});show('outer',E.memory_higher);
  move('fn',E.memory_receive,.5,{x:.5,y:.59,scale:.65,owner:'outer'});move('fn',E.memory_return,.5,{x:.5,y:.70,scale:.65,owner:null});
  hide('value',E.reset);hide('outer',E.reset);hide('fn',E.reset);
  show('relation',E.dependency);move('fn',E.dependency,0,{x:.5,y:.39,scale:.82});show('fn',E.dependency+.2);
  move('outer',E.dependency_lock,0,{x:.5,y:.575,scale:.8});show('outer',E.dependency_lock);show('dependency-arrow',E.dependency_lock+.56);show('logo',E.logo);
  p.transitions=p.scenes.slice(1).map((s,i)=>({from:p.scenes[i].id,to:s.id,at:s.start,duration:tick(.3),kind:'continuation',shared:['fn'],reason:'The same function continues across the explanation'}));
  // One restrained move; return to neutral before the next semantic section.
  p.camera=[{at:tick(28.6),duration:tick(.65),kind:'push',x:.5,y:.5,zoom:1.025,intensity:1,ease:'smooth',settle:true},
    {at:tick(32.5),duration:tick(.6),kind:'settle',x:.5,y:.5,zoom:1,intensity:1,ease:'smooth',settle:true}];
  for(const m of p.motions){const event=Object.entries(p.events).find(([,time])=>time===m.at);if(event)m.at={event:event[0],offset:0};}
  return p;
}
async function genericProject(){
  const folder=path.join(root,'projects/array-last-element-ar'),plan=read(path.join(folder,'motion-plan.json')),board=read(path.join(folder,'storyboard.json'));
  const p=await base('ArraysRemotion',path.join(folder,'master-audio.mp3')),{tick,object,move,show}=author(p);
  const visual=plan.scenes.find((s:any)=>s.code_array).code_array;
  object('array','array',visual.variable,.5,.39,[.74,.18],{cells:visual.cells,direction:'ltr',fontSize:42});
  plan.scenes.forEach((s:any,i:number)=>{
    const b=board.scenes[i],start=tick(s.start),end=i===plan.scenes.length-1?p.audio.sampleCount:tick(s.end);
    p.scenes.push({id:s.id,start,end,narration:b.narration,purpose:b.semantic_function,hierarchy:[s.code_array?'array':`title${i}`],visualReason:b.visual_reason,density:b.information_density,uncertainty:['Existing aligned draft; human wording review remains separate'],source:'Existing semantic storyboard'});
    p.events[`scene${i}`]=start;
    object(`title${i}`,'text',s.headline,.5,.18,[.78,.1],{scene:s.id,direction:'rtl',fontSize:54});show(`title${i}`,s.start+(s.choreography?.beats?.headline??0));
    const a=s.code_array;if(!a)return;
    if(i===1)show('array',s.start+.1);
    if(a.selected_index!==undefined)move('array',s.start+(s.choreography?.beats?.focus??.2),0,{selected:a.selected_index,focus:1},'state');
    if(a.expression){
      object(`expression${i}`,'text',a.previous_expression??'',.5,.56,[.78,.08],{scene:s.id,fontSize:40,initial:{x:.5,y:.56,scale:1,opacity:1,rotation:0,focus:0,owner:null}});
      if(a.tokens&&a.token_times){let label='';a.tokens.forEach((token:string,j:number)=>{label+=token;move(`expression${i}`,s.start+a.token_times[j],0,{label},'state');});}
      else move(`expression${i}`,s.start+(s.choreography?.beats?.expression??0),0,{label:a.expression},'state');
    }
    if(a.editor_comments)a.editor_comments.forEach((c:any,j:number)=>{const name=`comment${i}_${j}`;object(name,'text',`${c.arabic} ${c.ltr}`,.5,.623+j*.05,[.76,.04],{scene:s.id,direction:'rtl',fontSize:30});show(name,s.start+c.at);});
    if(a.reasoning){const name=`reasoning${i}`;object(name,'text','',.5,.618,[.76,.03],{scene:s.id,direction:'rtl',fontSize:30});a.reasoning.forEach((r:any)=>move(name,s.start+r.at,0,{label:`${r.text} → ${r.value}`,opacity:1},'state'));}
    if(a.result){const value=a.result.kind==='array'?`[ ${a.result.value.join(', ')} ]`:a.result.value;
      const name=`result${i}`;object(name,'value',value,.5,.68,[.52,.09],{scene:s.id,direction:'ltr',fontSize:40});show(name,s.start+(s.choreography?.beats?.result??1));}
  });
  // Coalesce simultaneous token reveals into a single resolved state.
  p.motions=p.motions.filter((m,i,all)=>!all.slice(i+1).some(n=>n.target===m.target&&n.at===m.at&&JSON.stringify(Object.keys(n.to))===JSON.stringify(Object.keys(m.to))));
  p.captions=plan.captions.map((c:any,i:number)=>({id:`phrase${i}`,start:tick(c.start),end:Math.min(p.audio.sampleCount,tick(c.end)),text:c.text,direction:c.direction??'auto',status:'proposed',source:'Existing measured phrase captions'}));
  p.transitions=p.scenes.slice(1).map((s,i)=>({from:p.scenes[i].id,to:s.id,at:s.start,duration:tick(.25),kind:'carry',shared:['array'],reason:'Keep the reference array stable'}));
  return p;
}
async function main(){
  for(const project of [await genericProject(),await functionsProject()]){
    validateProject(project);await prepareAudio(project);
    const dir=path.join(root,'projects/remotion-projects',project.id);mkdirSync(dir,{recursive:true});
    writeFileSync(path.join(dir,'project.json'),JSON.stringify({project},null,2));console.log(dir);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});



// Semantic operations share real object identities. All changes belong to the seekable timeline.
gsap.registerPlugin(MotionPathPlugin);
const objectState = new Map();
const semanticColors = MOTION.presentation_colors || {focused:'#244b52',surface:'#1d2a3a',accent:'#76ddc8',count:'#ffb56b'};
const tween = (target,vars,at) => {if(target && (!Array.isArray(target)||target.length)) timeline.to(target,{...vars,overwrite:false},at);};
const reveal = (target,at,duration=.4,extra={}) => tween(target,{opacity:1,scale:1,y:0,clipPath:'inset(0% 0% 0% 0%)',duration,ease:'power2.out',...extra},at);

(MOTION.shared_arrays||[]).forEach(group=>{
  const root=document.getElementById('array-'+group.id), cells=[...root.querySelectorAll('.program-cell')];
  const rail=root.querySelector('.program-rail'), ring=root.querySelector('.selection-ring');
  const base=rail.getBoundingClientRect();
  const centers=cells.map(cell=>{const r=cell.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height};});
  gsap.set(root,{visibility:'hidden',opacity:1});
  const constructing=MOTION.scenes[group.first_index].choreography.family==='construct';
  gsap.set([root.querySelector('.program-variable'),root.querySelector('.program-container'),...cells,...root.querySelectorAll('.program-index')],{opacity:constructing?0:1});
  gsap.set(ring,{opacity:0,width:Math.round(centers[0].width),height:centers[0].height,x:0,force3D:true});
  gsap.set(root.querySelector('.count-connector path'),{strokeDasharray:1,strokeDashoffset:1});
  gsap.set(root.querySelector('.count-connector'),{visibility:'hidden'});
  gsap.set(root.querySelectorAll('.negative-index'),{opacity:0});
  timeline.set(root,{visibility:'visible'},group.start);
  timeline.set(root,{visibility:'hidden'},group.end);
  objectState.set(group.id,{root,cells,ring,centers,base,lastIndex:0,ringVisible:false});
});

MOTION.scenes.forEach((scene,index)=>{
  if(!scene.choreography) return;
  const root=document.getElementById('scene-'+index), c=scene.choreography, start=scene.start,end=scene.end;
  const length=end-start, beat=(name,fraction)=>start+(c.beats?.[name]??length*fraction);
  const heading=root.querySelector('.headline'), eyebrow=root.querySelector('.eyebrow');
  gsap.set([heading,eyebrow],{opacity:0});
  const motif=root.querySelector('.scene-brand-motif');
  if(motif){
    gsap.set(motif,{opacity:0});
    reveal(motif,c.family==='construct'?beat('build',.08)+.4:start+.08,.2,{opacity:.7});
  }
  timeline.set(root,{visibility:'visible'},start);
  timeline.set(root,{visibility:'hidden'},end);
  if(c.family==='staged'){
    gsap.set(heading,{clipPath:'inset(0% 0% 100% 0%)',scale:.97});
    reveal(heading,start+.25,.65);
    const context=[...root.querySelectorAll('.program-context span')];
    gsap.set(context,{opacity:0,scale:.88});
    context.forEach((node,i)=>reveal(node,start+2.4+i*.48,.48));
    reveal(eyebrow,start+.12,.3);
    tween(heading,{scale:1.025,duration:.35,ease:'power2.inOut',repeat:1,yoyo:true},start+4.2);
    tween([heading,eyebrow,...context],{opacity:0,scale:.97,duration:.35,ease:'power2.in'},end-.35);
    return;
  }
  // Headers update; the array stays fixed throughout the teaching sequence.
  gsap.set(heading,{clipPath:'inset(0% 0% 100% 0%)'});
  const headlineIsTimed=c.beats && c.beats.headline!==undefined;
  reveal(heading,beat('headline',.08),headlineIsTimed ? .16 : .36); reveal(eyebrow,start,.25);
  tween([heading,eyebrow],{opacity:0,duration:.18},end-.18);
  const visual=scene.code_array, object=objectState.get(visual.object_id);
  const {root:array,cells,ring,centers,base}=object;
  const panel=root.querySelector('.code-program'), expression=panel.querySelector('.program-expression');
  const editor=panel.querySelector('.teaching-editor');
  const tokens=[...panel.querySelectorAll('.program-token')];
  const result=panel.querySelector('.program-result');
  if(tokens.length) gsap.set(tokens,{opacity:0});
  if(result) gsap.set(result,{opacity:0});
  if(editor) gsap.set(editor,{opacity:0,visibility:'hidden'});
  const focus=(which,at,{fromEnd=false}={})=>{
    const destination=Math.round(centers[which].x-centers[0].width/2-base.x);
    if(fromEnd){
      timeline.set(ring,{x:destination,y:62,scale:.65,opacity:0},at);
      tween(ring,{opacity:1,duration:.12},at);
    }else if(!object.ringVisible){
      timeline.set(ring,{x:destination},at); tween(ring,{opacity:1,duration:.2},at);
    }
    const origin=object.ringVisible?Math.round(centers[object.lastIndex].x-centers[0].width/2-base.x):destination;
    timeline.fromTo(ring,{x:fromEnd?destination:origin,y:fromEnd?62:0,scale:fromEnd?.65:1},
      {x:destination,y:0,scale:1,duration:.58,ease:'power2.inOut',immediateRender:false},at);
    cells.forEach((cell,i)=>tween(cell,{backgroundColor:i===which?semanticColors.focused:semanticColors.surface,duration:.28},at+.3));
    tween(array.querySelectorAll('.program-index')[which],{color:semanticColors.accent,scale:1.15,duration:.2,repeat:1,yoyo:true},at+.52);
    object.lastIndex=which;object.ringVisible=true;
  };
  const showResult=at=>{if(result) reveal(result,at,.4);};
  const extract=at=>{
    if(!result) return;
    const ghost=panel.querySelector('.extraction-token'), source=centers[visual.selected_index];
    const target=result.querySelector('.return-value').getBoundingClientRect();
    const destination={x:target.x+target.width/2,y:target.y+target.height/2};
    gsap.set(ghost,{opacity:0,x:source.x,y:source.y,xPercent:-50,yPercent:-50});
    gsap.set(result.querySelector('.return-value'),{opacity:0});
    gsap.set(result.querySelectorAll('.return-bracket'),{opacity:0,scaleY:.4});
    timeline.set(ghost,{opacity:1},at);
    reveal(result,at,.28);
    timeline.fromTo(ghost,{x:source.x,y:source.y},{motionPath:{path:[{x:source.x,y:source.y},{x:source.x+25,y:source.y+95},{x:destination.x,y:destination.y}],curviness:.65},duration:.9,ease:'power2.inOut',immediateRender:false},at);
    tween(ghost,{opacity:0,duration:.15},at+.82);
    reveal(result.querySelector('.return-value'),at+.82,.18);
    tween(result.querySelectorAll('.return-bracket'),{opacity:1,scaleY:1,duration:.4,ease:'power2.out'},at+.85);
  };
  if(c.family==='construct'){
    reveal(array.querySelector('.program-variable'),beat('build',.08),.3);
    // The rail and all of its chrome enter with the first real cell, never as an empty shell.
    gsap.set(array.querySelector('.program-container'),{scaleX:1});
    reveal(array.querySelector('.program-container'),beat('build',.08)+.4,.35);
    cells.forEach((cell,i)=>{
      gsap.set(cell,{scale:.82});reveal(cell,beat('build',.08)+.4+i*.28,.35);
    });
    [...array.querySelectorAll('.program-index')].forEach((node,i)=>reveal(node,beat('indexes',.56)+i*.13,.25));
  }
  const tokenBase=beat('expression',.10);
  const previous=expression.querySelector('.previous-expression');
  if(!previous){
    const firstTokenAt=visual.token_times?start+visual.token_times[0]:tokenBase;
    gsap.set(expression,{opacity:0});
    reveal(expression,firstTokenAt,.25);
  }
  tokens.forEach((token,i)=>reveal(token,visual.token_times?start+visual.token_times[i]:tokenBase+i*.2,.32));
  if(previous){
    const at=beat('expression',.1);
    gsap.set(expression.querySelector('.current-expression'),{opacity:0});
    tween(previous,{opacity:0,duration:.2},at);
    reveal(expression.querySelector('.current-expression'),at,.25);
  }
  if(c.family==='evaluate'){
    const steps=[...panel.querySelectorAll('.reason-step')];
    gsap.set(steps,{opacity:0,scale:.96});
    steps.forEach((node,i)=>{
      const at=start+visual.reasoning[i].at;
      reveal(node,at,.35);gsap.set(node.querySelector('strong'),{opacity:0,scale:.8});
      reveal(node.querySelector('strong'),at+.45,.3);
      if(i<steps.length-1) tween(node,{opacity:0,duration:.2},start+visual.reasoning[i+1].at-.2);
    });
    focus(visual.selected_index,beat('focus',.65));
  }
  if(c.family==='count'){
    // A large editor surface occupies the connector's region; do not stack redundant chrome.
    const connector=editor?null:array.querySelector('.count-connector');
    if(connector) timeline.set(connector,{visibility:'visible'},beat('count',.12));
    cells.forEach((cell,i)=>tween(cell,{borderColor:semanticColors.count,duration:.18,repeat:1,yoyo:true},beat('count',.12)+i*.4));
    if(connector) tween(connector.querySelector('path'),{strokeDashoffset:0,duration:.8,ease:'power2.inOut'},beat('count',.12));
    const steps=[...panel.querySelectorAll('.reason-step')];
    gsap.set(steps,{opacity:0});steps.forEach((step,i)=>reveal(step,start+visual.reasoning[i].at,.3));
    const comments=[...panel.querySelectorAll('.editor-comment')];
    gsap.set(comments,{opacity:0,y:9});
    if(editor){
      const enter=start+visual.editor_comments[0].at;
      timeline.set(editor,{visibility:'visible'},enter);
      reveal(editor,enter,.22);
      tween(editor,{opacity:0,duration:.18},end-.18);
    }
    comments.forEach((comment,i)=>{
      const at=start+visual.editor_comments[i].at;
      reveal(comment,at,.22);
      if(i) tween(comments[i-1],{opacity:.55,duration:.2},at);
    });
    focus(visual.selected_index,beat('focus',.6));
    if(connector){
      const exitAt=Math.min(end-.25,beat('focus',.6));
      tween(connector.querySelector('path'),{strokeDashoffset:1,duration:.25},exitAt);
      timeline.set(connector,{visibility:'hidden'},exitAt+.25);
    }
  }
  if(c.family==='tokens') focus(visual.selected_index,beat('focus',.7));
  if(c.family==='extract'){focus(visual.selected_index,start+.12);extract(beat('result',.42));}
  if(c.family==='end-focus'){
    reveal(array.querySelectorAll('.negative-index')[visual.selected_index],beat('focus',.55)-.2,.25);
    focus(visual.selected_index,beat('focus',.55),{fromEnd:true});showResult(beat('result',.8));
  }
  if(c.family==='focus-step'){
    // The same ring remains at its prior coordinate until this explanatory beat.
    reveal(array.querySelectorAll('.negative-index')[visual.selected_index],beat('focus',.44),.25);
    focus(visual.selected_index,beat('focus',.44));showResult(beat('result',.7));
  }
  if(c.family==='simplify'){
    focus(visual.selected_index,start+.12);
    tween(array,{opacity:.32,duration:.5},beat('reduce',.12));
    tween(expression,{y:60,scale:1.26,duration:.6,ease:'power2.inOut'},beat('reduce',.12));
    tween(array,{opacity:1,duration:.35},end-.35);
  }
  if(c.family==='behavior-compare'){
    focus(visual.selected_index,beat('focus',.12));
    const steps=[...panel.querySelectorAll('.reason-step')];
    gsap.set(steps,{opacity:0});
    steps.forEach((step,i)=>{reveal(step,start+visual.reasoning[i].at,.3);if(i<steps.length-1)tween(step,{opacity:0,duration:.2},start+visual.reasoning[i+1].at-.2);});
    extract(beat('result',.55));
  }
  const resource=root.querySelector('.scene-resource');
  if(resource){gsap.set(resource,{opacity:0});reveal(resource,beat('focus',.6),.3);}
});

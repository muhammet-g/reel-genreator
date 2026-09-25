// One deterministic, seekable timeline. Motion decisions come from the visual plan.
const timeline = gsap.timeline({paused:true});
const densityScale = {low:.8,medium:1,high:1.12}[MOTION.motion_density];
const energyScale = {calm:.83,balanced:1,energetic:1.12}[MOTION.visual_energy];
timeline.to('#reel-progress',{scaleX:1,duration:MOTION.duration,ease:'none'},0);

MOTION.scenes.forEach((scene,index)=>{
  if(scene.choreography) return; // Semantic object timelines are compiled below.
  const root = '#scene-'+index;
  const start = Number(scene.start), end = Number(scene.end), length=end-start;
  const enter = Math.min(.52,Math.max(.28,length*.17))/densityScale;
  const leave = Math.min(.35,Math.max(.16,length*.12));
  const emphasisAt = Math.min(end-leave-.35,start+Math.max(enter+.18,length*.46));
  const inner = root+' .scene-inner';
  timeline.set(root,{visibility:'visible'},start);
  const incoming = {opacity:0,y:0,x:0,scale:1,clipPath:'inset(0 0 0 0)'};
  const entrance=scene.motion.entrance==='auto'?({compare:'settle',steps:'staged',diagram:'staged',typography:'mask'}[scene.type]||'settle'):scene.motion.entrance;
  if(entrance==='rise') incoming.y=90;
  else if(entrance==='slide') incoming.x=105;
  else if(entrance==='scale' || entrance==='settle' || entrance==='focus') incoming.scale=.88;
  else if(entrance==='reveal' || entrance==='mask') incoming.clipPath='inset(0 0 100% 0)';
  // A scene's explicit entrance owns direction; global transitions never add a push.
  if((scene.transition||MOTION.transition_family)==='wipe' && index>0) incoming.clipPath='inset(0 0 100% 0)';
  timeline.fromTo(inner,incoming,{opacity:1,y:0,x:0,scale:1,clipPath:'inset(0 0 0 0)',duration:enter,ease:'power3.out'},start);
  const parts = root+' .motion-part';
  if(document.querySelector(parts)) timeline.fromTo(parts,{opacity:0,y:20},{opacity:1,y:0,duration:Math.min(.3,length*.12),stagger:.075/densityScale,ease:'power2.out'},start+.13);
  if(scene.type==='number'){
    const counter=document.querySelector(root+' .counter'), target=Number(counter.dataset.target), count={value:0};
    timeline.to(count,{value:target,duration:Math.min(1.25,length*.42),ease:'power2.out',onUpdate:()=>{counter.textContent=Number.isInteger(target)?Math.round(count.value).toLocaleString('en-US'):count.value.toFixed(1)}},start+enter*.5);
  }
  if(scene.type==='progress'){
    const fill=root+' .progress-fill';
    timeline.to(fill,{scaleX:Number(document.querySelector(fill).dataset.value),duration:Math.min(1.2,length*.42),ease:'power2.inOut'},start+enter*.55);
  }
  if(!scene.code_array && (scene.type==='steps' || scene.type==='diagram')){
    const vertical=MOTION.composition?.scenes[index]?.reflow==='stack';
    timeline.fromTo(root+' .connector i',vertical?{width:'100%',scaleY:0,transformOrigin:'top'}:{width:'0%'},{...(vertical?{scaleY:1}:{width:'100%'}),duration:Math.min(.4,length*.13),stagger:.2/densityScale,ease:'power2.out'},start+enter+.13);
  }
  if(scene.code_array){
    const visual=scene.code_array;
    const path=visual.selection_path||[];
    if(path.length>1){
      const cells=document.querySelectorAll(root+' .code-array-cell');
      const first=start+length*Number(visual.selection_at??.55);
      const interval=Math.min(.5,Math.max(.25,(end-first-leave-.2)/(path.length-1)));
      for(let step=1;step<path.length;step++){
        const at=first+(step-1)*interval;
        timeline.set(cells[path[step-1]],{attr:{'data-active':'false'}},at);
        timeline.set(cells[path[step]],{attr:{'data-active':'true'}},at);
        timeline.fromTo(cells[path[step]],{y:0},{y:-11,duration:.16,repeat:1,yoyo:true,ease:'power2.out'},at);
      }
    }
    const result=document.querySelector(root+' .code-result');
    if(result){
      const at=start+length*Number(visual.result_reveal_at??.55);
      timeline.fromTo(result,{opacity:0,y:20},{opacity:1,y:0,duration:.32,ease:'power2.out'},at);
    }
  }
  if(scene.motion.emphasis==='pulse') timeline.to(root+' .headline',{scale:1.035,duration:.18,ease:'power2.out',yoyo:true,repeat:1,transformOrigin:'left center'},emphasisAt);
  if(scene.motion.emphasis==='underline') timeline.to(root+' .headline',{textDecorationColor:'var(--accent)',duration:.3},emphasisAt);
  if(scene.motion.emphasis==='connect' && scene.type!=='steps' && scene.type!=='diagram') timeline.to(root+' .headline',{color:'var(--accent)',duration:.28,yoyo:true,repeat:1},emphasisAt);
  if(scene.motion.exit==='fade') timeline.to(inner,{opacity:0,duration:leave,ease:'power2.in'},end-leave);
  else if(scene.motion.exit==='slide') timeline.to(inner,{opacity:0,x:-85,duration:leave,ease:'power2.in'},end-leave);
  timeline.set(root,{visibility:'hidden'},end);
});

MOTION.captions.forEach((caption,index)=>{
  const root='#caption-'+index, start=Number(caption.start), end=Number(caption.end);
  timeline.set(root,{visibility:'visible'},start);
  timeline.fromTo(root,{opacity:0,y:15},{opacity:1,y:0,duration:Math.min(.18,(end-start)/3),ease:'power2.out'},start);
  timeline.set(root,{visibility:'hidden'},end);
});
// The selected frame is a pure function of the composition time, including random-access seeks.
(MOTION.sequences||[]).forEach(sequence=>{
  const element=document.querySelector(sequence.selector), state={frame:0};
  const duration=sequence.frames.length/sequence.fps;
  timeline.to(state,{frame:sequence.frames.length,duration:duration,ease:'none',
    onUpdate:()=>{
      const index=Math.min(sequence.frames.length-1,Math.max(0,Math.floor(state.frame+1e-6)));
      const source=sequence.frames[index];
      if(element.getAttribute('src')!==source) element.setAttribute('src',source);
    }},sequence.start);
});
window.__timelines=window.__timelines||{};
window.__timelines.reel=timeline;

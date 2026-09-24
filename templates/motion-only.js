// One deterministic, seekable timeline. Motion decisions come from the visual plan.
const timeline = gsap.timeline({paused:true});
const densityScale = {low:.8,medium:1,high:1.12}[MOTION.motion_density];
const energyScale = {calm:.83,balanced:1,energetic:1.12}[MOTION.visual_energy];
timeline.to('#reel-progress',{scaleX:1,duration:MOTION.duration,ease:'none'},0);

MOTION.scenes.forEach((scene,index)=>{
  const root = '#scene-'+index;
  const start = Number(scene.start), end = Number(scene.end), length=end-start;
  const enter = Math.min(.52,Math.max(.28,length*.17))/densityScale;
  const leave = Math.min(.35,Math.max(.16,length*.12));
  const emphasisAt = Math.min(end-leave-.35,start+Math.max(enter+.18,length*.46));
  const inner = root+' .scene-inner';
  timeline.set(root,{visibility:'visible'},start);
  const incoming = {opacity:0,y:0,x:0,scale:1,clipPath:'inset(0 0 0 0)'};
  if(scene.motion.entrance==='rise') incoming.y=90;
  else if(scene.motion.entrance==='slide') incoming.x=105;
  else if(scene.motion.entrance==='scale') incoming.scale=.88;
  else incoming.clipPath='inset(0 100% 0 0)';
  if(MOTION.transition_family==='push' && index>0) incoming.x+=72;
  if(MOTION.transition_family==='wipe' && index>0) incoming.clipPath='inset(0 100% 0 0)';
  timeline.fromTo(inner,incoming,{opacity:1,y:0,x:0,scale:1,clipPath:'inset(0 0 0 0)',duration:enter,ease:'power3.out'},start);
  const parts = root+' .motion-part';
  timeline.fromTo(parts,{opacity:0,y:20},{opacity:1,y:0,duration:Math.min(.3,length*.12),stagger:.075/densityScale,ease:'power2.out'},start+.13);
  if(scene.type==='number'){
    const counter=document.querySelector(root+' .counter'), target=Number(counter.dataset.target), count={value:0};
    timeline.to(count,{value:target,duration:Math.min(1.25,length*.42),ease:'power2.out',onUpdate:()=>{counter.textContent=Number.isInteger(target)?Math.round(count.value).toLocaleString('en-US'):count.value.toFixed(1)}},start+enter*.5);
  }
  if(scene.type==='progress'){
    const fill=root+' .progress-fill';
    timeline.to(fill,{scaleX:Number(document.querySelector(fill).dataset.value),duration:Math.min(1.2,length*.42),ease:'power2.inOut'},start+enter*.55);
  }
  if(scene.type==='steps' || scene.type==='diagram'){
    timeline.fromTo(root+' .connector i',{width:'0%'},{width:'100%',duration:Math.min(.4,length*.13),stagger:.2/densityScale,ease:'power2.out'},start+enter+.13);
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
window.__timelines=window.__timelines||{};
window.__timelines.reel=timeline;

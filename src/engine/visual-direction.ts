/** Author-time visual choices. A person/agent supplies meaning; this maps it to existing motion recipes. */
import {z} from 'zod';
import type {Project} from './contracts';
import type {SceneMotion} from './motion-language';
import {validateProject} from './validate';

export const visualIntentSchema=z.array(z.object({
  scene:z.string(),
  intent:z.enum(['explain','reveal','sequence','compare','inspect','connect','conclude']),
  focus:z.string().optional(),
  priority:z.enum(['passing','important','hero']).optional(),
  flow:z.enum(['left','right','up','down']).optional(),
  relationship:z.enum(['independent','continuation','replacement','contrast','detail','overview']).optional(),
  restReason:z.string().trim().min(1).optional(),
}).strict());
export type VisualIntent=z.input<typeof visualIntentSchema>[number];
export type DirectionDecision={scene:string;intent:VisualIntent['intent'];recipe:SceneMotion;reason:string;review:string[]};

export function directScenes(input:Project,intents:VisualIntent[]):DirectionDecision[]{
  const p=validateProject(input),choices=visualIntentSchema.parse(intents),seen=new Set<string>();
  return choices.map(choice=>{
    if(seen.has(choice.scene))throw Error(`Duplicate visual intent: ${choice.scene}`);seen.add(choice.scene);
    const index=p.scenes.findIndex(s=>s.id===choice.scene),scene=p.scenes[index];
    if(!scene)throw Error(`Unknown visual-intent scene: ${choice.scene}`);
    const previous=p.scenes[index-1],next=p.scenes[index+1],local=p.objects.filter(o=>o.scene===scene.id);
    const focus=choice.focus??scene.teachingObject??scene.hierarchy[0];
    if(focus&&!p.objects.some(o=>o.id===focus&&(!o.scene||o.scene===scene.id)))throw Error(`Focus is outside scene: ${focus}`);
    if(choice.flow&&!next)throw Error('Visual flow requires a following scene');
    if(choice.intent==='connect'&&!next)throw Error('Connect requires a following scene');
    if(choice.relationship&&choice.relationship!=='independent'&&!next)throw Error('Visual relationship requires a following scene');
    const recipe:SceneMotion={scene:scene.id,preset:'softReveal'};
    let reason='Readable explanation leads with restrained motion.';
    const review:string[]=[];
    switch(choice.intent){
      case 'reveal':recipe.preset='expressiveReveal';reason='A key idea earns one stronger entrance.';break;
      case 'sequence':recipe.preset='cascade';recipe.stagger={strategy:'hierarchy',strength:'normal'};reason='Ordered ideas enter by hierarchy.';break;
      case 'compare':recipe.preset='softReveal';recipe.stagger={strategy:'center',strength:'subtle'};reason='Paired claims should arrive together for fair comparison.';review.push('Check pair balance and label legibility.');break;
      case 'inspect':recipe.preset='focusPush';recipe.active=focus?{kind:'focus',target:focus}:{kind:'push'};reason='Move attention to the teaching object after the entrance settles.';break;
      case 'connect':recipe.preset='directionalFlow';reason='Direction starts before the scene boundary and continues after it.';break;
      case 'conclude':recipe.preset='expressiveReveal';recipe.active={kind:'rest',reason:choice.restReason??'Give the closing statement time to read'};reason='One arrival, then a deliberate closing hold.';break;
    }
    if(choice.restReason)recipe.active={kind:'rest',reason:choice.restReason};
    const shared=next?p.objects.filter(o=>!o.scene&&scene.hierarchy.includes(o.id)&&next.hierarchy.includes(o.id)):[];
    const relationship=choice.relationship??(shared.length?'continuation':'independent');
    if(relationship==='continuation'&&!shared.length)review.push('No shared persistent object; inspect the proposed continuation.');
    if(choice.flow||choice.intent==='connect'||relationship!=='independent'){
      const current=p.objects.find(o=>o.id===focus),upcoming=p.objects.find(o=>o.id===next!.teachingObject);
      const horizontal=current&&upcoming?upcoming.initial.x-current.initial.x:0;
      recipe.transition={direction:choice.flow??(horizontal>.04?'right':'left'),
        kind:relationship==='continuation'?'continuation':relationship==='detail'||relationship==='overview'?'focus':'push',
        reason:`${relationship} relationship from ${scene.id} to ${next!.id}`};
    }
    const priority=choice.priority??(scene.importance==='key'?'important':'passing');
    const principal=p.objects.find(o=>o.id===focus),isCode=principal?.kind==='code'||principal?.kind==='function';
    recipe.entryFamily=isCode&&priority!=='passing'&&['reveal','inspect','explain'].includes(choice.intent)?'codeScan':
      priority==='hero'&&choice.intent==='reveal'?'heroDepth':
      local.length>1&&choice.intent==='sequence'?'groupAssemble':'spatial';
    recipe.exitFamily=!next||relationship==='continuation'?'none':
      isCode&&priority!=='passing'?'codeDeconstruct':
      priority==='hero'?'heroDepart':
      local.length>1&&['sequence','compare'].includes(choice.intent)?'groupCascade':'none';
    const seconds=(scene.end-scene.start)/p.audio.sampleRate;
    if(priority!=='passing'&&choice.intent!=='explain'){
      const crowded=scene.density==='high'||local.length>=5;
      const weight=seconds<1.2?'normal':priority==='hero'&&!crowded?'hero':
        choice.intent==='inspect'||choice.intent==='connect'?'cinematic':'expressive';
      recipe.creative={weight,reason:`${priority} ${choice.intent}; ${focus?`teaching focus ${focus}`:'scene hierarchy'}; `+
        `${crowded?'dense composition':'available space is checked'}; ${previous?`follows ${previous.id}`:'opening scene'}; `+
        `${next?`precedes ${next.id}`:'closing scene'}.`};
      if(choice.intent==='reveal'&&focus)recipe.active={kind:'focus',target:focus};
    }
    if(!local.length)review.push('No scene-scoped objects; inspect persistent object choreography.');
    if(scene.uncertainty.length)review.push('Resolve scene uncertainty before accepting the visual decision.');
    if(choice.intent==='inspect'&&!focus)review.push('Teaching object was not identified; focus uses the scene hierarchy.');
    return {scene:scene.id,intent:choice.intent,recipe,reason,review};
  });
}

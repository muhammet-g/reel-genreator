import {z} from 'zod';

const tick=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const id=z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const finite=z.number().finite();
const unit=finite.min(0).max(1);
export const trigger=z.union([tick,z.object({event:id,offset:z.number().int().default(0)}).strict()]);
export const stateSchema=z.object({x:finite,y:finite,scale:finite.positive(),opacity:unit,
  rotation:finite,focus:unit,owner:id.nullable(),label:z.string().optional(),selected:z.number().int().nonnegative().optional()}).strict();
const easing=z.enum(['linear','smooth','out','in']);
const box=z.tuple([unit,unit,unit.positive(),unit.positive()]);
const direction=z.enum(['rtl','ltr','auto']);
export const resourceSchema=z.object({id,file:z.string().min(1),sha256:hash,
  type:z.enum(['image','svg','video','audio']),source:z.string().min(1),license:z.string().min(1),
  reviewed:z.boolean(),tags:z.array(z.string()),sceneTypes:z.array(z.string()),
  energy:z.enum(['calm','balanced','energetic']),styles:z.array(z.string()),loopable:z.boolean(),
  durationSamples:tick.optional()}).strict();
export const objectSchema=z.object({id,kind:z.enum(['text','function','container','value','array','image']),
  label:z.string(),role:z.enum(['primary','secondary','context']),size:z.tuple([unit.positive(),unit.positive()]),
  initial:stateSchema,scene:id.optional(),direction:direction.default('auto'),
  cells:z.array(z.string()).optional(),resource:id.optional(),tint:z.enum(['text','accent']).optional(),fontSize:finite.positive().optional(),
  depth:unit.default(0),allowOverlap:z.array(id).default([])}).strict();
export const motionSchema=z.object({target:id,at:trigger,duration:tick,
  intent:z.enum(['entrance','emphasis','exit','hold','move','state','path']).default('state'),
  to:stateSchema.partial(),ease:easing.default('smooth'),
  control:z.tuple([finite,finite]).optional()}).strict();
export const projectSchema=z.object({version:z.literal(1),id,
  frame:z.object({width:z.number().int().positive(),height:z.number().int().positive(),
    fps:z.object({num:z.number().int().positive(),den:z.number().int().positive()}).strict()}).strict(),
  audio:z.object({src:z.string(),sha256:hash,sampleRate:z.number().int().positive(),sampleCount:tick.positive(),
    channels:z.number().int().positive(),codec:z.string(),durationSource:z.enum(['decoded-samples','container']),
    derivative:z.object({src:z.string(),sha256:hash,decodedHash:z.string(),sourceHash:hash}).strict().optional()}).strict(),
  events:z.record(id,tick),
  scenes:z.array(z.object({id,start:tick,end:tick,narration:z.string(),purpose:z.string().min(1),
    hierarchy:z.array(id),visualReason:z.string().min(1),density:z.enum(['low','medium','high']),
    importance:z.enum(['supporting','normal','key']).optional(),teachingObject:id.optional(),
    structure:z.string().optional(),relationship:z.string().optional(),resourceNeeds:z.array(z.string()).optional(),
    uncertainty:z.array(z.string()).default([]),source:z.string().min(1)}).strict()).min(1),
  objects:z.array(objectSchema),motions:z.array(motionSchema),
  camera:z.array(z.object({at:trigger,duration:tick,kind:z.enum(['static','zoom','push','pull','pan','focus','follow','settle','drift']),
    target:id.optional(),x:finite,y:finite,zoom:finite.positive(),intensity:unit,ease:easing,
    settle:z.boolean()}).strict()),
  transitions:z.array(z.object({from:id,to:id,at:trigger,duration:tick,
    kind:z.enum(['cut','fade','carry','focus','push','wipe','reveal','match','continuation']),
    shared:z.array(id),reason:z.string().min(1)}).strict()),
  captions:z.array(z.object({id,start:tick,end:tick,text:z.string().min(1),direction,
    status:z.enum(['proposed','verified']),source:z.string().min(1)}).strict()),
  resources:z.array(resourceSchema),
  sfx:z.array(z.object({resource:id,at:trigger,gain:unit.max(.25),trimStart:tick,duration:tick.positive()}).strict()),
  style:z.object({id,palette:z.object({background:z.string(),surface:z.string(),text:z.string(),muted:z.string(),accent:z.string()}).strict(),
    fonts:z.object({arabic:z.string(),latin:z.string(),code:z.string()}).strict(),
    fontFiles:z.array(z.object({file:z.string(),sha256:hash,family:z.string(),weight:z.number().int().positive()}).strict()),
    radius:finite.nonnegative(),captionSize:finite.positive(),motionEnergy:z.enum(['calm','balanced','energetic'])}).strict(),
  layout:z.object({safeArea:box,captionZone:box,minimumText:finite.positive()}).strict(),
  references:z.array(z.object({resource:id,note:z.string()}).strict()).default([]),
}).strict();
export type Project=z.infer<typeof projectSchema>;
export type VisualObject=z.infer<typeof objectSchema>;
export type Motion=z.infer<typeof motionSchema>;
export type ObjectState=z.infer<typeof stateSchema>;
export type Trigger=z.infer<typeof trigger>;
export type Resource=z.infer<typeof resourceSchema>;

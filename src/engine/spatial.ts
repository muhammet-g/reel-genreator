import type {Project} from './contracts';
export type MeasuredObject={id:string;box:number[];clipped:boolean;minText?:number;owner?:string|null};
export function spatialIssues(p:Project,objects:MeasuredObject[]){
  const issues:{kind:string;objects:string[]}[]=[],[x,y,w,h]=p.layout.safeArea.map((v,i)=>v*(i%2?p.frame.height:p.frame.width));
  for(const o of objects){const [ox,oy,ow,oh]=o.box;
    if(ox<x-2||oy<y-2||ox+ow>x+w+2||oy+oh>y+h+2)issues.push({kind:'safe-area',objects:[o.id]});
    if(o.clipped)issues.push({kind:'clipping',objects:[o.id]});
    if(typeof o.minText==='number'&&Number.isFinite(o.minText)&&o.minText<p.layout.minimumText-.5)issues.push({kind:'readability',objects:[o.id]});
  }
  for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){
    const a=objects[i],b=objects[j],oa=p.objects.find(o=>o.id===a.id)!,ob=p.objects.find(o=>o.id===b.id)!;
    if(oa.allowOverlap.includes(b.id)||ob.allowOverlap.includes(a.id)||a.owner===b.id||b.owner===a.id)continue;
    const dx=Math.min(a.box[0]+a.box[2],b.box[0]+b.box[2])-Math.max(a.box[0],b.box[0]);
    const dy=Math.min(a.box[1]+a.box[3],b.box[1]+b.box[3])-Math.max(a.box[1],b.box[1]);
    if(dx>2&&dy>2)issues.push({kind:'collision',objects:[a.id,b.id]});
  }
  return issues;
}

/** Author-time placement of existing objects. Coordinates remain ordinary project coordinates. */
import type {VisualObject} from './contracts';
export type LayoutBox=[number,number,number,number];
export type LayoutMode='center'|'stack'|'row'|'grid';
export function placeObjects(objects:VisualObject[],options:{mode:LayoutMode;zone:LayoutBox;gap?:number;columns?:number;direction?:'rtl'|'ltr'}):VisualObject[]{
  const {mode,zone}=options,[x,y,w,h]=zone,gap=options.gap??.02;
  if(!objects.length)throw Error('Layout requires objects');
  if([x,y,w,h].some(v=>!Number.isFinite(v))||x<0||y<0||w<=0||h<=0||x+w>1||y+h>1||gap<0)throw Error('Invalid layout zone or gap');
  if(mode==='center'&&objects.length!==1)throw Error('Center accepts one object');
  const columns=mode==='grid'?(options.columns??2):mode==='row'?objects.length:1;
  if(!Number.isInteger(columns)||columns<1)throw Error('Invalid column count');
  const rows=Math.ceil(objects.length/columns);
  const cellW=(w-gap*(columns-1))/columns,cellH=(h-gap*(rows-1))/rows;
  if(cellW<=0||cellH<=0)throw Error('Layout gap consumes zone');
  return objects.map((object,index)=>{
    const column=index%columns,row=Math.floor(index/columns);
    if(object.size[0]>cellW+1e-9||object.size[1]>cellH+1e-9)throw Error(`Object ${object.id} does not fit ${mode} cell`);
    const visualColumn=options.direction==='rtl'?columns-1-column:column;
    const px=x+visualColumn*(cellW+gap)+cellW/2,py=y+row*(cellH+gap)+cellH/2;
    return {...object,initial:{...object.initial,x:px,y:py}};
  });
}

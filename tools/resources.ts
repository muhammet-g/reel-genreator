import {readFileSync} from 'node:fs';
import path from 'node:path';
import {resourceSchema,type Resource} from '../src/engine/contracts';
import {root,hash,stage} from './media';
/** Catalog paths are repository-relative. Project paths are staged publicDir-relative. */
export function stageResource(id:string,projectId:string,sampleRate:number):Resource{
  const catalog=JSON.parse(readFileSync(path.join(root,'resources/catalog.json'),'utf8'));
  const item=catalog.resources.find((r:any)=>r.id===id);if(!item)throw Error(`Unknown resource: ${id}`);
  const {durationSeconds,...data}=item;
  const resource=resourceSchema.parse(data),file=path.resolve(root,'resources',resource.file);
  if(!file.startsWith(path.join(root,'resources')+path.sep)||hash(file)!==resource.sha256)throw Error('Resource path or hash mismatch');
  if(!resource.reviewed)throw Error('Resource requires review');
  return {...resource,...stage(file,projectId),...(durationSeconds?{durationSamples:Math.round(durationSeconds*sampleRate)}:{})};
}

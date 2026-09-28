import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fixture} from '../src/examples/fixture';
import {validateProject} from '../src/engine/validate';
import {inspectAudio,root,stage} from './media';
import {addCodeDragonBrand} from './code-dragon-brand';
async function main(){
  const [id,audio,...options]=process.argv.slice(2);
  if(!id||!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)||!audio||
    options.length>1||options.some(option=>option!=='--code-dragon'))
    throw Error('Usage: npm run new -- ProjectId path/to/finished-audio.wav [--code-dragon]');
  const folder=path.join(root,'projects',id),file=path.join(folder,'project.json');
  if(existsSync(file))throw Error('Project already exists; original files are never overwritten');
  const p=structuredClone(fixture);p.id=id;p.audio=await inspectAudio(path.resolve(audio),id);
  p.events={start:0};p.scenes=[{id:'opening',start:0,end:p.audio.sampleCount,narration:'',purpose:'unplanned',hierarchy:['title'],visualReason:'Replace the placeholder after reading the narration',density:'low',uncertainty:['Narration and phrase timing have not been supplied'],source:'Unplanned finished audio intake'}];
  p.objects=[{...p.objects[2],scene:'opening',label:'مشروع جديد',initial:{...p.objects[2].initial,y:.35}}];
  p.motions=[];p.camera=[];p.transitions=[];p.captions=[];
  for(const [family,pkg,subset] of [['Cairo','cairo','arabic'],['Inter','inter','latin'],['JetBrains Mono','jetbrains-mono','latin']]){
    p.style.fontFiles.push({...stage(path.join(root,`node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-600-normal.woff2`),id),family,weight:600});
  }
  if(options.includes('--code-dragon'))addCodeDragonBrand(p,id);
  validateProject(p);mkdirSync(folder,{recursive:true});writeFileSync(file,JSON.stringify({project:p},null,2),{flag:'wx'});console.log(file);
}
main().catch(e=>{console.error(e);process.exitCode=1;});

import path from 'node:path';
import type {Project} from '../src/engine/contracts';
import {root,stage} from './media';

/** Opt a project into the reusable Code Dragon logo and username treatment. */
export function addCodeDragonBrand(project:Project,folder:string,username='code__dragon_'){
  if(project.branding||project.resources.some(resource=>resource.id==='code-dragon-logo'))
    throw Error('Project already has branding or a Code Dragon logo resource');
  const logo=stage(path.join(root,'assets/brand/code-dragon-logo.png'),folder);
  project.resources.push({id:'code-dragon-logo',...logo,type:'image',
    source:'Creator-supplied Code Dragon logo from assets/brand/code-dragon-logo.png',
    license:'Creator-supplied brand asset',reviewed:true,tags:['brand','logo'],sceneTypes:[],
    energy:'calm',styles:[],loopable:false});
  project.branding={template:'code-dragon',logo:'code-dragon-logo',username};
  return project;
}

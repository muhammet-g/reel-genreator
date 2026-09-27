import {readFileSync,writeFileSync} from 'node:fs';
import {choreograph} from '../src/engine/motion-language';
const [source,recipes,output]=process.argv.slice(2);
if(!source||!recipes||!output)throw Error('Pass source project.json, recipes.json and a NEW output file');
const result=choreograph(JSON.parse(readFileSync(source,'utf8')).project,JSON.parse(readFileSync(recipes,'utf8')));
writeFileSync(output,JSON.stringify({project:result.project},null,2),{flag:'wx'});
writeFileSync(output+'.motion.json',JSON.stringify({phases:result.phases,warnings:result.warnings,activity:result.activity},null,2),{flag:'wx'});
console.log({output,warnings:result.warnings});

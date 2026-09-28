import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {directScenes} from '../src/engine/visual-direction';
const [source,intents,output]=process.argv.slice(2);
if(!source||!intents||!output)throw Error('Pass project.json, visual-intents.json and a NEW report file');
if(existsSync(output)||existsSync(output+'.recipes.json'))throw Error('Direction output exists; choose a new report file');
const decisions=directScenes(JSON.parse(readFileSync(source,'utf8')).project,JSON.parse(readFileSync(intents,'utf8')));
writeFileSync(output,JSON.stringify({decisions,recipes:decisions.map(d=>d.recipe)},null,2),{flag:'wx'});
writeFileSync(output+'.recipes.json',JSON.stringify(decisions.map(d=>d.recipe),null,2),{flag:'wx'});
console.log(`Visual direction written: ${output}`);

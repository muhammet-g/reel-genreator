import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/engine/validate';
import {verifyOutput,prepareAudio} from './media';
async function main(){
  const [props,file]=process.argv.slice(2);if(!props||!file)throw Error('Pass project JSON and MP4');
  const project=validateProject(JSON.parse(readFileSync(props,'utf8')).project);await prepareAudio(project);
  const report=await verifyOutput(project,file);writeFileSync(file+'.verification.json',JSON.stringify(report,null,2));console.log(report);
}
main().catch(e=>{console.error(e);process.exitCode=1;});

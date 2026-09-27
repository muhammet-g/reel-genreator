import {existsSync} from 'node:fs';
import {executable,run} from './media';
import {browserExecutable} from './render';
const browser=browserExecutable();
console.log({node:process.version,browser:browser??'Remotion default browser',browserExists:browser?existsSync(browser):'not checked'});
for(const name of ['ffmpeg','ffprobe'] as const)console.log(run(executable(name),['-version']).split('\n')[0]);
if(browser&&!existsSync(browser))throw Error('Set REMOTION_BROWSER to an installed Chromium browser');

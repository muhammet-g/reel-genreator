import {readFileSync} from 'node:fs';
import {validateProject} from '../src/engine/validate';
import {motionAdvisories} from '../src/engine/planning';
import {frameCount} from '../src/engine/time';
import {verifyAssets} from './media';
const file=process.argv[2];if(!file)throw Error('Pass project.json');
const p=validateProject(JSON.parse(readFileSync(file,'utf8')).project);verifyAssets(p);
console.log(JSON.stringify({id:p.id,seconds:p.audio.sampleCount/p.audio.sampleRate,frames:frameCount(p.audio.sampleCount,p.audio.sampleRate,p.frame.fps),scenes:p.scenes.length,objects:p.objects.length,
  unreviewedPhrases:p.captions.filter(c=>c.status!=='verified').length,advisories:motionAdvisories(p)},null,2));

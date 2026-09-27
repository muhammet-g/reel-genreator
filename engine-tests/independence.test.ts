import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('active TypeScript has no legacy runtime imports, subprocesses, or providers',()=>{
  for(const file of [...files('src'),...files('tools')].filter(f=>/\.[cm]?tsx?$/.test(f))){
    const source=readFileSync(file,'utf8');
    assert.doesNotMatch(source,/(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"]*(?:reelkit|hyperframes|gsap|templates\/)/i,file);
    assert.doesNotMatch(source,/(?:spawn|exec|run)\w*\([^\n]*(?:python|reel\.py|gemini|hyperframes)/i,file);
  }
});

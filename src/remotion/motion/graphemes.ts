const combining=/\p{Mark}|[\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}]/u;
const regional=/[\u{1F1E6}-\u{1F1FF}]/u;
const arabic=/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;

/** Keep combining marks, ZWJ emoji and flags intact even without Intl.Segmenter. */
export function segmentGraphemes(text:string,useIntl=true):string[]{
  if(useIntl&&typeof Intl.Segmenter==='function')
    return [...new Intl.Segmenter('und',{granularity:'grapheme'}).segment(text)].map(part=>part.segment);
  const result:string[]=[];
  for(const point of Array.from(text)){
    const previous=result.at(-1);
    if(previous&&(combining.test(point)||point==='\u200D'||previous.endsWith('\u200D')||
      regional.test(point)&&regional.test(previous)&&Array.from(previous).length%2===1))
      result[result.length-1]+=point;
    else result.push(point);
  }
  return result;
}

/** Arabic uses complete words so contextual joining survives per-unit movement. */
export function motionTextUnits(text:string):string[]{
  return arabic.test(text)?text.split(/(\s+)/u).filter(Boolean):segmentGraphemes(text);
}

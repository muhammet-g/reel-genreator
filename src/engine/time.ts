export type Fps = {num:number; den:number};
const integer = (n:number, positive=false) => {
  if (!Number.isSafeInteger(n) || n < (positive ? 1 : 0)) throw Error('Expected safe nonnegative integer');
  return BigInt(n);
};
export function sampleToFrame(sample:number, rate:number, fps:Fps, rounding:'floor'|'ceil'='ceil'):number {
  const n=integer(sample)*integer(fps.num,true), d=integer(rate,true)*integer(fps.den,true);
  const result=Number(rounding==='ceil' ? (n+d-1n)/d : n/d);
  if (!Number.isSafeInteger(result)) throw Error('Frame count overflow');
  return result;
}
export const frameCount=(samples:number,rate:number,fps:Fps)=>sampleToFrame(samples,rate,fps,'ceil');
// Sampling may be fractional; integer arithmetic is used for boundary conversion.
export const frameToSample=(frame:number,rate:number,fps:Fps)=>frame*rate*fps.den/fps.num;
export const secondsToSamples=(seconds:number,rate:number)=>Math.round(seconds*rate);

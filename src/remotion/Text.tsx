import React from 'react';
// Tokenize complete expressions before ordinary Latin runs. React escapes all text.
const islands= /([A-Za-z_$][\w$]*(?:(?:\[[^\]\n]+\])|(?:\.[A-Za-z_$][\w$]*(?:\([^()\n]*\))?)|(?:\([^()\n]*\)))+|[-−]\d+(?:\.\d+)?|[A-Za-z][A-Za-z0-9 .+/#-]*[A-Za-z0-9]|[A-Za-z])/g;
export const MixedText:React.FC<{text:string;direction?:'rtl'|'ltr'|'auto'}>=({text,direction='auto'})=>{
  const parts=text.split(islands);
  return <span dir={direction}>{parts.map((part,i)=>i%2?<bdi key={i} dir="ltr" style={{unicodeBidi:'isolate'}}>{part}</bdi>:<React.Fragment key={i}>{part}</React.Fragment>)}</span>;
};

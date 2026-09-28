import React from 'react';
import {AbsoluteFill,Sequence} from 'remotion';
import {MotionElement,TextEffect} from '../remotion/motion';

const center:React.CSSProperties={display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:42};
const panel:React.CSSProperties={padding:'48px 54px',background:'#17263e',border:'1px solid #4a6384',
  borderRadius:28,color:'#e7f0ff',fontFamily:'system-ui',fontSize:42,boxShadow:'0 24px 60px #03071288'};

/** Development-only composition: no project media, camera or scene transitions. */
export const MotionPrimitivesShowcase:React.FC=()=> <AbsoluteFill style={{background:'#0b1424',color:'#edf4ff'}}>
  <Sequence from={0} durationInFrames={90}><AbsoluteFill style={center}>
    <MotionElement motion={{enter:{type:'blur-pop',durationFrames:28},
      exit:{type:'slide',startFrame:66,durationFrames:20,direction:'up'}}}>
      <div style={panel}>Arbitrary React content <span style={{color:'#ffb800'}}>◆</span></div>
    </MotionElement>
    <div style={{fontFamily:'system-ui',fontSize:28,color:'#93a8c4'}}>blur-pop entrance · slide exit</div>
  </AbsoluteFill></Sequence>
  <Sequence from={90} durationInFrames={90}><AbsoluteFill style={center}>
    <TextEffect text="السَلام عليكم 👩‍💻" mode="stagger" direction="rtl" staggerFrames={5}
      motion={{enter:{type:'fade',durationFrames:10}}}
      style={{fontFamily:'Cairo, system-ui',fontSize:62,fontWeight:700}}/>
    <TextEffect text="const result = [10, 20, 30];" mode="typewriter" direction="ltr" startFrame={18}
      durationFrames={55} showCursor style={{fontFamily:'monospace',fontSize:32}}/>
  </AbsoluteFill></Sequence>
  <Sequence from={180} durationInFrames={90}><AbsoluteFill style={center}>
    <MotionElement motion={{enter:{type:'scan',durationFrames:26,direction:'down'},
      emphasis:{type:'punch',startFrame:35,durationFrames:18},
      ambient:{type:'float',startFrame:52,periodFrames:75}}}>
      <div style={{...panel,width:480,textAlign:'center'}}>
        <svg aria-label="diagram" width="180" height="90" viewBox="0 0 180 90">
          <rect x="4" y="20" width="65" height="48" rx="12" fill="#ffb800"/>
          <path d="M70 44h40m-11-10 11 10-11 10" stroke="#fff" strokeWidth="5" fill="none"/>
          <circle cx="145" cy="44" r="25" fill="#22d3ee"/>
        </svg>
        <div style={{fontSize:30}}>SVG, UI, images or cards</div>
      </div>
    </MotionElement>
  </AbsoluteFill></Sequence>
</AbsoluteFill>;

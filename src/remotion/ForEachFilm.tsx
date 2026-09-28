import React,{createContext,useContext,useEffect,useState} from 'react';
import {AbsoluteFill,Audio,staticFile,useCurrentFrame,useVideoConfig,delayRender,continueRender,cancelRender} from 'remotion';
import type {Project} from '../engine/contracts';
import {frameToSample} from '../engine/time';
import {cameraAt,objectStateAt,resolveTime} from '../engine/state';
import {transitionState} from '../engine/transitions';
import {localEffectAt,type LocalEffect} from '../engine/motion-families';
import {ease as motionEase} from '../engine/easing';
import {MixedText} from './Text';
import {CodeCard,CodeTypewriter,MotionElement,TextEffect} from './motion';
import {CodeDragonBrand} from './CodeDragonBrand';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>motionEase(n,'settled');
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const tint=(from:string,to:string,amount:number)=>{
  const channel=(hex:string,offset:number)=>parseInt(hex.slice(offset,offset+2),16);
  return `rgb(${[1,3,5].map(offset=>Math.round(mix(channel(from,offset),channel(to,offset),amount))).join(',')})`;
};
const attention=(t:number,start:number,end=Infinity)=>ease((t-start)/.3)*(1-ease((t-end)/.3));
const centered:React.CSSProperties={display:'flex',alignItems:'center',justifyContent:'center'};
const codeFont='"JetBrains Mono",monospace';
const arabicFont='"Cairo",sans-serif';
const latinFont='"Inter",sans-serif';
const gold='#FFB800',white='#E2E8F0',muted='#94A3B8';
export const DebugMode=createContext(false);
const PolishedContext=createContext(false);
export const DebugOnly:React.FC<{children:React.ReactNode}>=({children})=>useContext(DebugMode)
  ?<div data-debug-overlay style={{display:'contents'}}>{children}</div>:null;

const Fonts:React.FC<{project:Project}>=({project})=>{
  const [handle]=useState(()=>delayRender('ForEach local fonts'));
  const [ready,setReady]=useState(false);
  useEffect(()=>{Promise.all(project.style.fontFiles.map(async f=>{
    const face=new FontFace(f.family,`url("${staticFile(f.file)}")`,{weight:String(f.weight)});
    await face.load();document.fonts.add(face);
  })).then(()=>{setReady(true);continueRender(handle);}).catch(cancelRender);},[handle,project.style.fontFiles]);
  return <span data-fonts-ready={ready} style={{display:'none'}}/>;
};

const Pill:React.FC<{children:React.ReactNode;active?:number|boolean;quiet?:boolean;size?:number}>=({children,active=0,quiet=false,size=36})=>{const focus=typeof active==='boolean'?Number(active):clamp(active),polished=useContext(PolishedContext);return <span style={{
  display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'14px 22px',borderRadius:16,
  border:`1px solid ${tint(polished?'#44444b':'#314158','#D9A02A',focus)}`,background:tint(polished?'#1b1c23':'#172236','#3B352A',focus),
  boxShadow:`0 0 ${36*focus}px rgba(255,184,0,${.2*focus}), inset 0 0 ${20*focus}px rgba(255,184,0,${.07*focus})`,
  color:tint(quiet?muted:white,gold,focus),fontFamily:codeFont,fontSize:size,fontWeight:600,
  transform:`translateY(${-7*focus}px) scale(${1+.05*focus})`,
}}>{children}</span>;};

const CodeBox:React.FC<{children:React.ReactNode;title?:string;glow?:number;style?:React.CSSProperties;effect?:LocalEffect;borderAt?:number}>=({children,title='JavaScript',glow=0,style,effect,borderAt})=>{
  const polished=useContext(PolishedContext),frame=useCurrentFrame(),{fps}=useVideoConfig();
  const borderMotion=borderAt===undefined?0:ease((frame/fps-borderAt)/1.8);
  if(polished){
    const {width=880,margin,paddingTop,paddingBottom,...outer}=style??{};
    return <CodeCard title={title} width={Number(width)} style={{margin,...outer}}
      typingStartFrame={borderAt===undefined?0:Math.round(borderAt*fps)} typingDurationFrames={borderAt===undefined?1:Math.round(1.8*fps)} glow={glow}
      cardStyle={{paddingTop:paddingTop??30,paddingBottom:paddingBottom??38,clipPath:effect?.clipPath,filter:effect?.filter}}>
      <div dir="ltr" style={{fontFamily:codeFont,color:white,textAlign:'left',fontWeight:600}}>{children}</div>
      {effect?.edgeOpacity&&<div aria-hidden style={{position:'absolute',top:0,bottom:0,left:`${effect.edge}%`,width:2,
        background:gold,opacity:effect.edgeOpacity,boxShadow:'0 0 18px #FFB800'}}/>}
    </CodeCard>;
  }
  return <div style={{
  position:'relative',overflow:'hidden',borderRadius:28,border:polished?'2px solid transparent':`2px solid ${glow>.05?`rgba(255,184,0,${.22+.55*glow})`:'#32415a'}`,
  background:polished?`linear-gradient(155deg,#17191f,#101218 70%,#12131a) padding-box, conic-gradient(from ${-110+260*borderMotion}deg,#3c3e45,#ffb80099,#4a3b20,#3c3e45) border-box`:
    'linear-gradient(155deg,#172238,#101b2c 65%,#111b2d)',
  boxShadow:polished?`0 28px 82px #000a,0 0 ${38*glow}px #FFB80033`:`0 28px 90px #03071299,0 0 ${48*glow}px #FFB80044`,
  padding:'32px 42px 42px',...style,clipPath:effect?.clipPath,filter:effect?.filter,
}}>
  <div style={{display:'flex',alignItems:'center',gap:11,height:28,marginBottom:28}}>
    {['#fb7185','#fbbf24','#34d399'].map((c,i)=><span key={i} style={{width:13,height:13,borderRadius:'50%',background:c,opacity:.72}}/>)}
    <span style={{marginLeft:'auto',fontFamily:polished?latinFont:codeFont,color:muted,fontSize:22,fontWeight:600}}>{title}</span>
  </div>
  <div dir="ltr" style={{fontFamily:codeFont,color:white,textAlign:'left',fontWeight:600}}>{children}</div>
  {glow>.05&&<div style={{position:'absolute',inset:0,pointerEvents:'none',background:`linear-gradient(105deg,transparent 25%,rgba(255,220,130,${.13*glow}) 49%,transparent 66%)`,transform:`translateX(${mix(-150,150,glow)}%)`}}/>}
  {effect?.edgeOpacity&&<div aria-hidden style={{position:'absolute',top:0,bottom:0,left:`${effect.edge}%`,width:2,
    background:gold,opacity:effect.edgeOpacity,boxShadow:'0 0 18px #FFB800'}}/>}
</div>;};

const Line:React.FC<{children:React.ReactNode;size?:number;indent?:number}>=({children,size=36,indent=0})=><div style={{whiteSpace:'nowrap',fontSize:size,lineHeight:1.7,paddingLeft:indent}}>{children}</div>;
const Token:React.FC<{children:React.ReactNode;focus?:number|boolean;dim?:boolean}>=({children,focus=0,dim=false})=>{const strength=typeof focus==='boolean'?Number(focus):clamp(focus),polished=useContext(PolishedContext);return <span style={{
  display:'inline-block',borderRadius:8,padding:'0 4px',margin:'0 -4px',
  color:tint(dim?'#718199':white,gold,strength),background:polished?'transparent':`rgba(255,184,0,${.13*strength})`,
  boxShadow:polished?undefined:`0 0 ${24*strength}px rgba(255,184,0,${.21*strength})`,
  textShadow:polished&&strength>.01?`0 0 ${5+18*strength}px rgba(255,184,0,${.9*strength})`:undefined,
  transform:`translateY(${-5*strength}px) scale(${1+.08*strength})`,
}}>{children}</span>;};
const GlowWord:React.FC<{children:string;active:number}>=({children,active})=><span style={{
  display:'inline-block',fontFamily:codeFont,fontSize:29,fontWeight:600,padding:'14px 7px',
  color:tint(muted,gold,clamp(active)),textShadow:active>.01?`0 0 ${6+23*active}px rgba(255,184,0,${.9*active})`:undefined,
  transform:`translateY(${-4*active}px)`,
}}>{children}</span>;

const Eyebrow:React.FC<{number:string;label:string}>=({number,label})=><DebugOnly><div style={{fontFamily:latinFont,letterSpacing:4,textTransform:'uppercase',fontSize:24,color:gold,marginBottom:36}}>{number} <span style={{color:'#546781'}}> / </span> {label}</div></DebugOnly>;
const Arabic:React.FC<{children:string;size?:number;color?:string;style?:React.CSSProperties}>=({children,size=44,color=white,style})=><div dir="rtl" style={{fontFamily:arabicFont,fontSize:size,color,lineHeight:1.45,fontWeight:600,textAlign:'center',...style}}><MixedText text={children} direction="rtl"/></div>;

const ArrayLine:React.FC<{active?:number;strengths?:number[];large?:boolean;beam?:number}>=({active=-1,strengths,large=false,beam=0})=>{const polished=useContext(PolishedContext);return <div dir="ltr" style={{...centered,position:'relative',gap:10,fontFamily:codeFont,fontSize:large?82:57,letterSpacing:-3,whiteSpace:'nowrap'}}>
  <span style={{color:gold,opacity:.8,transform:`translateX(${-4*beam}px)`}}>[</span>
  {[10,20,30].map((n,i)=><React.Fragment key={n}>
    {i>0&&<span style={{color:tint('#68809d','#B98A31',strengths?Math.max(strengths[i-1],strengths[i]):Number(active>=i-1)),
      fontSize:large?58:43,transform:`translateY(${3*(strengths?.[i]??Number(active===i))}px)`}}>,</span>}
    <span style={{position:'relative',padding:large?'13px 18px':'12px 16px',borderRadius:20,
      color:tint(white,gold,strengths?.[i]??Number(active===i)),background:tint(polished?'#1b1d25':'#18263b','#3C382D',strengths?.[i]??Number(active===i)),
      border:`2px solid ${tint(polished?'#3a3d48':'#31425c','#D9A02A',strengths?.[i]??Number(active===i))}`,
      boxShadow:`0 0 ${54*(strengths?.[i]??Number(active===i))}px rgba(255,184,0,${.33*(strengths?.[i]??Number(active===i))})`,
      transform:`translateY(${-15*(strengths?.[i]??Number(active===i))}px) scale(${1+.09*(strengths?.[i]??Number(active===i))})`}}>{n}</span>
  </React.Fragment>)}
  <span style={{color:gold,opacity:.8,transform:`translateX(${4*beam}px)`}}>]</span>
</div>;};

const StandardCode:React.FC<{focus?:'index'|'condition'|'increment'|'access';focusLevel?:Partial<Record<'index'|'condition'|'increment'|'access',number>>;mutedCode?:boolean;effect?:LocalEffect}>=({focus,focusLevel,mutedCode=false,effect})=><CodeBox title="traditional for" style={{width:880}} effect={effect}>
  <Line size={34}><Token>for (</Token><Token focus={focusLevel?.index??(focus==='index')} dim={mutedCode}>let i = 0</Token><Token>; </Token><Token focus={focusLevel?.condition??(focus==='condition')} dim={mutedCode}>i &lt; prices.length</Token><Token>; </Token><Token focus={focusLevel?.increment??(focus==='increment')} dim={mutedCode}>i++</Token><Token>) {'{'}</Token></Line>
  <Line size={34} indent={32}><Token>console.log(</Token><Token focus={focusLevel?.access??(focus==='access')}>prices[i]</Token><Token>);</Token></Line>
  <Line size={34}>{'}'}</Line>
</CodeBox>;

const ForEachCode:React.FC<{full?:boolean;focus?:'price'|'index'|'array';focusLevel?:Partial<Record<'price'|'index'|'array',number>>;glow?:number;size?:number;effect?:LocalEffect}>=({full=false,focus,focusLevel,glow=0,size=34,effect})=><CodeBox title={full?'callback · 3 parameters':'forEach · callback'} glow={glow} style={{width:880}} effect={effect}>
  <Line size={size}><span style={{color:'#8bd1ff'}}>prices</span><span style={{color:gold}}>.forEach</span>(<span style={{color:'#c4a6ff'}}>function</span> (</Line>
  <Line size={size} indent={58}><Token focus={focusLevel?.price??(focus==='price')}>price</Token>{full&&<React.Fragment>, <Token focus={focusLevel?.index??(focus==='index')}>index</Token>, <Token focus={focusLevel?.array??(focus==='array')}>array</Token></React.Fragment>}{') {'}</Line>
  <Line size={size} indent={58}>console.log({full?'price, index, array':'price'});</Line>
  <Line size={size}> {'}'});</Line>
</CodeBox>;

const Scene:React.FC<{id:string;t:number;local:number;p:Project;effect?:LocalEffect}>=({id,t,local,p,effect})=>{
  const polished=useContext(PolishedContext),{fps}=useVideoConfig();
  const at=(seconds:number)=>Math.round(seconds*fps);
  const event=(name:string)=>p.events[name]/p.audio.sampleRate;
  const inAt=(seconds:number)=>ease((t-seconds)/.36);
  if(id==='hero'){
    const appear=ease((t-event('heroWord')+.25)/.72),sweep=clamp((t-event('heroWord'))/1.05);
    return <div style={{...centered,flexDirection:'column',height:'100%'}}>
      <div style={{position:'absolute',width:750,height:750,borderRadius:'50%',background:'radial-gradient(circle,#FFB8001b,transparent 70%)',opacity:appear,filter:'blur(15px)'}}/>
      <Eyebrow number="01" label="JAVASCRIPT · ARRAYS"/>
      <MotionElement shadowMode="text" motion={polished?{ambient:{type:'neon',startFrame:at(1.8),endFrame:at(3.6),periodFrames:36,intensity:'medium',color:'#FFB800bb'}}:{}}>
      <div style={{fontFamily:polished?latinFont:codeFont,fontSize:135,fontWeight:800,letterSpacing:-9,position:'relative',
        color:white,opacity:appear,transform:`translateY(${mix(70,0,appear)}px) scale(${mix(.76,1,appear)})`,
        textShadow:polished?undefined:`0 0 ${40*appear}px #FFB80055`}}>
        for<span style={{color:gold}}>Each</span>
        <span style={{position:'absolute',inset:0,color:'transparent',background:'linear-gradient(100deg,transparent 30%,#fff6cf 49%,transparent 61%)',
          backgroundSize:'300% 100%',backgroundPosition:`${mix(0,100,sweep)}% 0`,backgroundClip:'text',textShadow:'none',opacity:appear}} aria-hidden>forEach</span>
      </div></MotionElement>
      <div style={{width:520,height:2,background:`linear-gradient(90deg,transparent,${gold},transparent)`,opacity:appear,marginTop:20}}/>
      {polished?<TextEffect text="الأداة التي تمر على كل عنصر" direction="rtl"
        motion={{enter:{type:'slide',startFrame:at(2.55),durationFrames:17,direction:'up',intensity:'low'}}}
        style={{fontFamily:arabicFont,fontSize:38,color:muted,marginTop:32,fontWeight:600}}/>:
        <Arabic size={38} color={muted} style={{marginTop:32,opacity:ease((t-2.55)/.5)}}>الأداة التي تمر على كل عنصر</Arabic>}
    </div>;
  }
  if(id==='array')return <div style={{paddingTop:110}}>
    <Eyebrow number="02" label="THE ARRAY"/>
    <Arabic size={54} style={{textAlign:'right',marginBottom:65}}>تخيّل عندك مصفوفة أسعار</Arabic>
    <CodeBox title="data" style={{width:880,margin:'0 auto',paddingBottom:62}} borderAt={polished?3.6:undefined}>
      {polished?<CodeTypewriter lines={[[{text:'const',color:'#c4a6ff'},{text:' prices = ',color:white},{text:'[10, 20, 30]',color:gold},{text:';',color:white}]]}
        startFrame={at(3.6)} durationFrames={at(1.1)} fontSize={39}/>:<Line size={39}><span style={{color:'#c4a6ff'}}>const</span> prices = <span style={{color:gold}}>[10, 20, 30]</span>;</Line>}
    </CodeBox>
    <div style={{marginTop:88,opacity:inAt(4.5),transform:`translateY(${mix(30,0,inAt(4.5))}px)`}}><ArrayLine strengths={[0,1,2].map(i=>[0,1,2].reduce((total,cycle)=>total+attention(t,6.2+(i+cycle*3)/1.4,6.2+(i+cycle*3+1)/1.4),0))}/></div>
    <Arabic size={38} color={muted} style={{marginTop:80}}>نفس العملية، على كل عنصر</Arabic>
  </div>;
  if(id==='for-loop'){
    const focus=t<event('indexFirst')?undefined:t<event('conditionFirst')?'index':t<event('incrementFirst')?'condition':t<event('accessFirst')?'increment':t<15.55?'access':undefined;
    const levels={index:attention(t,event('indexFirst'),event('conditionFirst')),
      condition:attention(t,event('conditionFirst'),event('incrementFirst')),
      increment:attention(t,event('incrementFirst'),event('accessFirst')),
      access:attention(t,event('accessFirst'),15.55)};
    return <div style={{paddingTop:55}}><Eyebrow number="03" label="MANUAL ITERATION"/>
      <Arabic size={51} style={{marginBottom:42}}>في الـ for العادية... أنت تدير كل شيء</Arabic>
      <StandardCode focus={focus} focusLevel={levels} effect={effect}/>
      <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:56}}>
        {(['index','condition','increment'] as const).map((x,i)=><div key={x} style={{opacity:ease((t-[10.5,11.2,12.02][i])/.35)}}>{polished?<GlowWord active={levels[x]}>{x}</GlowWord>:<Pill active={levels[x]} size={26}>{x}</Pill>}</div>)}
      </div>
      <Arabic size={35} color={muted} style={{marginTop:42}}>تفاصيل كثيرة لمجرد المرور على العناصر</Arabic>
    </div>;
  }
  if(id==='foreach')return <div style={{paddingTop:55}}>
    <Eyebrow number="04" label="THE HANDOFF"/>
    <div style={{textAlign:'center',marginBottom:34}}>{polished?<TextEffect text="forEach" mode="stagger" startFrame={at(19.6)} durationFrames={13} staggerFrames={3} direction="ltr"
      motion={{ambient:{type:'neon',startFrame:at(20),endFrame:at(23.1),periodFrames:50,intensity:'low',color:'#FFB80099'}}}
      style={{fontFamily:latinFont,fontSize:86,color:gold,fontWeight:800}}/>:
      <span style={{fontFamily:codeFont,fontSize:86,color:gold,fontWeight:800,transform:`translateY(${mix(35,0,ease(local/.55))}px)`,display:'inline-block'}}>forEach</span>}</div>
    <div style={{opacity:inAt(20.16)}}><CodeBox title="input" style={{width:880,marginBottom:34,paddingTop:20,paddingBottom:20}}>
      {polished?<CodeTypewriter lines={[[{text:'const',color:'#c4a6ff'},{text:' prices = ',color:white},{text:'[10, 20, 30]',color:gold},{text:';',color:white}]]}
        startFrame={at(20.16)} durationFrames={at(1.4)} fontSize={37}/>:<Line size={37}><span style={{color:'#c4a6ff'}}>const</span> prices = <span style={{color:gold}}>[10, 20, 30]</span>;</Line>}
    </CodeBox></div>
    {polished?<CodeCard title="forEach · callback" width={880} fontSize={34} typingStartFrame={at(23.2)} typingDurationFrames={at(2.6)}
      motion={{enter:{type:'blur-pop',startFrame:at(23.05),durationFrames:18,intensity:'low'},exit:{type:'slide',startFrame:at(31.6),durationFrames:14,direction:'up',intensity:'low'}}}
      lines={[
        [{text:'prices',color:'#8bd1ff'},{text:'.forEach',color:gold},{text:'(function (',color:white}],
        [{text:'  price',color:white},{text:') {',color:white}],
        [{text:'  console.log(price);',color:white}],
        [{text:'});',color:white}],
      ]}/>:
      <div style={{opacity:inAt(23.2),transform:`translateY(${mix(35,0,inAt(23.2))}px)`}}><ForEachCode size={34}/></div>}
    <div style={{display:'flex',justifyContent:'center',gap:26,marginTop:46,opacity:inAt(26)}}><Pill active={attention(t,29.16,30.1)} size={29}>10</Pill><Pill active={attention(t,30.1,31.1)} size={29}>20</Pill><Pill active={attention(t,31.1)} size={29}>30</Pill></div>
  </div>;
  if(id==='less-work'){
    const gone=t<36.02?0:t<37.5?1:2;
    return <div style={{paddingTop:45}}><Eyebrow number="05" label="LESS TO MANAGE"/>
      <Arabic size={49} style={{marginBottom:42}}>العمل المطلوب فقط، بلا إدارة يدوية</Arabic>
      <ForEachCode size={34}/>
      <div style={{display:'flex',gap:15,justifyContent:'center',marginTop:70}}>{['index','i++','stop condition'].map((x,i)=><div key={x} style={{opacity:ease((t-[33.8,36.02,37.5][i])/.32),transform:`translateY(${mix(35,0,ease((t-[33.8,36.02,37.5][i])/.32))}px)`}}><span style={{display:'inline-block',fontFamily:codeFont,fontSize:28,color:gone>=i?muted:white,textDecoration:t>[34.9,36.8,38.3][i]?'line-through':undefined,padding:'18px 20px',border:'1px solid #4b5d75',borderRadius:14}}>{x}</span></div>)}</div>
    </div>;
  }
  if(id==='traversal'){
    const active=Math.min(2,Math.max(0,Math.floor(local/.84)));
    const strengths=[0,1,2].map(i=>attention(local,i*.84,i===2?Infinity:(i+1)*.84));
    return <div style={{...centered,flexDirection:'column',height:'100%'}}><Eyebrow number="06" label="ONE BY ONE"/>
      <Arabic size={52} style={{marginBottom:100}}>تمر على كل عنصر، تلقائيًا</Arabic>
      <ArrayLine active={active} strengths={strengths} large beam={Math.sin(local*4)*.5+.5}/>
      <div style={{width:680,height:3,marginTop:75,background:'linear-gradient(90deg,#FFB80022,#FFB800,#FFB80022)',transform:`scaleX(${.25+.75*clamp(local/2.6)})`}}/>
      <div style={{display:'flex',width:690,justifyContent:'space-between',fontFamily:codeFont,color:muted,fontSize:24,marginTop:21}}><span>01</span><span>02</span><span>03</span></div>
    </div>;
  }
  if(id==='callback')return <div style={{...centered,flexDirection:'column',height:'100%'}}>
    <Eyebrow number="07" label="A DEEPER IDEA"/>
    <Arabic size={51} style={{marginBottom:76}}>وهون تبدأ الفكرة الأهم</Arabic>
    {polished?<CodeCard title="callback · the idea" width={830} fontSize={31}
      typingStartFrame={at(44.4)} typingDurationFrames={at(1.8)}
      motion={{enter:{type:'mask',startFrame:at(42.7),durationFrames:20,direction:'down',intensity:'low'},
        exit:{type:'slide',startFrame:at(47.5),durationFrames:14,direction:'up',intensity:'low'}}}
      lines={[
        [{text:'prices',color:'#8bd1ff'},{text:'.forEach',color:gold},{text:'(',color:white}],
        [{text:'  function ',color:'#c4a6ff'},{text:'callback',color:gold},{text:'(price) {',color:white}],
        [{text:'    console.log(price);',color:white}],
        [{text:'  }',color:white},{text:');',color:white}],
      ]}/>:
    <div style={{position:'relative',width:830,height:430,border:'2px solid #344660',borderRadius:32,background:'#142239',padding:36}}>
      <div style={{fontFamily:codeFont,color:gold,fontSize:47}}>forEach<span style={{color:white}}>(</span></div>
      <div style={{position:'absolute',left:100,top:145,width:625,height:195,border:`2px solid ${gold}99`,borderRadius:25,background:'#1b2b42',boxShadow:'0 0 56px #FFB80022',
        opacity:inAt(44.76),transform:`translateY(${mix(30,0,inAt(44.76))}px)`}}>
        <div style={{fontFamily:codeFont,color:white,fontSize:43,padding:'48px 36px'}}>function <span style={{color:gold}}>callback</span>()</div>
      </div>
      <div style={{position:'absolute',right:38,bottom:26,fontFamily:codeFont,fontSize:44}}>)</div>
    </div>}
    <Arabic size={39} color={muted} style={{marginTop:66}}>الدالة التي تُنفَّذ لكل عنصر</Arabic>
  </div>;
  if(id==='parameters')return <div style={{...centered,flexDirection:'column',height:'100%'}}>
    <Eyebrow number="08" label="CALLBACK RECEIVES"/>
    <Arabic size={47} style={{marginBottom:115}}>أكثر من قيمة داخل الـ callback</Arabic>
    <div style={{display:'flex',gap:19,justifyContent:'center',alignItems:'center',width:'100%'}}>
      {(['element','index','array'] as const).map((x,i)=>{const at=[48.02,49.56,50.8][i],visibility=ease((t-at)/.4),active=attention(t,at,[49.56,50.8,Infinity][i]);return <React.Fragment key={x}>{i>0&&<span style={{width:30,height:2,background:'#52627b',opacity:visibility}}/>}<div style={{opacity:visibility,transform:`translateY(${mix(32,0,visibility)}px)`}}><Pill active={active} size={41}>{x}</Pill></div></React.Fragment>;})}
    </div>
    <div style={{display:'flex',gap:92,marginTop:63,fontFamily:arabicFont,fontSize:28,color:muted,opacity:inAt(50.8)}}><span>العنصر</span><span>المؤشر</span><span>المصفوفة</span></div>
  </div>;
  if(id==='code-hero'){
    const focus=t<event('parameter1')?undefined:t<event('parameter2')?'price':t<event('parameter3')?'index':'array';
    const levels={price:attention(t,event('parameter1'),event('parameter2')),
      index:attention(t,event('parameter2'),event('parameter3')),
      array:attention(t,event('parameter3'))};
    return <div style={{paddingTop:65}}><Eyebrow number="09" label="THE COMPLETE CALLBACK"/>
      <Arabic size={47} style={{marginBottom:80}}>ثلاث قيم متاحة في كل خطوة</Arabic>
      <ForEachCode full focus={focus} focusLevel={levels} size={33} effect={effect}/>
      <div style={{display:'flex',justifyContent:'center',gap:24,marginTop:72}}>{(['price','index','array'] as const).map((x,i)=><div key={x} style={{opacity:ease((t-[56.72,58.18,59.92][i])/.3)}}><Pill active={levels[x]} size={29}>{x}</Pill></div>)}</div>
    </div>;
  }
  if(id==='comfortable')return <div style={{paddingTop:65}}><Eyebrow number="10" label="ONE COHERENT TOOL"/>
    <Arabic size={49} style={{marginBottom:73}}>لهيك forEach مريحة</Arabic>
    <ForEachCode full glow={ease(local/.8)} size={33} effect={effect}/>
    <div style={{...centered,marginTop:86,fontFamily:latinFont,fontSize:38,color:gold}}>{polished?<TextEffect text="clear action · automatic iteration" mode="stagger" startFrame={at(62.5)} durationFrames={13} staggerFrames={2}
      motion={{ambient:{type:'neon',startFrame:at(63),endFrame:at(64.2),periodFrames:34,intensity:'low',color:'#FFB80099'}}}/>:<>clear action · automatic iteration</>}</div>
  </div>;
  if(id==='automatic')return <div style={{paddingTop:80}}><Eyebrow number="11" label="YOU DEFINE · IT ITERATES"/>
    <Arabic size={46} style={{marginBottom:77}}>أنت تحدد ماذا يحدث، وهي تتكفّل بالمرور</Arabic>
    <ForEachCode full size={31} glow={.45}/>
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:26,marginTop:74,fontFamily:codeFont,fontSize:30}}>
      <Pill active={1-ease((t-66.86)/.3)} size={29}>action</Pill><span style={{color:gold,fontSize:48}}>→</span><Pill active={ease((t-66.86)/.3)} size={29}>10 → 20 → 30</Pill>
    </div>
  </div>;
  if(id==='caution')return <div style={{...centered,flexDirection:'column',height:'100%'}}>
    <Eyebrow number="12" label="WHEN TO USE IT"/>
    <Arabic size={48} color={muted} style={{marginBottom:40}}>بس انتبه</Arabic>
    <div style={{fontFamily:codeFont,fontSize:104,color:gold,fontWeight:800}}>forEach</div>
    <div style={{height:3,width:340,background:'linear-gradient(90deg,transparent,#FFB80088,transparent)',margin:'45px 0'}}/>
    <Arabic size={49}>ممتازة لعمل حدث معين على كل عنصر</Arabic>
    <div style={{fontFamily:latinFont,color:muted,fontSize:28,marginTop:64}}>ACTION ON EACH ELEMENT</div>
  </div>;
  const shift=ease((t-75.75)/1.55),map=ease((t-event('mapWord')+.14)/.68);
  return <div style={{...centered,flexDirection:'column',height:'100%'}}>
    <Eyebrow number="13" label="A DIFFERENT RESULT"/>
    <Arabic size={46} color={muted} style={{marginBottom:50}}>وإذا أردت مصفوفة جديدة من النتائج...</Arabic>
    <div style={{position:'relative',width:880,height:280,...centered}}>
      <div style={{position:'absolute',fontFamily:codeFont,fontSize:113,fontWeight:800,color:white,letterSpacing:-7,
        opacity:1-shift,transform:`translateY(${-45*shift}px) scale(${1-.18*shift})`,filter:`blur(${7*shift}px)`}}>for<span style={{color:gold}}>Each</span></div>
      {Array.from({length:18},(_,i)=>{const a=i*2.399,r=80+(i%4)*43;return <span key={i} style={{position:'absolute',left:440+Math.cos(a)*r*shift,top:140+Math.sin(a)*r*shift,
        width:5+(i%3)*3,height:5+(i%3)*3,background:i%4?gold:'#fff6d9',borderRadius:i%2?2:'50%',
        opacity:shift*(1-map),transform:`rotate(${i*24*shift}deg) scale(${1-map*.5})`,boxShadow:'0 0 17px #FFB800aa'}}/>})}
      <div style={{position:'absolute',fontFamily:polished?latinFont:codeFont,fontSize:174,fontWeight:800,color:gold,letterSpacing:polished?-6:-9,
        opacity:map,transform:`translateY(${mix(75,0,map)}px) scale(${mix(.7,1,map)})`,textShadow:`0 0 ${mix(0,65,map)}px #FFB80077`}}>map</div>
    </div>
    <Arabic size={38} color={muted} style={{marginTop:43,opacity:map}}>للنتائج التي تصنع مصفوفة جديدة</Arabic>
  </div>;
};

export const ForEachFilm:React.FC<{project:Project;debugOverlays?:boolean}>=({project:p,debugOverlays=false})=>{
  const frame=useCurrentFrame(),sample=frameToSample(frame,p.audio.sampleRate,p.frame.fps),t=sample/p.audio.sampleRate;
  const polished=Boolean(p.branding);
  const scene=p.scenes.find(s=>sample>=s.start&&sample<s.end)??p.scenes[p.scenes.length-1];
  const local=t-scene.start/p.audio.sampleRate;
  const caption=p.captions.find(c=>sample>=c.start&&sample<c.end);
  const planned=p.motions.length>0||p.camera.length>0||p.transitions.length>0;
  // One small, non-looping camera move per meaningful reading interval.
  const amplitude:Record<string,number>={'hero':.045,'array':.012,'for-loop':.024,'foreach':.032,
    'less-work':.012,'traversal':.035,'callback':.024,'parameters':.025,'code-hero':.026,
    'comfortable':.012,'automatic':.02,'caution':0,'map-finale':.045};
  const cameraProgress=ease(local/Math.max(1.2,(scene.end-scene.start)/p.audio.sampleRate*.8));
  const cameraScale=1+(amplitude[scene.id]??0)*cameraProgress;
  const cameraX=(scene.id==='automatic'?-10:scene.id==='foreach'?8:0)*cameraProgress;
  const camera=planned?cameraAt(p,sample):undefined;
  const layers=p.scenes.filter(candidate=>candidate.id===scene.id||p.transitions.some(cue=>
    cue.from===candidate.id&&cue.to===scene.id&&sample>=resolveTime(cue.at,p.events)&&
    sample<resolveTime(cue.at,p.events)+cue.duration));
  return <AbsoluteFill data-render-frame={frame} style={{overflow:'hidden',color:white,background:polished?p.style.palette.background:'#0B1221'}}><DebugMode.Provider value={debugOverlays}><PolishedContext.Provider value={polished}>
    <Fonts project={p}/>
    <Audio src={staticFile(p.audio.derivative?.src??p.audio.src)}/>
    {!polished&&<div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 73% 27%,#263958 0%,#0B1221 52%,#080e1b 100%)'}}/>}
    <div style={{position:'absolute',inset:0,opacity:polished?1:.12,
      backgroundImage:polished?'linear-gradient(rgba(255,184,0,.20) 2px,transparent 2px),linear-gradient(90deg,rgba(255,184,0,.20) 2px,transparent 2px)':'linear-gradient(#9bb1cf 1px,transparent 1px),linear-gradient(90deg,#9bb1cf 1px,transparent 1px)',
      backgroundSize:'90px 90px',maskImage:polished?undefined:'linear-gradient(180deg,transparent,#000 20%,#000 65%,transparent)'}}/>
    {!polished&&<div style={{position:'absolute',left:-180,top:230,width:410,height:410,borderRadius:'50%',background:'#FFB80018',filter:'blur(130px)'}}/>}
    {!polished&&<div style={{position:'absolute',right:-170,bottom:340,width:450,height:500,borderRadius:'50%',background:'#3175cb20',filter:'blur(130px)'}}/>}
    <CodeDragonBrand project={p}/>
    <DebugOnly><div style={{position:'absolute',left:84,top:72,fontFamily:codeFont,fontSize:22,color:'#8395ad',letterSpacing:3}}>CODE DRAGON <span style={{color:gold}}> / </span> JAVASCRIPT</div></DebugOnly>
    <DebugOnly><div style={{position:'absolute',right:84,top:72,fontFamily:codeFont,fontSize:22,color:'#8395ad'}}>{String(p.scenes.indexOf(scene)+1).padStart(2,'0')} / 13</div></DebugOnly>
    {layers.map(layer=>{
      const object=p.objects.find(o=>o.scene===layer.id&&o.id===`${layer.id.replaceAll('-','_')}_visual`);
      if(!object)throw Error(`Missing ForEach visual object for ${layer.id}`);
      const state=planned?objectStateAt(object,p.motions,p.events,sample):object.initial;
      const bridge=planned?transitionState(p,object,sample):{opacity:1,x:0,y:0,scale:1,clip:0};
      const localEffect=planned?localEffectAt(p,object,sample):{};
      const visibleFraction=object.kind==='code'?1:localEffect.visibleFraction??1;
      const layerLocal=t-layer.start/p.audio.sampleRate;
      const dx=(state.x-object.initial.x+bridge.x)*p.frame.width;
      const dy=(state.y-object.initial.y+bridge.y)*p.frame.height;
      return <div key={layer.id} data-object={object.id} data-role="primary" data-owner=""
        data-visible={state.opacity*bridge.opacity*visibleFraction>.01}
        style={{position:'absolute',left:84,top:140,width:912,height:1250,
          opacity:state.opacity*bridge.opacity,
          transform:`translate(${dx}px,${dy}px) scale(${state.scale/object.initial.scale*bridge.scale}) rotate(${state.rotation-object.initial.rotation}deg)`,
          clipPath:bridge.clip?`inset(0 ${bridge.clip*100}% 0 0)`:object.kind==='code'?undefined:localEffect.clipPath,
          filter:object.kind==='code'?undefined:localEffect.filter}}>
        <div style={{width:'100%',height:'100%',transformOrigin:'50% 43%',
          transform:planned?`translate(${(.5-camera!.x)*p.frame.width}px,${(.5-camera!.y)*p.frame.height}px) scale(${camera!.zoom})`:
            `translateX(${cameraX}px) scale(${cameraScale})`}}>
          <Scene id={layer.id} t={t} local={layerLocal} p={p} effect={object.kind==='code'?localEffect:undefined}/>
        </div>
      </div>;
    })}
    {caption&&<div data-caption style={{position:'absolute',left:97,top:1517,width:886,height:270,...centered,textAlign:'center'}}>
      <div data-text dir="rtl" style={{fontFamily:arabicFont,fontSize:43,lineHeight:1.58,fontWeight:600,padding:'15px 26px',maxWidth:'100%',color:white,
        borderRadius:18,background:polished?'rgba(10,10,15,.91)':'rgba(9,17,31,.89)',boxShadow:'0 16px 38px #0006'}}><MixedText text={caption.text} direction="rtl"/></div>
    </div>}
    <DebugOnly><div style={{position:'absolute',left:84,right:84,bottom:71,height:4,background:'#263951',borderRadius:3}}><div style={{height:'100%',width:`${100*clamp(sample/p.audio.sampleCount)}%`,background:gold,borderRadius:3,boxShadow:'0 0 16px #FFB80077'}}/></div></DebugOnly>
  </PolishedContext.Provider></DebugMode.Provider></AbsoluteFill>;
};

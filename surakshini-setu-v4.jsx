import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─── FIREBASE SETUP ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const provider = new GoogleAuthProvider();

// ─── THEMES ───────────────────────────────────────────────────────────────────
const T = {
  dark:{ bg:"#04080F",bg2:"#080E1A",card:"rgba(13,20,36,0.95)",cardS:"#0D1424",
    border:"rgba(255,255,255,0.08)",text:"#F0F4FF",text2:"#9CA3AF",muted:"#4B5563",
    navBg:"rgba(4,8,15,0.98)",logBg:"rgba(0,0,0,0.4)",inp:"rgba(255,255,255,0.05)",
    mapBg:"#081220",body:"#020408",isDark:true },
  light:{ bg:"#F4F7FF",bg2:"#EBF0FA",card:"rgba(255,255,255,0.95)",cardS:"#FFFFFF",
    border:"rgba(0,0,0,0.08)",text:"#0F172A",text2:"#475569",muted:"#94A3B8",
    navBg:"rgba(244,247,255,0.98)",logBg:"rgba(0,0,0,0.05)",inp:"rgba(0,0,0,0.04)",
    mapBg:"#D8E8F5",body:"#E0E8F5",isDark:false }
};

// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
const beep=(f=880,d=200,v=0.3)=>{try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=f;g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d/1000);o.start();o.stop(c.currentTime+d/1000)}catch(e){}};
const alertSnd=()=>[880,660,880,1100,880].forEach((f,i)=>setTimeout(()=>beep(f,280,0.55),i*170));
const fogSnd=()=>{[200,180,220,160,240].forEach((f,i)=>setTimeout(()=>beep(f,200,0.4),i*80));setTimeout(()=>beep(300,400,0.3),500);};
const chimeSnd=()=>{beep(523,100,0.25);setTimeout(()=>beep(659,100,0.25),120);setTimeout(()=>beep(784,200,0.3),240);};
const smsSnd=()=>{beep(1047,80,0.2);setTimeout(()=>beep(1175,120,0.25),100);};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const CONTACTS=[
  {id:1,name:"Ammi",phone:"+91-9876543210",rel:"Mother",init:"AM",color:"#E63946"},
  {id:2,name:"Priya Sharma",phone:"+91-9123456780",rel:"Best Friend",init:"PS",color:"#3A86FF"},
  {id:3,name:"Uncle Tariq",phone:"+91-9988776655",rel:"Uncle",init:"UT",color:"#FFD60A"},
];
const WOMEN_HELPLINE={name:"Women Helpline",phone:"181",init:"WH",color:"#8B5CF6",rel:"Helpline"};

const speak=(msg)=>{try{if(!window||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang="en-IN";u.rate=1;window.speechSynthesis.speak(u);}catch(e){console.warn("Speech failed",e);}};

const POLICE_STATIONS=[
  {id:"p1",name:"Hitech City PS",x:82,y:60,dist:"0.6 km",phone:"040-23456789",officer:"SI Ramesh Kumar"},
  {id:"p2",name:"Banjara Hills PS",x:290,y:140,dist:"1.4 km",phone:"040-23456123",officer:"SI Priya Devi"},
  {id:"p3",name:"Madhapur PS",x:175,y:180,dist:"2.1 km",phone:"040-23456456",officer:"SI Arun Singh"},
  {id:"p4",name:"Jubilee Hills PS",x:310,y:62,dist:"2.8 km",phone:"040-23456999",officer:"SI Kiran Babu"},
];
const VOICE_KW=["help me","bachao","sos","danger","save me","madad karo","attack","help","release fog","fog release","deploy fog"];
const FOG_CMDS=["release fog","fog release","deploy fog"];
const SOS_CMDS=["help me","bachao","sos","danger","save me","madad karo","attack","help"];
const STRUGGLE_SEQ=[4.8,4.9,5.4,6.1,8.3,11.7,14.2,12.9,9.4,6.1,4.9];
const INIT_RECS=[
  {id:1,name:"REC_20241203_2214.enc",dur:"04:32",size:"2.1 MB",date:"Dec 3, 2024",bytes:2100000,color:"#E63946"},
  {id:2,name:"REC_20241201_1845.enc",dur:"01:15",size:"0.6 MB",date:"Dec 1, 2024",bytes:600000,color:"#3A86FF"},
  {id:3,name:"REC_20241128_0930.enc",dur:"08:11",size:"3.8 MB",date:"Nov 28, 2024",bytes:3800000,color:"#06D6A0"},
];

// ─── SMS SIMULATOR ────────────────────────────────────────────────────────────
const buildSMS=(profile,trigger,coords)=>{
  const loc = coords?`${coords.latitude.toFixed(6)}°N, ${coords.longitude.toFixed(6)}°E`:"17.4486°N, 78.3908°E";
  const region = coords?`(${loc})` : "(Hitech City, Hyderabad)";
  return `🚨 EMERGENCY ALERT\nFrom: ${profile.name}\nTrigger: ${trigger}\nLive Location: ${loc}\n${region}\nTime: ${new Date().toLocaleTimeString()}\nSent to: ${WOMEN_HELPLINE.phone}, closest police units\nDO NOT IGNORE — Surakshini Setu`;
};

// ─── CSS BUILDER ──────────────────────────────────────────────────────────────
const buildCSS=(t)=>`
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${t.body};font-family:'Exo 2',sans-serif;overflow:hidden;transition:background 0.4s}
.app{width:390px;height:844px;margin:0 auto;position:relative;overflow:hidden;background:${t.bg};
  display:flex;flex-direction:column;border-radius:44px;
  box-shadow:0 0 80px rgba(230,57,70,0.14),0 0 0 1px ${t.border};transition:all 0.4s}
.page{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:84px}
.page::-webkit-scrollbar{display:none}
.bnav{position:absolute;bottom:0;left:0;right:0;height:76px;background:${t.navBg};
  backdrop-filter:blur(24px);border-top:1px solid ${t.border};display:flex;z-index:100;border-radius:0 0 44px 44px}
.ni{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;transition:all 0.25s;position:relative}
.ni-ico{font-size:18px;transition:transform 0.25s,filter 0.25s}
.ni-lbl{font-size:8px;font-weight:700;letter-spacing:0.8px;color:${t.muted};transition:color 0.25s;font-family:'Rajdhani',sans-serif}
.ni.on .ni-lbl{color:#E63946}.ni.on .ni-ico{transform:translateY(-3px);filter:drop-shadow(0 0 8px #E63946)}
.ni-bar{position:absolute;bottom:0;width:22px;height:2px;border-radius:2px;background:#E63946;opacity:0;transition:opacity 0.25s}
.ni.on .ni-bar{opacity:1}
.card{background:${t.card};border:1px solid ${t.border};border-radius:16px;padding:16px;backdrop-filter:blur(12px);transition:background 0.3s,border 0.3s}
.card.ac{border-color:rgba(230,57,70,0.5);box-shadow:0 0 24px rgba(230,57,70,0.12)}
.card.gc{border-color:rgba(6,214,160,0.35)}
.card.pc{border-color:rgba(139,92,246,0.35)}
.card.bc{border-color:rgba(58,134,255,0.35)}
.tag{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;letter-spacing:0.5px;font-family:'Share Tech Mono',monospace}
.tg{background:rgba(6,214,160,0.12);color:#06D6A0;border:1px solid rgba(6,214,160,0.3)}
.ty{background:rgba(255,214,10,0.12);color:#FFD60A;border:1px solid rgba(255,214,10,0.3)}
.tr{background:rgba(230,57,70,0.12);color:#E63946;border:1px solid rgba(230,57,70,0.3)}
.tb{background:rgba(58,134,255,0.12);color:#3A86FF;border:1px solid rgba(58,134,255,0.3)}
.tp{background:rgba(139,92,246,0.12);color:#8B5CF6;border:1px solid rgba(139,92,246,0.3)}
/* SOS */
.sos-area{height:290px;display:flex;align-items:center;justify-content:center;position:relative}
.rng{position:absolute;border-radius:50%;border:2px solid #E63946;pointer-events:none}
.rng1{width:220px;height:220px;animation:rng1 2s ease-out infinite}
.rng2{width:264px;height:264px;animation:rng2 2s ease-out infinite 0.5s}
.rng3{width:306px;height:306px;animation:rng2 2s ease-out infinite 1s;border-width:1px;border-color:rgba(230,57,70,0.25)}
.sos-btn{width:186px;height:186px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#FF5C67,#E63946 55%,#9B1D20);border:none;cursor:pointer;
  position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
  box-shadow:0 0 60px rgba(230,57,70,0.55),0 0 120px rgba(230,57,70,0.18),inset 0 2px 0 rgba(255,255,255,0.15);
  transition:transform 0.1s;user-select:none;-webkit-user-select:none}
.sos-btn:active{transform:scale(0.95)}
/* VOICE rings */
.vring{position:absolute;border-radius:50%;pointer-events:none;border:1.5px solid #8B5CF6}
.vr1{width:198px;height:198px;animation:vrng 1.1s ease-out infinite}
.vr2{width:238px;height:238px;animation:vrng 1.1s ease-out infinite 0.28s}
.vr3{width:276px;height:276px;animation:vrng 1.1s ease-out infinite 0.56s}
/* FOG */
.fog-overlay{position:absolute;inset:0;border-radius:44px;pointer-events:none;z-index:180;overflow:hidden}
.fog-particle{position:absolute;border-radius:50%;animation:fogrise linear forwards}
/* WAVEFORM */
.wf{display:flex;align-items:center;gap:2px;height:44px}
/* SMS panel */
.sms-item{background:${t.isDark?"rgba(6,214,160,0.06)":"rgba(6,214,160,0.06)"};border:1px solid rgba(6,214,160,0.25);border-radius:12px;padding:12px 14px;margin-bottom:8px;animation:smsin 0.4s ease}
/* LOG */
.log-box{background:${t.logBg};border-radius:10px;padding:10px 12px;max-height:140px;overflow-y:auto;font-family:'Share Tech Mono',monospace;font-size:10.5px}
.log-box::-webkit-scrollbar{width:3px}
.log-box::-webkit-scrollbar-thumb{background:#E63946;border-radius:2px}
/* OVERLAYS */
.sos-ov{position:absolute;inset:0;background:rgba(170,15,25,0.97);z-index:200;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  animation:fadein 0.3s;border-radius:44px;padding:20px}
.safe-btn{padding:13px 32px;border-radius:30px;background:rgba(255,255,255,0.15);
  border:1.5px solid rgba(255,255,255,0.4);color:#fff;font-family:'Rajdhani',sans-serif;
  font-size:15px;font-weight:700;cursor:pointer;letter-spacing:1px}
.toast{position:absolute;top:62px;left:50%;transform:translateX(-50%);
  background:${t.cardS};border:1px solid ${t.border};border-radius:12px;
  padding:9px 16px;font-size:12px;font-weight:600;white-space:nowrap;z-index:400;
  animation:slideup 0.3s ease;box-shadow:0 8px 32px rgba(0,0,0,0.45);max-width:340px;text-align:center;color:${t.text}}
.demo-tag{position:absolute;top:18px;right:18px;background:rgba(255,214,10,0.12);
  border:1px solid rgba(255,214,10,0.35);color:#FFD60A;font-size:9px;font-weight:700;
  padding:3px 10px;border-radius:20px;letter-spacing:1px;z-index:50;font-family:'Share Tech Mono',monospace}
/* VOICE ALWAYS-ON banner */
.va-banner{display:flex;align-items:center;gap:8px;padding:8px 16px;
  background:rgba(139,92,246,0.08);border-bottom:1px solid rgba(139,92,246,0.2)}
/* INPUT */
.inp{padding:10px 14px;background:${t.inp};border:1px solid ${t.border};border-radius:10px;
  color:${t.text};font-size:13px;outline:none;font-family:'Exo 2',sans-serif;width:100%;transition:border 0.2s}
.inp:focus{border-color:rgba(58,134,255,0.45)}
/* rec items */
.rec-it{background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:12px 14px;
  display:flex;align-items:center;gap:12px;transition:all 0.2s;animation:recin 0.3s ease}
/* police card */
.ps-card{background:${t.card};border:1px solid rgba(58,134,255,0.2);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;margin-bottom:8px;transition:all 0.2s}
.ps-card.nearest{border-color:rgba(6,214,160,0.5);box-shadow:0 0 16px rgba(6,214,160,0.1)}
/* theme toggle */
.th-btn{width:40px;height:22px;border-radius:11px;border:1.5px solid ${t.border};
  background:${t.isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"};
  position:relative;cursor:pointer;transition:all 0.3s;flex-shrink:0}
.th-thumb{position:absolute;top:2px;width:14px;height:14px;border-radius:50%;
  transition:all 0.3s;left:${t.isDark?"2px":"21px"};
  background:${t.isDark?"#4B5563":"#FFD60A"};box-shadow:0 1px 4px rgba(0,0,0,0.3)}
@keyframes rng1{0%{transform:scale(1);opacity:.72}100%{transform:scale(1.46);opacity:0}}
@keyframes rng2{0%{transform:scale(1);opacity:.44}100%{transform:scale(1.56);opacity:0}}
@keyframes vrng{0%{transform:scale(1);opacity:.85}100%{transform:scale(1.42);opacity:0}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.18}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
@keyframes slideup{from{transform:translateX(-50%) translateY(10px);opacity:0}to{transform:translateX(-50%);opacity:1}}
@keyframes hb{0%,100%{transform:scale(1)}15%{transform:scale(1.22)}30%{transform:scale(1)}}
@keyframes fogrise{0%{transform:translate(-50%,-50%) scale(0.4);opacity:0.8}70%{opacity:0.5}100%{transform:translate(-50%,-50%) scale(3.5);opacity:0}}
@keyframes smsin{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes recin{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulseglow{0%,100%{box-shadow:0 0 0 0 rgba(6,214,160,0.6)}50%{box-shadow:0 0 0 8px rgba(6,214,160,0)}}
@keyframes thread{0%{stroke-dashoffset:300}100%{stroke-dashoffset:0}}
@keyframes voiceln{0%,100%{transform:scaleY(.12)}50%{transform:scaleY(1)}}
`;

// ─── MINI CHART ───────────────────────────────────────────────────────────────
function MiniChart({data,color,h=44}){
  const W=220,mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*W},${h-((v-mn)/rng)*(h-5)-2}`).join(" ");
  const gid=`gc${color.replace(/\W/g,"")}${h}`;
  return(<svg width="100%" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
    <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity="0.38"/><stop offset="95%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <polygon points={`0,${h} ${pts} ${W},${h}`} fill={`url(#${gid})`}/>
    <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"/>
  </svg>);
}

// ─── WAVEFORM ─────────────────────────────────────────────────────────────────
function Waveform({active,level=50,color="#E63946",bars=30}){
  const [hs,setHs]=useState(Array(bars).fill(3));
  useEffect(()=>{
    if(!active){setHs(Array(bars).fill(3));return;}
    const t=setInterval(()=>setHs(Array.from({length:bars},(_,i)=>3+Math.abs(Math.sin(Date.now()*0.003+i*0.55))*(level||30)*0.38+Math.random()*5)),65);
    return()=>clearInterval(t);
  },[active,level,bars]);
  return(<div className="wf">{hs.map((h,i)=><div key={i} style={{width:3.5,borderRadius:2,background:color,height:h,transition:"height 0.06s",alignSelf:"center"}}/>)}</div>);
}

// ─── THREAD VIZ ───────────────────────────────────────────────────────────────
function ThreadViz({r}){
  const [tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),90);return()=>clearInterval(t);},[]);
  const amp=Math.min(20,r*1.5),c=r>10?"#E63946":r>6?"#FFD60A":"#06D6A0";
  const d=Array.from({length:60},(_,i)=>{const x=(i/59)*338,y=30+Math.sin(i*0.42+tick*0.12)*amp+Math.cos(i*0.75)*amp*0.3;return`${i===0?"M":"L"}${x},${y}`;}).join(" ");
  return(<svg width="100%" height="58" viewBox="0 0 338 58" style={{display:"block"}}>
    <defs><linearGradient id="tg3" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={c} stopOpacity="0.1"/><stop offset="50%" stopColor={c} stopOpacity="1"/><stop offset="100%" stopColor={c} stopOpacity="0.1"/></linearGradient></defs>
    {r>6&&<path d={d} fill="none" stroke={`${c}20`} strokeWidth="8" strokeLinecap="round"/>}
    <path d={d} fill="none" stroke="url(#tg3)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={r<6?"300":"none"} style={r<6?{animation:"thread 1.5s linear infinite"}:{}}/>
    {[0.2,0.5,0.8].map((x,i)=><circle key={i} cx={x*338} cy={29} r={r>10?5.5:r>6?3.5:2.5} fill={c} opacity={0.85}>{r>10&&<animate attributeName="r" values="3;7;3" dur="0.45s" repeatCount="indefinite"/>}</circle>)}
  </svg>);
}

// ─── FOG OVERLAY ──────────────────────────────────────────────────────────────
function FogOverlay({active,onDone}){
  const [particles]=useState(()=>Array.from({length:22},(_,i)=>({
    id:i, x:20+Math.random()*60, y:30+Math.random()*60,
    size:60+Math.random()*120, dur:1.2+Math.random()*1.4,
    delay:Math.random()*0.6, opacity:0.35+Math.random()*0.35,
    color:i%3===0?"rgba(180,220,255":"rgba(220,235,255"
  })));
  useEffect(()=>{if(active){const t=setTimeout(onDone,3200);return()=>clearTimeout(t);}});
  if(!active) return null;
  return(<div className="fog-overlay" style={{background:"rgba(0,0,0,0.3)"}}>
    {particles.map(p=>(
      <div key={p.id} className="fog-particle" style={{
        left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size,
        background:`radial-gradient(circle,${p.color},${p.opacity}),transparent 70%)`,
        animationDuration:`${p.dur}s`,animationDelay:`${p.delay}s`,
        boxShadow:`0 0 ${p.size/2}px rgba(180,220,255,0.4)`,
        backdropFilter:"blur(3px)",
      }}/>
    ))}
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
      <div style={{fontSize:52,filter:"drop-shadow(0 0 20px rgba(180,220,255,0.8))"}}>🌫️</div>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:800,fontSize:24,color:"#fff",letterSpacing:2,textShadow:"0 0 20px rgba(255,255,255,0.8)"}}>FOG DEPLOYED</div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.8)"}}>10 second escape window active</div>
      <div style={{display:"flex",gap:8,marginTop:4}}>
        {["ATTACKER DISORIENTED","ESCAPE NOW","HELP COMING"].map(l=>(
          <div key={l} style={{background:"rgba(255,255,255,0.15)",borderRadius:6,padding:"3px 8px",fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"#fff"}}>{l}</div>
        ))}
      </div>
    </div>
  </div>);
}

// ─── SMS DISPATCH MODAL ───────────────────────────────────────────────────────
function SMSModal({messages,onClose,t}){
  return(<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",zIndex:250,display:"flex",alignItems:"flex-end",borderRadius:44}}>
    <div style={{width:"100%",background:t.cardS,borderRadius:"24px 24px 44px 44px",padding:"20px 20px 36px",maxHeight:"80%",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:t.text}}>📤 Messages Sent</div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.muted}}>{messages.length} recipients notified</div>
        </div>
        <button onClick={onClose} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${t.border}`,background:"transparent",color:t.text2,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13}}>CLOSE</button>
      </div>
      {messages.map((m,i)=>(
        <div key={i} className="sms-item" style={{background:m.type==="police"?"rgba(58,134,255,0.08)":"rgba(6,214,160,0.06)",borderColor:m.type==="police"?"rgba(58,134,255,0.3)":"rgba(6,214,160,0.3)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>{m.type==="police"?"🚔":"👤"}</span>
              <div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:t.text}}>{m.to}</div>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted}}>{m.phone}</div>
              </div>
            </div>
            <span className={m.type==="police"?"tag tb":"tag tg"}>{m.type==="police"?"POLICE":"CONTACT"}</span>
          </div>
          <div style={{background:t.isDark?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.04)",borderRadius:8,padding:"8px 10px",fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.text2,lineHeight:1.7,whiteSpace:"pre-line"}}>{m.body}</div>
          <div style={{marginTop:6,fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"#06D6A0"}}>✓ DELIVERED — {new Date().toLocaleTimeString()}</div>
        </div>
      ))}
    </div>
  </div>);
}

// ─── ALWAYS-ON VOICE HOOK ─────────────────────────────────────────────────────
function useAlwaysOnVoice({onSOS, onFog}){
  const [tx,setTx]=useState("");
  const [hit,setHit]=useState(null);
  const [vol,setVol]=useState(0);
  const [status,setStatus]=useState("STARTING");
  const rRef=useRef(null),vRef=useRef(null),sRef=useRef(null),cdRef=useRef(null);

  const startVol=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      sRef.current=s;
      const ctx=new AudioContext(),src=ctx.createMediaStreamSource(s),an=ctx.createAnalyser();
      an.fftSize=512;src.connect(an);
      const d=new Uint8Array(an.frequencyBinCount);
      vRef.current=setInterval(()=>{an.getByteFrequencyData(d);setVol(Math.round(d.reduce((a,b)=>a+b)/d.length*0.75));},80);
      setStatus("ACTIVE");
    }catch{
      // fallback simulation
      vRef.current=setInterval(()=>setVol(Math.round(15+Math.random()*20)),150);
      setStatus("SIMULATED");
    }
  };

  const startRec=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setStatus("SIMULATED");return;}
    try{
      const r=new SR();
      rRef.current=r;
      r.continuous=true;r.interimResults=true;r.lang="en-IN";r.maxAlternatives=3;
      r.onstart=()=>setStatus("ACTIVE");
      r.onend=()=>{clearTimeout(cdRef.current);cdRef.current=setTimeout(()=>{try{r.start();}catch{}},300);};
      r.onerror=(e)=>{if(e.error==="not-allowed")setStatus("DENIED");};
      r.onresult=(e)=>{
        const txt=Array.from(e.results).flatMap(r=>Array.from(r)).map(a=>a.transcript).join(" ").toLowerCase();
        setTx(txt.slice(-100));
        const fogCmd=FOG_CMDS.find(k=>txt.includes(k));
        const sosCmd=SOS_CMDS.find(k=>txt.includes(k));
        if(fogCmd){setHit(fogCmd);chimeSnd();onFog(fogCmd);}
        else if(sosCmd){setHit(sosCmd);chimeSnd();onSOS(sosCmd);}
      };
      r.start();
    }catch(e){setStatus("SIMULATED");}
  },[onSOS,onFog]);

  useEffect(()=>{
    startVol();
    startRec();
    return()=>{
      clearInterval(vRef.current);clearTimeout(cdRef.current);
      if(rRef.current){try{rRef.current.stop();}catch{}}
      if(sRef.current)sRef.current.getTracks().forEach(t=>t.stop());
    };
  },[]);

  return{tx,hit,vol,status};
}

// ─── STRUGGLE HOOK ────────────────────────────────────────────────────────────
function useStruggle(onDetect){
  const [r,setR]=useState(4.8);
  const [hist,setHist]=useState(Array.from({length:40},()=>4.7+Math.random()*0.5));
  const [status,setStatus]=useState("RELAXED");
  const [running,setRunning]=useState(false);
  useEffect(()=>{
    if(running)return;
    const t=setInterval(()=>{const v=parseFloat((4.7+Math.random()*0.6).toFixed(2));setR(v);setHist(h=>[...h.slice(-39),v]);setStatus("RELAXED");},1200);
    return()=>clearInterval(t);
  },[running]);
  const simulate=()=>{
    if(running)return;setRunning(true);let i=0;
    const t=setInterval(()=>{
      const v=parseFloat((STRUGGLE_SEQ[i]+(Math.random()*0.25)).toFixed(2));
      setR(v);setHist(h=>[...h.slice(-39),v]);
      const s=v>10?"STRUGGLE":v>6?"TENSION":"RELAXED";
      setStatus(s);if(s==="STRUGGLE")onDetect(v);
      i++;if(i>=STRUGGLE_SEQ.length){clearInterval(t);setRunning(false);setStatus("RELAXED");}
    },580);
  };
  const spike=v=>{setR(v);setHist(h=>[...h.slice(-39),v]);setStatus(v>10?"STRUGGLE":v>6?"TENSION":"RELAXED");};
  return{r,hist,status,running,simulate,spike};
}

// ═══════════════════════════ HOME SCREEN ═════════════════════════════════════
function HomeScreen({sos,hr,voice,attack,audio,t,onManualSOS,onPolice,onSafeRoute,onShadow,onFog}){
  const bc=hr>125?"#E63946":hr>105?"#FFD60A":"#06D6A0";
  return(<div className="page">
    {/* Always-On Voice Banner */}
    <div className="va-banner">
      <div style={{width:7,height:7,borderRadius:"50%",background:"#8B5CF6",boxShadow:"0 0 8px #8B5CF6",animation:"blink 1.2s infinite"}}/>
      <div style={{flex:1}}>
        <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:"#8B5CF6",fontWeight:700}}>🎙 VOICE GUARD ALWAYS ON</span>
        {voice.tx&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(139,92,246,0.7)",marginLeft:8}}>› {voice.tx.slice(-40)}</span>}
      </div>
      <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"#8B5CF6"}}>{voice.vol}dB</span>
      <div style={{display:"flex",gap:2,alignItems:"center",height:16,marginLeft:4}}>
        {Array.from({length:6}).map((_,i)=><div key={i} style={{width:2.5,borderRadius:1,background:"#8B5CF6",height:3+Math.abs(Math.sin(Date.now()*0.004+i))*10,animation:`voiceln ${0.25+i*0.07}s ease infinite`,animationDelay:`${i*0.04}s`}}/>)}
      </div>
    </div>

    {/* Header */}
    <div style={{padding:"14px 18px 0",background:"linear-gradient(180deg,rgba(230,57,70,0.07),transparent)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted,letterSpacing:1.5}}>THE DIGITAL BODYGUARD</div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:t.text}}>Surakshini Setu</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:sos||attack?"#E63946":"#06D6A0",boxShadow:`0 0 8px ${sos||attack?"#E63946":"#06D6A0"}`,animation:"blink 1.4s infinite"}}/>
          <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:sos||attack?"#E63946":"#06D6A0"}}>{sos||attack?"ALERT":"SAFE"}</span>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:10,marginBottom:4}}>
        {[{l:"HR",v:`${hr}`,c:bc},{l:"MIC",v:voice.status==="ACTIVE"?"LIVE":voice.status==="SIMULATED"?"SIM":"ERR",c:"#8B5CF6"},{l:"HW",v:"SYNC",c:"#06D6A0"}].map(s=>(
          <div key={s.l} style={{flex:1,background:t.card,border:`1px solid ${t.border}`,borderRadius:10,padding:"7px 10px",textAlign:"center"}}>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8.5,color:t.muted}}>{s.l}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>

    {/* SOS */}
    <div className="sos-area">
      <div className="vring vr1"/><div className="vring vr2"/><div className="vring vr3"/>
      <div className="rng rng1"/><div className="rng rng2"/><div className="rng rng3"/>
      <button className="sos-btn" onClick={onManualSOS}>
        <span style={{fontSize:32,animation:attack?"hb 0.5s infinite":"hb 1.2s infinite"}}>🛡️</span>
        <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,letterSpacing:2,color:"#fff"}}>TAP SOS</span>
        <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.55)"}}>OR SAY "HELP ME"</span>
      </button>
    </div>

    {/* Voice keywords */}
    <div style={{padding:"0 16px 10px"}}>
      <div style={{background:"rgba(139,92,246,0.06)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:12,padding:"10px 14px"}}>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:"#8B5CF6",marginBottom:6,letterSpacing:1}}>🎙 VOICE COMMANDS — ALWAYS LISTENING</div>
        <div style={{marginBottom:6}}>
          {SOS_CMDS.map(k=><span key={k} style={{display:"inline-block",background:voice.hit===k?"rgba(230,57,70,0.2)":"rgba(139,92,246,0.1)",border:`1px solid ${voice.hit===k?"#E63946":"rgba(139,92,246,0.3)"}`,color:voice.hit===k?"#E63946":"#8B5CF6",fontSize:9.5,padding:"2px 8px",borderRadius:20,fontFamily:"'Share Tech Mono',monospace",margin:"2px"}}>{k}</span>)}
        </div>
        <div style={{borderTop:`1px solid rgba(139,92,246,0.15)`,paddingTop:6}}>
          {FOG_CMDS.map(k=><span key={k} style={{display:"inline-block",background:voice.hit===k?"rgba(6,214,160,0.2)":"rgba(6,214,160,0.08)",border:`1px solid ${voice.hit===k?"#06D6A0":"rgba(6,214,160,0.3)"}`,color:voice.hit===k?"#06D6A0":"rgba(6,214,160,0.8)",fontSize:9.5,padding:"2px 8px",borderRadius:20,fontFamily:"'Share Tech Mono',monospace",margin:"2px"}}>{k}</span>)}
          <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted,marginLeft:4}}>→ deploys fog</span>
        </div>
        {voice.tx&&<div style={{marginTop:8,background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"5px 10px",fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:"rgba(139,92,246,0.8)"}}>
          <span style={{color:t.muted}}>hearing: </span>{voice.tx.slice(-60)}
        </div>}
      </div>
    </div>

    {/* Quick actions */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 16px 16px"}}>
      {[{ico:"🚔",t:"Police",s:"View nearby stations",c:"#3A86FF",onClick:onPolice},{ico:"🗺️",t:"Safe Route",s:"Start journey",c:"#06D6A0",onClick:onSafeRoute},
        {ico:"📸",t:"Shadow",s:audio?"● Recording":"Tap to arm",c:audio?"#E63946":t.muted,onClick:onShadow},{ico:"🌫️",t:"Fog",s:'Say "release fog" or tap',c:"#9CA3AF",onClick:onFog}].map(a=>(
        <button key={a.t} onClick={a.onClick} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:14,textAlign:"left",cursor:"pointer"}}>
          <span style={{fontSize:20}}>{a.ico}</span>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:600,fontSize:14,color:t.text,marginTop:5}}>{a.t}</div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:a.c}}>{a.s}</div>
        </button>
      ))}
    </div>
  </div>);
}

// ═══════════════════════════ MAP SCREEN ══════════════════════════════════════
function MapScreen({t,location,destination}){
  const [journey,setJourney]=useState(false);
  const [dev,setDev]=useState(false);
  const [dest,setDest]=useState(destination||"");
  const [ci,setCi]=useState(900);
  const [selPS,setSelPS]=useState(null);
  const [layer,setLayer]=useState({safe:true,unsafe:true,police:true,hosp:true});
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  useEffect(()=>{if(destination){setDest(destination);setJourney(true);} },[destination]);
  useEffect(()=>{if(!journey)return;const ti=setInterval(()=>setCi(c=>c>0?c-1:900),1000);return()=>clearInterval(ti);},[journey]);

  const safeZones=[{x:105,y:76,l:"Inorbit Mall",c:"#06D6A0",type:"safe"},{x:240,y:108,l:"Hitech Metro",c:"#3A86FF",type:"safe"},{x:175,y:214,l:"Charminar",c:"#FFD60A",type:"safe"},{x:295,y:185,l:"Apollo Hosp",c:"#fff",type:"hosp"}];
  const roads=[[18,48,348,48],[18,128,348,128],[18,208,348,208],[64,8,64,232],[178,8,178,232],[294,8,294,232],[112,48,112,208],[246,48,246,208]];
  const buildings=[[26,58,36,22],[72,133,40,24],[114,133,34,20],[184,133,38,22],[250,53,42,28],[302,53,38,20],[70,213,44,12],[188,213,42,14]];

  return(<div className="page">
    <div style={{padding:"18px 16px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted,letterSpacing:1.5}}>REAL-TIME ROUTING</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:21,color:t.text}}>Safe Route Map</div>
      </div>
      <span className="tag tb">{location?`You: ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`:"Hyderabad 📍"}</span>
    </div>

    {/* MAP */}
    <div className="map-bg" style={{height:232,background:t.mapBg}}>
      <svg width="100%" height="232" viewBox="0 0 365 232" style={{display:"block"}}>
        {Array.from({length:13}).map((_,i)=>[
          <line key={`h${i}`} x1={0} y1={i*19} x2={365} y2={i*19} stroke={t.isDark?"rgba(58,134,255,0.04)":"rgba(0,0,80,0.04)"} strokeWidth={0.8}/>,
          <line key={`v${i}`} x1={i*29} y1={0} x2={i*29} y2={232} stroke={t.isDark?"rgba(58,134,255,0.04)":"rgba(0,0,80,0.04)"} strokeWidth={0.8}/>
        ])}
        {buildings.map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} rx={2} fill={t.isDark?"rgba(58,134,255,0.07)":"rgba(0,0,80,0.07)"} stroke={t.isDark?"rgba(58,134,255,0.13)":"rgba(0,0,80,0.13)"} strokeWidth={0.6}/>)}
        {roads.map(([x1,y1,x2,y2],i)=><line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"} strokeWidth={i<3?4:i<6?3:2} strokeLinecap="round"/>)}
        {[{x:178,y:7,l:"NH-65"},{x:294,y:7,l:"ORR"},{x:192,y:228,l:"MG Road"}].map(r=><text key={r.l} x={r.x} y={r.y} textAnchor="middle" fontSize={7} fill={t.isDark?"rgba(255,255,255,0.22)":"rgba(0,0,0,0.28)"} fontFamily="'Share Tech Mono',monospace">{r.l}</text>)}
        <defs>
          <radialGradient id="hm1"><stop offset="0%" stopColor="#E63946" stopOpacity="0.28"/><stop offset="100%" stopColor="#E63946" stopOpacity="0"/></radialGradient>
          <radialGradient id="hm2"><stop offset="0%" stopColor="#FFD60A" stopOpacity="0.18"/><stop offset="100%" stopColor="#FFD60A" stopOpacity="0"/></radialGradient>
        </defs>
        {layer.unsafe&&<><circle cx={148} cy={185} r={44} fill="url(#hm1)"/><circle cx={258} cy={72} r={34} fill="url(#hm2)"/></>}
        {journey&&<polyline points="178,224 178,128 64,128 64,76" fill="none" stroke="#3A86FF" strokeWidth={3.5} strokeDasharray="9,5" strokeLinecap="round"/>}
        {dev&&<circle cx={138} cy={178} r={14} fill="rgba(230,57,70,0.7)" stroke="#E63946" strokeWidth={2}><animate attributeName="r" values="11;18;11" dur="0.9s" repeatCount="indefinite"/></circle>}
        {safeZones.filter(z=>layer[z.type]!==false).map(z=><g key={z.l}><circle cx={z.x} cy={z.y} r={16} fill={`${z.c}12`} stroke={z.c} strokeWidth={1.2} strokeOpacity={0.55}/><circle cx={z.x} cy={z.y} r={4} fill={z.c}/><text x={z.x} y={z.y+26} textAnchor="middle" fontSize={7.5} fill={z.c} fontFamily="'Share Tech Mono',monospace">{z.l}</text></g>)}
        {/* POLICE STATIONS */}
        {layer.police&&POLICE_STATIONS.map((ps,i)=><g key={ps.id} style={{cursor:"pointer"}} onClick={()=>setSelPS(selPS?.id===ps.id?null:ps)}>
          <circle cx={ps.x} cy={ps.y} r={selPS?.id===ps.id?18:14} fill={selPS?.id===ps.id?"rgba(58,134,255,0.3)":"rgba(58,134,255,0.15)"} stroke="#3A86FF" strokeWidth={selPS?.id===ps.id?2:1.5} style={{animation:i===0?"pulseglow 2s infinite":"none"}}/>
          <text x={ps.x} y={ps.y+5} textAnchor="middle" fontSize={12}>🚔</text>
          <text x={ps.x} y={ps.y+26} textAnchor="middle" fontSize={7} fill="#3A86FF" fontFamily="'Share Tech Mono',monospace">{ps.name.split(" ")[0]}</text>
          {i===0&&<circle cx={ps.x+10} cy={ps.y-10} r={5} fill="#06D6A0"><animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite"/></circle>}
        </g>)}
        {/* YOU */}
        <circle cx={178} cy={224} r={9} fill="#E63946" opacity={0.25}><animate attributeName="r" values="7;13;7" dur="1.8s" repeatCount="indefinite"/></circle>
        <circle cx={178} cy={224} r={6.5} fill="#E63946"/><circle cx={178} cy={224} r={3} fill="#fff"/>
        <text x={178} y={213} textAnchor="middle" fontSize={8.5} fill="#E63946" fontFamily="'Share Tech Mono',monospace" fontWeight="bold">YOU</text>
      </svg>
      {dev&&<div style={{position:"absolute",top:8,left:8,background:"rgba(230,57,70,0.9)",borderRadius:8,padding:"4px 10px",fontFamily:"'Share Tech Mono',monospace",fontSize:11,animation:"blink 0.8s infinite",color:"#fff"}}>⚠ ROUTE DEVIATION</div>}
    </div>

    {/* Police station detail popup */}
    {selPS&&<div style={{margin:"8px 16px 0",background:"rgba(58,134,255,0.1)",border:"1px solid rgba(58,134,255,0.35)",borderRadius:12,padding:"12px 14px",animation:"smsin 0.3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:22}}>🚔</span>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:t.text}}>{selPS.name}</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:"#3A86FF"}}>{selPS.dist} away</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted}}>{selPS.phone}</div>
          </div>
        </div>
        <button onClick={()=>{beep(440,150,0.2);}} style={{padding:"6px 12px",borderRadius:20,border:"1px solid rgba(58,134,255,0.4)",background:"rgba(58,134,255,0.15)",color:"#3A86FF",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:11}}>CALL</button>
      </div>
    </div>}

    {/* Layer toggles */}
    <div style={{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto"}}>
      {[["safe","Safe","#06D6A0"],["unsafe","Heat","#E63946"],["police","Police","#3A86FF"],["hosp","Hosp","#fff"]].map(([k,l,c])=>(
        <button key={k} onClick={()=>setLayer(lyr=>({...lyr,[k]:!lyr[k]}))} style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:`1px solid ${layer[k]?c+"66":t.border}`,background:layer[k]?`${c}18`:t.inp,color:layer[k]?c:t.muted,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10,fontWeight:700}}>
          {l}
        </button>
      ))}
    </div>

    {/* Journey */}
    <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10}}>
      {!journey?(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <input value={dest} onChange={e=>setDest(e.target.value)} placeholder="Enter destination..." className="inp"/>
          <button onClick={()=>{setJourney(true);beep(440,200,0.2);}} style={{padding:12,borderRadius:12,border:"none",background:"linear-gradient(135deg,#3A86FF,#1E4FCC)",color:"#fff",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,letterSpacing:1}}>🗺️ START SAFE JOURNEY</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div className="card" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted}}>ACTIVE JOURNEY</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:"#3A86FF",fontSize:14}}>{dest||"Inorbit Mall, Hyderabad"}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted}}>CHECK-IN</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:"#06D6A0",fontSize:19}}>{fmt(ci)}</div></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setDev(!dev);if(!dev)alertSnd();}} style={{flex:1,padding:10,borderRadius:10,border:"1px solid rgba(230,57,70,0.4)",background:"rgba(230,57,70,0.1)",color:"#E63946",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:600,fontSize:12}}>{dev?"✓ Clear":"⚠ Sim Dev"}</button>
            <button onClick={()=>{setCi(900);beep(440,150,0.2);}} style={{flex:1,padding:10,borderRadius:10,border:"1px solid rgba(6,214,160,0.4)",background:"rgba(6,214,160,0.1)",color:"#06D6A0",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:600,fontSize:12}}>✓ I'm Safe</button>
            <button onClick={()=>{setJourney(false);setDev(false);}} style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${t.border}`,background:"transparent",color:t.muted,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:600,fontSize:12}}>✕</button>
          </div>
        </div>
      )}

      {/* Police Stations List */}
      <div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.muted,letterSpacing:1,marginBottom:8}}>🚔 NEARBY POLICE STATIONS</div>
        {POLICE_STATIONS.map((ps,i)=>(
          <div key={ps.id} className={`ps-card${i===0?" nearest":""}`} onClick={()=>setSelPS(selPS?.id===ps.id?null:ps)} style={{cursor:"pointer"}}>
            <div style={{width:38,height:38,borderRadius:10,background:i===0?"rgba(6,214,160,0.15)":"rgba(58,134,255,0.12)",border:`1px solid ${i===0?"rgba(6,214,160,0.4)":"rgba(58,134,255,0.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🚔</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontWeight:600,fontSize:13,color:t.text}}>{ps.name}</div>
                {i===0&&<span className="tag tg" style={{fontSize:8,padding:"1px 6px"}}>NEAREST</span>}
              </div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted,marginTop:2}}>{ps.phone} · {ps.officer}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:i===0?"#06D6A0":"#3A86FF"}}>{ps.dist}</div>
              <button onClick={e=>{e.stopPropagation();beep(440,150,0.2);}} style={{marginTop:3,padding:"3px 8px",borderRadius:20,border:`1px solid ${i===0?"rgba(6,214,160,0.4)":"rgba(58,134,255,0.3)"}`,background:"transparent",color:i===0?"#06D6A0":"#3A86FF",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:10}}>CALL</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>);
}

// ═══════════════════════════ SENSOR SCREEN ═══════════════════════════════════
function SensorScreen({hr,hrH,snd,resist,rHist,rSt,voice,struggle,attack,onAttack,fog,audio,t,onFogDeploy}){
  const bc=hr>125?"#E63946":hr>105?"#FFD60A":"#06D6A0";
  const rc=rSt==="STRUGGLE"?"#E63946":rSt==="TENSION"?"#FFD60A":"#06D6A0";
  const [fogSt,setFogSt]=useState("READY");
  const [logs,setLogs]=useState([{c:"green",m:"Arduino Nano CONNECTED · BLE 4.2"},{c:"green",m:"All sensors NOMINAL"},{c:"blue",m:"Silver thread stable · 4.8kΩ"},{c:"purple",m:"Voice guard ACTIVE · listening"}]);
  const addLog=(m,c="red")=>setLogs(l=>[...l.slice(-25),{c,m,t:new Date().toLocaleTimeString("en-IN",{hour12:false})}]);
  useEffect(()=>{if(attack)addLog("⚠ ATTACK — ALL DEFENSE ARMED","red");},[attack]);
  useEffect(()=>{if(rSt==="STRUGGLE")addLog(`Struggle: ${resist.toFixed(1)}kΩ → FOG ARMED`,"red");else if(rSt==="TENSION")addLog(`Tension: ${resist.toFixed(1)}kΩ`,"yellow");},[rSt]);
  useEffect(()=>{if(voice.hit)addLog(`Voice cmd: "${voice.hit}"`,"purple");},[voice.hit]);
  useEffect(()=>{if(hr>130)addLog(`HR CRITICAL: ${hr}BPM → SOS ARMED`,"red");},[hr]);
  const lc={"green":"#06D6A0","red":"#E63946","yellow":"#FFD60A","blue":"#3A86FF","purple":"#8B5CF6"};

  const deployFog=()=>{setFogSt("DEPLOYED");fogSnd();onFogDeploy();addLog("FOG CARTRIDGE DEPLOYED → 10s escape","yellow");setTimeout(()=>setFogSt("READY"),3500);};

  return(<div className="page" style={{padding:"0 16px 84px",display:"flex",flexDirection:"column",gap:12}}>
    <div style={{padding:"18px 0 4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted,letterSpacing:1.5}}>LIVE TELEMETRY</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:21,color:t.text}}>Sensor Dashboard</div></div>
      <span className={`tag ${attack?"tr":"tg"}`}><span style={{width:6,height:6,borderRadius:"50%",background:"currentColor",animation:"blink 1s infinite",display:"inline-block"}}/>{attack?"THREAT":"NOMINAL"}</span>
    </div>

    {/* HR */}
    <div className={`card${hr>125?" ac":""}`}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted,letterSpacing:1}}>HEART RATE</div>
          <div style={{display:"flex",alignItems:"baseline",gap:5}}>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:800,fontSize:50,color:bc,lineHeight:1,animation:hr>125?"hb 0.5s infinite":"hb 1.2s infinite"}}>{hr}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:t.muted}}>BPM</span>
          </div></div>
        <div style={{textAlign:"right",marginTop:4}}>
          <span className={`tag ${hr>125?"tr":hr>105?"ty":"tg"}`}>{hr>125?"CRITICAL":hr>105?"ELEVATED":"NORMAL"}</span>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted,marginTop:5}}>AUTO-SOS @130</div>
        </div>
      </div>
      <MiniChart data={hrH} color={bc} height={46}/>
    </div>

    {/* VOICE */}
    <div className="card pc">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:18}}>🎙</span>
          <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted}}>VOICE GUARD — ALWAYS ON</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:"#8B5CF6"}}>{voice.status.toUpperCase()}</div></div>
        </div>
        <div style={{display:"flex",gap:2,alignItems:"center",height:22}}>
          {Array.from({length:10}).map((_,i)=><div key={i} style={{width:3,borderRadius:1.5,background:"#8B5CF6",height:4+Math.abs(Math.sin(Date.now()*0.004+i))*14,animation:`voiceln ${0.22+i*0.06}s ease infinite`,animationDelay:`${i*0.04}s`}}/>)}
          <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:"#8B5CF6",marginLeft:6}}>{voice.vol}dB</span>
        </div>
      </div>
      <Waveform active={true} level={voice.vol||20} color="#8B5CF6" bars={34}/>
      {voice.tx&&<div style={{marginTop:8,background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"5px 10px",fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:"rgba(139,92,246,0.8)"}}>› {voice.tx.slice(-60)}</div>}
      <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:3}}>
        {VOICE_KW.map(k=><span key={k} style={{display:"inline-block",background:voice.hit===k?(FOG_CMDS.includes(k)?"rgba(6,214,160,0.2)":"rgba(230,57,70,0.2)"):"rgba(139,92,246,0.1)",border:`1px solid ${voice.hit===k?(FOG_CMDS.includes(k)?"#06D6A0":"#E63946"):"rgba(139,92,246,0.3)"}`,color:voice.hit===k?(FOG_CMDS.includes(k)?"#06D6A0":"#E63946"):"#8B5CF6",fontSize:9,padding:"2px 7px",borderRadius:20,fontFamily:"'Share Tech Mono',monospace",margin:"1px"}}>{k}</span>)}
      </div>
    </div>

    {/* STRUGGLE */}
    <div className={`card${rSt==="STRUGGLE"?" ac":""}`} style={{border:`1px solid ${rc}44`}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted}}>STRUGGLE SIGNATURE</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginTop:4}}>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:800,fontSize:38,color:rc,lineHeight:1}}>{resist.toFixed(1)}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:t.muted}}>kΩ</span>
          </div></div>
        <span className={`tag ${rSt==="STRUGGLE"?"tr":rSt==="TENSION"?"ty":"tg"}`}>{rSt}</span>
      </div>
      <div style={{background:"rgba(0,0,0,0.18)",borderRadius:10,padding:"5px 0",marginBottom:8}}><ThreadViz r={resist}/></div>
      <MiniChart data={rHist} color={rc} height={36}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:8}}>
        {[["RELAXED","<6kΩ","#06D6A0"],["TENSION","6–10kΩ","#FFD60A"],["STRUGGLE",">10kΩ","#E63946"]].map(([l,r,c])=>{
          const on=l===rSt;
          return(<div key={l} style={{borderRadius:8,padding:"6px 8px",textAlign:"center",background:on?`${c}18`:"rgba(255,255,255,0.02)",border:`1px solid ${on?c+"55":t.border}`}}>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,fontWeight:700,color:on?c:t.muted}}>{l}</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:on?c+"aa":t.muted}}>{r}</div>
          </div>);
        })}
      </div>
      <button onClick={struggle.simulate} disabled={struggle.running} style={{marginTop:10,width:"100%",padding:10,borderRadius:10,border:`1px solid ${rc}44`,background:`${rc}0f`,color:rc,cursor:struggle.running?"not-allowed":"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,opacity:struggle.running?0.6:1}}>
        {struggle.running?"▶ REPLAYING...":"▶ SIMULATE STRUGGLE SIGNATURE"}
      </button>
    </div>

    {/* SOUND */}
    <div className="card">
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted}}>AMBIENT SOUND</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:800,fontSize:34,color:snd>70?"#E63946":snd>55?"#FFD60A":"#3A86FF",lineHeight:1}}>{snd}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:t.muted}}>dB</span>
          </div></div>
        <span className={`tag ${snd>70?"tr":snd>55?"ty":"tb"}`}>{snd>70?"DISTRESS":snd>55?"ELEVATED":"AMBIENT"}</span>
      </div>
      <Waveform active={audio||attack} level={snd} bars={34}/>
    </div>

    {/* FOG */}
    <div className="card" style={{border:`1px solid ${fogSt==="DEPLOYED"?"rgba(6,214,160,0.5)":"rgba(139,92,246,0.25)"}`}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted}}>FOG CARTRIDGE — HARDWARE</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:800,fontSize:34,color:fog>60?"#06D6A0":fog>30?"#FFD60A":"#E63946",lineHeight:1}}>{fog}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:t.muted}}>%</span>
          </div></div>
        <span className={`tag ${fogSt==="DEPLOYED"?"tg":"tp"}`}>{fogSt}</span>
      </div>
      <div style={{background:"rgba(255,255,255,0.05)",borderRadius:6,height:10,overflow:"hidden",marginBottom:10}}>
        <div style={{width:`${fog}%`,height:"100%",borderRadius:6,background:`linear-gradient(90deg,${fog>60?"#06D6A0aa":"#E63946aa"},${fog>60?"#06D6A0":"#E63946"})`,transition:"width 0.5s"}}/>
      </div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted,marginBottom:10}}>
        Say <span style={{color:"#06D6A0",fontWeight:700}}>"release fog"</span> or tap below to deploy from Arduino device
      </div>
      <button onClick={deployFog} disabled={fogSt==="DEPLOYED"} style={{width:"100%",padding:12,borderRadius:10,border:"none",background:fogSt==="DEPLOYED"?"rgba(6,214,160,0.15)":"linear-gradient(135deg,rgba(139,92,246,0.8),rgba(99,52,206,0.9))",color:"#fff",cursor:fogSt==="DEPLOYED"?"not-allowed":"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,letterSpacing:1,opacity:fogSt==="DEPLOYED"?0.7:1,transition:"all 0.3s"}}>
        {fogSt==="DEPLOYED"?"🌫️ FOG RELEASED — RECHARGING (3s)":"🌫️ DEPLOY FOG — HARDWARE TRIGGER"}
      </button>
    </div>

    {/* ATTACK */}
    <div style={{background:"rgba(230,57,70,0.05)",border:"1px solid rgba(230,57,70,0.2)",borderRadius:16,padding:16}}>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:17,color:"#E63946",marginBottom:8}}>⚡ FULL ATTACK SIMULATION</div>
      <button onClick={onAttack} style={{width:"100%",padding:14,borderRadius:12,border:"1px solid #E63946",background:attack?"#E63946":"rgba(230,57,70,0.1)",color:attack?"#fff":"#E63946",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,letterSpacing:1.5,transition:"all 0.3s"}}>
        {attack?"🚨 ACTIVE — TAP TO RESET":"▶ SIMULATE FULL ATTACK"}
      </button>
      {attack&&<div style={{marginTop:10}}>{["HR → 142 BPM","Voice → distress","Thread → 14.2kΩ STRUGGLE","Fog → deployed","SMS → 3 contacts + police"].map(l=><div key={l} style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:"#E63946",padding:"1.5px 0"}}>⚡ {l}</div>)}</div>}
    </div>

    <div className="card"><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.muted,letterSpacing:1,marginBottom:8}}>HARDWARE LOG</div>
      <div className="log-box">{logs.map((l,i)=><div key={i} style={{padding:"2px 0",borderBottom:`1px solid ${t.border}`,display:"flex",gap:8}}><span style={{color:t.muted,flexShrink:0,fontFamily:"'Share Tech Mono',monospace",fontSize:10}}>[{l.t||"00:00:00"}]</span><span style={{color:lc[l.c]||t.text2,fontFamily:"'Share Tech Mono',monospace",fontSize:10}}>{l.m}</span></div>)}</div>
    </div>
  </div>);
}

// ═══════════════════════════ SHADOW SCREEN ═══════════════════════════════════
function ShadowScreen({isRec,setIsRec,t}){
  const [recs,setRecs]=useState(INIT_RECS);
  const [elapsed,setElapsed]=useState(0);
  const [delId,setDelId]=useState(null);
  const [playing,setPlaying]=useState(null);
  const fmt=s=>`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  useEffect(()=>{if(!isRec){setElapsed(0);return;}const ti=setInterval(()=>setElapsed(e=>e+1),1000);return()=>clearInterval(ti);},[isRec]);
  const stopSave=()=>{
    if(elapsed>2){const now=new Date();setRecs(r=>[{id:Date.now(),name:`REC_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}.enc`,dur:fmt(elapsed),size:`${(elapsed*0.5/1024).toFixed(1)} MB`,date:now.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),bytes:elapsed*500,color:"#E63946"},...r]);}
    setIsRec(false);
  };
  return(<div className="page" style={{padding:"18px 16px 84px",display:"flex",flexDirection:"column",gap:12}}>
    <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted,letterSpacing:1.5}}>COVERT MODE</div>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:21,color:t.text}}>Shadow Recording</div></div>
    <div style={{background:isRec?"rgba(230,57,70,0.07)":t.card,border:`1px solid ${isRec?"rgba(230,57,70,0.4)":t.border}`,borderRadius:16,padding:20,textAlign:"center",transition:"all 0.3s"}}>
      <div style={{fontSize:42,marginBottom:8}}>{isRec?"🔴":"🎙"}</div>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:21,color:t.text,marginBottom:isRec?10:14}}>{isRec?"RECORDING ACTIVE":"SHADOW MODE OFF"}</div>
      {isRec&&<><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:17,color:"#E63946",marginBottom:10,animation:"blink 1s infinite"}}>{fmt(elapsed)}</div><Waveform active={true} level={50} bars={32}/><div style={{marginTop:8,fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:"#06D6A0"}}>● ENCRYPTED · UPLOADING...</div></>}
      <button onClick={isRec?stopSave:()=>{setIsRec(true);beep(440,150,0.2);}} style={{marginTop:14,padding:"11px 30px",borderRadius:30,border:isRec?"1px solid rgba(6,214,160,0.4)":"none",background:isRec?"rgba(6,214,160,0.12)":"linear-gradient(135deg,#E63946,#9B1D20)",color:isRec?"#06D6A0":"#fff",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,letterSpacing:1}}>
        {isRec?"◼ STOP & SAVE":"◉ START RECORDING"}
      </button>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.muted,letterSpacing:1}}>EVIDENCE VAULT ({recs.length})</div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.muted}}>{(recs.reduce((a,r)=>a+r.bytes,0)/1e6).toFixed(1)} MB</div>
    </div>
    {recs.length===0&&<div className="card" style={{textAlign:"center",padding:28,color:t.muted}}><div style={{fontSize:32,marginBottom:8}}>🗂</div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>No recordings</div></div>}
    {recs.map(r=>(
      <div key={r.id} className="rec-it">
        <div style={{width:38,height:38,borderRadius:10,background:`${r.color}18`,border:`1px solid ${r.color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:17}}>{playing===r.id?"🔊":"🔒"}</span></div>
        <div style={{flex:1,overflow:"hidden"}}>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
          <div style={{display:"flex",gap:8,marginTop:3}}>
            {[`⏱ ${r.dur}`,`💾 ${r.size}`,r.date].map(s=><span key={s} style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8.5,color:t.muted}}>{s}</span>)}
          </div>
          {playing===r.id&&<Waveform active={true} level={40} bars={18} color={r.color}/>}
        </div>
        <div style={{display:"flex",gap:5,flexShrink:0}}>
          {[{ico:playing===r.id?"⏸":"▶",fn:()=>{setPlaying(playing===r.id?null:r.id);beep(440,100,0.12);}},{ico:"↗",fn:()=>beep(440,80,0.1)},{ico:"✕",fn:()=>setDelId(r.id),red:true}].map((b,i)=>(
            <button key={i} onClick={b.fn} style={{width:29,height:29,borderRadius:7,border:b.red?"1px solid rgba(230,57,70,0.3)":`1px solid ${t.border}`,background:b.red?"rgba(230,57,70,0.08)":t.inp,cursor:"pointer",color:b.red?"#E63946":t.text2,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{b.ico}</button>
          ))}
        </div>
      </div>
    ))}
    {delId&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,borderRadius:44,padding:24}}>
      <div style={{background:t.cardS,border:`1px solid ${t.border}`,borderRadius:16,padding:24,textAlign:"center",width:"100%"}}>
        <div style={{fontSize:34,marginBottom:8}}>🗑</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,color:t.text,marginBottom:6}}>Delete Recording?</div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.muted,marginBottom:18}}>Cannot be undone.</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setDelId(null)} style={{flex:1,padding:10,borderRadius:10,border:`1px solid ${t.border}`,background:"transparent",color:t.text2,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14}}>CANCEL</button>
          <button onClick={()=>{beep(300,150,0.2);setRecs(r=>r.filter(x=>x.id!==delId));setDelId(null);}} style={{flex:1,padding:10,borderRadius:10,border:"1px solid rgba(230,57,70,0.4)",background:"rgba(230,57,70,0.12)",color:"#E63946",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14}}>DELETE</button>
        </div>
      </div>
    </div>}
  </div>);
}

// ═══════════════════════════ PROFILE SCREEN ══════════════════════════════════
function ProfileScreen({t,isDark,setIsDark,profile,setProfile}){
  const [edit,setEdit]=useState(false);
  const [form,setForm]=useState(profile);
  const [saved,setSaved]=useState(false);
  const save=()=>{setProfile(form);setEdit(false);setSaved(true);beep(523,200,0.2);setTimeout(()=>setSaved(false),2500);};
  return(<div className="page" style={{padding:"0 16px 84px"}}>
    <div style={{padding:"18px 0 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted,letterSpacing:1.5}}>ACCOUNT</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:21,color:t.text}}>Profile</div></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13}}>{isDark?"🌙":"☀️"}</span>
        <div className="th-btn" onClick={()=>setIsDark(d=>!d)}><div className="th-thumb"/></div>
      </div>
    </div>
    <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center"}}>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:t.muted}}>{authLoading?"Auth: LOADING":"Auth: "+(user?user.email:"NOT SIGNED IN")}</div>
      {user?
        <button onClick={signOutUser} style={{padding:"5px 10px",borderRadius:16,border:`1px solid ${t.border}`,background:"transparent",color:t.text2,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:11}}>SIGN OUT</button>
        :
        <button onClick={signIn} style={{padding:"5px 10px",borderRadius:16,border:`1px solid ${t.border}`,background:"rgba(58,134,255,0.15)",color:"#3A86FF",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:11}}>SIGN IN WITH GOOGLE</button>
      }
    </div>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"4px 0 20px",gap:10}}>
      <div style={{width:78,height:78,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:26,background:"linear-gradient(135deg,rgba(230,57,70,0.3),rgba(230,57,70,0.1))",border:"2px solid rgba(230,57,70,0.5)",color:"#E63946"}}>{(profile.name||"U").slice(0,2).toUpperCase()}</div>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:21,color:t.text}}>{profile.name||"User"}</div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:t.muted,marginTop:2}}>{profile.phone||"No phone"}</div>
      </div>
      <span className="tag tg">● Protected</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
      {[{ico:"🛡",l:"SOS Alerts",v:"3",c:"#E63946"},{ico:"📍",l:"Journeys",v:"12",c:"#3A86FF"},{ico:"🎙",l:"Recordings",v:"3",c:"#8B5CF6"},{ico:"⚠️",l:"Reports",v:"1",c:"#FFD60A"}].map(s=>(
        <div key={s.l} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"11px 13px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>{s.ico}</span>
          <div><div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:s.c,lineHeight:1}}>{s.v}</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted}}>{s.l}</div></div>
        </div>
      ))}
    </div>
    <div className="card" style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:t.text}}>Personal Info</div>
        <button onClick={()=>{setEdit(!edit);setForm(profile);}} style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${t.border}`,background:"transparent",color:"#3A86FF",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:12}}>{edit?"CANCEL":"EDIT"}</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[["name","Full Name","👤"],["phone","Phone","📱"],["age","Age","🎂"],["city","City","📍"],["blood","Blood Group","🩸"]].map(([k,pl,ico])=>(
          <div key={k}><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:t.muted,marginBottom:4}}>{ico} {pl.toUpperCase()}</div>
            {edit?<input value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={pl} className="inp" style={{padding:"9px 13px",background:t.inp,border:`1px solid ${t.border}`,borderRadius:9,color:t.text,fontSize:13,outline:"none",width:"100%"}}/>
              :<div style={{fontSize:14,color:profile[k]?t.text:t.muted,padding:"8px 0",borderBottom:`1px solid ${t.border}`}}>{profile[k]||<span style={{fontStyle:"italic"}}>Not set</span>}</div>}
          </div>
        ))}
        {edit&&<button onClick={save} style={{padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#06D6A0,#059669)",color:"#fff",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,letterSpacing:1,marginTop:4}}>{saved?"✓ SAVED!":"SAVE CHANGES"}</button>}
      </div>
    </div>
    <div className="card" style={{textAlign:"center",background:`linear-gradient(135deg,rgba(230,57,70,0.08),rgba(58,134,255,0.06))`,marginBottom:12}}>
      <div style={{fontSize:26,marginBottom:6}}>🛡️</div>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:t.text}}>Surakshini Setu v4.0</div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:t.muted,marginTop:4,lineHeight:1.7}}>Afifa Fatima & Misbah Maheen<br/>Final Year Engineering · 2024</div>
      <div style={{marginTop:8,display:"flex",justifyContent:"center",gap:6}}>
        <span className="tag tg">AI Powered</span><span className="tag tb">BLE 4.2</span><span className="tag tr">Always-On Voice</span>
      </div>
    </div>
  </div>);
}

// ═══════════════════════════ MAIN APP ════════════════════════════════════════
function App(){
  const [isDark,setIsDark]=useState(true);
  const th=T[isDark?"dark":"light"];
  const [page,setPage]=useState("home");
  const [sos,setSos]=useState(false);
  const [attack,setAttack]=useState(false);
  const [audio,setAudio]=useState(true);
  const [fog,setFog]=useState(87);
  const [fogActive,setFogActive]=useState(false);
  const [toast,setToast]=useState(null);
  const [smsModal,setSmsModal]=useState(null);
  const [profile]=useState({name:"Afifa Fatima",phone:"+91-9876501234",age:"21",city:"Hyderabad",blood:"B+"});
  const [profileState,setProfileState]=useState({name:"Afifa Fatima",phone:"+91-9876501234",age:"21",city:"Hyderabad",blood:"B+"});

  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);

  const [location,setLocation]=useState(null);
  const [destination,setDestination]=useState("Inorbit Mall, Hyderabad");

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{setUser(u);setAuthLoading(false);});
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    const updateLocation=()=>{
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(p=>setLocation(p.coords),e=>console.warn("Geolocation error",e));
      }
    };
    updateLocation();
    const id=setInterval(updateLocation,60000);
    return ()=>clearInterval(id);
  },[]);

  const signIn = async ()=>{try{await signInWithPopup(auth, provider);}catch(e){console.error("Firebase signIn failed",e);speak("Failed to sign in, please try again.");}};
  const signOutUser = async ()=>{try{await signOut(auth);speak("Signed out successfully.");}catch(e){console.error("Firebase signOut failed",e);speak("Sign out failed.");}};

  const [hr,setHr]=useState(74);
  const [hrH,setHrH]=useState(Array.from({length:44},(_,i)=>68+Math.sin(i*0.3)*6+Math.random()*3));
  const [snd,setSnd]=useState(44);
  const atkRef=useRef();

  const showToast=useCallback((msg)=>{setToast(msg);setTimeout(()=>setToast(null),3800);},[]);

  // Build SMS messages
  const getNearestPolice=(coords)=>{
    if(!coords) return POLICE_STATIONS.slice(0,2);
    const distance=(lat1,lon1,lat2,lon2)=>{
      const r=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180;
      const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
      const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); return r*c;
    };
    return POLICE_STATIONS.slice().sort((a,b)=>{
      const dA=distance(coords.latitude,coords.longitude,17.4486+(a.y-100)/100,78.3908+(a.x-180)/100);
      const dB=distance(coords.latitude,coords.longitude,17.4486+(b.y-100)/100,78.3908+(b.x-180)/100);
      return dA-dB;
    }).slice(0,2);
  };

  const buildMessages=(trigger)=>{
    const coords=location||{latitude:17.4486,longitude:78.3908};
    const targetPolice=getNearestPolice(coords);
    const base = buildSMS(profileState,trigger,coords);
    const extra = `\n\nWomen Helpline: ${WOMEN_HELPLINE.phone}`;
    const policeTexts = targetPolice.map(ps=>`\n${ps.name} (${ps.phone})`).join("");
    return [
      ...CONTACTS.map(c=>({to:c.name,phone:c.phone,type:"contact",body:base+extra})),
      {to:WOMEN_HELPLINE.name,phone:WOMEN_HELPLINE.phone,type:"helpline",body:base+"\nHelp needed for a woman in distress."},
      ...targetPolice.map(ps=>({to:ps.name,phone:ps.phone,type:"police",body:`🚔 EMERGENCY DISPATCH REQUEST\nCivilian: ${profileState.name}\nTrigger: ${trigger}\nLive Location: ${coords.latitude.toFixed(6)}°, ${coords.longitude.toFixed(6)}°\nNearest police: ${ps.name} (${ps.phone})\nTime: ${new Date().toLocaleTimeString()}\nPlease respond immediately.`}))
    ];
  };

  const triggerSOS=useCallback((trigger="MANUAL")=>{
    if(sos)return;
    const coords=location||{latitude:17.4486,longitude:78.3908};
    setSos(true);setAudio(true);alertSnd();
    const msgs=buildMessages(trigger);
    msgs.forEach((m,i)=>setTimeout(()=>{smsSnd();console.log("SMS->",m.to,m.phone,m.body);},i*200));
    setTimeout(()=>{setSmsModal(msgs);},600);
    speak(`SOS activated via ${trigger}. Sending live location to contacts, women helpline, and nearby police.`);
    showToast(`🚨 SOS sent! ${msgs.length} recipients alerted`);
    console.log("SOS Location",coords);
  },[sos,profileState,location]);

  const triggerFog=useCallback((cmd="MANUAL")=>{
    if(fogActive)return;
    setFogActive(true);fogSnd();
    setFog(f=>Math.max(0,f-22));
    speak("Fog deployment activated.");
    showToast("🌫️ FOG DEPLOYED from hardware device!");
  },[fogActive]);

  // Always-on voice
  const voice=useAlwaysOnVoice({
    onSOS:(kw)=>{showToast(`🎙 "${kw}" detected!`);triggerSOS(`Voice: "${kw}"`);},
    onFog:(kw)=>{showToast(`🌫️ "${kw}" — deploying fog!`);triggerFog(kw);}
  });

  const struggle=useStruggle((r)=>{
    showToast(`⚡ STRUGGLE ${r.toFixed(1)}kΩ — Defense active!`);
    triggerSOS(`Struggle signature ${r.toFixed(1)}kΩ`);
  });

  // Sensors
  useEffect(()=>{
    if(attack)return;
    const t=setInterval(()=>{setHr(h=>Math.round(Math.max(64,Math.min(90,h+(Math.random()-0.5)*3.5))));setSnd(s=>Math.round(Math.max(30,Math.min(58,s+(Math.random()-0.5)*6))));},1600);
    return()=>clearInterval(t);
  },[attack]);
  useEffect(()=>{const t=setInterval(()=>setHrH(h=>[...h.slice(-43),hr+(Math.random()-0.5)*2]),1600);return()=>clearInterval(t);},[hr]);
  useEffect(()=>{if(hr>130&&!sos)triggerSOS(`Auto: HR critical ${hr}BPM`);},[hr]);

  const doAttack=()=>{
    if(attack){setAttack(false);clearInterval(atkRef.current);setHr(74);setSnd(44);setFog(87);setSos(false);struggle.spike(4.8);return;}
    setAttack(true);triggerSOS("ATTACK SIMULATION");struggle.spike(13.8);
    let h=74,s=44,f=87;
    atkRef.current=setInterval(()=>{h=Math.min(146,h+10);s=Math.min(94,s+12);f=Math.max(0,f-28);setHr(h);setSnd(Math.round(s));setFog(Math.round(f));if(h>=146)clearInterval(atkRef.current);},280);
  };

  const NAV=[{k:"home",i:"🛡️",l:"Home"},{k:"sensor",i:"📡",l:"Sensor"},{k:"map",i:"🗺️",l:"Map"},{k:"shadow",i:"🎙",l:"Shadow"},{k:"profile",i:"👤",l:"Profile"}];
  const css=buildCSS(th);

  if(authLoading){
    return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:th.body,color:th.text,fontFamily:"'Rajdhani',sans-serif",fontSize:18}}>Loading authentication...</div>);
  }
  if(!user){
    return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:th.body,color:th.text,fontFamily:"'Rajdhani',sans-serif"}}>
      <div style={{width:360,padding:28,background:th.card,border:`1px solid ${th.border}`,borderRadius:18,boxShadow:"0 16px 40px rgba(0,0,0,0.2)",textAlign:"center"}}>
        <h1 style={{marginBottom:10,fontSize:22}}>Surakshini Setu</h1>
        <p style={{marginBottom:20,color:th.muted,fontSize:14}}>Secure access required. Please log in to continue.</p>
        <button onClick={signIn} style={{width:"100%",padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3A86FF,#1E74F8)",color:"#fff",fontWeight:700,cursor:"pointer"}}>Sign in with Google</button>
      </div>
    </div>);
  }

  return(<>
    <style>{css}</style>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:th.body,transition:"background 0.4s"}}>
      <div className="app">

        {/* FOG OVERLAY */}
        <FogOverlay active={fogActive} onDone={()=>setFogActive(false)}/>

        {/* SOS OVERLAY */}
        {sos&&page==="home"&&!smsModal&&(
          <div className="sos-ov">
            <div style={{fontSize:58}}>🚨</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:800,fontSize:26,letterSpacing:1,color:"#fff"}}>SOS ACTIVE</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10.5,color:"rgba(255,255,255,0.75)",textAlign:"center",lineHeight:1.8}}>Live location shared · Recording active<br/>Police notified · All contacts alerted</div>
            <div style={{background:"rgba(0,0,0,0.22)",borderRadius:12,padding:"10px 18px",width:"100%"}}>
              {[...CONTACTS,...POLICE_STATIONS.slice(0,1)].map((c,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#06D6A0",boxShadow:"0 0 5px #06D6A0"}}/>
                  <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10.5,flex:1,color:"#fff"}}>{c.name}</span>
                  <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.45)"}}>{c.phone}</span>
                  <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9.5,color:"#06D6A0"}}>✓ SMS</span>
                </div>
              ))}
            </div>
            <button className="safe-btn" onClick={()=>{setSos(false);setAttack(false);clearInterval(atkRef.current);}}>✓ I AM SAFE NOW</button>
          </div>
        )}

        {/* SMS MODAL */}
        {smsModal&&<SMSModal messages={smsModal} onClose={()=>setSmsModal(null)} t={th}/>}

        {/* Alert banner on other pages */}
        {(sos||attack)&&page!=="home"&&!smsModal&&(
          <div style={{position:"absolute",top:0,left:0,right:0,background:"rgba(230,57,70,0.93)",padding:"7px 16px",zIndex:90,display:"flex",alignItems:"center",gap:8,borderRadius:"44px 44px 0 0"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#fff",animation:"blink 0.7s infinite"}}/>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"#fff",fontWeight:700}}>{attack?"⚡ ATTACK — DEFENSE ACTIVE":"🚨 SOS ALERT ACTIVE"}</span>
            <button onClick={()=>setSmsModal(buildMessages("Resend"))} style={{marginLeft:"auto",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:10}}>VIEW SMS</button>
          </div>
        )}

        <div key={page} style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",marginTop:(sos||attack)&&page!=="home"&&!smsModal?32:0}}>
          {page==="home"&&<HomeScreen sos={sos} hr={hr} voice={voice} attack={attack} audio={audio} t={th} onManualSOS={()=>triggerSOS("MANUAL TAP")} onPolice={()=>{setPage("map");speak("Opening nearby police map.");}} onSafeRoute={()=>{setPage("map");setDestination("Hitech City to Jubilee Hills");speak("Starting safe route planning.");}} onShadow={()=>{setAudio(a=>!a);speak("Shadow recording toggled.");}} onFog={()=>{triggerFog("MANUAL");}}/>}
          {page==="sensor"&&<SensorScreen hr={hr} hrH={hrH} snd={snd} resist={struggle.r} rHist={struggle.hist} rSt={struggle.status} voice={voice} struggle={struggle} attack={attack} onAttack={doAttack} fog={fog} audio={audio} t={th} onFogDeploy={triggerFog}/>}
          {page==="map"&&<MapScreen t={th} location={location} destination={destination}/>}
          {page==="shadow"&&<ShadowScreen isRec={audio} setIsRec={setAudio} t={th}/>}
          {page==="profile"&&<ProfileScreen t={th} isDark={isDark} setIsDark={setIsDark} profile={profileState} setProfile={setProfileState}/>}
        </div>

        <nav className="bnav">
          {NAV.map(({k,i,l})=>(
            <div key={k} className={`ni${page===k?" on":""}`} onClick={()=>setPage(k)}>
              <div className="ni-ico">{i}</div>
              <div className="ni-lbl">{l}</div>
              <div className="ni-bar"/>
            </div>
          ))}
        </nav>
      </div>
    </div>
  </>);
}

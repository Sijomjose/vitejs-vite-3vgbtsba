// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";

const SUPABASE_URL = "https://mlfgdutctvbvqwebqajp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmdkdXRjdHZidnF3ZWJxYWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ2MDIsImV4cCI6MjA4OTgxMDYwMn0.TPBeT6y-fFGAgcME_mmKqBUYHFUMVB1FO3wrAhneKW4";
const EXAM_DATE  = new Date("2027-02-15T00:00:00");
const START_DATE = new Date("2026-03-27T00:00:00");

async function sbGet() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tracker_data?id=eq.savio&select=data`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const d = await r.json();
    return d && d[0] && d[0].data ? d[0].data : null;
  } catch { return null; }
}

async function sbSet(payload) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/tracker_data?id=eq.savio`, {
      method: "PATCH",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload })
    });
  } catch {}
}

function getTimeLeft() {
  const now  = new Date();
  const diff = EXAM_DATE - now;
  if (diff <= 0) return { days:0, hrs:0, mins:0, secs:0, pct:100 };
  const total = EXAM_DATE - START_DATE;
  const used  = now - START_DATE;
  return {
    days: Math.floor(diff / 86400000),
    hrs:  Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
    pct:  Math.max(0, Math.min(100, Math.round((used / total) * 100)))
  };
}

function useCountdown() {
  const [time, setTime] = useState(getTimeLeft);
  useEffect(() => { const t = setInterval(() => setTime(getTimeLeft()), 1000); return () => clearInterval(t); }, []);
  return time;
}

// ── Animated progress bar with shimmer ──
function AnimatedBar({ pct: p, color, height=6, radius=10, bg="rgba(0,0,0,.08)" }) {
  const [val, setVal] = useState(0);
  useEffect(() => { const t = setTimeout(() => setVal(p), 120); return () => clearTimeout(t); }, [p]);
  return (
    <div style={{background:bg, borderRadius:radius, height, overflow:"hidden", position:"relative"}}>
      <div style={{height:"100%", borderRadius:radius, width:`${val}%`, background:`linear-gradient(90deg,${color}bb,${color},${color}cc)`, transition:"width .8s cubic-bezier(.4,0,.2,1)", position:"relative", overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:"-60%",width:"50%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent)",animation:val>0?"shimmer 2.2s ease-in-out infinite":"none"}}/>
      </div>
      <style>{`@keyframes shimmer{0%{left:-60%}100%{left:160%}}`}</style>
    </div>
  );
}

// ── Donut ring ──
function DonutRing({ pct: p, color="white", size=88 }) {
  const r = 28, cx = 40, cy = 40, circ = 2 * Math.PI * r;
  const [val, setVal] = useState(0);
  useEffect(() => { const t = setTimeout(() => setVal(p), 200); return () => clearTimeout(t); }, [p]);
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{flexShrink:0}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="8"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${(val/100)*circ} ${circ}`} strokeDashoffset={circ/4}
        strokeLinecap="round" style={{transition:"stroke-dasharray .9s ease"}}/>
      <text x={cx} y={cy-4} textAnchor="middle" fill="white" fontSize="13" fontWeight="900">{val}%</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill="rgba(255,255,255,.65)" fontSize="8" fontWeight="700">DONE</text>
    </svg>
  );
}

const SUBJECTS = [
  { id:"maths",   name:"Mathematics",    icon:"📐", color:"#2563eb",
    chapters:["Real Numbers","Polynomials","Pair of Linear Equations in Two Variables","Quadratic Equations","Arithmetic Progressions","Triangles","Coordinate Geometry","Introduction to Trigonometry","Some Applications of Trigonometry","Circles","Areas Related to Circles","Surface Areas and Volumes","Statistics","Probability"] },
  { id:"science", name:"Science",        icon:"🔬", color:"#059669",
    chapters:["Chemical Reactions and Equations","Acids, Bases and Salts","Metals and Non-metals","Carbon and its Compounds","Life Processes","Control and Coordination","How do Organisms Reproduce?","Heredity","Light – Reflection and Refraction","Human Eye and Colourful World","Electricity","Magnetic Effects of Electric Current","Our Environment"] },
  { id:"english", name:"English",        icon:"📖", color:"#d97706",
    sections:[
      { name:"First Flight – Prose",    chapters:["A Letter to God","Nelson Mandela: Long Walk to Freedom","Two Stories about Flying","From the Diary of Anne Frank","Glimpses of India","Mijbil the Otter","Madam Rides the Bus","The Sermon at Benares","The Proposal"] },
      { name:"First Flight – Poetry",   chapters:["Dust of Snow","Fire and Ice","A Tiger in the Zoo","How to Tell Wild Animals","The Ball Poem","Amanda!","Animals","The Trees","Fog","The Tale of Custard the Dragon","For Anne Gregory"] },
      { name:"Footprints Without Feet", chapters:["A Triumph of Surgery","The Thief's Story","The Midnight Visitor","A Question of Trust","Footprints without Feet","The Making of a Scientist","The Necklace","Bholi","The Book That Saved the Earth"] }
    ]},
  { id:"hindi",   name:"Hindi",          icon:"🪔", color:"#dc2626",
    sections:[
      { name:"Kshitij – Kavya Khand",  chapters:["Kabir – Sakhiyan aur Sabad","Mirabai – Pad","Bihari – Dohe","Maithili Sharan Gupt – Manushyata","Sumitranandan Pant – Parvat Pradesh mein Pavas","Mahadevi Verma – Madhur Madhur Mere Deepak Jal","Nagarjuna – Yah Danturit Muskan / Fasal","Mangalesh Dabral – Sangatkar"] },
      { name:"Kshitij – Gadya Khand",  chapters:["Swayam Prakash – Netaji ka Chashma","Ram Vriksh Benipuri – Balgobin Bhagat","Yashpal – Lakhnavi Andaaz","Mannu Bhandari – Ek Kahani Yeh Bhi","Sarveshwar Dayal Saxena – Manoj","Hazari Prasad Dwivedi – Sanskriti","Habib Tanvir – Kartoos"] },
      { name:"Kritika",                chapters:["Mata ka Anchal – Shivpujan Sahay","George Pancham ki Naak – Kamleshwar","Sana-Sana Haath Jodi – Madhu Kankariya","Ehi Thaiya Jhulni Herani Ho Rama – Shivprasad Mishra 'Rudra'","Main Kyun Likhta Hoon – Nirmal Verma"] }
    ]},
  { id:"sst",     name:"Social Studies", icon:"🌍", color:"#7c3aed",
    sections:[
      { name:"History",         chapters:["The Rise of Nationalism in Europe","Nationalism in India","The Making of a Global World","The Age of Industrialisation","Print Culture and the Modern World"] },
      { name:"Geography",       chapters:["Resources and Development","Forest and Wildlife Resources","Water Resources","Agriculture","Minerals and Energy Resources","Manufacturing Industries","Lifelines of National Economy"] },
      { name:"Political Science",chapters:["Power Sharing","Federalism","Gender, Religion and Caste","Political Parties","Outcomes of Democracy"] },
      { name:"Economics",       chapters:["Development","Sectors of the Indian Economy","Money and Credit","Globalisation and the Indian Economy","Consumer Rights"] }
    ]}
];

function flattenChapters(sub) {
  if (sub.chapters) return sub.chapters.map((c,i) => ({ id:`${sub.id}__${i}`, name:c }));
  const out = [];
  sub.sections.forEach(sec => sec.chapters.forEach((c,i) => out.push({ id:`${sub.id}__${sec.name}__${i}`, name:c, section:sec.name })));
  return out;
}

const S_CYCLE = ["not_started","in_progress","completed","revised"];
const S_CFG = {
  not_started: { label:"Not Started", color:"#6b7280", bg:"#f9fafb", border:"#e5e7eb", dot:"⬜" },
  in_progress:  { label:"In Progress", color:"#d97706", bg:"#fffbeb", border:"#fcd34d", dot:"🔄" },
  completed:    { label:"Completed",   color:"#059669", bg:"#f0fdf4", border:"#86efac", dot:"✅" },
  revised:      { label:"Revised ⭐",  color:"#7c3aed", bg:"#f5f3ff", border:"#c4b5fd", dot:"🌟" },
};
const TEST_TYPES = ["Class Test","Unit Test","Half Yearly Exam","Annual Exam","Practice Test","Mock Test","Oral Test","Assignment","Other"];
const PAPER_TYPES = [
  { key:"qp", label:"📄 Question Paper", color:"#2563eb", bg:"#eff6ff", border:"#93c5fd" },
  { key:"ma", label:"✅ Model Answer",   color:"#059669", bg:"#f0fdf4", border:"#86efac" },
  { key:"as", label:"📝 Answer Sheet",   color:"#d97706", bg:"#fffbeb", border:"#fcd34d" },
];

function pct(o,m) { return m>0 ? Math.round((o/m)*100) : 0; }
function pctColor(p) { return p>=80?"#059669":p>=60?"#d97706":"#dc2626"; }
function toArr(v) { if (!v) return [""]; if (Array.isArray(v)) return v.length ? v : [""]; return [v]; }
function hasPapers(p) { return p && PAPER_TYPES.some(({key}) => toArr(p[key]).some(x=>x)); }
function initPapers(p) { const o={}; PAPER_TYPES.forEach(({key})=>{o[key]=toArr(p?p[key]:null);}); return o; }

export default function App() {
  const [data, setData]             = useState({});
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [tab, setTab]               = useState("dashboard");
  const [testModal, setTestModal]   = useState(null);
  const [noteModal, setNoteModal]   = useState(null);
  const [paperModal, setPaperModal] = useState(null);
  const [tf, setTf] = useState({ type:"Class Test", date:new Date().toISOString().slice(0,10), obtained:"", max:"", notes:"" });
  const countdown = useCountdown();

  const examColor  = countdown.days>60 ? "#00ffcc" : countdown.days>30 ? "#ffcc00" : "#ff4444";
  const examGlow   = countdown.days>60 ? "rgba(0,255,204,.15)" : countdown.days>30 ? "rgba(255,204,0,.15)" : "rgba(255,68,68,.15)";
  const examBorder = countdown.days>60 ? "rgba(0,255,204,.3)"  : countdown.days>30 ? "rgba(255,204,0,.3)"  : "rgba(255,68,68,.3)";

  useEffect(() => {
    (async () => {
      const d = await sbGet();
      if (d) setData(d);
      else { try { const s=localStorage.getItem("savio_v3"); if(s) setData(JSON.parse(s)); } catch {} }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async nd => {
    setData(nd);
    try { localStorage.setItem("savio_v3", JSON.stringify(nd)); } catch {}
    setSyncing(true); await sbSet(nd); setSyncing(false);
  }, []);

  const cd = id => data[id] || { status:"not_started", revision:false, tests:[], notes:"", papers:null };
  const cycleStatus = id => { const c=cd(id),i=S_CYCLE.indexOf(c.status); persist({...data,[id]:{...c,status:S_CYCLE[(i+1)%4]}}); };
  const toggleRev   = id => { const c=cd(id); persist({...data,[id]:{...c,revision:!c.revision}}); };
  const addTest = id => {
    if (!tf.obtained||!tf.max) return;
    const c=cd(id); persist({...data,[id]:{...c,tests:[...(c.tests||[]),{...tf,id:Date.now()}]}});
    setTf({type:"Class Test",date:new Date().toISOString().slice(0,10),obtained:"",max:"",notes:""});
  };
  const delTest    = (cid,tid)   => { const c=cd(cid); persist({...data,[cid]:{...c,tests:c.tests.filter(t=>t.id!==tid)}}); };
  const saveNote   = (id,note)   => { const c=cd(id);  persist({...data,[id]:{...c,notes:note}}); };
  const savePapers = (id,papers) => { const c=cd(id);  persist({...data,[id]:{...c,papers}}); };

  const stats = useMemo(() => {
    const ss = SUBJECTS.map(sub => {
      const chs=flattenChapters(sub);
      const done=chs.filter(c=>["completed","revised"].includes(cd(c.id).status)).length;
      const prog=chs.filter(c=>cd(c.id).status==="in_progress").length;
      const rev =chs.filter(c=>cd(c.id).revision).length;
      return {id:sub.id,name:sub.name,icon:sub.icon,color:sub.color,total:chs.length,done,prog,rev};
    });
    const tot=ss.reduce((a,s)=>a+s.total,0), don=ss.reduce((a,s)=>a+s.done,0);
    return {ss,tot,don,pct:tot?Math.round(don/tot*100):0};
  }, [data]);

  const inp = st => ({width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #d1d5db",fontSize:14,boxSizing:"border-box",...st});

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",fontSize:18}}>📚 Loading Savio's Study Tracker…</div>;

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:1200,margin:"0 auto",padding:"14px clamp(14px,3vw,40px)",minHeight:"100vh",background:"#f1f5f9"}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1e3a8a,#6d28d9)",borderRadius:16,padding:"18px 22px",marginBottom:12,color:"white"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:32}}>📚</span>
          <div>
            <div style={{fontWeight:800,fontSize:22,letterSpacing:-.5}}>Savio's Study Tracker</div>
            <div style={{fontSize:13,opacity:.85}}>Class 10 • CBSE NCERT {syncing&&"• ☁️ Saving..."}</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:28,fontWeight:800}}>{stats.pct}%</div>
            <div style={{fontSize:12,opacity:.8}}>{stats.don}/{stats.tot} done</div>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <AnimatedBar pct={stats.pct} color="white" height={8} radius={20} bg="rgba(255,255,255,.25)"/>
        </div>
      </div>

      {/* COUNTDOWN */}
      <div style={{background:"linear-gradient(135deg,#0a0f1e,#0d1b3e,#0a0f1e)",borderRadius:20,padding:"22px 24px",marginBottom:14,border:`1.5px solid ${examBorder}`,boxShadow:`0 8px 40px ${examGlow}`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:80,width:180,height:180,borderRadius:"50%",background:examColor,opacity:.06,filter:"blur(60px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-40,left:40,width:120,height:120,borderRadius:"50%",background:examColor,opacity:.04,filter:"blur(40px)",pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${examColor}22`,border:`1px solid ${examColor}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎯</div>
            <div>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:3,color:"#64748b",textTransform:"uppercase"}}>Board Exam Countdown</div>
              <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginTop:1}}>CBSE Class 10 • Feb 15, 2027</div>
            </div>
          </div>
          <div style={{background:`${examColor}22`,border:`1px solid ${examColor}44`,borderRadius:20,padding:"4px 14px"}}>
            <span style={{fontSize:12,fontWeight:800,color:examColor,letterSpacing:1}}>
              {countdown.days>60?"🟢 ON TRACK":countdown.days>30?"🟡 HURRY UP":"🔴 URGENT"}
            </span>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:20}}>
          {[
            {val:String(countdown.days).padStart(3,"0"),label:"DAYS"},
            {val:String(countdown.hrs).padStart(2,"0"), label:"HOURS"},
            {val:String(countdown.mins).padStart(2,"0"),label:"MINS"},
            {val:String(countdown.secs).padStart(2,"0"),label:"SECS"},
          ].map(({val,label},idx)=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:6}}>
              {idx>0&&<div style={{display:"flex",flexDirection:"column",gap:8,paddingBottom:28}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:examColor,boxShadow:`0 0 10px ${examColor}`}}/>
                <div style={{width:7,height:7,borderRadius:"50%",background:examColor,boxShadow:`0 0 10px ${examColor}`}}/>
              </div>}
              <div style={{textAlign:"center"}}>
                <div style={{display:"flex",gap:4}}>
                  {val.split("").map((d,j)=>(
                    <div key={j} style={{width:52,height:76,background:"linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.03))",border:`2px solid ${examBorder}`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:46,fontWeight:900,color:"white",fontFamily:"'Courier New',monospace",boxShadow:`0 6px 24px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.15),0 0 20px ${examColor}44`,textShadow:`0 0 30px ${examColor},0 0 60px ${examColor}88`,position:"relative",overflow:"hidden",letterSpacing:-2}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:"45%",background:"rgba(255,255,255,.05)",borderRadius:"12px 12px 0 0"}}/>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${examColor}66,transparent)`}}/>
                      {d}
                    </div>
                  ))}
                </div>
                <div style={{fontSize:13,fontWeight:900,letterSpacing:4,color:examColor,marginTop:8,textTransform:"uppercase",textShadow:`0 0 10px ${examColor}66`}}>{label}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(255,255,255,.04)",borderRadius:20,height:8,overflow:"hidden",border:"1px solid rgba(255,255,255,.06)",position:"relative"}}>
          <div style={{background:`linear-gradient(90deg,${examColor}99,${examColor},${examColor}cc)`,borderRadius:20,height:"100%",width:`${countdown.pct}%`,transition:"width 1s ease",boxShadow:`0 0 12px ${examColor}`,position:"relative"}}>
            <div style={{position:"absolute",right:0,top:0,bottom:0,width:3,background:"white",borderRadius:20,opacity:.8}}/>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
          <span style={{fontSize:11,color:"#334155",fontWeight:600}}>Mar 27, 2026</span>
          <span style={{fontSize:11,fontWeight:800,color:examColor}}>{countdown.pct}% prep time used</span>
          <span style={{fontSize:11,color:"#334155",fontWeight:600}}>Feb 15, 2027</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["dashboard",...SUBJECTS.map(s=>s.id)].map(t=>{
          const sub=SUBJECTS.find(s=>s.id===t), active=tab===t;
          return <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 13px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:active?700:500,fontSize:13,background:active?(sub?sub.color:"#1e3a8a"):"white",color:active?"white":"#374151",boxShadow:active?"0 2px 10px rgba(0,0,0,.22)":"0 1px 3px rgba(0,0,0,.08)",transition:"all .18s"}}>
            {t==="dashboard"?"🏠 Dashboard":`${sub.icon} ${sub.name}`}
          </button>;
        })}
      </div>

      {/* DASHBOARD */}
      {tab==="dashboard"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:14}}>
          {stats.ss.map(s=>(
            <div key={s.id} onClick={()=>setTab(s.id)} style={{background:"white",borderRadius:12,padding:"14px 16px",cursor:"pointer",borderTop:`4px solid ${s.color}`,boxShadow:"0 1px 4px rgba(0,0,0,.07)",transition:"transform .15s,box-shadow .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.12)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.07)";}}>
              <div style={{fontSize:26}}>{s.icon}</div>
              <div style={{fontWeight:700,fontSize:13,marginTop:5,color:"#111827"}}>{s.name}</div>
              <div style={{fontSize:24,fontWeight:800,color:s.color}}>{Math.round(s.done/s.total*100)}%</div>
              <div style={{fontSize:11,color:"#6b7280"}}>{s.done}/{s.total} chapters</div>
              {s.prog>0&&<div style={{fontSize:11,color:"#d97706",marginTop:2}}>🔄 {s.prog} in progress</div>}
              {s.rev>0 &&<div style={{fontSize:11,color:"#dc2626",marginTop:1}}>🚩 {s.rev} flagged</div>}
              <div style={{marginTop:8}}>
                <AnimatedBar pct={Math.round(s.done/s.total*100)} color={s.color} height={6}/>
              </div>
            </div>
          ))}
          {/* Chapter overview card */}
          {(()=>{
            const allChs=SUBJECTS.flatMap(s=>flattenChapters(s));
            const counts={
              not_started: allChs.filter(c=>cd(c.id).status==="not_started").length,
              in_progress: allChs.filter(c=>cd(c.id).status==="in_progress").length,
              completed:   allChs.filter(c=>cd(c.id).status==="completed").length,
              revised:     allChs.filter(c=>cd(c.id).status==="revised").length,
              flagged:     allChs.filter(c=>cd(c.id).revision).length,
            };
            return (
              <div style={{background:"linear-gradient(135deg,#1e3a8a,#3730a3)",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,.12)",color:"white",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                <div style={{fontWeight:800,fontSize:13,marginBottom:10,opacity:.9}}>📊 Chapter Overview</div>
                {[
                  {label:"Not Started",count:counts.not_started,color:"#94a3b8",bg:"rgba(148,163,184,.15)"},
                  {label:"In Progress",count:counts.in_progress,color:"#fcd34d",bg:"rgba(252,211,77,.15)"},
                  {label:"Completed",  count:counts.completed,  color:"#34d399",bg:"rgba(52,211,153,.15)"},
                  {label:"Revised ⭐", count:counts.revised,    color:"#c4b5fd",bg:"rgba(196,181,253,.15)"},
                  {label:"🚩 Flagged", count:counts.flagged,    color:"#fca5a5",bg:"rgba(252,165,165,.15)"},
                ].map(({label,count,color,bg})=>(
                  <div key={label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",borderRadius:7,background:bg,marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:600,color}}>{label}</span>
                    <span style={{fontSize:16,fontWeight:800,color}}>{count}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div style={{background:"white",borderRadius:12,padding:"16px 18px",marginBottom:12,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:12,color:"#111827"}}>📖 How to use</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
            {[
              {dot:"⬜",label:"Not Started",    desc:"Chapter not yet studied",        color:"#6b7280",bg:"#f9fafb",border:"#e5e7eb"},
              {dot:"🔄",label:"In Progress",    desc:"Currently being studied",        color:"#d97706",bg:"#fffbeb",border:"#fcd34d"},
              {dot:"✅",label:"Completed",      desc:"Studied and done",               color:"#059669",bg:"#f0fdf4",border:"#86efac"},
              {dot:"🌟",label:"Revised",        desc:"Completed + revision done ✓",    color:"#7c3aed",bg:"#f5f3ff",border:"#c4b5fd"},
              {dot:"🚩",label:"Needs Revision", desc:"Flag chapters to revisit later", color:"#dc2626",bg:"#fef2f2",border:"#fca5a5"},
              {dot:"📎",label:"Has Papers",     desc:"Question paper/answer attached", color:"#059669",bg:"#f0fdf4",border:"#86efac"},
            ].map(({dot,label,desc,color,bg,border})=>(
              <div key={label} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:bg,border:`1px solid ${border}`,borderRadius:10}}>
                <div style={{fontSize:20,lineHeight:1,marginTop:1,flexShrink:0}}>{dot}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color}}>{label}</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,fontSize:12,color:"#9ca3af",background:"#f8fafc",borderRadius:8,padding:"8px 12px"}}>
            💡 Click the <strong>status badge</strong> to cycle statuses. Use <strong>🚩</strong> to flag for revision. Use <strong>+ Test</strong> for scores. Use <strong>📎</strong> to attach papers.
          </div>
        </div>

        <div style={{background:"white",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:12,color:"#111827"}}>📝 Recent Test Scores</div>
          {(()=>{
            const all=SUBJECTS.flatMap(sub=>flattenChapters(sub).flatMap(ch=>(cd(ch.id).tests||[]).map(t=>({...t,cName:ch.name,sIcon:sub.icon}))));
            all.sort((a,b)=>new Date(b.date)-new Date(a.date));
            if (!all.length) return <div style={{color:"#9ca3af",fontSize:14,textAlign:"center",padding:"18px 0"}}>No test scores yet!</div>;
            return all.slice(0,10).map((t,i)=>{
              const p=pct(t.obtained,t.max);
              return <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                <span style={{fontSize:18}}>{t.sIcon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.cName}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{t.type} • {t.date}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,fontSize:16,color:pctColor(p)}}>{t.obtained}/{t.max}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{p}%</div>
                </div>
              </div>;
            });
          })()}
        </div>
      </>}

      {/* SUBJECT VIEW */}
      {SUBJECTS.map(sub=>{
        if (tab!==sub.id) return null;
        const allCh=flattenChapters(sub);
        const done=allCh.filter(c=>["completed","revised"].includes(cd(c.id).status)).length;
        let sections;
        if (sub.chapters) { sections=[{name:null,chs:allCh}]; }
        else { let i=0; sections=sub.sections.map(sec=>{ const chs=allCh.slice(i,i+sec.chapters.length); i+=sec.chapters.length; return {name:sec.name,chs}; }); }
        return <div key={sub.id}>
          <div style={{background:sub.color,borderRadius:12,padding:"16px 20px",marginBottom:14,color:"white",display:"flex",alignItems:"center",gap:16,boxShadow:`0 4px 20px ${sub.color}55`}}>
            <span style={{fontSize:34}}>{sub.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:20}}>{sub.name}</div>
              <div style={{fontSize:13,opacity:.85,marginTop:2}}>{done}/{allCh.length} chapters complete</div>
              <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
                {[
                  {label:"Not Started",count:allCh.filter(c=>cd(c.id).status==="not_started").length,color:"rgba(255,255,255,.5)"},
                  {label:"In Progress",count:allCh.filter(c=>cd(c.id).status==="in_progress").length,color:"#fcd34d"},
                  {label:"Completed",  count:allCh.filter(c=>cd(c.id).status==="completed").length,  color:"#6ee7b7"},
                  {label:"Revised",    count:allCh.filter(c=>cd(c.id).status==="revised").length,    color:"#c4b5fd"},
                  {label:"🚩 Flagged", count:allCh.filter(c=>cd(c.id).revision).length,              color:"#fca5a5"},
                ].filter(s=>s.count>0).map(({label,count,color})=>(
                  <div key={label} style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:16,fontWeight:800,color}}>{count}</span>
                    <span style={{fontSize:11,opacity:.8}}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <DonutRing pct={Math.round(done/allCh.length*100)} color="white" size={90}/>
          </div>
          {sections.map(sec=>(
            <div key={sec.name||"m"} style={{marginBottom:20}}>
              {sec.name&&<div style={{fontWeight:700,color:sub.color,fontSize:13,marginBottom:8,paddingBottom:6,borderBottom:`2px solid ${sub.color}33`,display:"flex",alignItems:"center",gap:6}}><span>📌</span>{sec.name}</div>}
              {sec.chs.map(ch=>{
                const cdata=cd(ch.id),sc=S_CFG[cdata.status],tests=cdata.tests||[];
                const avg=tests.length?Math.round(tests.reduce((a,t)=>a+pct(t.obtained,t.max),0)/tests.length):null;
                const hasP=hasPapers(cdata.papers);
                return <div key={ch.id} style={{background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:10,padding:"10px 13px",marginBottom:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <button onClick={()=>cycleStatus(ch.id)} style={{background:sc.color,color:"white",border:"none",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{sc.dot} {sc.label}</button>
                    <div style={{flex:1,fontWeight:600,fontSize:14,color:"#1e293b",minWidth:80}}>{ch.name}</div>
                    <div style={{display:"flex",gap:5,flexShrink:0}}>
                      <button onClick={()=>toggleRev(ch.id)} title="Flag for revision" style={{background:cdata.revision?"#fef2f2":"white",border:`1px solid ${cdata.revision?"#fca5a5":"#e5e7eb"}`,borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:13}}>{cdata.revision?"🚩":"🏳️"}</button>
                      <button onClick={()=>setNoteModal({id:ch.id,name:ch.name,note:cdata.notes||""})} title="Notes" style={{background:cdata.notes?"#eff6ff":"white",border:`1px solid ${cdata.notes?"#93c5fd":"#e5e7eb"}`,borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:13}}>{cdata.notes?"📝":"📄"}</button>
                      <button onClick={()=>setPaperModal({id:ch.id,name:ch.name,papers:initPapers(cdata.papers)})} title="Papers" style={{background:hasP?"#f0fdf4":"white",border:`1px solid ${hasP?"#86efac":"#e5e7eb"}`,borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:13}}>📎</button>
                      <button onClick={()=>{setTestModal({id:ch.id,name:ch.name});setTf({type:"Class Test",date:new Date().toISOString().slice(0,10),obtained:"",max:"",notes:""}); }} style={{background:"white",border:"1px solid #e5e7eb",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#374151"}}>+ Test</button>
                    </div>
                  </div>
                  {tests.length>0&&<div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
                    {tests.map(t=>{const p=pct(t.obtained,t.max); return <div key={t.id} style={{background:"white",borderRadius:7,padding:"3px 9px",fontSize:12,border:"1px solid #e5e7eb",display:"flex",gap:5,alignItems:"center"}}>
                      <span style={{color:"#6b7280"}}>{t.type}</span>
                      <span style={{fontWeight:700,color:pctColor(p)}}>{t.obtained}/{t.max} ({p}%)</span>
                      <button onClick={()=>delTest(ch.id,t.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#d1d5db",fontSize:11}}>✕</button>
                    </div>;})}
                    {avg!==null&&<span style={{fontSize:12,color:"#6b7280"}}>Avg: <strong style={{color:pctColor(avg)}}>{avg}%</strong></span>}
                  </div>}
                </div>;
              })}
            </div>
          ))}
        </div>;
      })}

      {/* TEST MODAL */}
      {testModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
        <div style={{background:"white",borderRadius:16,padding:22,width:"100%",maxWidth:400,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
          <div style={{fontWeight:800,fontSize:17,color:"#111827"}}>📝 Add Test Score</div>
          <div style={{color:"#6b7280",fontSize:13,marginBottom:14,marginTop:2}}>{testModal.name}</div>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4,color:"#374151"}}>Test Type</div>
          <select value={tf.type} onChange={e=>setTf({...tf,type:e.target.value})} style={inp({marginBottom:11})}>
            {TEST_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4,color:"#374151"}}>Date</div>
          <input type="date" value={tf.date} onChange={e=>setTf({...tf,date:e.target.value})} style={inp({marginBottom:11})}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
            <div><div style={{fontSize:13,fontWeight:600,marginBottom:4,color:"#374151"}}>Marks Obtained</div><input type="number" min="0" placeholder="e.g. 18" value={tf.obtained} onChange={e=>setTf({...tf,obtained:e.target.value})} style={inp()}/></div>
            <div><div style={{fontSize:13,fontWeight:600,marginBottom:4,color:"#374151"}}>Max Marks</div><input type="number" min="1" placeholder="e.g. 20" value={tf.max} onChange={e=>setTf({...tf,max:e.target.value})} style={inp()}/></div>
          </div>
          {tf.obtained&&tf.max&&+tf.max>0&&<div style={{textAlign:"center",padding:"8px 0",fontSize:26,fontWeight:800,color:pctColor(pct(+tf.obtained,+tf.max)),marginBottom:8}}>
            {pct(+tf.obtained,+tf.max)}% {pct(+tf.obtained,+tf.max)>=80?"🎉":pct(+tf.obtained,+tf.max)>=60?"👍":"📖"}
          </div>}
          <div style={{fontSize:13,fontWeight:600,marginBottom:4,color:"#374151"}}>Notes (optional)</div>
          <textarea placeholder="Any remarks…" value={tf.notes} onChange={e=>setTf({...tf,notes:e.target.value})} style={inp({minHeight:60,resize:"vertical",marginBottom:14})}/>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <button onClick={()=>setTestModal(null)} style={{flex:1,padding:10,borderRadius:10,border:"1px solid #d1d5db",background:"white",cursor:"pointer",fontWeight:600,fontSize:14}}>Cancel</button>
            <button onClick={()=>{addTest(testModal.id);setTestModal(null);}} style={{flex:1,padding:10,borderRadius:10,border:"none",background:"#1e3a8a",color:"white",cursor:"pointer",fontWeight:700,fontSize:14}}>Save Score</button>
          </div>
          {(cd(testModal.id).tests||[]).length>0&&<>
            <div style={{fontWeight:700,fontSize:13,color:"#374151",marginBottom:6}}>Previous Scores</div>
            {(cd(testModal.id).tests||[]).map(t=>{const p=pct(t.obtained,t.max); return <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#f8fafc",borderRadius:8,marginBottom:5}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{t.type} • {t.date}</div>{t.notes&&<div style={{fontSize:11,color:"#6b7280"}}>{t.notes}</div>}</div>
              <div style={{fontWeight:800,color:pctColor(p),fontSize:15}}>{t.obtained}/{t.max}</div>
              <div style={{fontWeight:600,color:pctColor(p),fontSize:12}}>{p}%</div>
              <button onClick={()=>delTest(testModal.id,t.id)} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",color:"#dc2626",fontSize:12,fontWeight:700}}>✕</button>
            </div>;})}
          </>}
        </div>
      </div>}

      {/* NOTE MODAL */}
      {noteModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
        <div style={{background:"white",borderRadius:16,padding:22,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
          <div style={{fontWeight:800,fontSize:17,color:"#111827"}}>📄 Chapter Notes</div>
          <div style={{color:"#6b7280",fontSize:13,marginBottom:12,marginTop:2}}>{noteModal.name}</div>
          <textarea value={noteModal.note} onChange={e=>setNoteModal({...noteModal,note:e.target.value})} placeholder="Study notes, formulae, reminders…" style={inp({minHeight:110,resize:"vertical",marginBottom:14})}/>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setNoteModal(null)} style={{flex:1,padding:10,borderRadius:10,border:"1px solid #d1d5db",background:"white",cursor:"pointer",fontWeight:600,fontSize:14}}>Cancel</button>
            <button onClick={()=>{saveNote(noteModal.id,noteModal.note);setNoteModal(null);}} style={{flex:1,padding:10,borderRadius:10,border:"none",background:"#1e3a8a",color:"white",cursor:"pointer",fontWeight:700,fontSize:14}}>Save Note</button>
          </div>
        </div>
      </div>}

      {/* PAPERS MODAL */}
      {paperModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
        <div style={{background:"white",borderRadius:16,padding:22,width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
          <div style={{fontWeight:800,fontSize:17,color:"#111827"}}>📎 Papers & Resources</div>
          <div style={{color:"#6b7280",fontSize:13,marginBottom:12,marginTop:2}}>{paperModal.name}</div>
          <div style={{fontSize:12,color:"#9ca3af",marginBottom:16,background:"#f8fafc",borderRadius:8,padding:"8px 12px"}}>Upload to Google Drive → Right click → Share → Copy link → Paste below</div>
          {PAPER_TYPES.map(({key,label,color,bg,border})=>(
            <div key={key} style={{marginBottom:16,background:bg,border:`1px solid ${border}`,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:8,color}}>{label}</div>
              {toArr(paperModal.papers[key]).map((link,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <input type="url" placeholder={`Paste Google Drive link ${i+1}`} value={link}
                    onChange={e=>{const arr=[...toArr(paperModal.papers[key])];arr[i]=e.target.value;setPaperModal({...paperModal,papers:{...paperModal.papers,[key]:arr}});}}
                    style={inp({flex:1,background:"white",fontSize:13})}/>
                  {link&&<a href={link} target="_blank" rel="noreferrer" style={{background:"white",border:`1px solid ${border}`,borderRadius:7,padding:"6px 8px",fontSize:12,textDecoration:"none",color,whiteSpace:"nowrap"}}>🔗</a>}
                  {toArr(paperModal.papers[key]).length>1&&<button onClick={()=>{const arr=toArr(paperModal.papers[key]).filter((_,j)=>j!==i);setPaperModal({...paperModal,papers:{...paperModal.papers,[key]:arr}});}} style={{background:"#fee2e2",border:"none",borderRadius:7,padding:"6px 8px",cursor:"pointer",color:"#dc2626",fontSize:12,fontWeight:700}}>✕</button>}
                </div>
              ))}
              <button onClick={()=>{const arr=[...toArr(paperModal.papers[key]),""];setPaperModal({...paperModal,papers:{...paperModal.papers,[key]:arr}});}} style={{background:"white",border:`1px dashed ${border}`,borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:12,color,fontWeight:600,marginTop:2}}>+ Add another link</button>
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <button onClick={()=>setPaperModal(null)} style={{flex:1,padding:10,borderRadius:10,border:"1px solid #d1d5db",background:"white",cursor:"pointer",fontWeight:600,fontSize:14}}>Cancel</button>
            <button onClick={()=>{savePapers(paperModal.id,paperModal.papers);setPaperModal(null);}} style={{flex:1,padding:10,borderRadius:10,border:"none",background:"#1e3a8a",color:"white",cursor:"pointer",fontWeight:700,fontSize:14}}>Save Links</button>
          </div>
        </div>
      </div>}

    </div>
  );
}

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ───────── Supabase Config ───────── */
const SUPA_URL = "https://mlfgdutctvbvqwebqajp.supabase.co";
const SUPA_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmdkdXRjdHZidnF3ZWJxYWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ2MDIsImV4cCI6MjA4OTgxMDYwMn0.TPBeT6y-fFGAgcME_mmKqBUYHFUMVB1FO3wrAhneKW4";
const EXAM_DATE = new Date("2027-02-15T00:00:00");
const START_DATE = new Date("2026-03-27T00:00:00");
const ROW_IDS: Record<string, string> = { home: "savio", school: "savio_school" };
const LS_KEYS: Record<string, string> = { home: "savio_v4", school: "savio_school_v4" };

/* ───────── Types ───────── */
interface ChapterData {
  status: string;
  revision: boolean;
  tests: TestEntry[];
  notes: string;
  papers?: Record<string, string[]> | null;
}
interface TestEntry {
  id: number;
  type: string;
  date: string;
  obtained: string;
  max: string;
  notes: string;
}
interface Chapter { id: string; name: string; section?: string; }
interface SubjectDef {
  id: string; name: string; icon: string; color: string;
  chapters?: string[];
  sections?: { name: string; chapters: string[] }[];
}
interface SubjectStat extends SubjectDef {
  total: number; done: number; prog: number; flagged: number; pct: number;
}

/* ───────── Data helpers ───────── */
async function fetchData(mode: string): Promise<Record<string, ChapterData> | null> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/tracker_data?id=eq.${ROW_IDS[mode]}&select=data`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const d = (await res.json())?.[0]?.data;
    return d && typeof d === "object" && Object.keys(d).length > 0 ? d : null;
  } catch { return null; }
}

async function saveData(mode: string, data: Record<string, ChapterData>) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/tracker_data`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: ROW_IDS[mode], data }),
    });
  } catch { /* silent */ }
}

function getCountdown() {
  const diff = +EXAM_DATE - +new Date();
  if (diff <= 0) return { days: 0, hrs: 0, mins: 0, secs: 0, pct: 100 };
  return {
    days: Math.floor(diff / 864e5),
    hrs: Math.floor((diff % 864e5) / 36e5),
    mins: Math.floor((diff % 36e5) / 6e4),
    secs: Math.floor((diff % 6e4) / 1e3),
    pct: Math.max(0, Math.min(100, Math.round(((+new Date() - +START_DATE) / (+EXAM_DATE - +START_DATE)) * 100))),
  };
}

/* ───────── Subjects ───────── */
const SUBJECTS: SubjectDef[] = [
  { id: "maths", name: "Mathematics", icon: "📐", color: "#2563eb",
    chapters: ["Real Numbers","Polynomials","Pair of Linear Equations in Two Variables","Quadratic Equations","Arithmetic Progressions","Triangles","Coordinate Geometry","Introduction to Trigonometry","Some Applications of Trigonometry","Circles","Areas Related to Circles","Surface Areas and Volumes","Statistics","Probability"] },
  { id: "science", name: "Science", icon: "🔬", color: "#059669",
    chapters: ["Chemical Reactions and Equations","Acids, Bases and Salts","Metals and Non-metals","Carbon and its Compounds","Life Processes","Control and Coordination","How do Organisms Reproduce?","Heredity","Light – Reflection and Refraction","Human Eye and Colourful World","Electricity","Magnetic Effects of Electric Current","Our Environment"] },
  { id: "english", name: "English", icon: "📖", color: "#d97706",
    sections: [
      { name: "First Flight – Prose", chapters: ["A Letter to God","Nelson Mandela: Long Walk to Freedom","Two Stories about Flying","From the Diary of Anne Frank","Glimpses of India","Mijbil the Otter","Madam Rides the Bus","The Sermon at Benares","The Proposal"] },
      { name: "First Flight – Poetry", chapters: ["Dust of Snow","Fire and Ice","A Tiger in the Zoo","How to Tell Wild Animals","The Ball Poem","Amanda!","Animals","The Trees","Fog","The Tale of Custard the Dragon","For Anne Gregory"] },
      { name: "Footprints Without Feet", chapters: ["A Triumph of Surgery","The Thief's Story","The Midnight Visitor","A Question of Trust","Footprints without Feet","The Making of a Scientist","The Necklace","Bholi","The Book That Saved the Earth"] },
    ] },
  { id: "hindi", name: "Hindi", icon: "🪔", color: "#dc2626",
    sections: [
      { name: "Kshitij – Kavya", chapters: ["Kabir – Sakhiyan aur Sabad","Mirabai – Pad","Bihari – Dohe","Maithili Sharan Gupt – Manushyata","Sumitranandan Pant – Parvat Pradesh mein Pavas","Mahadevi Verma – Madhur Madhur Mere Deepak Jal","Nagarjun – Yah Danturit Muskan / Fasal","Mangalesh Dabral – Sangatkar"] },
      { name: "Kshitij – Gadya", chapters: ["Swayam Prakash – Netaji ka Chashma","Ram Vriksh Benipuri – Balgobin Bhagat","Yashpal – Lakhnavi Andaaz","Mannu Bhandari – Ek Kahani Yeh Bhi","Sarveshwar Dayal Saxena – Manoj","Hazari Prasad Dwivedi – Sanskriti","Habib Tanvir – Kartoos"] },
      { name: "Kritika", chapters: ["Mata ka Anchal","George Pancham ki Naak","Sana-Sana Haath Jodi","Ehi Thaiya Jhulni Herani Ho Rama","Main Kyun Likhta Hoon"] },
    ] },
  { id: "sst", name: "Social Studies", icon: "🌍", color: "#7c3aed",
    sections: [
      { name: "History", chapters: ["The Rise of Nationalism in Europe","Nationalism in India","The Making of a Global World","The Age of Industrialisation","Print Culture and the Modern World"] },
      { name: "Geography", chapters: ["Resources and Development","Forest and Wildlife Resources","Water Resources","Agriculture","Minerals and Energy Resources","Manufacturing Industries","Lifelines of National Economy"] },
      { name: "Political Science", chapters: ["Power Sharing","Federalism","Gender, Religion and Caste","Political Parties","Outcomes of Democracy"] },
      { name: "Economics", chapters: ["Development","Sectors of the Indian Economy","Money and Credit","Globalisation and the Indian Economy","Consumer Rights"] },
    ] },
];

const SCHOOL_SUBJECTS: SubjectDef[] = [
  { id: "maths", name: "Mathematics", icon: "📐", color: "#2563eb",
    chapters: ["Real Numbers","Polynomials","Pair of Linear Equations in Two Variables","Quadratic Equations","Arithmetic Progressions","Triangles","Coordinate Geometry","Introduction to Trigonometry","Some Applications of Trigonometry","Circles","Areas Related to Circles","Surface Areas and Volumes","Statistics","Probability"] },
  { id: "science", name: "Science", icon: "🔬", color: "#059669",
    chapters: ["Chemical Reactions and Equations","Acids, Bases and Salts","Metals and Non-metals","Carbon and its Compounds","Life Processes","Control and Coordination","How do Organisms Reproduce?","Heredity","Light – Reflection and Refraction","Human Eye and Colourful World","Electricity","Magnetic Effects of Electric Current","Our Environment"] },
  { id: "english", name: "English", icon: "📖", color: "#d97706",
    sections: [
      { name: "First Flight – Prose", chapters: ["A Letter to God","Nelson Mandela: Long Walk to Freedom","Two Stories about Flying","From the Diary of Anne Frank","Glimpses of India","Mijbil the Otter","Madam Rides the Bus","The Sermon at Benares","The Proposal"] },
      { name: "First Flight – Poetry", chapters: ["Dust of Snow","Fire and Ice","A Tiger in the Zoo","How to Tell Wild Animals","The Ball Poem","Amanda!","Animals","The Trees","Fog","The Tale of Custard the Dragon","For Anne Gregory"] },
      { name: "Footprints Without Feet", chapters: ["A Triumph of Surgery","The Thief's Story","The Midnight Visitor","A Question of Trust","Footprints without Feet","The Making of a Scientist","The Necklace","Bholi","The Book That Saved the Earth"] },
    ] },
  { id: "hindi", name: "Hindi", icon: "🪔", color: "#dc2626",
    sections: [
      { name: "Kshitij – Kavya", chapters: ["Kabir – Sakhiyan aur Sabad","Mirabai – Pad","Bihari – Dohe","Maithili Sharan Gupt – Manushyata","Sumitranandan Pant – Parvat Pradesh mein Pavas","Mahadevi Verma – Madhur Madhur Mere Deepak Jal","Nagarjun – Yah Danturit Muskan / Fasal","Mangalesh Dabral – Sangatkar"] },
      { name: "Kshitij – Gadya", chapters: ["Swayam Prakash – Netaji ka Chashma","Ram Vriksh Benipuri – Balgobin Bhagat","Yashpal – Lakhnavi Andaaz","Mannu Bhandari – Ek Kahani Yeh Bhi","Sarveshwar Dayal Saxena – Manoj","Hazari Prasad Dwivedi – Sanskriti","Habib Tanvir – Kartoos"] },
      { name: "Kritika", chapters: ["Mata ka Anchal","George Pancham ki Naak","Sana-Sana Haath Jodi","Ehi Thaiya Jhulni Herani Ho Rama","Main Kyun Likhta Hoon"] },
    ] },
  { id: "sst", name: "Social Studies", icon: "🌍", color: "#7c3aed",
    sections: [
      { name: "History", chapters: ["The Rise of Nationalism in Europe","Nationalism in India","The Making of a Global World","The Age of Industrialisation","Print Culture and the Modern World"] },
      { name: "Geography", chapters: ["Resources and Development","Forest and Wildlife Resources","Water Resources","Agriculture","Minerals and Energy Resources","Manufacturing Industries","Lifelines of National Economy"] },
      { name: "Political Science", chapters: ["Power Sharing","Federalism","Gender, Religion and Caste","Political Parties","Outcomes of Democracy"] },
      { name: "Economics", chapters: ["Development","Sectors of the Indian Economy","Money and Credit","Globalisation and the Indian Economy","Consumer Rights"] },
    ] },
];

function getChapters(sub: SubjectDef): Chapter[] {
  if (sub.chapters) return sub.chapters.map((c, i) => ({ id: `${sub.id}__${i}`, name: c }));
  const out: Chapter[] = [];
  sub.sections!.forEach(s =>
    s.chapters.forEach((c, i) => out.push({ id: `${sub.id}__${s.name}__${i}`, name: c, section: s.name }))
  );
  return out;
}

const STATUSES = ["not_started", "in_progress", "completed", "revised"] as const;
const STATUS_META: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  not_started: { label: "Not Started", color: "#94a3b8", icon: "⬜", bg: "#f8fafc" },
  in_progress: { label: "In Progress", color: "#f59e0b", icon: "🔄", bg: "#fffbeb" },
  completed:   { label: "Completed",   color: "#10b981", icon: "✅", bg: "#ecfdf5" },
  revised:     { label: "Revised",     color: "#8b5cf6", icon: "🌟", bg: "#f5f3ff" },
};

const TEST_TYPES = [
  "Class Test","Unit Test","Half Yearly","Annual Exam",
  "Practice Test","Mock Test","Oral Test","Assignment","Other",
];

const PAPER_TYPES = [
  { key: "qp", label: "📄 Question Paper", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  { key: "ma", label: "✅ Model Answer",   color: "#059669", bg: "#f0fdf4", border: "#86efac" },
  { key: "as", label: "📝 Answer Sheet",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
];

function pctCalc(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function scoreColor(p: number) { return p >= 80 ? "#10b981" : p >= 60 ? "#f59e0b" : "#ef4444"; }
function ensureArr(v: unknown): string[] {
  if (!v) return [""];
  if (Array.isArray(v)) return v.length ? v : [""];
  return [v as string];
}
function hasPapers(p: Record<string, string[]> | null | undefined): boolean {
  return !!p && PAPER_TYPES.some(({ key }) => ensureArr(p[key]).some(Boolean));
}
function initPapers(p?: Record<string, string[]> | null): Record<string, string[]> {
  const o: Record<string, string[]> = {};
  PAPER_TYPES.forEach(({ key }) => { o[key] = ensureArr(p ? p[key] : null); });
  return o;
}

/* ───────── UI Components ───────── */

function CircleProgress({ value, size = 72, stroke = 7, color = "#2563eb", bg = "#e2e8f0" }: {
  value: number; size?: number; stroke?: number; color?: string; bg?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(value), 200); return () => clearTimeout(t); }, [value]);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${(anim / 100) * c} ${c}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
}

function ProgressBar({ value, color, h = 6 }: { value: number; color: string; h?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 100); return () => clearTimeout(t); }, [value]);
  return (
    <div style={{ background: "#e5e7eb", borderRadius: 99, height: h, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 99, width: `${w}%`,
        background: `linear-gradient(90deg, ${color}cc, ${color})`,
        transition: "width .8s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function Glass({ children, style, onClick, hover }: {
  children: React.ReactNode; style?: CSSProperties; onClick?: () => void; hover?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)", borderRadius: 16,
        border: "1px solid rgba(255,255,255,.5)",
        boxShadow: hov && hover ? "0 8px 32px rgba(0,0,0,.12)" : "0 2px 12px rgba(0,0,0,.06)",
        transform: hov && hover ? "translateY(-3px)" : "none",
        transition: "all .22s ease", cursor: onClick ? "pointer" : "default",
        ...style,
      }}>{children}</div>
  );
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: 20, padding: "24px 26px", width: "100%",
        maxWidth: 440, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 25px 60px rgba(0,0,0,.25)", animation: "modalIn .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>{title}</div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 10,
            width: 36, height: 36, cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Digit({ ch, glow }: { ch: string; glow: string }) {
  return (
    <div style={{
      width: 44, height: 60,
      background: "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.04))",
      border: `1.5px solid ${glow}44`, borderRadius: 12,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 32, fontWeight: 900, color: "white", fontFamily: "'Courier New', monospace",
      boxShadow: `0 4px 20px rgba(0,0,0,.4), 0 0 20px ${glow}33`,
      textShadow: `0 0 20px ${glow}`,
    }}>{ch}</div>
  );
}

/* ═══════════════════════════════════
   MAIN APP COMPONENT
   ═══════════════════════════════════ */
export default function App() {
  const [mode, setMode] = useState<"home" | "school">("home");
  const [data, setData] = useState<Record<string, ChapterData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");

  // Modals
  const [testModal, setTestModal] = useState<{ id: string; name: string } | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: string; name: string; note: string } | null>(null);
  const [paperModal, setPaperModal] = useState<{ id: string; name: string; papers: Record<string, string[]> } | null>(null);
  const [testForm, setTestForm] = useState({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" });

  const [countdown, setCountdown] = useState(getCountdown());
  const isSchool = mode === "school";
  const activeSubjects = useMemo(() => isSchool ? SCHOOL_SUBJECTS : SUBJECTS, [isSchool]);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    setLoading(true); setData({}); setTab("dashboard"); setSearch("");
    (async () => {
      let d = await fetchData(mode);
      if (d) { setData(d); try { localStorage.setItem(LS_KEYS[mode], JSON.stringify(d)); } catch {} }
      else { try { const s = localStorage.getItem(LS_KEYS[mode]); if (s) { d = JSON.parse(s); setData(d!); await saveData(mode, d!); } } catch {} }
      setLoading(false);
    })();
  }, [mode]);

  const persist = useCallback(async (d: Record<string, ChapterData>) => {
    setData(d);
    try { localStorage.setItem(LS_KEYS[mode], JSON.stringify(d)); } catch {}
    setSaving(true); await saveData(mode, d); setSaving(false);
  }, [mode]);

  const getCh = (id: string): ChapterData => data[id] || { status: "not_started", revision: false, tests: [], notes: "" };

  const cycleStatus = (id: string) => {
    const ch = getCh(id);
    const i = STATUSES.indexOf(ch.status as typeof STATUSES[number]);
    persist({ ...data, [id]: { ...ch, status: STATUSES[(i + 1) % 4] } });
  };

  const toggleFlag = (id: string) => {
    const ch = getCh(id);
    persist({ ...data, [id]: { ...ch, revision: !ch.revision } });
  };

  const addTest = (id: string) => {
    if (!testForm.obtained || !testForm.max) return;
    const ch = getCh(id);
    persist({ ...data, [id]: { ...ch, tests: [...(ch.tests || []), { ...testForm, id: Date.now() }] } });
    setTestForm({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" });
  };

  const delTest = (chId: string, testId: number) => {
    const ch = getCh(chId);
    persist({ ...data, [chId]: { ...ch, tests: ch.tests.filter(t => t.id !== testId) } });
  };

  const saveNote = (id: string, note: string) =>
    persist({ ...data, [id]: { ...getCh(id), notes: note } });

  const savePapers = (id: string, papers: Record<string, string[]>) =>
    persist({ ...data, [id]: { ...getCh(id), papers } });

  /* ── Stats ── */
  const stats = useMemo(() => {
    const ss: SubjectStat[] = activeSubjects.map(s => {
      const chs = getChapters(s);
      const done = chs.filter(c => ["completed", "revised"].includes(getCh(c.id).status)).length;
      const prog = chs.filter(c => getCh(c.id).status === "in_progress").length;
      const flagged = chs.filter(c => getCh(c.id).revision).length;
      return { ...s, total: chs.length, done, prog, flagged, pct: pctCalc(done, chs.length) };
    });
    const tot = ss.reduce((a, b) => a + b.total, 0);
    const don = ss.reduce((a, b) => a + b.done, 0);
    return { ss, tot, don, pct: pctCalc(don, tot) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeSubjects]);

  const allTests = useMemo(() => {
    const out: (TestEntry & { chName: string; sIcon: string; sColor: string })[] = [];
    activeSubjects.forEach(s => getChapters(s).forEach(c => {
      (getCh(c.id).tests || []).forEach(t => out.push({ ...t, chName: c.name, sIcon: s.icon, sColor: s.color }));
    }));
    out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeSubjects]);

  const testAnalytics = useMemo(() => {
    const bySubject: Record<string, { icon: string; color: string; avg: number; count: number }> = {};
    activeSubjects.forEach(s => {
      const tests: TestEntry[] = [];
      getChapters(s).forEach(c => (getCh(c.id).tests || []).forEach(t => tests.push(t)));
      if (tests.length) bySubject[s.name] = {
        icon: s.icon, color: s.color, count: tests.length,
        avg: Math.round(tests.reduce((a, t) => a + pctCalc(+t.obtained, +t.max), 0) / tests.length),
      };
    });
    return bySubject;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeSubjects]);

  const glow = countdown.days > 60 ? "#10b981" : countdown.days > 30 ? "#f59e0b" : "#ef4444";
  const accentGrad = isSchool
    ? "linear-gradient(135deg, #92400e, #b45309)"
    : "linear-gradient(135deg, #1e40af, #7c3aed)";

  const inp = (extra: CSSProperties = {}): CSSProperties => ({
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const,
    outline: "none", transition: "border .2s", ...extra,
  });

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", gap: 12 }}>
      <div style={{ width: 24, height: 24, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <span style={{ fontSize: 16, color: "#64748b" }}>Loading {isSchool ? "School" : "Home"} Tracker…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  /* ═════════ RENDER ═════════ */
  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "linear-gradient(180deg,#f0f4ff 0%,#f8fafc 100%)" }}>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px" }}>

        {/* ════ HEADER ════ */}
        <div style={{ background: accentGrad, borderRadius: 20, padding: "22px 28px", marginBottom: 16, color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 38 }}>{isSchool ? "🏫" : "📚"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Savio's {isSchool ? "School" : "Home"} Tracker</div>
              <div style={{ fontSize: 13, opacity: .8, marginTop: 2 }}>Class 10 • CBSE NCERT{saving ? " • ☁️ Syncing…" : ""}</div>
            </div>
            <div style={{ position: "relative", width: 80, height: 80 }}>
              <CircleProgress value={stats.pct} size={80} stroke={8} color="white" bg="rgba(255,255,255,.2)" />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{stats.pct}%</div>
                <div style={{ fontSize: 9, opacity: .7, fontWeight: 600 }}>DONE</div>
              </div>
            </div>
          </div>
          {/* Quick stats ribbon */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { label: "Chapters", val: `${stats.don}/${stats.tot}`, ico: "📑" },
              { label: "In Progress", val: stats.ss.reduce((a, b) => a + b.prog, 0), ico: "🔄" },
              { label: "Flagged", val: stats.ss.reduce((a, b) => a + b.flagged, 0), ico: "🚩" },
              { label: "Tests", val: allTests.length, ico: "📝" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,.15)", borderRadius: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{s.ico}</span>
                <span style={{ fontWeight: 800, fontSize: 15 }}>{s.val}</span>
                <span style={{ fontSize: 11, opacity: .7 }}>{s.label}</span>
              </div>
            ))}
            <button onClick={() => setMode(m => m === "home" ? "school" : "home")}
              style={{ marginLeft: "auto", background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 12, padding: "6px 14px", cursor: "pointer", color: "white", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              {isSchool ? "🏠 Home" : "🏫 School"}
            </button>
          </div>
        </div>

        {/* ════ COUNTDOWN ════ */}
        <Glass style={{ padding: "20px 24px", marginBottom: 16, background: "linear-gradient(135deg,#0f172a,#1e1b4b)", color: "white", border: `1.5px solid ${glow}33` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${glow}22`, border: `1px solid ${glow}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎯</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "#94a3b8", textTransform: "uppercase" as const }}>Board Exam Countdown</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>CBSE Class 10 • Feb 15, 2027</div>
              </div>
            </div>
            <div style={{ background: `${glow}22`, border: `1px solid ${glow}44`, borderRadius: 20, padding: "4px 14px" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: glow }}>{countdown.days > 60 ? "🟢 ON TRACK" : countdown.days > 30 ? "🟡 HURRY" : "🔴 URGENT"}</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {[
              { val: String(countdown.days).padStart(3, "0"), label: "DAYS" },
              { val: String(countdown.hrs).padStart(2, "0"), label: "HRS" },
              { val: String(countdown.mins).padStart(2, "0"), label: "MIN" },
              { val: String(countdown.secs).padStart(2, "0"), label: "SEC" },
            ].map((u, idx) => (
              <div key={u.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {idx > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 24 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: glow, boxShadow: `0 0 8px ${glow}` }} />
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: glow, boxShadow: `0 0 8px ${glow}` }} />
                </div>}
                <div style={{ textAlign: "center" as const }}>
                  <div style={{ display: "flex", gap: 3 }}>{u.val.split("").map((ch, i) => <Digit key={i} ch={ch} glow={glow} />)}</div>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, color: glow, marginTop: 6, textShadow: `0 0 8px ${glow}66` }}>{u.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 20, height: 6, overflow: "hidden" }}>
            <div style={{ background: `linear-gradient(90deg,${glow}88,${glow})`, height: "100%", width: `${countdown.pct}%`, borderRadius: 20, transition: "width 1s", boxShadow: `0 0 10px ${glow}` }} />
          </div>
        </Glass>

        {/* ════ TABS + SEARCH ════ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {["dashboard", ...activeSubjects.map(s => s.id), "analytics"].map(t => {
            const sub = activeSubjects.find(s => s.id === t);
            const active = tab === t;
            return (
              <button key={t} onClick={() => { setTab(t); setSearch(""); }}
                style={{
                  padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                  fontWeight: active ? 700 : 500, fontSize: 13,
                  background: active ? (sub ? sub.color : t === "analytics" ? "#0f172a" : (isSchool ? "#92400e" : "#1e40af")) : "white",
                  color: active ? "white" : "#475569",
                  boxShadow: active ? `0 2px 12px ${sub ? sub.color + "44" : "rgba(0,0,0,.15)"}` : "0 1px 3px rgba(0,0,0,.06)",
                  transition: "all .2s",
                }}>
                {t === "dashboard" ? "🏠 Dashboard" : t === "analytics" ? "📊 Analytics" : `${sub!.icon} ${sub!.name}`}
              </button>
            );
          })}
          {tab !== "dashboard" && tab !== "analytics" && (
            <input placeholder="🔍 Search chapters…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp({ maxWidth: 220, marginLeft: "auto", background: "white", fontSize: 13 }) }} />
          )}
        </div>

        {/* ════ DASHBOARD ════ */}
        {tab === "dashboard" && (
          <div style={{ animation: "fadeUp .3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
              {stats.ss.map(s => (
                <Glass key={s.id} hover onClick={() => setTab(s.id)} style={{ padding: "18px 20px", borderTop: `4px solid ${s.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 28 }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6, color: "#0f172a" }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{s.done}/{s.total} chapters</div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <CircleProgress value={s.pct} size={62} stroke={6} color={s.color} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: s.color }}>{s.pct}%</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 11 }}>
                    {s.prog > 0 && <span style={{ color: "#f59e0b" }}>🔄 {s.prog}</span>}
                    {s.flagged > 0 && <span style={{ color: "#ef4444" }}>🚩 {s.flagged}</span>}
                  </div>
                </Glass>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Glass style={{ padding: "18px 20px" }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#0f172a" }}>📊 Status Overview</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart><Pie data={[
                      { name: "Done", value: stats.don },
                      { name: "Progress", value: stats.ss.reduce((a, b) => a + b.prog, 0) },
                      { name: "Left", value: stats.tot - stats.don - stats.ss.reduce((a, b) => a + b.prog, 0) },
                    ]} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={2}>
                      <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#e2e8f0" />
                    </Pie></PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1 }}>
                    {[
                      { label: "Completed", val: stats.don, color: "#10b981" },
                      { label: "In Progress", val: stats.ss.reduce((a, b) => a + b.prog, 0), color: "#f59e0b" },
                      { label: "Not Started", val: stats.tot - stats.don - stats.ss.reduce((a, b) => a + b.prog, 0), color: "#94a3b8" },
                      { label: "Flagged", val: stats.ss.reduce((a, b) => a + b.flagged, 0), color: "#ef4444" },
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: r.color, display: "inline-block" }} />{r.label}
                        </span>
                        <span style={{ fontWeight: 700, color: r.color }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Glass>
              <Glass style={{ padding: "18px 20px" }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#0f172a" }}>📝 Recent Tests</div>
                {allTests.length === 0 ? <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center" as const, padding: 20 }}>No test scores yet!</div> :
                  allTests.slice(0, 6).map((t, i) => {
                    const p = pctCalc(+t.obtained, +t.max);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < 5 ? "1px solid #f1f5f9" : "none" }}>
                        <span style={{ fontSize: 16 }}>{t.sIcon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.chName}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.type} • {t.date}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: scoreColor(p) }}>{t.obtained}/{t.max}</div>
                      </div>
                    );
                  })}
              </Glass>
            </div>
          </div>
        )}

        {/* ════ ANALYTICS TAB ════ */}
        {tab === "analytics" && (
          <div style={{ animation: "fadeUp .3s ease" }}>
            <Glass style={{ padding: "22px 24px", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16, color: "#0f172a" }}>📊 Subject Progress</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.ss.map(s => ({ name: `${s.icon} ${s.name.slice(0, 5)}`, Done: s.done, "In Prog": s.prog, Left: s.total - s.done - s.prog }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip />
                  <Bar dataKey="Done" stackId="a" fill="#10b981" />
                  <Bar dataKey="In Prog" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Left" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Glass>
            {Object.keys(testAnalytics).length > 0 && (
              <Glass style={{ padding: "22px 24px" }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16, color: "#0f172a" }}>🎯 Test Averages</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                  {Object.entries(testAnalytics).map(([name, d]) => (
                    <div key={name} style={{ background: `${d.color}0a`, border: `1px solid ${d.color}22`, borderRadius: 14, padding: "16px 18px", textAlign: "center" as const }}>
                      <div style={{ fontSize: 28 }}>{d.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{name}</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: scoreColor(d.avg), marginTop: 4 }}>{d.avg}%</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{d.count} test{d.count > 1 ? "s" : ""}</div>
                      <div style={{ marginTop: 8 }}><ProgressBar value={d.avg} color={scoreColor(d.avg)} h={5} /></div>
                    </div>
                  ))}
                </div>
              </Glass>
            )}
          </div>
        )}

        {/* ════ SUBJECT VIEW ════ */}
        {activeSubjects.map(sub => {
          if (tab !== sub.id) return null;
          const chapters = getChapters(sub);
          const done = chapters.filter(c => ["completed", "revised"].includes(getCh(c.id).status)).length;
          const filtered = search ? chapters.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : chapters;
          const sections = sub.chapters
            ? [{ name: null as string | null, chs: filtered }]
            : (() => { let n = 0; return sub.sections!.map(s => { const sl = chapters.slice(n, n + s.chapters.length); n += s.chapters.length; return { name: s.name as string | null, chs: search ? sl.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : sl }; }).filter(s => s.chs.length > 0); })();

          return (
            <div key={sub.id} style={{ animation: "fadeUp .3s ease" }}>
              <div style={{ background: `linear-gradient(135deg,${sub.color},${sub.color}cc)`, borderRadius: 18, padding: "20px 24px", marginBottom: 14, color: "white", display: "flex", alignItems: "center", gap: 18, boxShadow: `0 6px 24px ${sub.color}33` }}>
                <span style={{ fontSize: 40 }}>{sub.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 22 }}>{sub.name}</div>
                  <div style={{ fontSize: 13, opacity: .85, marginTop: 2 }}>{done}/{chapters.length} chapters complete</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                    {[
                      { l: "Not Started", c: chapters.filter(c => getCh(c.id).status === "not_started").length, cl: "rgba(255,255,255,.5)" },
                      { l: "In Progress", c: chapters.filter(c => getCh(c.id).status === "in_progress").length, cl: "#fcd34d" },
                      { l: "Completed", c: chapters.filter(c => getCh(c.id).status === "completed").length, cl: "#6ee7b7" },
                      { l: "Revised", c: chapters.filter(c => getCh(c.id).status === "revised").length, cl: "#c4b5fd" },
                      { l: "🚩 Flagged", c: chapters.filter(c => getCh(c.id).revision).length, cl: "#fca5a5" },
                    ].filter(x => x.c > 0).map(x => <span key={x.l}><strong style={{ color: x.cl, fontSize: 15 }}>{x.c}</strong> {x.l}</span>)}
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <CircleProgress value={pctCalc(done, chapters.length)} size={82} stroke={8} color="white" bg="rgba(255,255,255,.2)" />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{pctCalc(done, chapters.length)}%</div>
                    <div style={{ fontSize: 8, opacity: .7, fontWeight: 700 }}>DONE</div>
                  </div>
                </div>
              </div>

              {sections.map(sec => (
                <div key={sec.name || "m"} style={{ marginBottom: 18 }}>
                  {sec.name && <div style={{ fontWeight: 700, color: sub.color, fontSize: 14, marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${sub.color}22` }}>📌 {sec.name}</div>}
                  {sec.chs.map(ch => {
                    const d = getCh(ch.id);
                    const sm = STATUS_META[d.status];
                    const tests = d.tests || [];
                    const avg = tests.length ? Math.round(tests.reduce((a, t) => a + pctCalc(+t.obtained, +t.max), 0) / tests.length) : null;
                    return (
                      <Glass key={ch.id} style={{ padding: "12px 16px", marginBottom: 8, borderLeft: `4px solid ${sm.color}`, background: sm.bg }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => cycleStatus(ch.id)}
                            style={{ background: sm.color, color: "white", border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                            {sm.icon} {sm.label}
                          </button>
                          <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#1e293b", minWidth: 80 }}>{ch.name}</div>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => toggleFlag(ch.id)} style={{ background: d.revision ? "#fef2f2" : "white", border: `1px solid ${d.revision ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13 }}>{d.revision ? "🚩" : "🏳️"}</button>
                            <button onClick={() => setNoteModal({ id: ch.id, name: ch.name, note: d.notes || "" })} style={{ background: d.notes ? "#eff6ff" : "white", border: `1px solid ${d.notes ? "#93c5fd" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13 }}>{d.notes ? "📝" : "📄"}</button>
                            <button onClick={() => setPaperModal({ id: ch.id, name: ch.name, papers: initPapers(d.papers) })} style={{ background: hasPapers(d.papers) ? "#f0fdf4" : "white", border: `1px solid ${hasPapers(d.papers) ? "#86efac" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13 }}>📎</button>
                            <button onClick={() => { setTestModal({ id: ch.id, name: ch.name }); setTestForm({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" }); }}
                              style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#475569" }}>+ Test</button>
                          </div>
                        </div>
                        {tests.length > 0 && (
                          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                            {tests.map(t => {
                              const p = pctCalc(+t.obtained, +t.max);
                              return (
                                <div key={t.id} style={{ background: "white", borderRadius: 8, padding: "3px 10px", fontSize: 12, border: "1px solid #e5e7eb", display: "flex", gap: 5, alignItems: "center" }}>
                                  <span style={{ color: "#94a3b8" }}>{t.type}</span>
                                  <span style={{ fontWeight: 700, color: scoreColor(p) }}>{t.obtained}/{t.max} ({p}%)</span>
                                  <button onClick={() => delTest(ch.id, t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 11 }}>✕</button>
                                </div>
                              );
                            })}
                            {avg !== null && <span style={{ fontSize: 12, color: "#94a3b8" }}>Avg: <strong style={{ color: scoreColor(avg) }}>{avg}%</strong></span>}
                          </div>
                        )}
                      </Glass>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}

        {/* ════ TEST MODAL ════ */}
        <Modal open={!!testModal} onClose={() => setTestModal(null)} title="📝 Add Test Score">
          {testModal && <>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14, marginTop: -8 }}>{testModal.name}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Test Type</div>
            <select value={testForm.type} onChange={e => setTestForm({ ...testForm, type: e.target.value })} style={inp({ marginBottom: 10 })}>
              {TEST_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Date</div>
            <input type="date" value={testForm.date} onChange={e => setTestForm({ ...testForm, date: e.target.value })} style={inp({ marginBottom: 10 })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Obtained</div>
                <input type="number" min="0" placeholder="18" value={testForm.obtained} onChange={e => setTestForm({ ...testForm, obtained: e.target.value })} style={inp()} /></div>
              <div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Max Marks</div>
                <input type="number" min="1" placeholder="20" value={testForm.max} onChange={e => setTestForm({ ...testForm, max: e.target.value })} style={inp()} /></div>
            </div>
            {testForm.obtained && testForm.max && +testForm.max > 0 && (
              <div style={{ textAlign: "center" as const, padding: "8px 0", fontSize: 28, fontWeight: 900, color: scoreColor(pctCalc(+testForm.obtained, +testForm.max)) }}>
                {pctCalc(+testForm.obtained, +testForm.max)}% {pctCalc(+testForm.obtained, +testForm.max) >= 80 ? "🎉" : pctCalc(+testForm.obtained, +testForm.max) >= 60 ? "👍" : "📖"}
              </div>
            )}
            <textarea placeholder="Notes (optional)…" value={testForm.notes} onChange={e => setTestForm({ ...testForm, notes: e.target.value })} style={inp({ minHeight: 60, resize: "vertical" as const, marginBottom: 14 })} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setTestModal(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <button onClick={() => { addTest(testModal.id); setTestModal(null); }} style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: accentGrad, color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Save Score</button>
            </div>
          </>}
        </Modal>

        {/* ════ NOTE MODAL ════ */}
        <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title="📄 Chapter Notes">
          {noteModal && <>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12, marginTop: -8 }}>{noteModal.name}</div>
            <textarea value={noteModal.note} onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
              placeholder="Study notes, formulae, reminders…" style={inp({ minHeight: 120, resize: "vertical" as const, marginBottom: 14 })} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setNoteModal(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <button onClick={() => { saveNote(noteModal.id, noteModal.note); setNoteModal(null); }} style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: accentGrad, color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Save Note</button>
            </div>
          </>}
        </Modal>

        {/* ════ PAPERS MODAL ════ */}
        <Modal open={!!paperModal} onClose={() => setPaperModal(null)} title="📎 Papers & Resources">
          {paperModal && <>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12, marginTop: -8 }}>{paperModal.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16, background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
              Upload to Google Drive → Right click → Share → Copy link → Paste below
            </div>
            {PAPER_TYPES.map(({ key, label, color, bg, border }) => (
              <div key={key} style={{ marginBottom: 16, background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color }}>{label}</div>
                {ensureArr(paperModal.papers[key]).map((v, r) => (
                  <div key={r} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <input type="url" placeholder={`Paste link ${r + 1}`} value={v}
                      onChange={e => { const a = [...ensureArr(paperModal.papers[key])]; a[r] = e.target.value; setPaperModal({ ...paperModal, papers: { ...paperModal.papers, [key]: a } }); }}
                      style={inp({ flex: 1, background: "white", fontSize: 13 })} />
                    {v && <a href={v} target="_blank" rel="noreferrer" style={{ background: "white", border: `1px solid ${border}`, borderRadius: 7, padding: "6px 8px", fontSize: 12, textDecoration: "none", color }}>🔗</a>}
                    {ensureArr(paperModal.papers[key]).length > 1 && (
                      <button onClick={() => { const a = ensureArr(paperModal.papers[key]).filter((_, i) => i !== r); setPaperModal({ ...paperModal, papers: { ...paperModal.papers, [key]: a } }); }}
                        style={{ background: "#fee2e2", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "#dc2626", fontSize: 12, fontWeight: 700 }}>✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => { const a = [...ensureArr(paperModal.papers[key]), ""]; setPaperModal({ ...paperModal, papers: { ...paperModal.papers, [key]: a } }); }}
                  style={{ background: "white", border: `1px dashed ${border}`, borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, color, fontWeight: 600, marginTop: 2 }}>+ Add link</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPaperModal(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <button onClick={() => { savePapers(paperModal.id, paperModal.papers); setPaperModal(null); }} style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: accentGrad, color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Save Links</button>
            </div>
          </>}
        </Modal>
      </div>

      {/* ════ FOOTER ════ */}
      <footer style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", color: "white", marginTop: 40, padding: "28px 20px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {stats.ss.map(s => (
              <div key={s.id} style={{ flex: 1, minWidth: 100, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, opacity: .6 }}>{s.icon} {s.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.pct}%</span>
                </div>
                <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 10, height: 4 }}>
                  <div style={{ background: s.color, borderRadius: 10, height: 4, width: `${s.pct}%`, transition: "width .8s", boxShadow: `0 0 6px ${s.color}88` }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: .35 }}>Built with ❤️ for Savio • {new Date().getFullYear()} • All the best! 🎯</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", animation: "pulse2 2s infinite" }} />
              <span style={{ fontSize: 11, opacity: .4 }}>Live • saviosijo.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

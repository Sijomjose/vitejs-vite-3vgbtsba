import React, { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";

/* âââââââââ Supabase Config âââââââââ */
const SUPA_URL = "https://mlfgdutctvbvqwebqajp.supabase.co";
const SUPA_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmdkdXRjdHZidnF3ZWJxYWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ2MDIsImV4cCI6MjA4OTgxMDYwMn0.TPBeT6y-fFGAgcME_mmKqBUYHFUMVB1FO3wrAhneKW4";
const ROW_ID = "letty";
const LS_KEY = "letty_v4";
const EXAM_DATE = new Date("2027-03-15T00:00:00");
const START_DATE = new Date("2026-04-04T00:00:00");

/* âââââââââ Types âââââââââ */
interface ChapterResource {
  id: string;
  tracker: string;
  subject: string;
  chapter: string;
  resource_type: string;
  link: string;
  created_at: string;
  updated_at: string;
}
interface CommonResource {
  id: string;
  page_type: string;
  title: string;
  link: string;
  notes: string;
  created_at: string;
  updated_at: string;
}
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

/* âââââââââ Data helpers âââââââââ */
async function fetchData(rowId: string): Promise<Record<string, ChapterData> | null> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/tracker_data?id=eq.${rowId}&select=data`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const d = (await res.json())?.[0]?.data;
    return d && typeof d === "object" && Object.keys(d).length > 0 ? d : null;
  } catch { return null; }
}

async function saveData(rowId: string, data: Record<string, ChapterData>) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/tracker_data`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: rowId, data }),
    });
  } catch { /* silent */ }
}

async function fetchCommonResources(pageType: string): Promise<CommonResource[]> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/common_resources?page_type=eq.${pageType}&order=created_at.asc`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function insertCommonResource(
  resource: Pick<CommonResource, "page_type" | "title" | "link" | "notes">
): Promise<CommonResource | null> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/common_resources`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify(resource),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d[0] ?? null;
  } catch { return null; }
}

async function patchCommonResource(
  id: string,
  updates: Partial<Pick<CommonResource, "title" | "link" | "notes">>
): Promise<boolean> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/common_resources?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
    });
    return res.ok;
  } catch { return false; }
}

async function removeCommonResource(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/common_resources?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    return res.ok;
  } catch { return false; }
}

const KEY_TO_RESOURCE_TYPE: Record<string, string> = {
  qp: "question_paper", ma: "model_answer", as: "answer_sheet", resources: "resources",
};

async function fetchChapterResources(tracker: string, chapterId: string): Promise<ChapterResource[]> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/chapter_resources?tracker=eq.${tracker}&chapter=eq.${encodeURIComponent(chapterId)}&order=created_at.asc`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function insertChapterResource(
  row: Pick<ChapterResource, "tracker" | "subject" | "chapter" | "resource_type" | "link">
): Promise<ChapterResource | null> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/chapter_resources`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d[0] ?? null;
  } catch { return null; }
}

async function deleteChapterResource(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/chapter_resources?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    return res.ok;
  } catch { return false; }
}

async function migrateSingleChapter(
  tracker: string, subjectId: string, chapterId: string,
  papers: Record<string, string[]> | null | undefined
): Promise<void> {
  if (!papers) return;
  for (const [key, links] of Object.entries(papers)) {
    const rtype = KEY_TO_RESOURCE_TYPE[key];
    if (!rtype) continue;
    for (const link of links) {
      if (!link) continue;
      await insertChapterResource({ tracker, subject: subjectId, chapter: chapterId, resource_type: rtype, link });
    }
  }
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

/* âââââââââ Subjects âââââââââ */
const LETTY_SUBJECTS: SubjectDef[] = [
  { id: "maths", name: "Mathematics", icon: "📐", color: "#2563eb",
    sections: [
      { name: "Ganita Prakash – Part 1", chapters: ["A Square and a Cube","Power Play","A Story of Numbers","Quadrilaterals","Number Play","We Distribute, Yet Things Multiply","Proportional Reasoning-1"] },
      { name: "Ganita Prakash – Part 2", chapters: ["Fractions in Disguise","The Baudhayana–Pythagoras Theorem","Proportional Reasoning-2","Exploring Some Geometric Themes","Tales by Dots and Lines","Algebra Play","Area"] },
    ] },
  { id: "science", name: "Science", icon: "🔬", color: "#059669",
    chapters: ["Exploring the Investigative World of Science","The Invisible Living World: Beyond Our Naked Eye","Health: The Ultimate Treasure","Electricity: Magnetic and Heating Effects","Exploring Forces","Pressure, Winds, Storms and Cyclones","Particulate Nature of Matter","Nature of Matter: Elements, Compounds and Mixtures","The Amazing World of Solutes, Solvents and Solutions","Light: Mirrors and Lenses","Keeping Time with the Skies","How Nature Works in Harmony","Our Home: Earth, a Unique Life Sustaining Planet"] },
  { id: "english", name: "English", icon: "📖", color: "#d97706",
    chapters: [
      "The Wit that Won Hearts",
      "A Concrete Example",
      "Wisdom Paves the Way",
      "A Tale of Valour: Major Somnath Sharma and the Battle of Badgam",
      "Somebody's Mother",
      "Verghese Kurien—I Too Had A Dream",
      "The Case of the Fifth Word",
      "The Magic Brush of Dreams",
      "Spectacular Wonders",
      "The Cherry Tree",
      "Harvest Hymn",
      "Waiting for the Rain",
      "Feathered Friend",
      "Magnifying Glass",
      "Bibha Chowdhuri: The Beam of Light that Lit the Path for Women in Indian Science"
    ] },


  { id: "enggrammar", name: "English Grammar", icon: "✏️", color: "#0891b2",
    sections: [
      { name: "Present Tenses", chapters: [
        "Unit 1 – am/is/are",
        "Unit 2 – am/is/are (questions)",
        "Unit 3 – I am doing (present continuous)",
        "Unit 4 – are you doing? (present continuous questions)",
        "Unit 5 – I do/work etc. (present simple)",
        "Unit 6 – I don't... (present simple negative)",
        "Unit 7 – Do you...? (present simple questions)",
        "Unit 8 – I am doing and I do (present continuous and present simple)",
        "Unit 9 – I have... / I've got...",
      ]},
      { name: "Past Tenses", chapters: [
        "Unit 10 – was/were",
        "Unit 11 – worked/got/went etc. (past simple)",
        "Unit 12 – I didn't... / Did you...? (past simple negative and questions)",
        "Unit 13 – I was doing (past continuous)",
        "Unit 14 – I was doing (past continuous) and I did (past simple)",
      ]},
      { name: "Present Perfect and Passive", chapters: [
        "Unit 15 – I have done (present perfect 1)",
        "Unit 16 – I've just... / I've already... / I haven't...yet (present perfect 2)",
        "Unit 17 – Have you ever...? (present perfect 3)",
        "Unit 18 – How long have you...? (present perfect 4)",
        "Unit 19 – for / since / ago",
        "Unit 20 – I have done (present perfect) and I did (past simple)",
        "Unit 21 – is done / was done (passive 1)",
        "Unit 22 – is being done / has been done (passive 2)",
        "Unit 23 – be/have/do in present and past tenses",
        "Unit 24 – Regular and irregular verbs",
      ]},
      { name: "Used to, Future and Might", chapters: [
        "Unit 25 – I used to...",
        "Unit 26 – What are you doing tomorrow?",
        "Unit 27 – I'm going to...",
        "Unit 28 – will/shall (1)",
        "Unit 29 – will/shall (2)",
        "Unit 30 – might",
      ]},
      { name: "Modal Verbs", chapters: [
        "Unit 31 – can and could",
        "Unit 32 – must / mustn't / needn't",
        "Unit 33 – should",
        "Unit 34 – I have to...",
        "Unit 35 – Would you like...? / I'd like...",
      ]},
      { name: "There, It and Auxiliaries", chapters: [
        "Unit 36 – there is / there are",
        "Unit 37 – there was/were / there has/have been",
        "Unit 38 – It... / there will be",
        "Unit 39 – I am / I don't etc. (short answers)",
        "Unit 40 – Have you? / Are you? / Don't you? etc.",
        "Unit 41 – too/either / so am I / neither do I etc.",
        "Unit 42 – isn't / haven't / don't etc. (negatives)",
      ]},
      { name: "Questions and Reported Speech", chapters: [
        "Unit 43 – is it...? / have you...? / do they...? etc. (questions 1)",
        "Unit 44 – Who saw you? / Who did you see? (questions 2)",
        "Unit 45 – Who is she talking to? / What is it like? (questions 3)",
        "Unit 46 – What...? / Which...? / How...?",
        "Unit 47 – How long does it take...?",
        "Unit 48 – Do you know where...? / I don't know what... etc.",
        "Unit 49 – She said that... / He told me that...",
      ]},
      { name: "Verb Patterns", chapters: [
        "Unit 50 – work/working / go/going / do/doing",
        "Unit 51 – to... (I want to do) and -ing (I enjoy doing)",
        "Unit 52 – I want you to... / I told you to...",
        "Unit 53 – I went to the shop to...",
        "Unit 54 – go to... / go on... / go for... / go -ing",
        "Unit 55 – get",
        "Unit 56 – do and make",
        "Unit 57 – have",
      ]},
      { name: "Pronouns and Possessives", chapters: [
        "Unit 58 – I/me / he/him / they/them etc.",
        "Unit 59 – my/his/their etc.",
        "Unit 60 – Whose is this? / It's mine/yours/hers etc.",
        "Unit 61 – I/me/my/mine",
        "Unit 62 – myself/yourself/themselves etc.",
        "Unit 63 – 's (Ann's camera / my brother's car) etc.",
      ]},
      { name: "Articles and Nouns", chapters: [
        "Unit 64 – a/an...",
        "Unit 65 – flower(s) / bus(es) (singular and plural)",
        "Unit 66 – a car / some money (countable/uncountable 1)",
        "Unit 67 – a car / some money (countable/uncountable 2)",
        "Unit 68 – a/an and the",
        "Unit 69 – the...",
        "Unit 70 – go to work / go home / go to the cinema",
        "Unit 71 – I like music / I hate exams",
        "Unit 72 – the... (names of places)",
      ]},
      { name: "Determiners", chapters: [
        "Unit 73 – this/that/these/those",
        "Unit 74 – one/ones",
        "Unit 75 – some and any",
        "Unit 76 – not + any / no / none",
        "Unit 77 – not + anybody/anyone/anything / nobody/no-one/nothing",
        "Unit 78 – somebody/anything/nowhere etc.",
        "Unit 79 – every and all",
        "Unit 80 – all / most / some / any / no/none",
        "Unit 81 – both / either / neither",
        "Unit 82 – a lot / much / many",
        "Unit 83 – (a) little / (a) few",
      ]},
      { name: "Adjectives, Adverbs and Word Order", chapters: [
        "Unit 84 – old/new/interesting etc. (adjectives)",
        "Unit 85 – quickly/badly/suddenly etc. (adverbs)",
        "Unit 86 – old/older / expensive/more expensive",
        "Unit 87 – older than... / more expensive than...",
        "Unit 88 – not as... as",
        "Unit 89 – the oldest / the most expensive",
        "Unit 90 – enough",
        "Unit 91 – too",
        "Unit 92 – He speaks English very well. (word order 1)",
        "Unit 93 – always/usually/often etc. (word order 2)",
        "Unit 94 – still / yet / already",
        "Unit 95 – Give me that book! / Give it to me!",
      ]},
      { name: "Prepositions", chapters: [
        "Unit 96 – at 8 o'clock / on Monday / in April",
        "Unit 97 – from...to / until / since / for",
        "Unit 98 – before / after / during / while",
        "Unit 99 – in / at / on (places 1)",
        "Unit 100 – in / at / on (places 2)",
        "Unit 101 – to / in / at (places 3)",
        "Unit 102 – under / behind / opposite etc. (prepositions)",
        "Unit 103 – up / over / through etc. (prepositions)",
        "Unit 104 – on / at / by / with / about (prepositions)",
        "Unit 105 – afraid of... / good at... etc. / preposition + -ing",
        "Unit 106 – listen to... / look at... etc. (verb + preposition)",
        "Unit 107 – go in / fall off / run away etc. (phrasal verbs 1)",
        "Unit 108 – put on your shoes / put your shoes on (phrasal verbs 2)",
      ]},
      { name: "Conjunctions and Relative Clauses", chapters: [
        "Unit 109 – and / but / or / so / because",
        "Unit 110 – When...",
        "Unit 111 – If we go... / If you see... etc.",
        "Unit 112 – If I had... / If we went... etc.",
        "Unit 113 – a person who... / a thing that/which... (relative clauses 1)",
        "Unit 114 – the people we met / the hotel you stayed at (relative clauses 2)",
      ]},
      { name: "Appendices", chapters: [
        "Appendix 1 – Active and passive",
        "Appendix 2 – List of irregular verbs",
        "Appendix 3 – Irregular verbs in groups",
        "Appendix 4 – Short forms (he's / I'd / I don't etc.)",
        "Appendix 5 – Spelling",
        "Appendix 6 – Phrasal verbs (look out / take off etc.)",
        "Appendix 7 – Phrasal verbs + object (fill in a form / put out a fire etc.)",
      ]},
      { name: "Additional Exercises", chapters: [
        "Additional Exercises",
      ]},
    ] },

  { id: "hindi", name: "Hindi", icon: "🫔", color: "#dc2626",
    chapters: [
      "स्वदेश (कविता)",
      "दो गौरैया (कहानी)",
      "एक आशीर्वाद (कविता)",
      "हरिद्वार (पत्र)",
      "कबीर के दोहे",
      "एक टोकरी भर मिट्टी (कहानी)",
      "मत बाँधो (कविता)",
      "नए मेहमान (एकांकी)",
      "आदमी का अनुपात (कविता)",
      "तरुण के स्वप्न (उद्बोधन)"
    ] },
  { id: "sst", name: "Social Studies", icon: "🌍", color: "#7c3aed",
    sections: [
      { name: "Exploring Society – Theme A: Land and People", chapters: ["Natural Resources and Their Use"] },
      { name: "Exploring Society – Theme B: Tapestry of the Past", chapters: ["Reshaping India's Political Map","The Rise of the Marathas","The Colonial Era in India"] },
      { name: "Exploring Society – Theme D: Governance and Democracy", chapters: ["Universal Franchise and India's Electoral System","The Parliamentary System: Legislature and Executive"] },
      { name: "Exploring Society – Theme E: Economy", chapters: ["Factors of Production"] },
    ] },
  { id: "sanskrit", name: "Sanskrit", icon: "🕉️", color: "#b45309",
    chapters: [
      "संगच्छध्वं संवदध्वम्",
      "अल्पानामपि वस्तूनां संहितः कार्यसाधिका",
      "सुभाषितरसं पीत्वा जीवनं सफलं कुरु",
      "प्रणम्यो देशभक्तोऽयं गोपबन्धुर्महामनाः",
      "गीता सुगीता कर्तव्या",
      "डिजिभारतम् – युगपरिवर्तनम्",
      "मञ्जुलमञ्जूषा सुन्दरसुरभाषा",
      "पश्यत कोणमैशान्यं भारतस्य मनोहरम्",
      "कोऽरुकृ ? कोऽरुकृ ? कोऽरुकृ ?",
      "सन्निमित्ते वरं त्यागः (क–भागः)",
      "सन्निमित्ते वरं त्यागः (ख–भागः)",
      "सम्यग्वर्णप्रयोगेन ब्रह्मलोके महीयते",
      "वर्णोच्चारण-शिक्षा"
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
  { key: "qp",        label: "📄 Question Paper", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  { key: "ma",        label: "✅ Model Answer",   color: "#059669", bg: "#f0fdf4", border: "#86efac" },
  { key: "as",        label: "📝 Answer Sheet",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  { key: "resources", label: "🔗 Resources",      color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
];

const accentGrad = "linear-gradient(135deg, #065f46, #059669)";

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
/* âââââââââ UI Components âââââââââ */

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

/* âââââââââââââââââââââââââââââââââââ
   LETTY COMPONENT
   âââââââââââââââââââââââââââââââââââ */
export default function Letty() {
  const [data, setData] = useState<Record<string, ChapterData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");

  // Modals
  const [testModal, setTestModal] = useState<{ id: string; name: string } | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: string; name: string; note: string } | null>(null);
  const [paperModal, setPaperModal] = useState<{ id: string; name: string; subjectId: string; subjectName: string } | null>(null);
  const [chapterResources, setChapterResources] = useState<ChapterResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [newLinkInputs, setNewLinkInputs] = useState<Record<string, string>>({ qp: "", ma: "", as: "", resources: "" });
  const [testForm, setTestForm] = useState({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" });

  const [countdown, setCountdown] = useState(getCountdown());
  const [hovSlice, setHovSlice] = useState<number | null>(null);
  const [statusModal, setStatusModal] = useState<{ filter: string; label: string; color: string } | null>(null);

  // Common resources
  const [commonResources, setCommonResources] = useState<CommonResource[]>([]);
  const [commonLoading, setCommonLoading] = useState(false);
  const [commonSaving, setCommonSaving] = useState(false);
  const [commonForm, setCommonForm] = useState({ title: "", link: "", notes: "" });
  const [editingResource, setEditingResource] = useState<CommonResource | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    setLoading(true); setData({}); setTab("dashboard"); setSearch("");
    (async () => {
      let d = await fetchData(ROW_ID);
      if (d) {
        setData(d);
        try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {}
      } else {
        try {
          const s = localStorage.getItem(LS_KEY);
          if (s) { d = JSON.parse(s); setData(d!); await saveData(ROW_ID, d!); }
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (d: Record<string, ChapterData>) => {
    setData(d);
    try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {}
    setSaving(true); await saveData(ROW_ID, d); setSaving(false);
  }, []);

  useEffect(() => {
    if (tab !== "common") return;
    setCommonLoading(true);
    fetchCommonResources("letty").then(r => { setCommonResources(r); setCommonLoading(false); });
  }, [tab]);

  const addCommonResource = async () => {
    if (!commonForm.title.trim()) return;
    setCommonSaving(true);
    const r = await insertCommonResource({ page_type: "letty", title: commonForm.title.trim(), link: commonForm.link.trim(), notes: commonForm.notes.trim() });
    if (r) { setCommonResources(prev => [...prev, r]); setCommonForm({ title: "", link: "", notes: "" }); }
    setCommonSaving(false);
  };

  const saveEditResource = async () => {
    if (!editingResource || !editingResource.title.trim()) return;
    setCommonSaving(true);
    const ok = await patchCommonResource(editingResource.id, { title: editingResource.title.trim(), link: editingResource.link.trim(), notes: editingResource.notes.trim() });
    if (ok) { setCommonResources(prev => prev.map(r => r.id === editingResource.id ? { ...editingResource, updated_at: new Date().toISOString() } : r)); setEditingResource(null); }
    setCommonSaving(false);
  };

  const deleteCommonRes = async (id: string) => {
    const ok = await removeCommonResource(id);
    if (ok) setCommonResources(prev => prev.filter(r => r.id !== id));
  };

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

  useEffect(() => {
    if (!paperModal) return;
    setResourcesLoading(true);
    setChapterResources([]);
    setNewLinkInputs({ qp: "", ma: "", as: "", resources: "" });
    (async () => {
      const existing = await fetchChapterResources(ROW_ID, paperModal.id);
      if (existing.length === 0) {
        const oldPapers = getCh(paperModal.id).papers;
        if (oldPapers && Object.values(oldPapers).some(arr => arr.some(Boolean))) {
          await migrateSingleChapter(ROW_ID, paperModal.subjectId, paperModal.id, oldPapers);
          const migrated = await fetchChapterResources(ROW_ID, paperModal.id);
          setChapterResources(migrated);
        }
      } else {
        setChapterResources(existing);
      }
      setResourcesLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperModal?.id]);

  const handleAddResource = async (ptKey: string) => {
    if (!paperModal) return;
    const link = newLinkInputs[ptKey]?.trim();
    if (!link) return;
    const row = await insertChapterResource({
      tracker: ROW_ID,
      subject: paperModal.subjectId,
      chapter: paperModal.id,
      resource_type: KEY_TO_RESOURCE_TYPE[ptKey],
      link,
    });
    if (row) {
      setChapterResources(prev => [...prev, row]);
      setNewLinkInputs(prev => ({ ...prev, [ptKey]: "" }));
    }
  };

  const handleDeleteResource = async (id: string) => {
    await deleteChapterResource(id);
    setChapterResources(prev => prev.filter(r => r.id !== id));
  };

  /* ââ Stats ââ */
  const stats = useMemo(() => {
    const ss: SubjectStat[] = LETTY_SUBJECTS.map(s => {
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
  }, [data]);

  const allTests = useMemo(() => {
    const out: (TestEntry & { chName: string; sIcon: string; sColor: string })[] = [];
    LETTY_SUBJECTS.forEach(s => getChapters(s).forEach(c => {
      (getCh(c.id).tests || []).forEach(t => out.push({ ...t, chName: c.name, sIcon: s.icon, sColor: s.color }));
    }));
    out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const testAnalytics = useMemo(() => {
    const bySubject: Record<string, { icon: string; color: string; avg: number; count: number }> = {};
    LETTY_SUBJECTS.forEach(s => {
      const tests: TestEntry[] = [];
      getChapters(s).forEach(c => (getCh(c.id).tests || []).forEach(t => tests.push(t)));
      if (tests.length) bySubject[s.name] = {
        icon: s.icon, color: s.color, count: tests.length,
        avg: Math.round(tests.reduce((a, t) => a + pctCalc(+t.obtained, +t.max), 0) / tests.length),
      };
    });
    return bySubject;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const glow = countdown.days > 60 ? "#10b981" : countdown.days > 30 ? "#f59e0b" : "#ef4444";

  const inp = (extra: CSSProperties = {}): CSSProperties => ({
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const,
    outline: "none", transition: "border .2s", ...extra,
  });

  /* ââ Loading ââ */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", gap: 12 }}>
      <div style={{ width: 24, height: 24, border: "3px solid #e2e8f0", borderTop: "3px solid #059669", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <span style={{ fontSize: 16, color: "#64748b" }}>Loading Letty's Trackerâ¦</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  /* âââââââââ RENDER âââââââââ */
  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "linear-gradient(180deg,#ecfdf5 0%,#f8fafc 100%)" }}>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
      `}</style>

      {/* ââââ TOP NAV BAR ââââ */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "10px 20px", display: "flex", gap: 12, alignItems: "center" }}>
        <a href="/" style={{ textDecoration: "none", padding: "6px 14px", borderRadius: 10, background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 13 }}>📚 Savvy's</a>
        <span style={{ padding: "6px 14px", borderRadius: 10, background: "#065f46", color: "white", fontWeight: 700, fontSize: 13 }}>🎀 Letty's</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px" }}>

        {/* ââââ HEADER ââââ */}
        <div style={{ background: accentGrad, borderRadius: 20, padding: "22px 28px", marginBottom: 16, color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 38 }}>🎀</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Letty's Study Tracker</div>
              <div style={{ fontSize: 13, opacity: .8, marginTop: 2 }}>Grade 8 â¢ CBSE NCERT{saving ? " â¢ âï¸ Syncingâ¦" : ""}</div>
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
              { label: "Total Chapters", val: `${stats.don}/${stats.tot}`, ico: "📑" },
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
          </div>
        </div>

        {/* ââââ COUNTDOWN ââââ */}
        <Glass style={{ padding: "20px 24px", marginBottom: 16, background: "linear-gradient(135deg,#0f172a,#1e1b4b)", color: "white", border: `1.5px solid ${glow}33` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${glow}22`, border: `1px solid ${glow}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎯</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "#94a3b8", textTransform: "uppercase" as const }}>Annual Exam Countdown</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Grade 8 Annual Exam â¢ Mar 15, 2027</div>
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

        {/* ââââ TABS + SEARCH ââââ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {["dashboard", ...LETTY_SUBJECTS.map(s => s.id), "analytics", "common"].map(t => {
            const sub = LETTY_SUBJECTS.find(s => s.id === t);
            const active = tab === t;
            const tabColor = sub ? sub.color : t === "analytics" ? "#0f172a" : t === "common" ? "#7c3aed" : "#065f46";
            return (
              <button key={t} onClick={() => { setTab(t); setSearch(""); }}
                style={{
                  padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                  fontWeight: active ? 700 : 500, fontSize: 13,
                  background: active ? tabColor : "white",
                  color: active ? "white" : "#475569",
                  boxShadow: active ? `0 2px 12px ${sub ? sub.color + "44" : "rgba(0,0,0,.15)"}` : "0 1px 3px rgba(0,0,0,.06)",
                  transition: "all .2s",
                }}>
                {t === "dashboard" ? "🏠 Dashboard" : t === "analytics" ? "📊 Analytics" : t === "common" ? "🗂️ Common" : `${sub!.icon} ${sub!.name}`}
              </button>
            );
          })}
          {tab !== "dashboard" && tab !== "analytics" && tab !== "common" && (
            <input placeholder="🔍 Search chaptersâ¦" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp({ maxWidth: 220, marginLeft: "auto", background: "white", fontSize: 13 }) }} />
          )}
        </div>

        {/* ââââ DASHBOARD ââââ */}
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
                    <PieChart>
                      <Pie data={[
                        { name: "Completed", value: stats.don },
                        { name: "In Progress", value: stats.ss.reduce((a, b) => a + b.prog, 0) },
                        { name: "Not Started", value: stats.tot - stats.don - stats.ss.reduce((a, b) => a + b.prog, 0) },
                      ]} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={2}
                        onMouseEnter={(_, index) => setHovSlice(index)}
                        onMouseLeave={() => setHovSlice(null)}
                      >
                        {[0, 1, 2].map(i => (
                          <Cell key={i} fill={["#10b981","#f59e0b","#e2e8f0"][i]}
                            opacity={hovSlice === null || hovSlice === i ? 1 : 0.4}
                            style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1 }}>
                    {[
                      { label: "Completed", val: stats.don, color: "#10b981", idx: 0, filter: "completed" },
                      { label: "In Progress", val: stats.ss.reduce((a, b) => a + b.prog, 0), color: "#f59e0b", idx: 1, filter: "in_progress" },
                      { label: "Not Started", val: stats.tot - stats.don - stats.ss.reduce((a, b) => a + b.prog, 0), color: "#94a3b8", idx: 2, filter: "not_started" },
                      { label: "Flagged", val: stats.ss.reduce((a, b) => a + b.flagged, 0), color: "#ef4444", idx: -1, filter: "flagged" },
                    ].map(r => (
                      <div key={r.label}
                        onMouseEnter={() => r.idx >= 0 && setHovSlice(r.idx)}
                        onMouseLeave={() => setHovSlice(null)}
                        onClick={() => setStatusModal({ filter: r.filter, label: r.label, color: r.color })}
                        style={{ display: "flex", justifyContent: "space-between", padding: "5px 6px", fontSize: 13, borderRadius: 6, cursor: "pointer",
                          background: hovSlice === r.idx ? `${r.color}18` : "transparent",
                          transition: "background 0.15s",
                        }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: r.color, display: "inline-block",
                            transform: hovSlice === r.idx ? "scale(1.4)" : "scale(1)", transition: "transform 0.15s" }} />{r.label}
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
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.type} â¢ {t.date}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: scoreColor(p) }}>{t.obtained}/{t.max}</div>
                      </div>
                    );
                  })}
              </Glass>
            </div>
          </div>
        )}

        {/* ââââ ANALYTICS TAB ââââ */}
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

        {/* ââââ COMMON TAB ââââ */}
        {tab === "common" && (
          <div style={{ animation: "fadeUp .3s ease" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9cc)", borderRadius: 18, padding: "20px 24px", marginBottom: 14, color: "white", display: "flex", alignItems: "center", gap: 18, boxShadow: "0 6px 24px #7c3aed33" }}>
              <span style={{ fontSize: 40 }}>🗂️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 22 }}>Common Resources</div>
                <div style={{ fontSize: 13, opacity: .85, marginTop: 2 }}>Letty â¢ {commonResources.length} saved resource{commonResources.length !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>Links, notes, and general study materials</div>
              </div>
            </div>

            {/* Add Resource Form */}
            <Glass style={{ padding: "20px 22px", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#0f172a" }}>➕ Add Resource</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Title <span style={{ color: "#ef4444" }}>*</span></div>
                  <input
                    placeholder="e.g. Chapter 3 Notes, Formula Sheetâ¦"
                    value={commonForm.title}
                    onChange={e => setCommonForm(f => ({ ...f, title: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" as const, outline: "none" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Google Drive / URL</div>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/â¦"
                    value={commonForm.link}
                    onChange={e => setCommonForm(f => ({ ...f, link: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" as const, outline: "none" }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Notes</div>
                <textarea
                  placeholder="Add any notes or descriptionâ¦"
                  value={commonForm.notes}
                  onChange={e => setCommonForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" as const, outline: "none", resize: "vertical" as const, minHeight: 72, fontFamily: "inherit" }}
                />
              </div>
              <button
                onClick={addCommonResource}
                disabled={!commonForm.title.trim() || commonSaving}
                style={{ background: !commonForm.title.trim() || commonSaving ? "#e2e8f0" : "linear-gradient(135deg,#7c3aed,#6d28d9)", color: !commonForm.title.trim() || commonSaving ? "#94a3b8" : "white", border: "none", borderRadius: 12, padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: !commonForm.title.trim() || commonSaving ? "default" : "pointer", transition: "all .2s" }}
              >
                {commonSaving ? "Savingâ¦" : "Save Resource"}
              </button>
            </Glass>

            {/* Resource List */}
            {commonLoading ? (
              <div style={{ textAlign: "center" as const, padding: 40, color: "#94a3b8", fontSize: 14 }}>Loadingâ¦</div>
            ) : commonResources.length === 0 ? (
              <Glass style={{ padding: "32px 24px", textAlign: "center" as const }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🗂️</div>
                <div style={{ fontWeight: 600, color: "#64748b", fontSize: 15 }}>No resources yet</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Add your first link, note, or resource above.</div>
              </Glass>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {commonResources.map((r, idx) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid #ede9fe", fontSize: 14 }}>
                    <span style={{ color: "#7c3aed", fontWeight: 700, minWidth: 22, flexShrink: 0 }}>{idx + 1}.</span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{r.title}</span>
                    {r.link && (
                      <a href={r.link} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#2563eb", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        🔗 {r.link}
                      </a>
                    )}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: "auto" }}>
                      <button onClick={() => setEditingResource({ ...r })}
                        style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => { if (window.confirm(`Delete "${r.title}"?`)) deleteCommonRes(r.id); }}
                        style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 13, color: "#dc2626" }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ââââ SUBJECT VIEW ââââ */}
        {LETTY_SUBJECTS.map(sub => {
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
                  {sec.chs.map((ch, chIdx) => {
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
                          <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#1e293b", minWidth: 80 }}>{chIdx + 1}. {ch.name}</div>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => toggleFlag(ch.id)} style={{ background: d.revision ? "#fef2f2" : "white", border: `1px solid ${d.revision ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13 }}>{d.revision ? "🚩" : "🏳️"}</button>
                            <button onClick={() => setNoteModal({ id: ch.id, name: ch.name, note: d.notes || "" })} style={{ background: d.notes ? "#eff6ff" : "white", border: `1px solid ${d.notes ? "#93c5fd" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13 }}>{d.notes ? "📝" : "📄"}</button>
                            <button onClick={() => setPaperModal({ id: ch.id, name: ch.name, subjectId: sub.id, subjectName: sub.name })} style={{ background: hasPapers(d.papers) ? "#f0fdf4" : "white", border: `1px solid ${hasPapers(d.papers) ? "#86efac" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13 }}>📎</button>
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

        {/* ââââ TEST MODAL ââââ */}
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
            <textarea placeholder="Notes (optional)â¦" value={testForm.notes} onChange={e => setTestForm({ ...testForm, notes: e.target.value })} style={inp({ minHeight: 60, resize: "vertical" as const, marginBottom: 14 })} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setTestModal(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <button onClick={() => { addTest(testModal.id); setTestModal(null); }} style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: accentGrad, color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Save Score</button>
            </div>
          </>}
        </Modal>

        {/* ââââ NOTE MODAL ââââ */}
        <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title="📄 Chapter Notes">
          {noteModal && <>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12, marginTop: -8 }}>{noteModal.name}</div>
            <textarea value={noteModal.note} onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
              placeholder="Study notes, formulae, remindersâ¦" style={inp({ minHeight: 120, resize: "vertical" as const, marginBottom: 14 })} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setNoteModal(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <button onClick={() => { saveNote(noteModal.id, noteModal.note); setNoteModal(null); }} style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: accentGrad, color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Save Note</button>
            </div>
          </>}
        </Modal>

        {/* ââââ PAPERS MODAL ââââ */}
        <Modal open={!!paperModal} onClose={() => setPaperModal(null)} title="📎 Papers & Resources">
          {paperModal && <>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12, marginTop: -8 }}>{paperModal.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16, background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
              Upload to Google Drive â Right click â Share â Copy link â Paste below
            </div>
            {resourcesLoading ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 13 }}>Loading...</div>
            ) : (
              PAPER_TYPES.map(({ key, label, color, bg, border }) => {
                const section = chapterResources.filter(r => r.resource_type === KEY_TO_RESOURCE_TYPE[key]);
                return (
                  <div key={key} style={{ marginBottom: 16, background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color }}>{label}</div>
                    {section.map(r => (
                      <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                        <a href={r.link} target="_blank" rel="noreferrer"
                          style={{ flex: 1, fontSize: 12, color, wordBreak: "break-all" as const, padding: "6px 8px", background: "white", borderRadius: 7, border: `1px solid ${border}`, textDecoration: "none" }}>
                          🔗 {r.link}
                        </a>
                        <button onClick={() => handleDeleteResource(r.id)}
                          style={{ background: "#fee2e2", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "#dc2626", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: section.length ? 6 : 0 }}>
                      <input type="url" placeholder="Paste Google Drive / URL link"
                        value={newLinkInputs[key] ?? ""}
                        onChange={e => setNewLinkInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") handleAddResource(key); }}
                        style={inp({ flex: 1, background: "white", fontSize: 13 })} />
                      <button onClick={() => handleAddResource(key)}
                        style={{ background: color, color: "white", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>Add</button>
                    </div>
                  </div>
                );
              })
            )}
          </>}
        </Modal>

        {/* ââââ EDIT COMMON RESOURCE MODAL ââââ */}
        <Modal open={!!editingResource} onClose={() => setEditingResource(null)} title="✏️ Edit Resource">
          {editingResource && <>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Title <span style={{ color: "#ef4444" }}>*</span></div>
            <input
              value={editingResource.title}
              onChange={e => setEditingResource(r => r && ({ ...r, title: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none", marginBottom: 10 }}
            />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Google Drive / URL</div>
            <input
              type="url"
              value={editingResource.link}
              onChange={e => setEditingResource(r => r && ({ ...r, link: e.target.value }))}
              placeholder="https://drive.google.com/â¦"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none", marginBottom: 10 }}
            />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Notes</div>
            <textarea
              value={editingResource.notes}
              onChange={e => setEditingResource(r => r && ({ ...r, notes: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none", resize: "vertical" as const, minHeight: 90, fontFamily: "inherit", marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingResource(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <button
                onClick={saveEditResource}
                disabled={!editingResource.title.trim() || commonSaving}
                style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: !editingResource.title.trim() || commonSaving ? "#e2e8f0" : "linear-gradient(135deg,#7c3aed,#6d28d9)", color: !editingResource.title.trim() || commonSaving ? "#94a3b8" : "white", cursor: !editingResource.title.trim() || commonSaving ? "default" : "pointer", fontWeight: 700, fontSize: 14 }}>
                {commonSaving ? "Savingâ¦" : "Save Changes"}
              </button>
            </div>
          </>}
        </Modal>

        {/* ââââ STATUS FILTER MODAL ââââ */}
        <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title={`${statusModal?.label || ""} Chapters`}>
          {statusModal && (() => {
            const matchFn = (d: ChapterData) =>
              statusModal.filter === "flagged" ? d.revision : d.status === statusModal.filter;
            const matched = LETTY_SUBJECTS.flatMap(s =>
              getChapters(s)
                .filter(c => matchFn(getCh(c.id)))
                .map(c => ({ ...c, subName: s.name, subIcon: s.icon, subColor: s.color }))
            );
            if (matched.length === 0) return (
              <div style={{ color: "#94a3b8", textAlign: "center" as const, padding: "20px 0", fontSize: 14 }}>
                No chapters found.
              </div>
            );
            const bySubject: Record<string, typeof matched> = {};
            matched.forEach(c => {
              if (!bySubject[c.subName]) bySubject[c.subName] = [];
              bySubject[c.subName].push(c);
            });
            return (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#64748b", margin: "0 0 10px",
                  paddingBottom: 6, borderBottom: "1px solid #f1f5f9" }}>
                  {matched.length} chapter{matched.length !== 1 ? "s" : ""}
                </div>
                {Object.entries(bySubject).map(([subName, chs]) => {
                  const first = chs[0];
                  return (
                    <div key={subName} style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: first.subColor, marginBottom: 4 }}>
                        {first.subIcon} {subName}
                      </div>
                      {chs.map(c => (
                        <div key={c.id} style={{ fontSize: 13, color: "#374151", padding: "3px 0 3px 12px",
                          borderLeft: `3px solid ${first.subColor}44`, marginBottom: 2 }}>
                          {c.name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Modal>
      </div>

      {/* ââââ FOOTER ââââ */}
      <footer style={{ background: "linear-gradient(135deg,#0f172a,#064e3b)", color: "white", marginTop: 40, padding: "28px 20px 20px" }}>
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
            <div style={{ fontSize: 12, opacity: .35 }}>Built with ❤️ for Letty â¢ {new Date().getFullYear()} â¢ All the best! 🎯</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", animation: "pulse2 2s infinite" }} />
              <span style={{ fontSize: 11, opacity: .4 }}>Live â¢ letty.study</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

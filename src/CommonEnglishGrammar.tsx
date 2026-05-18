/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState, type CSSProperties } from "react";
import { RewardBadge, RewardBreakdown, buildPerformanceRewardSummary } from "./Rewards";
import { RewardRedeemer, type RewardLedgerControls } from "./RewardRedemptions";

const SUPA_URL = "https://mlfgdutctvbvqwebqajp.supabase.co";
const SUPA_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmdkdXRjdHZidnF3ZWJxYWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ2MDIsImV4cCI6MjA4OTgxMDYwMn0.TPBeT6y-fFGAgcME_mmKqBUYHFUMVB1FO3wrAhneKW4";

export const ENGLISH_GRAMMAR_ID = "enggrammar";

export interface TestEntry {
  id: number;
  type: string;
  date: string;
  obtained: string;
  max: string;
  notes: string;
}

export interface ChapterData {
  status: string;
  revision: boolean;
  tests: TestEntry[];
  notes: string;
  papers?: Record<string, string[]> | null;
}

export interface Chapter {
  id: string;
  name: string;
  section?: string;
}

export interface SubjectDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  chapters?: string[];
  sections?: { name: string; chapters: string[] }[];
}

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

export const SAVIO_GRAMMAR_SUBJECT: SubjectDef = {
  id: "enggrammar", name: "English Grammar", icon: "✏️", color: "#0891b2",
  sections: [
    { name: "Present and past", chapters: [
      "Unit 1 – Present continuous (I am doing)",
      "Unit 2 – Present simple (I do)",
      "Unit 3 – Present continuous and present simple (1)",
      "Unit 4 – Present continuous and present simple (2)",
      "Unit 5 – Past simple (I did)",
      "Unit 6 – Past continuous (I was doing)",
    ]},
    { name: "Present perfect and past", chapters: [
      "Unit 7 – Present perfect (1) (I have done)",
      "Unit 8 – Present perfect (2) (I have done)",
      "Unit 9 – Present perfect continuous (I have been doing)",
      "Unit 10 – Present perfect continuous and simple",
      "Unit 11 – How long have you (been)...?",
      "Unit 12 – When...? and How long...? For and since",
      "Unit 13 – Present perfect and past (1)",
      "Unit 14 – Present perfect and past (2)",
      "Unit 15 – Past perfect (I had done)",
      "Unit 16 – Past perfect continuous (I had been doing)",
      "Unit 17 – Have and have got",
      "Unit 18 – Used to (do)",
    ]},
    { name: "Future", chapters: [
      "Unit 19 – Present tenses for the future",
      "Unit 20 – (I'm) going to (do)",
      "Unit 21 – Will/shall (1)",
      "Unit 22 – Will/shall (2)",
      "Unit 23 – I will and I'm going to",
      "Unit 24 – Will be doing and will have done",
      "Unit 25 – When I do / When I've done – When and if",
    ]},
    { name: "Modals", chapters: [
      "Unit 26 – Can, could and (be) able to",
      "Unit 27 – Could (do) and could have (done)",
      "Unit 28 – Must and can't",
      "Unit 29 – May and might (1)",
      "Unit 30 – May and might (2)",
      "Unit 31 – Must and have to",
      "Unit 32 – Must mustn't needn't",
      "Unit 33 – Should (1)",
      "Unit 34 – Should (2)",
      "Unit 35 – Had better – It's time...",
      "Unit 36 – Can/Could/Would you...? (Requests, offers, permission and invitations)",
    ]},
    { name: "Conditionals and wish", chapters: [
      "Unit 37 – If I do... and If I did...",
      "Unit 38 – If I knew... I wish I knew...",
      "Unit 39 – If I had known... I wish I had known...",
      "Unit 40 – Would – I wish...would",
    ]},
    { name: "Passive", chapters: [
      "Unit 41 – Passive (1) (is done / was done)",
      "Unit 42 – Passive (2) (be/been/being done)",
      "Unit 43 – Passive (3)",
      "Unit 44 – It is said that... He is said to... (be) supposed to...",
      "Unit 45 – Have something done",
    ]},
    { name: "Reported speech", chapters: [
      "Unit 46 – Reported speech (1) (He said that...)",
      "Unit 47 – Reported speech (2)",
    ]},
    { name: "Questions and auxiliary verbs", chapters: [
      "Unit 48 – Questions (1)",
      "Unit 49 – Questions (2) (Do you know where...?)",
      "Unit 50 – Auxiliary verbs – I think so / I hope so etc.",
      "Unit 51 – Question tags (do you? isn't it? etc.)",
    ]},
    { name: "-ing and the infinitive", chapters: [
      "Unit 52 – Verb + -ing (enjoy doing / stop doing etc.)",
      "Unit 53 – Verb + to... (decide to do / forget to do etc.)",
      "Unit 54 – Verb + (object) + to... (I want you to do etc.)",
      "Unit 55 – Verb + -ing or to... (1) (remember/regret etc.)",
      "Unit 56 – Verb + -ing or to... (2) (try/need/help)",
      "Unit 57 – Verb + -ing or to... (3) (like/would like etc.)",
      "Unit 58 – Prefer and would rather",
      "Unit 59 – Preposition + -ing",
      "Unit 60 – Be/get used to something (I'm used to...)",
      "Unit 61 – Verb + preposition + -ing",
      "Unit 62 – Expressions + -ing",
      "Unit 63 – To..., for... and so that... (purpose)",
      "Unit 64 – Adjective + to...",
      "Unit 65 – To... (afraid to do) and preposition + -ing (afraid of -ing)",
      "Unit 66 – See somebody do and see somebody doing",
      "Unit 67 – -ing clauses",
    ]},
    { name: "Articles and nouns", chapters: [
      "Unit 68 – Countable and uncountable nouns (1)",
      "Unit 69 – Countable and uncountable nouns (2)",
      "Unit 70 – Countable nouns with a/an and some",
      "Unit 71 – A/an and the",
      "Unit 72 – The (1)",
      "Unit 73 – The (2) (School / the school)",
      "Unit 74 – The (3) (Children / the children)",
      "Unit 75 – The (4) (The giraffe / the telephone etc.; the + adjective)",
      "Unit 76 – Names with and without the (1)",
      "Unit 77 – Names with and without the (2)",
      "Unit 78 – Singular and plural",
      "Unit 79 – Noun + noun (a tennis ball / a headache etc.)",
      "Unit 80 – 's (the girl's name) and of... (the name of the book)",
    ]},
    { name: "Pronouns and determiners", chapters: [
      "Unit 81 – A friend of mine – My own house – On my own / by myself",
      "Unit 82 – Myself/yourself/themselves etc.",
      "Unit 83 – There... and it...",
      "Unit 84 – Some and any",
      "Unit 85 – No/none/any",
      "Unit 86 – Much, many, little, few, a lot, plenty",
      "Unit 87 – All / all of – most / most of – no / none of etc.",
      "Unit 88 – Both / both of – neither / neither of – either / either of",
      "Unit 89 – All, every and whole",
      "Unit 90 – Each and every",
    ]},
    { name: "Relative clauses", chapters: [
      "Unit 91 – Relative clauses (1) – clauses with who/that/which",
      "Unit 92 – Relative clauses (2) – clauses with or without who/that/which",
      "Unit 93 – Relative clauses (3) – whose/whom/where",
      "Unit 94 – Relative clauses (4) – extra information clauses (1)",
      "Unit 95 – Relative clauses (5) – extra information clauses (2)",
      "Unit 96 – -ing and -ed clauses",
    ]},
    { name: "Adjectives and adverbs", chapters: [
      "Unit 97 – Adjectives ending in -ing and -ed (boring/bored etc.)",
      "Unit 98 – Adjectives: word order – Adjectives after verbs",
      "Unit 99 – Adjectives and adverbs (1) (quick/quickly)",
      "Unit 100 – Adjectives and adverbs (2) (well/fast/late, hard/hardly)",
      "Unit 101 – So and such",
      "Unit 102 – Enough and too",
      "Unit 103 – Quite and rather",
      "Unit 104 – Comparison (1) – cheaper, more expensive etc.",
      "Unit 105 – Comparison (2)",
      "Unit 106 – Comparison (3) – as...as / than",
      "Unit 107 – Superlatives – the longest / the most enjoyable etc.",
      "Unit 108 – Word order (1) – verb + object; place and time",
      "Unit 109 – Word order (2) – adverbs with the verb",
    ]},
    { name: "Conjunctions", chapters: [
      "Unit 110 – Still, yet, already – Anymore/no longer",
      "Unit 111 – Even",
      "Unit 112 – Although/though/even though – In spite of/despite",
      "Unit 113 – In case",
      "Unit 114 – Unless – As long as – Provided/providing",
      "Unit 115 – As (time and reason)",
      "Unit 116 – Like and as (1)",
      "Unit 117 – Like and as (2)",
      "Unit 118 – For, during and while",
      "Unit 119 – By and until – By the time...",
    ]},
    { name: "Prepositions", chapters: [
      "Unit 120 – At/on/in (time) (1)",
      "Unit 121 – At/on/in (time) (2)",
      "Unit 122 – On time/in time – At the end/in the end",
      "Unit 123 – In/at/on (place) (1)",
      "Unit 124 – In/at/on (place) (2)",
      "Unit 125 – In/at/on (place) (3)",
      "Unit 126 – To/at/in/into",
      "Unit 127 – In/at/on (other uses)",
      "Unit 128 – By",
    ]},
    { name: "Noun, adjective and verb + preposition", chapters: [
      "Unit 129 – Noun + preposition (reason for, cause of etc.)",
      "Unit 130 – Adjective + preposition (1)",
      "Unit 131 – Adjective + preposition (2)",
      "Unit 132 – Verb + preposition (1) – to and at",
      "Unit 133 – Verb + preposition (2) – about/for/of/after",
      "Unit 134 – Verb + preposition (3) – about and of",
      "Unit 135 – Verb + preposition (4) – of/for/from/on",
      "Unit 136 – Verb + preposition (5) – in/into/with/to/on",
    ]},
    { name: "Appendices", chapters: [
      "Appendix 1 – Regular and irregular verbs",
      "Appendix 2 – Present and past tenses",
      "Appendix 3 – The future",
      "Appendix 4 – Modal verbs (can/could/will/would etc.)",
      "Appendix 5 – Short forms (I'm/you've/didn't etc.)",
      "Appendix 6 – Spelling",
      "Appendix 7 – American English",
    ]},
    { name: "Reference", chapters: [
      "Additional exercises",
      "Study guide",
    ]},
  ],
};

export const LETTY_GRAMMAR_SUBJECT: SubjectDef = {
  id: "enggrammar", name: "English Grammar", icon: "✏️", color: "#0891b2",
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
  ],
};

const STATUSES = ["not_started", "in_progress", "completed", "revised"] as const;
const STATUS_META: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  not_started: { label: "Not Started", color: "#94a3b8", icon: "⬜", bg: "#f8fafc" },
  in_progress: { label: "In Progress", color: "#f59e0b", icon: "🔄", bg: "#fffbeb" },
  completed:   { label: "Completed",   color: "#10b981", icon: "✅", bg: "#ecfdf5" },
  revised:     { label: "Revised",     color: "#8b5cf6", icon: "🌟", bg: "#f5f3ff" },
};
const TEST_TYPES = ["Class Test","Unit Test","Half Yearly","Annual Exam","Practice Test","Mock Test","Oral Test","Assignment","Other"];
const PAPER_TYPES = [
  { key: "qp",        label: "📄 Question Paper", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  { key: "ma",        label: "✅ Model Answer",   color: "#059669", bg: "#f0fdf4", border: "#86efac" },
  { key: "as",        label: "📝 Answer Sheet",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  { key: "resources", label: "🔗 Resources",      color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
];
const KEY_TO_RESOURCE_TYPE: Record<string, string> = {
  qp: "question_paper", ma: "model_answer", as: "answer_sheet", resources: "resources",
};

export interface GrammarTracker {
  id: string;
  label: string;
  rowId: string;
  subject: SubjectDef;
  data: Record<string, ChapterData>;
  days?: { daysLeft: number; totalDays: number; pct: number; examLabel: string };
  saving?: boolean;
  rewardLedger?: RewardLedgerControls;
  entertainmentLedger?: RewardLedgerControls;
  rewardMode?: "video" | "split";
  onChange: (next: Record<string, ChapterData>) => void | Promise<void>;
}

export function getChapters(sub: SubjectDef): Chapter[] {
  if (sub.chapters) return sub.chapters.map((c, i) => ({ id: `${sub.id}__${i}`, name: c }));
  const out: Chapter[] = [];
  sub.sections!.forEach(s =>
    s.chapters.forEach((c, i) => out.push({ id: `${sub.id}__${s.name}__${i}`, name: c, section: s.name }))
  );
  return out;
}

function pctCalc(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function scoreColor(p: number) { return p >= 80 ? "#10b981" : p >= 60 ? "#f59e0b" : "#ef4444"; }
function formatRewardAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
function ensureArr(v: unknown): string[] {
  if (!v) return [""];
  if (Array.isArray(v)) return v.length ? v : [""];
  return [v as string];
}
function hasPapers(p: Record<string, string[]> | null | undefined): boolean {
  return !!p && PAPER_TYPES.some(({ key }) => ensureArr(p[key]).some(Boolean));
}

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

function Glass({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)", borderRadius: 16,
      border: "1px solid rgba(255,255,255,.5)",
      boxShadow: "0 2px 12px rgba(0,0,0,.06)",
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

const emptyChapter = (): ChapterData => ({ status: "not_started", revision: false, tests: [], notes: "" });

export default function CommonEnglishGrammar({ trackers, loading = false }: {
  trackers: GrammarTracker[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [testModal, setTestModal] = useState<{ trackerId: string; chapterId: string; name: string } | null>(null);
  const [noteModal, setNoteModal] = useState<{ trackerId: string; chapterId: string; name: string; note: string } | null>(null);
  const [paperModal, setPaperModal] = useState<{ trackerId: string; rowId: string; chapterId: string; chapterName: string; subjectId: string } | null>(null);
  const [detailModal, setDetailModal] = useState<{ trackerId: string; kind: "days" | "done" | "in_progress" | "flagged" | "tests" | "rewards"; title: string } | null>(null);
  const [chapterResources, setChapterResources] = useState<ChapterResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [newLinkInputs, setNewLinkInputs] = useState<Record<string, string>>({ qp: "", ma: "", as: "", resources: "" });
  const [testForm, setTestForm] = useState({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" });

  const inp = (extra: CSSProperties = {}): CSSProperties => ({
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box",
    outline: "none", transition: "border .2s", ...extra,
  });

  const getTracker = (trackerId: string) => trackers.find(t => t.id === trackerId);
  const getCh = (tracker: GrammarTracker, id: string): ChapterData => tracker.data[id] || emptyChapter();
  const updateChapter = (tracker: GrammarTracker, chapterId: string, next: ChapterData) => {
    void tracker.onChange({ ...tracker.data, [chapterId]: next });
  };

  const cycleStatus = (tracker: GrammarTracker, chapterId: string) => {
    const ch = getCh(tracker, chapterId);
    const i = STATUSES.indexOf(ch.status as typeof STATUSES[number]);
    updateChapter(tracker, chapterId, { ...ch, status: STATUSES[(i + 1) % STATUSES.length] });
  };

  const toggleFlag = (tracker: GrammarTracker, chapterId: string) => {
    const ch = getCh(tracker, chapterId);
    updateChapter(tracker, chapterId, { ...ch, revision: !ch.revision });
  };

  const addTest = () => {
    if (!testModal || !testForm.obtained || !testForm.max) return;
    const tracker = getTracker(testModal.trackerId);
    if (!tracker) return;
    const ch = getCh(tracker, testModal.chapterId);
    updateChapter(tracker, testModal.chapterId, {
      ...ch,
      tests: [...(ch.tests || []), { ...testForm, id: Date.now() }],
    });
    setTestForm({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" });
    setTestModal(null);
  };

  const delTest = (tracker: GrammarTracker, chapterId: string, testId: number) => {
    const ch = getCh(tracker, chapterId);
    updateChapter(tracker, chapterId, { ...ch, tests: (ch.tests || []).filter(t => t.id !== testId) });
  };

  const saveNote = () => {
    if (!noteModal) return;
    const tracker = getTracker(noteModal.trackerId);
    if (!tracker) return;
    updateChapter(tracker, noteModal.chapterId, { ...getCh(tracker, noteModal.chapterId), notes: noteModal.note });
    setNoteModal(null);
  };

  useEffect(() => {
    if (!paperModal) return;
    const tracker = getTracker(paperModal.trackerId);
    setResourcesLoading(true);
    setChapterResources([]);
    setNewLinkInputs({ qp: "", ma: "", as: "", resources: "" });
    (async () => {
      const existing = await fetchChapterResources(paperModal.rowId, paperModal.chapterId);
      if (existing.length === 0 && tracker) {
        const oldPapers = getCh(tracker, paperModal.chapterId).papers;
        if (oldPapers && Object.values(oldPapers).some(arr => arr.some(Boolean))) {
          await migrateSingleChapter(paperModal.rowId, paperModal.subjectId, paperModal.chapterId, oldPapers);
          const migrated = await fetchChapterResources(paperModal.rowId, paperModal.chapterId);
          setChapterResources(migrated);
        }
      } else {
        setChapterResources(existing);
      }
      setResourcesLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperModal?.chapterId, paperModal?.rowId]);

  const handleAddResource = async (ptKey: string) => {
    if (!paperModal) return;
    const link = newLinkInputs[ptKey]?.trim();
    if (!link) return;
    setResourceError(null);
    const row = await insertChapterResource({
      tracker: paperModal.rowId,
      subject: paperModal.subjectId,
      chapter: paperModal.chapterId,
      resource_type: KEY_TO_RESOURCE_TYPE[ptKey],
      link,
    });
    if (row) {
      setChapterResources(prev => [...prev, row]);
      setNewLinkInputs(prev => ({ ...prev, [ptKey]: "" }));
    } else setResourceError("Could not save this grammar resource to Supabase.");
  };

  const handleDeleteResource = async (id: string) => {
    setResourceError(null);
    const ok = await deleteChapterResource(id);
    if (ok) setChapterResources(prev => prev.filter(r => r.id !== id));
    else setResourceError("Could not delete this grammar resource from Supabase.");
  };

  const openDetail = (tracker: GrammarTracker, kind: "days" | "done" | "in_progress" | "flagged" | "tests" | "rewards", title: string) => {
    setDetailModal({ trackerId: tracker.id, kind, title });
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <style>{`
        @media(max-width:900px){
          .grammar-tracker-head{align-items:flex-start!important}
          .grammar-tracker-main{min-width:0!important}
        }
        @media(max-width:820px){
          .grammar-search{max-width:none!important;width:100%!important}
          .grammar-tracker-head{flex-direction:column!important;align-items:flex-start!important}
          .grammar-tracker-icon{font-size:34px!important}
          .grammar-tracker-main{width:100%!important}
          .grammar-reward-badge{width:100%!important;min-width:0!important;flex-basis:auto!important}
          .grammar-progress-ring{align-self:flex-start!important;margin-top:0!important}
        }
        @media(max-width:520px){
          .grammar-chapter-actions{width:100%!important;justify-content:flex-start!important;flex-wrap:wrap!important}
        }
      `}</style>
      <Glass style={{ padding: "18px 20px", marginBottom: 14, border: "1px solid #dbeafe" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>✏️ English Grammar</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Savio and Letty grammar are shown here from their existing saved records.</div>
          </div>
          <input
            className="grammar-search"
            placeholder="🔍 Search grammar chapters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp({ maxWidth: 260, background: "white", fontSize: 13 }) }}
          />
	        </div>
	        {loading && <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Loading saved grammar scores...</div>}
	        {resourceError && <div style={{ marginTop: 10, fontSize: 12, color: "#991b1b", fontWeight: 800 }}>{resourceError}</div>}
	      </Glass>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {trackers.map(tracker => {
	          const chapters = getChapters(tracker.subject);
	          const done = chapters.filter(c => ["completed", "revised"].includes(getCh(tracker, c.id).status)).length;
	          const prog = chapters.filter(c => getCh(tracker, c.id).status === "in_progress").length;
	          const flagged = chapters.filter(c => getCh(tracker, c.id).revision).length;
	          const testsCount = chapters.reduce((total, c) => total + (getCh(tracker, c.id).tests || []).length, 0);
            const videoRewards = buildPerformanceRewardSummary(chapters.flatMap(ch =>
              (getCh(tracker, ch.id).tests || []).map(test => ({
                id: `${ch.id}-${test.id}`,
                label: ch.name,
                subLabel: `${test.type} • ${test.date}`,
                obtained: test.obtained,
                max: test.max,
              }))
            ));
            const isSplitReward = tracker.rewardMode === "split";
            const splitEarned = videoRewards.total / 2;
            const videoBalance = isSplitReward ? splitEarned - (tracker.rewardLedger?.spent || 0) : videoRewards.total - (tracker.rewardLedger?.spent || 0);
            const entertainmentBalance = splitEarned - (tracker.entertainmentLedger?.spent || 0);
            const rewardBalance = isSplitReward ? videoBalance + entertainmentBalance : videoBalance;
          const sections = tracker.subject.chapters
            ? [{ name: null as string | null, chs: search ? chapters.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : chapters }]
            : (() => {
                let n = 0;
                return tracker.subject.sections!.map(s => {
                  const sl = chapters.slice(n, n + s.chapters.length);
                  n += s.chapters.length;
                  return { name: s.name as string | null, chs: search ? sl.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : sl };
                }).filter(s => s.chs.length > 0);
              })();

          return (
            <div key={tracker.id}>
              <div className="grammar-tracker-head" style={{ background: `linear-gradient(135deg,${tracker.subject.color},${tracker.subject.color}cc)`, borderRadius: 18, padding: "18px 22px", marginBottom: 12, color: "white", display: "flex", alignItems: "center", gap: 16, boxShadow: `0 6px 24px ${tracker.subject.color}33` }}>
                <span className="grammar-tracker-icon" style={{ fontSize: 38 }}>{tracker.subject.icon}</span>
	                <div className="grammar-tracker-main" style={{ flex: 1 }}>
	                  <div style={{ fontWeight: 900, fontSize: 21 }}>{tracker.label} - English Grammar</div>
	                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
	                    {tracker.days && <button onClick={() => openDetail(tracker, "days", `${tracker.label} Days`)} style={{ border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.12)", color: "white", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{tracker.days.daysLeft}/{tracker.days.totalDays} days</button>}
	                    <button onClick={() => openDetail(tracker, "done", `${tracker.label} Completed / Revised`)} style={{ border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.12)", color: "white", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{done}/{chapters.length} chapters</button>
	                    <button onClick={() => openDetail(tracker, "tests", `${tracker.label} Test Scores`)} style={{ border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.12)", color: "white", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{testsCount} test score{testsCount !== 1 ? "s" : ""}</button>
	                    <button onClick={() => openDetail(tracker, "in_progress", `${tracker.label} In Progress`)} style={{ border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.12)", color: "white", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>🔄 {prog}</button>
	                    {flagged > 0 && <button onClick={() => openDetail(tracker, "flagged", `${tracker.label} Flagged`)} style={{ border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.12)", color: "white", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>🚩 {flagged}</button>}
	                  </div>
	                  {tracker.saving && <div style={{ fontSize: 12, opacity: .72, marginTop: 5 }}>Saving...</div>}
	                </div>
                  <RewardBadge
                    className="grammar-reward-badge"
                    tone="video"
                    icon="📺"
                    label={isSplitReward ? "Grammar Reward" : "Learning Videos"}
                    value={rewardBalance}
                    unit="min"
                    caption={isSplitReward ? "50% video • 50% entertainment" : "learning videos only"}
                    compact
                    onClick={() => openDetail(tracker, "rewards", isSplitReward ? `${tracker.label} Grammar Reward Split` : `${tracker.label} Learning Video Minutes`)}
                  />
                  {isSplitReward && (
                    <button
                      type="button"
                      className="grammar-reward-badge"
                      onClick={() => openDetail(tracker, "rewards", `${tracker.label} Grammar Reward Split`)}
                      style={{ border: "1px solid rgba(255,255,255,.28)", background: "rgba(255,255,255,.14)", color: "white", borderRadius: 12, padding: "8px 10px", cursor: "pointer", textAlign: "left", minWidth: 170, fontSize: 11, fontWeight: 850, lineHeight: 1.35 }}
                    >
                      <span style={{ display: "block" }}>Videos: {formatRewardAmount(videoBalance)} min</span>
                      <span style={{ display: "block" }}>Entertainment: {formatRewardAmount(entertainmentBalance)} min</span>
                    </button>
                  )}
	                <button type="button" onClick={() => openDetail(tracker, "done", `${tracker.label} Completed / Revised`)}
                    className="grammar-progress-ring"
	                  title={`Open completed ${tracker.label} grammar chapters`}
	                  style={{ position: "relative", cursor: "pointer", background: "transparent", border: "none", padding: 0, color: "white" }}>
	                  <CircleProgress value={pctCalc(done, chapters.length)} size={78} stroke={8} color="white" bg="rgba(255,255,255,.2)" />
	                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
	                    <div style={{ fontSize: 17, fontWeight: 900 }}>{pctCalc(done, chapters.length)}%</div>
	                    <div style={{ fontSize: 8, opacity: .7, fontWeight: 700 }}>DONE</div>
	                  </div>
	                </button>
              </div>

              {sections.length === 0 ? (
                <Glass style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No matching grammar chapters.</Glass>
              ) : sections.map(sec => (
                <div key={sec.name || "main"} style={{ marginBottom: 16 }}>
                  {sec.name && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 4 }}>
                      <div style={{ background: `${tracker.subject.color}15`, border: `1.5px solid ${tracker.subject.color}33`, borderRadius: 8, padding: "4px 13px", fontWeight: 700, color: tracker.subject.color, fontSize: 13, whiteSpace: "nowrap", boxShadow: `0 1px 6px ${tracker.subject.color}22` }}>📌 {sec.name}</div>
                      <div style={{ flex: 1, height: 1.5, background: `linear-gradient(90deg,${tracker.subject.color}44,transparent)`, borderRadius: 1 }} />
                    </div>
                  )}
                  {sec.chs.map((ch, chIdx) => {
                    const d = getCh(tracker, ch.id);
                    const sm = STATUS_META[d.status] || STATUS_META.not_started;
                    const tests = d.tests || [];
                    const avg = tests.length ? Math.round(tests.reduce((a, t) => a + pctCalc(+t.obtained, +t.max), 0) / tests.length) : null;
                    return (
                      <Glass key={`${tracker.id}-${ch.id}`} style={{ padding: "12px 16px", marginBottom: 8, borderLeft: `4px solid ${sm.color}`, background: sm.bg }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <button className="status-btn" onClick={() => cycleStatus(tracker, ch.id)}
                            style={{ background: `linear-gradient(135deg,${sm.color},${sm.color}cc)`, color: "white", border: "none", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: `0 2px 8px ${sm.color}55`, transition: "all .15s ease" }}>
                            {sm.icon} {sm.label}
                          </button>
                          <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#1e293b", minWidth: 80 }}>{chIdx + 1}. {ch.name}</div>
                          <div className="grammar-chapter-actions" style={{ display: "flex", gap: 4 }}>
                            <button className="action-btn" onClick={() => toggleFlag(tracker, ch.id)} title="Flag for revision" style={{ background: d.revision ? "#fef2f2" : "white", border: `1.5px solid ${d.revision ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13, transition: "all .15s" }}>{d.revision ? "🚩" : "🏳️"}</button>
                            <button className="action-btn" onClick={() => setNoteModal({ trackerId: tracker.id, chapterId: ch.id, name: ch.name, note: d.notes || "" })} title="Notes" style={{ background: d.notes ? "#eff6ff" : "white", border: `1.5px solid ${d.notes ? "#93c5fd" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13, transition: "all .15s" }}>{d.notes ? "📝" : "📄"}</button>
                            <button className="action-btn" onClick={() => setPaperModal({ trackerId: tracker.id, rowId: tracker.rowId, chapterId: ch.id, chapterName: ch.name, subjectId: tracker.subject.id })} title="Papers & Resources" style={{ background: hasPapers(d.papers) ? "#f0fdf4" : "white", border: `1.5px solid ${hasPapers(d.papers) ? "#86efac" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13, transition: "all .15s" }}>📎</button>
                            <button className="action-btn" onClick={() => { setTestModal({ trackerId: tracker.id, chapterId: ch.id, name: ch.name }); setTestForm({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" }); }}
                              title="Add test score" style={{ background: "white", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#475569", transition: "all .15s" }}>+ Test</button>
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
                                  <button onClick={() => delTest(tracker, ch.id, t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 11 }}>✕</button>
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
	      </div>

	      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.title || "Details"}>
	        {detailModal && (() => {
	          const tracker = getTracker(detailModal.trackerId);
	          if (!tracker) return null;
	          const chapters = getChapters(tracker.subject);
	          if (detailModal.kind === "days") {
	            if (!tracker.days) return null;
	            return (
	              <div>
	                <div style={{ fontSize: 34, fontWeight: 950, color: "#047857", marginBottom: 8 }}>
	                  {tracker.days.daysLeft}/{tracker.days.totalDays} days
	                </div>
	                <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
	                  Remaining days out of the full countdown period.
	                  <br />
	                  Exam date: {tracker.days.examLabel}
	                </div>
	              </div>
	            );
	          }
	          if (detailModal.kind === "tests") {
	            const tests = chapters.flatMap(ch =>
	              (getCh(tracker, ch.id).tests || []).map(t => ({ ...t, chapterName: ch.name }))
	            ).sort((a, b) => +new Date(b.date) - +new Date(a.date));
	            return tests.length === 0 ? (
	              <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0", fontSize: 14 }}>No test scores yet.</div>
	            ) : (
	              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
	                {tests.map((t, i) => {
	                  const p = pctCalc(+t.obtained, +t.max);
	                  return (
	                    <div key={`${t.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < tests.length - 1 ? "1px solid #f1f5f9" : "none" }}>
	                      <div style={{ flex: 1, minWidth: 0 }}>
	                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{t.chapterName}</div>
	                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.type} • {t.date}</div>
	                      </div>
	                      <div style={{ fontWeight: 900, fontSize: 14, color: scoreColor(p) }}>{t.obtained}/{t.max}</div>
	                    </div>
	                  );
	                })}
	              </div>
	            );
	          }
            if (detailModal.kind === "rewards") {
              const videoRewards = buildPerformanceRewardSummary(chapters.flatMap(ch =>
                (getCh(tracker, ch.id).tests || []).map(test => ({
                  id: `${ch.id}-${test.id}`,
                  label: ch.name,
                  subLabel: `${test.type} • ${test.date}`,
                  obtained: test.obtained,
                  max: test.max,
                }))
              ));
              const isSplitReward = tracker.rewardMode === "split";
              const splitEarned = videoRewards.total / 2;
              return (
                <RewardBreakdown
                  summary={videoRewards}
                  unit="minutes"
                  title={isSplitReward ? `${tracker.label} grammar reward split` : `${tracker.label} learning video balance`}
                  emptyText="No grammar test scores yet."
                  note={isSplitReward
                    ? "Calculated from English Grammar test scores. Exactly 50% is available for learning videos and 50% for entertainment; each balance is deducted separately and can go negative."
                    : "Calculated from English Grammar test scores. This reward is for learning videos only, such as PW, Vedantu, Next Topper, or similar."}
                >
                  {isSplitReward ? (
                    <>
                      {tracker.rewardLedger && (
                        <RewardRedeemer
                          ledger={tracker.rewardLedger}
                          earned={splitEarned}
                          unit="minutes"
                          label="learning videos"
                        />
                      )}
                      {tracker.entertainmentLedger && (
                        <RewardRedeemer
                          ledger={tracker.entertainmentLedger}
                          earned={splitEarned}
                          unit="minutes"
                          label="entertainment"
                        />
                      )}
                    </>
                  ) : tracker.rewardLedger && (
                    <RewardRedeemer
                      ledger={tracker.rewardLedger}
                      earned={videoRewards.total}
                      unit="minutes"
                      label="learning videos"
                    />
                  )}
                </RewardBreakdown>
              );
            }
	          const matched = chapters.filter(ch => {
	            const d = getCh(tracker, ch.id);
	            if (detailModal.kind === "done") return ["completed", "revised"].includes(d.status);
	            if (detailModal.kind === "flagged") return d.revision;
	            return d.status === detailModal.kind;
	          });
	          return matched.length === 0 ? (
	            <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0", fontSize: 14 }}>No chapters found.</div>
	          ) : (
	            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
	              {matched.map(ch => (
	                <div key={ch.id} style={{ fontSize: 13, color: "#374151", padding: "7px 0 7px 12px", borderLeft: `3px solid ${tracker.subject.color}55` }}>
	                  {ch.name}
	                </div>
	              ))}
	            </div>
	          );
	        })()}
	      </Modal>

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
            <div style={{ textAlign: "center", padding: "8px 0", fontSize: 28, fontWeight: 900, color: scoreColor(pctCalc(+testForm.obtained, +testForm.max)) }}>
              {pctCalc(+testForm.obtained, +testForm.max)}%
            </div>
          )}
          <textarea placeholder="Notes (optional)..." value={testForm.notes} onChange={e => setTestForm({ ...testForm, notes: e.target.value })} style={inp({ minHeight: 60, resize: "vertical", marginBottom: 14 })} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setTestModal(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
            <button onClick={addTest} style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#0891b2,#0e7490)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Save Score</button>
          </div>
        </>}
      </Modal>

      <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title="📄 Chapter Notes">
        {noteModal && <>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12, marginTop: -8 }}>{noteModal.name}</div>
          <textarea value={noteModal.note} onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
            placeholder="Study notes, formulae, reminders..." style={inp({ minHeight: 120, resize: "vertical", marginBottom: 14 })} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setNoteModal(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
            <button onClick={saveNote} style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#0891b2,#0e7490)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Save Note</button>
          </div>
        </>}
      </Modal>

      <Modal open={!!paperModal} onClose={() => setPaperModal(null)} title="📎 Papers & Resources">
        {paperModal && <>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12, marginTop: -8 }}>{paperModal.chapterName}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16, background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
            Upload to Google Drive, share, then paste the link below.
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
                        style={{ flex: 1, fontSize: 12, color, wordBreak: "break-all", padding: "6px 8px", background: "white", borderRadius: 7, border: `1px solid ${border}`, textDecoration: "none" }}>
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
    </div>
  );
}

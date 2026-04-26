import React, { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
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
const ROW_IDS: Record<string, string> = { home: "savvy", school: "savvy_school" };
const LS_KEYS: Record<string, string> = { home: "savvy_v4", school: "savvy_school_v4" };
const LEGACY_ROW_IDS: Record<string, string> = { home: "savio", school: "savio_school" };
const LEGACY_LS_KEYS: Record<string, string> = { home: "savio_v4", school: "savio_school_v4" };

/*
  ── Supabase SQL (run once in Supabase SQL editor) ──────────────────────────
  CREATE TABLE IF NOT EXISTS common_resources (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    page_type  TEXT        NOT NULL,
    title      TEXT        NOT NULL DEFAULT '',
    link       TEXT        NOT NULL DEFAULT '',
    notes      TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE common_resources DISABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS chapter_resources (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    tracker       TEXT        NOT NULL,
    subject       TEXT        NOT NULL DEFAULT '',
    chapter       TEXT        NOT NULL,
    resource_type TEXT        NOT NULL,
    link          TEXT        NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE chapter_resources DISABLE ROW LEVEL SECURITY;
  ────────────────────────────────────────────────────────────────────────── */

/* ───────── Types ───────── */
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

async function migrateSupabaseRows() {
  const pairs = [
    { from: LEGACY_ROW_IDS.home,   to: ROW_IDS.home },
    { from: LEGACY_ROW_IDS.school, to: ROW_IDS.school },
  ];
  for (const { from, to } of pairs) {
    try {
      const checkRes = await fetch(
        `${SUPA_URL}/rest/v1/tracker_data?id=eq.${to}&select=id`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
      );
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length > 0) continue;
      const oldRes = await fetch(
        `${SUPA_URL}/rest/v1/tracker_data?id=eq.${from}&select=data`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
      );
      const oldData = (await oldRes.json())?.[0]?.data;
      if (!oldData) continue;
      await fetch(`${SUPA_URL}/rest/v1/tracker_data`, {
        method: "POST",
        headers: {
          apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
          "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({ id: to, data: oldData }),
      });
    } catch { /* silent */ }
  }
}

function migrateLocalStorage() {
  const pairs = [
    { from: LEGACY_LS_KEYS.home,   to: LS_KEYS.home },
    { from: LEGACY_LS_KEYS.school, to: LS_KEYS.school },
  ];
  pairs.forEach(({ from, to }) => {
    try {
      const old = localStorage.getItem(from);
      if (old && !localStorage.getItem(to)) localStorage.setItem(to, old);
    } catch {}
  });
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
      { name: "Kshitij – Kavya", chapters: ["Surdas – Pad","Tulsidas – Ram-Lakshman-Parshuram Samvad","Jaishankar Prasad – Atmakathya","Suryakant Tripathi 'Nirala' – Utsah / Att Nahi Rahi","Nagarjun – Yah Danturit Muskan / Fasal","Mangalesh Dabral – Sangatkar"] },
      { name: "Kshitij – Gadya", chapters: ["Swayam Prakash – Netaji ka Chashma","Ram Vriksh Benipuri – Balgobin Bhagat","Yashpal – Lakhnavi Andaaz","Mannu Bhandari – Ek Kahani Yeh Bhi","Hazari Prasad Dwivedi – Sanskriti","Habib Tanvir – Kartoos"] },
      { name: "Kritika", chapters: ["Mata ka Anchal","Sana-Sana Haath Jodi","Main Kyun Likhta Hoon"] },
    ] },
  { id: "sst", name: "Social Studies", icon: "🌍", color: "#7c3aed",
    sections: [
      { name: "History", chapters: ["The Rise of Nationalism in Europe","Nationalism in India","The Making of a Global World","The Age of Industrialisation","Print Culture and the Modern World"] },
      { name: "Geography", chapters: ["Resources and Development","Forest and Wildlife Resources","Water Resources","Agriculture","Minerals and Energy Resources","Manufacturing Industries","Lifelines of National Economy"] },
      { name: "Political Science", chapters: ["Power Sharing","Federalism","Gender, Religion and Caste","Political Parties","Outcomes of Democracy"] },
      { name: "Economics", chapters: ["Development","Sectors of the Indian Economy","Money and Credit","Globalisation and the Indian Economy","Consumer Rights"] },
    ] },
  { id: "enggrammar", name: "English Grammar", icon: "✏️", color: "#0891b2",
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
      { name: "Kshitij – Kavya", chapters: ["Surdas – Pad","Tulsidas – Ram-Lakshman-Parshuram Samvad","Jaishankar Prasad – Atmakathya","Suryakant Tripathi 'Nirala' – Utsah / Att Nahi Rahi","Nagarjun – Yah Danturit Muskan / Fasal","Mangalesh Dabral – Sangatkar"] },
      { name: "Kshitij – Gadya", chapters: ["Swayam Prakash – Netaji ka Chashma","Ram Vriksh Benipuri – Balgobin Bhagat","Yashpal – Lakhnavi Andaaz","Mannu Bhandari – Ek Kahani Yeh Bhi","Hazari Prasad Dwivedi – Sanskriti","Habib Tanvir – Kartoos"] },
      { name: "Kritika", chapters: ["Mata ka Anchal","Sana-Sana Haath Jodi","Main Kyun Likhta Hoon"] },
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
  { key: "qp",        label: "📄 Question Paper", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  { key: "ma",        label: "✅ Model Answer",   color: "#059669", bg: "#f0fdf4", border: "#86efac" },
  { key: "as",        label: "📝 Answer Sheet",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  { key: "resources", label: "🔗 Resources",      color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
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
  const [paperModal, setPaperModal] = useState<{ id: string; name: string; subjectId: string; subjectName: string } | null>(null);
  const [chapterResources, setChapterResources] = useState<ChapterResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [newLinkInputs, setNewLinkInputs] = useState<Record<string, string>>({ qp: "", ma: "", as: "", resources: "" });
  const [testForm, setTestForm] = useState({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" });

  const [countdown, setCountdown] = useState(getCountdown());
  const [hovSlice, setHovSlice] = useState<number | null>(null);
  const [bothData, setBothData] = useState<Record<string, Record<string, ChapterData>>>({ home: {}, school: {} });
  const [statusModal, setStatusModal] = useState<{ filter: string; label: string; color: string } | null>(null);

  // Common resources
  const [commonResources, setCommonResources] = useState<CommonResource[]>([]);
  const [commonLoading, setCommonLoading] = useState(false);
  const [commonSaving, setCommonSaving] = useState(false);
  const [commonForm, setCommonForm] = useState({ title: "", link: "", notes: "" });
  const [editingResource, setEditingResource] = useState<CommonResource | null>(null);
  const isSchool = mode === "school";
  const activeSubjects = useMemo(() => isSchool ? SCHOOL_SUBJECTS : SUBJECTS, [isSchool]);

  useEffect(() => {
    migrateLocalStorage();
    migrateSupabaseRows();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    setLoading(true); setData({}); setTab("dashboard"); setSearch("");
    (async () => {
      let d = await fetchData(mode);
      if (d) { setData(d); setBothData(prev => ({ ...prev, [mode]: d! })); try { localStorage.setItem(LS_KEYS[mode], JSON.stringify(d)); } catch {} }
      else { try { const s = localStorage.getItem(LS_KEYS[mode]); if (s) { d = JSON.parse(s); setData(d!); setBothData(prev => ({ ...prev, [mode]: d! })); await saveData(mode, d!); } } catch {} }
      setLoading(false);
      // fetch other mode in background for status modal
      const other = mode === "home" ? "school" : "home";
      const od = await fetchData(other);
      if (od) { setBothData(prev => ({ ...prev, [other]: od })); }
      else { try { const s = localStorage.getItem(LS_KEYS[other]); if (s) setBothData(prev => ({ ...prev, [other]: JSON.parse(s) })); } catch {} }
    })();
  }, [mode]);

  const persist = useCallback(async (d: Record<string, ChapterData>) => {
    setData(d);
    setBothData(prev => ({ ...prev, [mode]: d }));
    try { localStorage.setItem(LS_KEYS[mode], JSON.stringify(d)); } catch {}
    setSaving(true); await saveData(mode, d); setSaving(false);
  }, [mode]);

  useEffect(() => {
    if (tab !== "common") return;
    setCommonLoading(true);
    fetchCommonResources(mode).then(r => { setCommonResources(r); setCommonLoading(false); });
  }, [tab, mode]);

  const addCommonResource = async () => {
    if (!commonForm.title.trim()) return;
    setCommonSaving(true);
    const r = await insertCommonResource({ page_type: mode, title: commonForm.title.trim(), link: commonForm.link.trim(), notes: commonForm.notes.trim() });
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
    const tracker = ROW_IDS[mode];
    setResourcesLoading(true);
    setChapterResources([]);
    setNewLinkInputs({ qp: "", ma: "", as: "", resources: "" });
    (async () => {
      const existing = await fetchChapterResources(tracker, paperModal.id);
      if (existing.length === 0) {
        const oldPapers = getCh(paperModal.id).papers;
        if (oldPapers && Object.values(oldPapers).some(arr => arr.some(Boolean))) {
          await migrateSingleChapter(tracker, paperModal.subjectId, paperModal.id, oldPapers);
          const migrated = await fetchChapterResources(tracker, paperModal.id);
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
      tracker: ROW_IDS[mode],
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
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "linear-gradient(145deg,#eef2ff 0%,#f8fafc 55%,#faf5ff 100%)", minHeight: "100vh" }}>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes cardIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes shimmer{0%{background-position:-300% 0}100%{background-position:300% 0}}
        html,body{margin:0;padding:0;width:100%;overflow-x:hidden}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#a5b4fc,#818cf8);border-radius:10px}
        ::-webkit-scrollbar-track{background:transparent}
        .tab-bar::-webkit-scrollbar{display:none}
        .tab-bar{scrollbar-width:none}
        .status-btn:hover{filter:brightness(1.1);transform:scale(1.04)}
        .action-btn:hover{background:#f0f4ff!important;border-color:#a5b4fc!important;transform:scale(1.08)}
        .chapter-glass:hover{box-shadow:0 4px 24px rgba(99,102,241,.1)!important}
        @media(max-width:600px){
          .page-wrap{padding:8px 12px!important}
          .header-card{border-radius:14px!important;padding:16px 18px!important}
          .dash-grid{grid-template-columns:1fr!important}
        }
        @media(min-width:1800px){
          .page-wrap,.footer-inner{zoom:1.18}
        }
        @media(min-width:2200px){
          .page-wrap,.footer-inner{zoom:1.4}
        }
        @media(min-width:2800px){
          .page-wrap,.footer-inner{zoom:1.7}
        }
      `}</style>

      <div className="page-wrap" style={{ width: "100%", padding: "16px 80px" }}>

        {/* ════ HEADER ════ */}
        <div className="header-card" style={{ background: accentGrad, borderRadius: 20, padding: "22px 28px", marginBottom: 16, color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
          <div style={{ position: "absolute", bottom: -50, left: 60, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
          <div style={{ position: "absolute", top: 10, right: 160, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
          <div style={{ position: "absolute", top: -20, left: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 38 }}>{isSchool ? "🏫" : "📚"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Savvy's {isSchool ? "School" : "Study"} Tracker</div>
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
              <div key={s.label} style={{ background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)", borderRadius: 14, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,.25)", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>
                <span style={{ fontSize: 14 }}>{s.ico}</span>
                <span style={{ fontWeight: 800, fontSize: 15 }}>{s.val}</span>
                <span style={{ fontSize: 11, opacity: .75 }}>{s.label}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <a href="/l"
                style={{ background: "rgba(255,105,180,.35)", border: "1.5px solid rgba(255,182,193,.6)", borderRadius: 12, padding: "6px 14px", cursor: "pointer", color: "white", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
                🎀 Letty's
              </a>
              <button onClick={() => setMode(m => m === "home" ? "school" : "home")}
                style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 12, padding: "6px 14px", cursor: "pointer", color: "white", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                {isSchool ? "🏠 Home" : "🏫 School"}
              </button>
            </div>
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
          {[
            { label: "Days",   pct: countdown.pct,              color: glow,      color2: `${glow}88` },
            { label: "Home",   pct: bothData.home   ? pctCalc(Object.values(bothData.home).filter(c => ["completed","revised"].includes(c.status)).length, SUBJECTS.reduce((a, s) => a + getChapters(s).length, 0)) : 0, color: "#818cf8", color2: "#6366f188" },
            { label: "School", pct: bothData.school ? pctCalc(Object.values(bothData.school).filter(c => ["completed","revised"].includes(c.status)).length, SCHOOL_SUBJECTS.reduce((a, s) => a + getChapters(s).length, 0)) : 0, color: "#f59e0b", color2: "#f59e0b88" },
          ].map(({ label, pct, color, color2 }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#64748b", textTransform: "uppercase" as const, width: 42, flexShrink: 0 }}>{label}</div>
              <div style={{ flex: 1, background: "rgba(255,255,255,.07)", borderRadius: 20, height: 8, overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,.2)" }}>
                <div style={{ background: `linear-gradient(90deg,${color2},${color})`, height: "100%", width: `${pct}%`, borderRadius: 20, transition: "width 1.2s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 12px ${color}88` }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color, width: 32, textAlign: "right" as const, textShadow: `0 0 8px ${color}88` }}>{pct}%</div>
            </div>
          ))}
        </Glass>

        {/* ════ TABS + SEARCH ════ */}
        <div className="tab-bar" style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center", overflowX: "auto", padding: "3px 3px 8px" }}>
          {["dashboard", ...activeSubjects.map(s => s.id), "analytics", "common"].map(t => {
            const sub = activeSubjects.find(s => s.id === t);
            const active = tab === t;
            const tabColor = sub ? sub.color : t === "analytics" ? "#0f172a" : t === "common" ? "#7c3aed" : (isSchool ? "#92400e" : "#1e40af");
            return (
              <button key={t} onClick={() => { setTab(t); setSearch(""); }}
                style={{
                  padding: "8px 18px", borderRadius: 50, cursor: "pointer", flexShrink: 0,
                  fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: "nowrap" as const,
                  border: active ? "none" : "1.5px solid #e5e7eb",
                  background: active ? `linear-gradient(135deg,${tabColor},${tabColor}dd)` : "white",
                  color: active ? "white" : "#64748b",
                  boxShadow: active ? `0 3px 14px ${tabColor}55, 0 1px 3px rgba(0,0,0,.1)` : "0 1px 4px rgba(0,0,0,.05)",
                  transform: active ? "translateY(-2px)" : "none",
                  transition: "all .22s cubic-bezier(.4,0,.2,1)",
                }}>
                {t === "dashboard" ? "🏠 Dashboard" : t === "analytics" ? "📊 Analytics" : t === "common" ? "🗂️ Common" : `${sub!.icon} ${sub!.name}`}
              </button>
            );
          })}
          {tab !== "dashboard" && tab !== "analytics" && tab !== "common" && (
            <input placeholder="🔍 Search chapters…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp({ maxWidth: 220, marginLeft: "auto", background: "white", fontSize: 13 }) }} />
          )}
        </div>

        {/* ════ DASHBOARD ════ */}
        {tab === "dashboard" && (
          <div style={{ animation: "fadeUp .3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 16, marginBottom: 20 }}>
              {stats.ss.map(s => (
                <Glass key={s.id} hover onClick={() => setTab(s.id)} style={{ padding: "22px 24px", borderTop: `4px solid ${s.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 32 }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginTop: 7, color: "#0f172a" }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{s.done}/{s.total} chapters</div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <CircleProgress value={s.pct} size={70} stroke={7} color={s.color} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: s.color }}>{s.pct}%</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 11, flexWrap: "wrap" }}>
                    {s.prog > 0 && <span style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "2px 7px", color: "#b45309", fontWeight: 700 }}>🔄 {s.prog}</span>}
                    {s.flagged > 0 && <span style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 7px", color: "#b91c1c", fontWeight: 700 }}>🚩 {s.flagged}</span>}
                  </div>
                  <div style={{ marginTop: 10, background: "#f0f2f8", borderRadius: 99, height: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, background: `linear-gradient(90deg,${s.color}99,${s.color})`, borderRadius: 99, transition: "width 1.2s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 6px ${s.color}66` }} />
                  </div>
                </Glass>
              ))}
            </div>
            <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
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
                    <div key={name} style={{ background: `${d.color}0d`, border: `1.5px solid ${d.color}2a`, borderRadius: 16, padding: "18px 18px 14px", textAlign: "center" as const, boxShadow: `0 2px 12px ${d.color}15`, transition: "transform .2s,box-shadow .2s" }}>
                      <div style={{ fontSize: 30 }}>{d.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6, color: "#1e293b" }}>{name}</div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: scoreColor(d.avg), marginTop: 4, textShadow: `0 2px 10px ${scoreColor(d.avg)}44` }}>{d.avg}%</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>{d.count} test{d.count > 1 ? "s" : ""}</div>
                      <ProgressBar value={d.avg} color={scoreColor(d.avg)} h={6} />
                    </div>
                  ))}
                </div>
              </Glass>
            )}
          </div>
        )}

        {/* ════ COMMON TAB ════ */}
        {tab === "common" && (
          <div style={{ animation: "fadeUp .3s ease" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9cc)", borderRadius: 18, padding: "20px 24px", marginBottom: 14, color: "white", display: "flex", alignItems: "center", gap: 18, boxShadow: "0 6px 24px #7c3aed33" }}>
              <span style={{ fontSize: 40 }}>🗂️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 22 }}>Common Resources</div>
                <div style={{ fontSize: 13, opacity: .85, marginTop: 2 }}>{isSchool ? "School" : "Home"} • {commonResources.length} saved resource{commonResources.length !== 1 ? "s" : ""}</div>
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
                    placeholder="e.g. Chapter 3 Notes, Formula Sheet…"
                    value={commonForm.title}
                    onChange={e => setCommonForm(f => ({ ...f, title: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" as const, outline: "none" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Google Drive / URL</div>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/…"
                    value={commonForm.link}
                    onChange={e => setCommonForm(f => ({ ...f, link: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" as const, outline: "none" }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Notes</div>
                <textarea
                  placeholder="Add any notes or description…"
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
                {commonSaving ? "Saving…" : "Save Resource"}
              </button>
            </Glass>

            {/* Resource List */}
            {commonLoading ? (
              <div style={{ textAlign: "center" as const, padding: 40, color: "#94a3b8", fontSize: 14 }}>Loading…</div>
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
                  {sec.name && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 4 }}>
                      <div style={{ background: `${sub.color}15`, border: `1.5px solid ${sub.color}33`, borderRadius: 8, padding: "4px 13px", fontWeight: 700, color: sub.color, fontSize: 13, whiteSpace: "nowrap" as const, boxShadow: `0 1px 6px ${sub.color}22` }}>📌 {sec.name}</div>
                      <div style={{ flex: 1, height: 1.5, background: `linear-gradient(90deg,${sub.color}44,transparent)`, borderRadius: 1 }} />
                    </div>
                  )}
                  {sec.chs.map((ch, chIdx) => {
                    const d = getCh(ch.id);
                    const sm = STATUS_META[d.status];
                    const tests = d.tests || [];
                    const avg = tests.length ? Math.round(tests.reduce((a, t) => a + pctCalc(+t.obtained, +t.max), 0) / tests.length) : null;
                    return (
                      <Glass key={ch.id} style={{ padding: "12px 16px", marginBottom: 8, borderLeft: `4px solid ${sm.color}`, background: sm.bg, transition: "box-shadow .2s ease" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <button className="status-btn" onClick={() => cycleStatus(ch.id)}
                            style={{ background: `linear-gradient(135deg,${sm.color},${sm.color}cc)`, color: "white", border: "none", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const, boxShadow: `0 2px 8px ${sm.color}55`, transition: "all .15s ease" }}>
                            {sm.icon} {sm.label}
                          </button>
                          <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#1e293b", minWidth: 80 }}>{(() => { chIdx++; return `${chIdx}. ${ch.name}`; })()}</div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="action-btn" onClick={() => toggleFlag(ch.id)} title="Flag for revision" style={{ background: d.revision ? "#fef2f2" : "white", border: `1.5px solid ${d.revision ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13, transition: "all .15s" }}>{d.revision ? "🚩" : "🏳️"}</button>
                            <button className="action-btn" onClick={() => setNoteModal({ id: ch.id, name: ch.name, note: d.notes || "" })} title="Notes" style={{ background: d.notes ? "#eff6ff" : "white", border: `1.5px solid ${d.notes ? "#93c5fd" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13, transition: "all .15s" }}>{d.notes ? "📝" : "📄"}</button>
                            <button className="action-btn" onClick={() => setPaperModal({ id: ch.id, name: ch.name, subjectId: sub.id, subjectName: sub.name })} title="Papers & Resources" style={{ background: hasPapers(d.papers) ? "#f0fdf4" : "white", border: `1.5px solid ${hasPapers(d.papers) ? "#86efac" : "#e5e7eb"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13, transition: "all .15s" }}>📎</button>
                            <button className="action-btn" onClick={() => { setTestModal({ id: ch.id, name: ch.name }); setTestForm({ type: "Class Test", date: new Date().toISOString().slice(0, 10), obtained: "", max: "", notes: "" }); }}
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

        {/* ════ EDIT COMMON RESOURCE MODAL ════ */}
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
              placeholder="https://drive.google.com/…"
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
                {commonSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>}
        </Modal>

        {/* ════ STATUS FILTER MODAL ════ */}
        <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title={`${statusModal?.label || ""} Chapters`}>
          {statusModal && (() => {
            const matchFn = (d: ChapterData) =>
              statusModal.filter === "flagged" ? d.revision : d.status === statusModal.filter;
            const getD = (modeKey: string, id: string): ChapterData =>
              (bothData[modeKey]?.[id]) || { status: "not_started", revision: false, tests: [], notes: "" };
            const sections: React.ReactNode[] = [];
            (["home", "school"] as const).forEach(m => {
              const subjects = m === "home" ? SUBJECTS : SCHOOL_SUBJECTS;
              const matched = subjects.flatMap(s =>
                getChapters(s)
                  .filter(c => matchFn(getD(m, c.id)))
                  .map(c => ({ ...c, subName: s.name, subIcon: s.icon, subColor: s.color }))
              );
              if (matched.length === 0) return;
              const bySubject: Record<string, typeof matched> = {};
              matched.forEach(c => {
                if (!bySubject[c.subName]) bySubject[c.subName] = [];
                bySubject[c.subName].push(c);
              });
              sections.push(
                <div key={m}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#64748b", margin: "14px 0 8px",
                    paddingBottom: 6, borderBottom: "1px solid #f1f5f9" }}>
                    {m === "home" ? "🏠 Home" : "🏫 School"} — {matched.length} chapter{matched.length !== 1 ? "s" : ""}
                  </div>
                  {Object.entries(bySubject).map(([subName, chs]) => {
                    const first = chs[0];
                    return (
                      <div key={subName} style={{ marginBottom: 10 }}>
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
            });
            return sections.length > 0 ? <>{sections}</> : (
              <div style={{ color: "#94a3b8", textAlign: "center" as const, padding: "20px 0", fontSize: 14 }}>
                No chapters found.
              </div>
            );
          })()}
        </Modal>
      </div>

      {/* ════ FOOTER ════ */}
      <footer style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#1e0f3a 100%)", color: "white", marginTop: 40, padding: "28px 20px 20px", borderTop: "1px solid rgba(99,102,241,.2)" }}>
        <div className="footer-inner" style={{ width: "100%", padding: "0 80px" }}>
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
            <div style={{ fontSize: 12, opacity: .35 }}>Built with ❤️ for Savvy • {new Date().getFullYear()} • All the best! 🎯</div>
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

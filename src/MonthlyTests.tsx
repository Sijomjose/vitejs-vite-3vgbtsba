/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RewardBadge, RewardBreakdown, buildMonthlyRewardSummary } from "./Rewards";
import { RewardRedeemer, useRewardRedemptions, type RewardWalletId } from "./RewardRedemptions";

const SUPA_URL = "https://mlfgdutctvbvqwebqajp.supabase.co";
const SUPA_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmdkdXRjdHZidnF3ZWJxYWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ2MDIsImV4cCI6MjA4OTgxMDYwMn0.TPBeT6y-fFGAgcME_mmKqBUYHFUMVB1FO3wrAhneKW4";

const PIN = "4563";

const SUBJECTS = [
  { key: "english", label: "English" },
  { key: "hindi", label: "Hindi" },
  { key: "maths", label: "Maths" },
  { key: "science", label: "Science" },
  { key: "socialScience", label: "Social Science" },
] as const;

type SubjectKey = (typeof SUBJECTS)[number]["key"];
type MarkValue = number | "AB" | null;
type Marks = Partial<Record<SubjectKey, MarkValue>>;

interface MonthlyStudent {
  id: string;
  rollNo: string;
  name: string;
  marks: Marks;
}

interface MonthlyTest {
  id: string;
  name: string;
  date: string;
  maxMarks: Record<SubjectKey, number>;
  students: MonthlyStudent[];
}

interface MonthlyTestsData {
  version: 1;
  updatedAt: string;
  tests: MonthlyTest[];
}

interface RowStats {
  total: number;
  maxAvailable: number;
  percentage: number | null;
  complete: boolean;
  numericCount: number;
  missingCount: number;
}

interface RankInfo {
  rank: number;
  percentile: number;
}

interface CumulativeRow {
  key: string;
  rollNo: string;
  name: string;
  completeTests: number;
  total: number;
  max: number;
  percentage: number | null;
  rank?: number;
  percentile?: number;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export interface MonthlyTestsConfig {
  title: string;
  directUrl: string;
  rowId: string;
  localKey: string;
  targetDisplayName: string;
  targetMatchers: string[];
  rewardWalletId: RewardWalletId;
  defaultData: MonthlyTestsData;
  seedTargetStudentName?: string;
}

const defaultMaxMarks = (): Record<SubjectKey, number> => ({
  english: 40,
  hindi: 40,
  maths: 40,
  science: 40,
  socialScience: 40,
});

const SAVIO_DEFAULT_DATA: MonthlyTestsData = {
  version: 1,
  updatedAt: "2026-05-16T00:00:00.000Z",
  tests: [
    {
      id: "monthly-test-1",
      name: "Monthly Test 1",
      date: "2026-04-01",
      maxMarks: defaultMaxMarks(),
      students: [
        { id: "10101", rollNo: "10101", name: "AARUSHI YADAV", marks: { english: 37, hindi: 39, maths: 30, science: 32, socialScience: 37 } },
        { id: "10102", rollNo: "10102", name: "AARUSHKUMAR VERN...", marks: { english: 37, hindi: 32, maths: 29, science: 36, socialScience: 34 } },
        { id: "10103", rollNo: "10103", name: "ABHINAV RAJPUT", marks: { english: 37, hindi: 39, maths: 34, science: 33, socialScience: 40 } },
        { id: "10104", rollNo: "10104", name: "AKASH ABHAY YADAV", marks: { english: 33, hindi: "AB", maths: 11, science: 18, socialScience: 25 } },
        { id: "10105", rollNo: "10105", name: "AKASH KUMAR YADA...", marks: { english: 28, hindi: 23, maths: 15, science: 28, socialScience: 27 } },
        { id: "10106", rollNo: "10106", name: "ANJUSHA BIJU PAND...", marks: { english: 37, hindi: 30, maths: 20, science: 35, socialScience: 29 } },
        { id: "10107", rollNo: "10107", name: "ANUJ YADAV", marks: { english: 9, hindi: 6, maths: "AB", science: null, socialScience: "AB" } },
        { id: "10108", rollNo: "10108", name: "ARNAV VERMA", marks: { english: "AB", hindi: "AB", maths: 24, science: 18, socialScience: 19 } },
        { id: "10109", rollNo: "10109", name: "BISWORANJAN BEHE...", marks: { english: 39, hindi: 37, maths: 24, science: 38, socialScience: 36 } },
        { id: "10110", rollNo: "10110", name: "DIVYA KUMARI", marks: { english: 21, hindi: 17, maths: 21, science: 32, socialScience: 33 } },
        { id: "10111", rollNo: "10111", name: "Divyanshu Kumar", marks: { english: 36, hindi: 38, maths: 34, science: 39, socialScience: 38 } },
        { id: "10112", rollNo: "10112", name: "DIVYANSHU KUMAR R...", marks: { english: "AB", hindi: "AB", maths: 22, science: 13, socialScience: 14 } },
        { id: "10113", rollNo: "10113", name: "DRISHTI RAHUL KHA...", marks: { english: 31, hindi: 30, maths: 29, science: 22, socialScience: 26 } },
        { id: "10114", rollNo: "10114", name: "EKTA", marks: { english: 40, hindi: 37, maths: 32, science: 38, socialScience: 40 } },
        { id: "10115", rollNo: "10115", name: "FAUSTINA JOSEPH AT...", marks: { english: 38, hindi: 36, maths: 22, science: 33, socialScience: 23 } },
        { id: "10116", rollNo: "10116", name: "GAURI GUPTA", marks: { english: 38, hindi: 39, maths: 20, science: 27, socialScience: 34 } },
        { id: "10117", rollNo: "10117", name: "HIMANSHU JAYVEER T...", marks: { english: 20, hindi: 18, maths: 11, science: 12, socialScience: 20 } },
        { id: "10118", rollNo: "10118", name: "ISHAAN PRASHANT K...", marks: { english: 31, hindi: 28, maths: 27, science: 33, socialScience: 23 } },
        { id: "10119", rollNo: "10119", name: "JAINIL KALPESH SHA...", marks: { english: 29, hindi: 25, maths: 34, science: 28, socialScience: 34 } },
        { id: "10120", rollNo: "10120", name: "KEYUR GANESH KOLI", marks: { english: 38, hindi: 32, maths: 40, science: 38, socialScience: 36 } },
        { id: "10121", rollNo: "10121", name: "R PRANITHA", marks: { english: 32, hindi: 26, maths: 27, science: 23, socialScience: 37 } },
        { id: "10122", rollNo: "10122", name: "RITESH KUMAR", marks: { english: 10, hindi: 22, maths: 22, science: 13, socialScience: 10 } },
        { id: "10123", rollNo: "10123", name: "SADIKA THAMPI", marks: { english: 38, hindi: 23, maths: 30, science: 39, socialScience: 37 } },
        { id: "10124", rollNo: "10124", name: "SAPNA RAKESH RAU...", marks: { english: "AB", hindi: "AB", maths: "AB", science: null, socialScience: "AB" } },
        { id: "10125", rollNo: "10125", name: "SAVIO SIJO", marks: { english: 37, hindi: 34, maths: 36, science: 37, socialScience: 38 } },
        { id: "10126", rollNo: "10126", name: "SHUBHRA SHARMA", marks: { english: 38, hindi: 32, maths: 33, science: 36, socialScience: 38 } },
        { id: "10127", rollNo: "10127", name: "SHRUTI RANDHIR CH...", marks: { english: 40, hindi: 36, maths: 34, science: 38, socialScience: 40 } },
        { id: "10128", rollNo: "10128", name: "SOURABH RAMDAS A...", marks: { english: 30, hindi: 25, maths: 29, science: 32, socialScience: 23 } },
        { id: "10129", rollNo: "10129", name: "ATHARV AVADHOOT S...", marks: { english: 26, hindi: 28, maths: 14, science: 32, socialScience: 31 } },
        { id: "10130", rollNo: "10130", name: "SWARAJ VINOD KAGI...", marks: { english: "AB", hindi: "AB", maths: "AB", science: null, socialScience: "AB" } },
        { id: "10131", rollNo: "10131", name: "VARSHA S G", marks: { english: 35, hindi: 37, maths: 20, science: 31, socialScience: 38 } },
      ],
    },
  ],
};

function blankDefaultData(studentName: string): MonthlyTestsData {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tests: [
      {
        id: "monthly-test-1",
        name: "Monthly Test 1",
        date: new Date().toISOString().slice(0, 10),
        maxMarks: defaultMaxMarks(),
        students: [
          { id: "target-student", rollNo: "", name: studentName, marks: {} },
        ],
      },
    ],
  };
}

const SAVIO_SCHOOL_TESTS_CONFIG: MonthlyTestsConfig = {
  title: "Savio's School Tests",
  directUrl: "/t",
  rowId: "savio_monthly_tests_v1",
  localKey: "savio_monthly_tests_v1",
  targetDisplayName: "Savio",
  targetMatchers: ["SAVIO SIJO"],
  rewardWalletId: "savio-school-tests",
  defaultData: SAVIO_DEFAULT_DATA,
};

export const LETICIA_SCHOOL_TESTS_CONFIG: MonthlyTestsConfig = {
  title: "Leticia's School Tests",
  directUrl: "/lt",
  rowId: "leticia_school_tests_v1",
  localKey: "leticia_school_tests_v1",
  targetDisplayName: "Leticia",
  targetMatchers: ["LETICIA", "LETTY"],
  rewardWalletId: "leticia-school-tests",
  defaultData: blankDefaultData("LETICIA"),
  seedTargetStudentName: "LETICIA",
};

async function fetchMonthlyData(rowId: string): Promise<MonthlyTestsData | null> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/tracker_data?id=eq.${rowId}&select=data`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    if (!res.ok) return null;
    const data = (await res.json())?.[0]?.data;
    return isMonthlyData(data) ? data : null;
  } catch {
    return null;
  }
}

async function saveMonthlyData(rowId: string, data: MonthlyTestsData): Promise<boolean> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/tracker_data`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: rowId, data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function isMonthlyData(value: unknown): value is MonthlyTestsData {
  return Boolean(
    value &&
      typeof value === "object" &&
      "tests" in value &&
      Array.isArray((value as MonthlyTestsData).tests)
  );
}

function cloneDefaultData(defaultData: MonthlyTestsData): MonthlyTestsData {
  return JSON.parse(JSON.stringify(defaultData));
}

function fromLocalStorage(localKey: string): MonthlyTestsData | null {
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isMonthlyData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toLocalStorage(localKey: string, data: MonthlyTestsData) {
  try {
    localStorage.setItem(localKey, JSON.stringify(data));
  } catch {
    /* local backup is best-effort */
  }
}

function normalizeData(data: MonthlyTestsData): MonthlyTestsData {
  return {
    ...data,
    tests: data.tests.map(test => ({
      ...test,
      maxMarks: { ...defaultMaxMarks(), ...test.maxMarks },
      students: test.students.map(student => ({
        ...student,
        marks: { ...student.marks },
      })),
    })),
  };
}

function ensureSeedTargetStudent(data: MonthlyTestsData, config: MonthlyTestsConfig): MonthlyTestsData {
  if (!config.seedTargetStudentName) return data;
  return {
    ...data,
    tests: data.tests.map(test => {
      if (test.students.length > 0) return test;
      return {
        ...test,
        students: [
          { id: `target-student-${test.id}`, rollNo: "", name: config.seedTargetStudentName!, marks: {} },
        ],
      };
    }),
  };
}

function rowStats(test: MonthlyTest, student: MonthlyStudent): RowStats {
  let total = 0;
  let maxAvailable = 0;
  let numericCount = 0;
  let missingCount = 0;

  SUBJECTS.forEach(subject => {
    const value = student.marks[subject.key];
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value;
      maxAvailable += test.maxMarks[subject.key] || 0;
      numericCount += 1;
    } else {
      missingCount += 1;
    }
  });

  return {
    total,
    maxAvailable,
    numericCount,
    missingCount,
    complete: numericCount === SUBJECTS.length,
    percentage: maxAvailable > 0 ? (total / maxAvailable) * 100 : null,
  };
}

function buildRankMap(test: MonthlyTest): Record<string, RankInfo> {
  const comparable = test.students
    .map(student => ({ student, stats: rowStats(test, student) }))
    .filter(row => row.stats.complete);

  const denominator = comparable.length;
  const out: Record<string, RankInfo> = {};

  comparable.forEach(row => {
    const above = comparable.filter(other => other.stats.total > row.stats.total).length;
    const equalOrBelow = comparable.filter(other => other.stats.total <= row.stats.total).length;
    out[row.student.id] = {
      rank: above + 1,
      percentile: denominator ? (equalOrBelow / denominator) * 100 : 0,
    };
  });

  return out;
}

function compareRollNo(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function sortStudentsByRank(test: MonthlyTest, rankMap: Record<string, RankInfo>): MonthlyStudent[] {
  return [...test.students].sort((a, b) => {
    const rankA = rankMap[a.id];
    const rankB = rankMap[b.id];

    if (rankA && rankB) {
      return (
        rankA.rank - rankB.rank ||
        rowStats(test, b).total - rowStats(test, a).total ||
        compareRollNo(a.rollNo, b.rollNo) ||
        a.name.localeCompare(b.name)
      );
    }

    if (rankA) return -1;
    if (rankB) return 1;

    return compareRollNo(a.rollNo, b.rollNo) || a.name.localeCompare(b.name);
  });
}

function studentKey(student: MonthlyStudent) {
  return student.rollNo.trim() || student.name.trim().toLowerCase() || student.id;
}

function buildCumulativeRows(data: MonthlyTestsData): CumulativeRow[] {
  const rows = new Map<string, CumulativeRow>();

  data.tests.forEach(test => {
    const testMax = SUBJECTS.reduce((sum, subject) => sum + (test.maxMarks[subject.key] || 0), 0);

    test.students.forEach(student => {
      const key = studentKey(student);
      const stats = rowStats(test, student);
      const existing = rows.get(key) || {
        key,
        rollNo: student.rollNo,
        name: student.name,
        completeTests: 0,
        total: 0,
        max: 0,
        percentage: null,
      };

      existing.rollNo = existing.rollNo || student.rollNo;
      existing.name = existing.name || student.name;

      if (stats.complete) {
        existing.completeTests += 1;
        existing.total += stats.total;
        existing.max += testMax;
      }

      rows.set(key, existing);
    });
  });

  const output = Array.from(rows.values()).map(row => ({
    ...row,
    percentage: row.max > 0 ? (row.total / row.max) * 100 : null,
  }));

  const groups = new Map<string, CumulativeRow[]>();
  output.forEach(row => {
    if (row.completeTests === 0) return;
    const groupKey = `${row.completeTests}:${row.max}`;
    const group = groups.get(groupKey) || [];
    group.push(row);
    groups.set(groupKey, group);
  });

  groups.forEach(group => {
    const denominator = group.length;
    group.forEach(row => {
      row.rank = group.filter(other => other.total > row.total).length + 1;
      row.percentile = denominator ? (group.filter(other => other.total <= row.total).length / denominator) * 100 : undefined;
    });
  });

  return output.sort((a, b) => {
    const rankedA = a.rank !== undefined;
    const rankedB = b.rank !== undefined;

    if (rankedA && rankedB) {
      return (
        b.completeTests - a.completeTests ||
        a.rank! - b.rank! ||
        b.total - a.total ||
        compareRollNo(a.rollNo, b.rollNo) ||
        a.name.localeCompare(b.name)
      );
    }

    if (rankedA) return -1;
    if (rankedB) return 1;

    return compareRollNo(a.rollNo, b.rollNo) || a.name.localeCompare(b.name);
  });
}

function markToInput(value: MarkValue | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseMark(raw: string): MarkValue {
  const value = raw.trim().toUpperCase();
  if (!value || value === "NA" || value === "N/A") return null;
  if (value === "AB") return "AB";
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function nextStudentId() {
  return `student-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function cardStyle(extra: CSSProperties = {}): CSSProperties {
  return {
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(226,232,240,.9)",
    borderRadius: 8,
    boxShadow: "0 18px 45px rgba(15,23,42,.08)",
    ...extra,
  };
}

function inputStyle(extra: CSSProperties = {}): CSSProperties {
  return {
    width: "100%",
    border: "1px solid #dbe3ef",
    borderRadius: 6,
    padding: "8px 9px",
    font: "inherit",
    color: "#0f172a",
    background: "#fff",
    boxSizing: "border-box",
    outline: "none",
    ...extra,
  };
}

function buttonStyle(extra: CSSProperties = {}): CSSProperties {
  return {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    color: "#0f172a",
    padding: "9px 12px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
    ...extra,
  };
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.52)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(15,23,42,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 950, color: "#0f172a" }}>{title}</div>
          <button onClick={onClose} style={buttonStyle({ width: 36, height: 36, padding: 0, display: "grid", placeItems: "center" })}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MonthlyTests({ config = SAVIO_SCHOOL_TESTS_CONFIG }: { config?: MonthlyTestsConfig }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [data, setData] = useState<MonthlyTestsData | null>(null);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({});
  const [detailModal, setDetailModal] = useState<{ kind: "students" | "comparable" | "target" | "rank"; title: string } | null>(null);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    (async () => {
      const remote = await fetchMonthlyData(config.rowId);
      const next = ensureSeedTargetStudent(
        normalizeData(remote || fromLocalStorage(config.localKey) || cloneDefaultData(config.defaultData)),
        config
      );
      if (!active) return;
      setData(next);
      setSelectedTestId(next.tests[0]?.id || "");
      toLocalStorage(config.localKey, next);
    })();
    return () => {
      active = false;
    };
  }, [config, unlocked]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const queueSave = useCallback((next: MonthlyTestsData) => {
    toLocalStorage(config.localKey, next);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await saveMonthlyData(config.rowId, next);
      setSaveState(ok ? "saved" : "error");
    }, 700);
  }, [config.localKey, config.rowId]);

  const updateData = useCallback((updater: (current: MonthlyTestsData) => MonthlyTestsData) => {
    setData(current => {
      if (!current) return current;
      const next = normalizeData({ ...updater(current), updatedAt: new Date().toISOString() });
      queueSave(next);
      return next;
    });
  }, [queueSave]);

  const selectedTest = useMemo(() => data?.tests.find(test => test.id === selectedTestId) || data?.tests[0], [data, selectedTestId]);
  const rankMap = useMemo(() => selectedTest ? buildRankMap(selectedTest) : {}, [selectedTest]);
  const sortedStudents = useMemo(() => selectedTest ? sortStudentsByRank(selectedTest, rankMap) : [], [selectedTest, rankMap]);
  const cumulativeRows = useMemo(() => data ? buildCumulativeRows(data) : [], [data]);
  const isTargetStudent = useCallback((name: string) => {
    const upperName = name.toUpperCase();
    return config.targetMatchers.some(matcher => upperName.includes(matcher));
  }, [config.targetMatchers]);
  const targetSummary = useMemo(() => {
    if (!selectedTest) return null;
    const student = selectedTest.students.find(row => isTargetStudent(row.name));
    if (!student) return null;
    return { stats: rowStats(selectedTest, student), rank: rankMap[student.id] };
  }, [isTargetStudent, selectedTest, rankMap]);
  const completeCount = useMemo(() => selectedTest ? selectedTest.students.filter(student => rowStats(selectedTest, student).complete).length : 0, [selectedTest]);
  const monthlyRewards = useMemo(() => {
    if (!data) return buildMonthlyRewardSummary([]);
    return buildMonthlyRewardSummary(data.tests.map(test => {
      const target = test.students.find(row => isTargetStudent(row.name));
      if (!target) {
        return {
          id: test.id,
          label: test.name,
          subLabel: test.date,
          percentage: null,
          scoreText: `${config.targetDisplayName} not found`,
          complete: false,
        };
      }
      const stats = rowStats(test, target);
      return {
        id: test.id,
        label: test.name,
        subLabel: test.date,
        percentage: stats.complete ? stats.percentage : null,
        scoreText: stats.maxAvailable ? `${stats.total}/${stats.maxAvailable}` : "Incomplete",
        complete: stats.complete,
      };
    }));
  }, [config.targetDisplayName, data, isTargetStudent]);
  const schoolTestsLedger = useRewardRedemptions(config.rewardWalletId);
  const monthlyRewardBalance = monthlyRewards.total - schoolTestsLedger.spent;

  const unlock = (value = pinInput) => {
    if (value.trim() !== PIN) {
      setPinError("Incorrect PIN");
      return;
    }
    setUnlocked(true);
    setPinError("");
  };

  const handlePinChange = (value: string) => {
    setPinInput(value);
    setPinError("");
    if (value.trim() === PIN) {
      setUnlocked(true);
    }
  };

  const updateTest = (testId: string, patch: Partial<MonthlyTest>) => {
    updateData(current => ({
      ...current,
      tests: current.tests.map(test => test.id === testId ? { ...test, ...patch } : test),
    }));
  };

  const updateStudent = (testId: string, studentId: string, patch: Partial<MonthlyStudent>) => {
    updateData(current => ({
      ...current,
      tests: current.tests.map(test => test.id === testId
        ? { ...test, students: test.students.map(student => student.id === studentId ? { ...student, ...patch } : student) }
        : test),
    }));
  };

  const updateMark = (testId: string, studentId: string, subject: SubjectKey, raw: string) => {
    const value = parseMark(raw);
    updateData(current => ({
      ...current,
      tests: current.tests.map(test => test.id === testId
        ? {
            ...test,
            students: test.students.map(student => student.id === studentId
              ? { ...student, marks: { ...student.marks, [subject]: value } }
              : student),
          }
        : test),
    }));
  };

  const updateMaxMark = (testId: string, subject: SubjectKey, raw: string) => {
    const number = Number(raw);
    updateData(current => ({
      ...current,
      tests: current.tests.map(test => test.id === testId
        ? { ...test, maxMarks: { ...test.maxMarks, [subject]: Number.isFinite(number) && number > 0 ? number : 40 } }
        : test),
    }));
  };

  const addMonthlyTest = () => {
    const sourceStudents = selectedTest?.students || [];
    const nextNumber = (data?.tests.length || 0) + 1;
    const newTest: MonthlyTest = {
      id: `monthly-test-${Date.now()}`,
      name: `Monthly Test ${nextNumber}`,
      date: new Date().toISOString().slice(0, 10),
      maxMarks: defaultMaxMarks(),
      students: sourceStudents.map(student => ({
        id: `${student.id}-${Date.now()}`,
        rollNo: student.rollNo,
        name: student.name,
        marks: {},
      })),
    };

    updateData(current => ({ ...current, tests: [...current.tests, newTest] }));
    setSelectedTestId(newTest.id);
  };

  const deleteMonthlyTest = (testId: string) => {
    if (!data || data.tests.length <= 1) return;
    if (!window.confirm("Delete this monthly test?")) return;
    updateData(current => {
      const nextTests = current.tests.filter(test => test.id !== testId);
      setSelectedTestId(nextTests[0]?.id || "");
      return { ...current, tests: nextTests };
    });
  };

  const addStudent = (testId: string) => {
    const newStudent: MonthlyStudent = {
      id: nextStudentId(),
      rollNo: "",
      name: "New student",
      marks: {},
    };
    updateData(current => ({
      ...current,
      tests: current.tests.map(test => test.id === testId ? { ...test, students: [...test.students, newStudent] } : test),
    }));
  };

  const deleteStudent = (testId: string, studentId: string) => {
    if (!window.confirm("Delete this student from the selected test?")) return;
    updateData(current => ({
      ...current,
      tests: current.tests.map(test => test.id === testId
        ? { ...test, students: test.students.filter(student => student.id !== studentId) }
        : test),
    }));
  };

  const saveNow = async () => {
    if (!data) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    const ok = await saveMonthlyData(config.rowId, data);
    toLocalStorage(config.localKey, data);
    setSaveState(ok ? "saved" : "error");
  };

  if (!unlocked) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "linear-gradient(145deg,#eef2ff 0%,#f8fafc 54%,#f5f3ff 100%)",
        color: "#0f172a",
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}>
        <section style={cardStyle({ width: "min(420px, 100%)", padding: 24 })}>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 8 }}>
            Locked marks page
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 30, letterSpacing: 0, color: "#0f172a", fontWeight: 900 }}>
            {config.title}
          </h1>
          <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14 }}>
            Enter the PIN to view and edit school test marks.
          </p>
          <input
            aria-label="PIN"
            type="password"
            inputMode="numeric"
            autoFocus
            value={pinInput}
            onChange={event => handlePinChange(event.target.value)}
            onKeyDown={event => { if (event.key === "Enter") unlock(); }}
            style={inputStyle({ fontSize: 20, letterSpacing: 4, textAlign: "center", marginBottom: 10 })}
          />
          {pinError && <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{pinError}</div>}
          <button onClick={() => unlock()} style={buttonStyle({ width: "100%", background: "#1e40af", color: "#fff", borderColor: "#1e40af", padding: "12px 14px" })}>
            Unlock
          </button>
        </section>
      </main>
    );
  }

  if (!data || !selectedTest) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui", color: "#64748b" }}>
        Loading {config.title}...
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      padding: "28px clamp(14px, 3vw, 40px)",
      boxSizing: "border-box",
      background: "linear-gradient(145deg,#eef2ff 0%,#f8fafc 54%,#f5f3ff 100%)",
      color: "#0f172a",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    }}>
      <style>{`
        .monthly-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .monthly-toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .monthly-test-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .monthly-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; }
        .monthly-table { width: 100%; min-width: 1060px; border-collapse: collapse; font-size: 13px; }
        .monthly-table th { position: sticky; top: 0; z-index: 1; background: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .monthly-table td { padding: 8px 10px; border-bottom: 1px solid #edf2f7; vertical-align: middle; }
        .monthly-table tr:hover td { background: #f8fafc; }
        .student-row-target td { background: #eff6ff; }
        .student-row-target:hover td { background: #dbeafe; }
        .monthly-small-input { width: 74px; border: 1px solid #dbe3ef; border-radius: 6px; padding: 7px 8px; box-sizing: border-box; font: inherit; color: #0f172a; background: #fff; }
        .monthly-name-input { min-width: 210px; }
        .monthly-subject-max { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 10px; }
        @media (max-width: 900px) {
          .monthly-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .monthly-subject-max { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
        }
        @media (max-width: 560px) {
          .monthly-grid { grid-template-columns: 1fr; }
          .monthly-subject-max { grid-template-columns: 1fr; }
        }
      `}</style>

      <section style={{ ...cardStyle({ padding: 18, marginBottom: 14 }), background: "linear-gradient(135deg,#1e40af,#7c3aed)", borderColor: "transparent", color: "#fff" }}>
        <div className="monthly-toolbar">
          <div>
            <div style={{ fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", opacity: .78, fontWeight: 900 }}>Private marks page</div>
            <h1 style={{ margin: "5px 0 4px", fontSize: "clamp(26px, 4vw, 38px)", color: "#fff", fontWeight: 950, letterSpacing: 0 }}>
              {config.title}
            </h1>
            <div style={{ opacity: .82, fontSize: 14 }}>Direct URL only: {config.directUrl}. Same PIN unlocks view and edit.</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <RewardBadge
              tone="coins"
              icon="🪙"
              label="Coins Collected"
              value={monthlyRewardBalance}
              unit="coins"
              caption="available now"
              compact
              onClick={() => setRewardModalOpen(true)}
            />
            <button onClick={saveNow} style={buttonStyle({ background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.35)", color: "#fff" })}>Save now</button>
            <button
              onClick={() => { setUnlocked(false); setPinInput(""); }}
              style={buttonStyle({ background: "rgba(255,255,255,.12)", borderColor: "rgba(255,255,255,.28)", color: "#fff" })}
            >
              Lock
            </button>
          </div>
        </div>
      </section>

      <Modal open={rewardModalOpen} onClose={() => setRewardModalOpen(false)} title="🪙 Monthly Test Coins">
        <RewardBreakdown
          summary={monthlyRewards}
          unit="coins"
          title="Real money coin balance"
          emptyText={`No complete ${config.targetDisplayName} school test totals yet.`}
          note={`Calculated from ${config.targetDisplayName}'s aggregate percentage for each school test. Incomplete tests do not earn coins. There are no negative points in school tests.`}
        >
          <RewardRedeemer
            ledger={schoolTestsLedger}
            earned={monthlyRewards.total}
            unit="coins"
            label={`${config.targetDisplayName} school test coins`}
          />
        </RewardBreakdown>
      </Modal>

	      <section className="monthly-grid" style={{ marginBottom: 14 }}>
	        <button type="button" onClick={() => setDetailModal({ kind: "students", title: "All Students" })} style={cardStyle({ padding: 14, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" })}>
	          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Students</div>
	          <div style={{ fontSize: 26, fontWeight: 950 }}>{selectedTest.students.length}</div>
	        </button>
	        <button type="button" onClick={() => setDetailModal({ kind: "comparable", title: "Comparable Rows" })} style={cardStyle({ padding: 14, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" })}>
	          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Comparable rows</div>
	          <div style={{ fontSize: 26, fontWeight: 950 }}>{completeCount}</div>
	        </button>
	        <button type="button" onClick={() => setDetailModal({ kind: "target", title: `${config.targetDisplayName} Total` })} style={cardStyle({ padding: 14, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" })}>
	          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>{config.targetDisplayName} total</div>
	          <div style={{ fontSize: 26, fontWeight: 950 }}>
	            {targetSummary ? `${targetSummary.stats.total}/${targetSummary.stats.maxAvailable}` : "-"}
	          </div>
	        </button>
	        <button type="button" onClick={() => setDetailModal({ kind: "rank", title: `${config.targetDisplayName} Rank / Percentile` })} style={cardStyle({ padding: 14, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" })}>
	          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>{config.targetDisplayName} rank / percentile</div>
	          <div style={{ fontSize: 26, fontWeight: 950 }}>
	            {targetSummary?.rank ? `#${targetSummary.rank.rank} / ${formatNumber(targetSummary.rank.percentile, 2)}` : "Incomplete"}
	          </div>
	        </button>
	      </section>

      <section style={cardStyle({ padding: 14, marginBottom: 14 })}>
        <div className="monthly-toolbar" style={{ marginBottom: 12 }}>
          <div className="monthly-test-tabs">
            {data.tests.map(test => (
              <button
                key={test.id}
                onClick={() => setSelectedTestId(test.id)}
                style={buttonStyle(test.id === selectedTest.id
                  ? { background: "#1e40af", borderColor: "#1e40af", color: "#fff" }
                  : {})}
              >
                {test.name}
              </button>
            ))}
          </div>
          <button onClick={addMonthlyTest} style={buttonStyle({ background: "#0f172a", color: "#fff", borderColor: "#0f172a" })}>
            Add monthly test
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(150px, 220px) auto", gap: 10, alignItems: "end", marginBottom: 12 }}>
          <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#64748b", fontWeight: 900 }}>
            Test name
            <input value={selectedTest.name} onChange={event => updateTest(selectedTest.id, { name: event.target.value })} style={inputStyle()} />
          </label>
          <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#64748b", fontWeight: 900 }}>
            Date
            <input type="date" value={selectedTest.date} onChange={event => updateTest(selectedTest.id, { date: event.target.value })} style={inputStyle()} />
          </label>
          <button
            onClick={() => deleteMonthlyTest(selectedTest.id)}
            disabled={data.tests.length <= 1}
            style={buttonStyle({ color: data.tests.length <= 1 ? "#94a3b8" : "#b91c1c", borderColor: data.tests.length <= 1 ? "#e2e8f0" : "#fecaca" })}
          >
            Delete test
          </button>
        </div>

        <div className="monthly-subject-max">
          {SUBJECTS.map(subject => (
            <label key={subject.key} style={{ display: "grid", gap: 5, fontSize: 12, color: "#64748b", fontWeight: 900 }}>
              {subject.label} max
              <input
                type="number"
                min="1"
                value={selectedTest.maxMarks[subject.key]}
                onChange={event => updateMaxMark(selectedTest.id, subject.key, event.target.value)}
                style={inputStyle()}
              />
            </label>
          ))}
        </div>
      </section>

      <section style={cardStyle({ padding: 14, marginBottom: 14 })}>
        <div className="monthly-toolbar" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 950, letterSpacing: 0 }}>Student marks</h2>
            <p style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
              Blank means not available. Type AB for absent. Rank and percentile use complete comparable rows only.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: saveState === "error" ? "#b91c1c" : "#64748b", fontWeight: 900 }}>
              {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? "Saved locally, Supabase failed" : "Ready"}
            </span>
            <button onClick={() => addStudent(selectedTest.id)} style={buttonStyle({ background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" })}>
              Add student
            </button>
          </div>
        </div>

        <div className="monthly-table-wrap">
          <table className="monthly-table">
            <thead>
              <tr>
                <th style={{ width: 86 }}>Roll no.</th>
                <th>Name</th>
                {SUBJECTS.map(subject => <th key={subject.key}>{subject.label}</th>)}
                <th>Total</th>
                <th>%</th>
                <th>Rank</th>
                <th>Percentile</th>
                <th>Status</th>
                <th style={{ width: 90 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map(student => {
                const stats = rowStats(selectedTest, student);
                const rank = rankMap[student.id];
                const isTarget = isTargetStudent(student.name);
                return (
                  <tr key={student.id} className={isTarget ? "student-row-target" : undefined}>
                    <td>
                      <input
                        value={student.rollNo}
                        onChange={event => updateStudent(selectedTest.id, student.id, { rollNo: event.target.value })}
                        className="monthly-small-input"
                        aria-label={`Roll number for ${student.name}`}
                      />
                    </td>
                    <td>
                      <input
                        value={student.name}
                        onChange={event => updateStudent(selectedTest.id, student.id, { name: event.target.value })}
                        className="monthly-small-input monthly-name-input"
                        aria-label={`Name for roll ${student.rollNo}`}
                      />
                    </td>
                    {SUBJECTS.map(subject => {
                      const key = `${selectedTest.id}:${student.id}:${subject.key}`;
                      return (
                        <td key={subject.key}>
                          <input
                            value={draftMarks[key] ?? markToInput(student.marks[subject.key])}
                            onChange={event => setDraftMarks(prev => ({ ...prev, [key]: event.target.value }))}
                            onBlur={event => {
                              updateMark(selectedTest.id, student.id, subject.key, event.target.value);
                              setDraftMarks(prev => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                              });
                            }}
                            onKeyDown={event => {
                              if (event.key === "Enter") {
                                updateMark(selectedTest.id, student.id, subject.key, (event.target as HTMLInputElement).value);
                                (event.target as HTMLInputElement).blur();
                              }
                            }}
                            className="monthly-small-input"
                            aria-label={`${subject.label} marks for ${student.name}`}
                          />
                        </td>
                      );
                    })}
                    <td style={{ fontWeight: 900 }}>{stats.maxAvailable ? `${stats.total}/${stats.maxAvailable}` : "-"}</td>
                    <td>{formatNumber(stats.percentage)}</td>
                    <td>{rank ? `#${rank.rank}` : "-"}</td>
                    <td>{rank ? formatNumber(rank.percentile, 2) : "-"}</td>
                    <td>
                      <span style={{
                        display: "inline-flex",
                        borderRadius: 999,
                        padding: "4px 8px",
                        fontSize: 12,
                        fontWeight: 900,
                        background: stats.complete ? "#dcfce7" : "#fef3c7",
                        color: stats.complete ? "#047857" : "#92400e",
                      }}>
                        {stats.complete ? "Comparable" : "Incomplete"}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => deleteStudent(selectedTest.id, student.id)} style={buttonStyle({ padding: "6px 9px", color: "#b91c1c", borderColor: "#fecaca" })}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={cardStyle({ padding: 14 })}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 950, letterSpacing: 0 }}>Cumulative monthly score</h2>
          <p style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
            Cumulative rank compares students only inside the same complete-test coverage group.
          </p>
        </div>
        <div className="monthly-table-wrap">
          <table className="monthly-table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th style={{ width: 86 }}>Roll no.</th>
                <th>Name</th>
                <th>Complete tests</th>
                <th>Cumulative total</th>
                <th>%</th>
                <th>Rank</th>
                <th>Percentile</th>
              </tr>
            </thead>
            <tbody>
              {cumulativeRows.map(row => (
                <tr key={row.key} className={isTargetStudent(row.name) ? "student-row-target" : undefined}>
                  <td>{row.rollNo || "-"}</td>
                  <td style={{ fontWeight: isTargetStudent(row.name) ? 950 : 700 }}>{row.name}</td>
                  <td>{row.completeTests}</td>
                  <td style={{ fontWeight: 900 }}>{row.max ? `${row.total}/${row.max}` : "-"}</td>
                  <td>{formatNumber(row.percentage)}</td>
                  <td>{row.rank ? `#${row.rank}` : "-"}</td>
                  <td>{row.percentile ? formatNumber(row.percentile, 2) : "-"}</td>
                </tr>
              ))}
            </tbody>
	          </table>
	        </div>
	      </section>

	      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.title || "Details"}>
	        {detailModal && (() => {
	          const rowLine = (student: MonthlyStudent, index: number) => {
	            const stats = rowStats(selectedTest, student);
	            const rank = rankMap[student.id];
	            return (
	              <div key={student.id} style={{ display: "grid", gridTemplateColumns: "36px minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #edf2f7" }}>
	                <div style={{ color: "#64748b", fontWeight: 900, fontSize: 12 }}>{index + 1}</div>
	                <div style={{ minWidth: 0 }}>
	                  <div style={{ fontWeight: isTargetStudent(student.name) ? 950 : 800, color: "#0f172a", fontSize: 13 }}>{student.name}</div>
	                  <div style={{ color: "#94a3b8", fontSize: 11 }}>Roll {student.rollNo || "-"}</div>
	                </div>
	                <div style={{ textAlign: "right", fontSize: 12, color: "#475569", fontWeight: 800 }}>
	                  {stats.maxAvailable ? `${stats.total}/${stats.maxAvailable}` : "-"} {rank ? `#${rank.rank}` : ""}
	                </div>
	              </div>
	            );
	          };

	          if (detailModal.kind === "students") return (
	            <div>{sortedStudents.map(rowLine)}</div>
	          );

	          if (detailModal.kind === "comparable") {
	            const comparable = sortedStudents.filter(student => rowStats(selectedTest, student).complete);
	            return comparable.length ? <div>{comparable.map(rowLine)}</div> : <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No comparable rows.</div>;
	          }

	          const target = selectedTest.students.find(student => isTargetStudent(student.name));
	          if (!target) return <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>{config.targetDisplayName} is not in this test.</div>;
	          const targetStats = rowStats(selectedTest, target);
	          const targetRank = rankMap[target.id];

	          if (detailModal.kind === "target") return (
	            <div>
	              {SUBJECTS.map(subject => (
	                <div key={subject.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #edf2f7", fontSize: 13 }}>
	                  <span style={{ color: "#475569", fontWeight: 800 }}>{subject.label}</span>
	                  <span style={{ color: "#0f172a", fontWeight: 950 }}>{markToInput(target.marks[subject.key]) || "-"}/{selectedTest.maxMarks[subject.key]}</span>
	                </div>
	              ))}
	              <div style={{ marginTop: 12, fontSize: 18, fontWeight: 950, color: "#1e40af" }}>
	                Total: {targetStats.maxAvailable ? `${targetStats.total}/${targetStats.maxAvailable}` : "-"} ({formatNumber(targetStats.percentage)}%)
	              </div>
	            </div>
	          );

	          const aboveTarget = targetRank
	            ? sortedStudents.filter(student => {
	                const rank = rankMap[student.id];
	                return rank && rank.rank < targetRank.rank;
	              })
	            : [];

	          return (
	            <div>
	              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, marginBottom: 12, color: "#1e40af", fontWeight: 900 }}>
	                {targetRank ? `${config.targetDisplayName} is rank #${targetRank.rank}, percentile ${formatNumber(targetRank.percentile, 2)}.` : `${config.targetDisplayName} is incomplete for rank calculation.`}
	              </div>
	              {aboveTarget.length ? <div>{aboveTarget.map(rowLine)}</div> : <div style={{ color: "#94a3b8", textAlign: "center", padding: "14px 0" }}>No ranked students above {config.targetDisplayName}.</div>}
	            </div>
	          );
	        })()}
	      </Modal>
	    </main>
	  );
	}

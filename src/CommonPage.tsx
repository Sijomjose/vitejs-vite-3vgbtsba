import { useCallback, useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import CommonEnglishGrammar, {
  getChapters,
  LETTY_GRAMMAR_SUBJECT,
  SAVIO_GRAMMAR_SUBJECT,
  type ChapterData,
  type SubjectDef,
} from "./CommonEnglishGrammar";
import { RewardBadge, RewardBreakdown, buildPerformanceRewardSummary } from "./Rewards";
import { RewardRedeemer, useRewardRedemptions } from "./RewardRedemptions";

const SUPA_URL = "https://mlfgdutctvbvqwebqajp.supabase.co";
const SUPA_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmdkdXRjdHZidnF3ZWJxYWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ2MDIsImV4cCI6MjA4OTgxMDYwMn0.TPBeT6y-fFGAgcME_mmKqBUYHFUMVB1FO3wrAhneKW4";

const ROWS = {
  savio: { rowId: "savvy", localKey: "savvy_v4", label: "Savvy's", subject: SAVIO_GRAMMAR_SUBJECT },
  letty: { rowId: "letty", localKey: "letty_v4", label: "Letty's", subject: LETTY_GRAMMAR_SUBJECT },
} as const;

type StudentKey = keyof typeof ROWS;

const EXAM_WINDOWS: Record<StudentKey, { start: Date; exam: Date; examLabel: string }> = {
  savio: { start: new Date("2026-03-27T00:00:00"), exam: new Date("2027-02-15T00:00:00"), examLabel: "Feb 15, 2027" },
  letty: { start: new Date("2026-04-04T00:00:00"), exam: new Date("2027-03-15T00:00:00"), examLabel: "Mar 15, 2027" },
};

async function fetchTrackerData(rowId: string): Promise<Record<string, ChapterData> | null> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/tracker_data?id=eq.${rowId}&select=data`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const d = (await res.json())?.[0]?.data;
    return d && typeof d === "object" && Object.keys(d).length > 0 ? d : null;
  } catch { return null; }
}

async function saveTrackerData(rowId: string, data: Record<string, ChapterData>): Promise<boolean> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/tracker_data`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: rowId, data }),
    });
    return res.ok;
  } catch { return false; }
}

function loadLocal(key: string): Record<string, ChapterData> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocal(key: string, data: Record<string, ChapterData>) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore localStorage write failure */ }
}

function pctCalc(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function scoreColor(p: number) { return p >= 80 ? "#10b981" : p >= 60 ? "#f59e0b" : "#ef4444"; }
function getDaysSummary(student: StudentKey) {
  const window = EXAM_WINDOWS[student];
  const now = new Date();
  const totalDays = Math.ceil((+window.exam - +window.start) / 86400000);
  const daysLeft = Math.max(0, Math.floor((+window.exam - +now) / 86400000));
  const pct = Math.max(0, Math.min(100, Math.round(((+now - +window.start) / (+window.exam - +window.start)) * 100)));
  return { totalDays, daysLeft, pct, examLabel: window.examLabel };
}

function getGrammarStats(subject: SubjectDef, data: Record<string, ChapterData>) {
  const chapters = getChapters(subject);
  const done = chapters.filter(c => ["completed", "revised"].includes(data[c.id]?.status || "")).length;
  const prog = chapters.filter(c => data[c.id]?.status === "in_progress").length;
  const tests = chapters.reduce((sum, c) => sum + (data[c.id]?.tests || []).length, 0);
  const testTotals = chapters.reduce((sum, c) => {
    (data[c.id]?.tests || []).forEach(test => {
      const obtained = Number(test.obtained);
      const max = Number(test.max);
      if (Number.isFinite(obtained) && Number.isFinite(max) && max > 0) {
        sum.obtained += obtained;
        sum.max += max;
      }
    });
    return sum;
  }, { obtained: 0, max: 0 });
  const flagged = chapters.filter(c => data[c.id]?.revision).length;
  return {
    chapters: chapters.length,
    done,
    prog,
    tests,
    flagged,
    pct: pctCalc(done, chapters.length),
    testPct: testTotals.max > 0 ? pctCalc(testTotals.obtained, testTotals.max) : null,
  };
}

function getGrammarRewardSummary(subject: SubjectDef, data: Record<string, ChapterData>) {
  return buildPerformanceRewardSummary(getChapters(subject).flatMap(ch =>
    (data[ch.id]?.tests || []).map(test => ({
      id: `${ch.id}-${test.id}`,
      label: ch.name,
      subLabel: `${test.type} • ${test.date}`,
      obtained: test.obtained,
      max: test.max,
    }))
  ));
}

function cardStyle(active: boolean, color: string): CSSProperties {
  return {
    border: active ? `2px solid ${color}` : "1px solid #e2e8f0",
    background: active ? `${color}12` : "white",
    boxShadow: active ? `0 12px 28px ${color}24` : "0 4px 16px rgba(15,23,42,.06)",
    borderRadius: 16,
    padding: "18px 20px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all .2s ease",
  };
}

function formatRewardAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.52)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: 20, padding: "24px 26px", width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,.25)", animation: "modalIn .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>{title}</div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CommonPage() {
  const [selected, setSelected] = useState<StudentKey>("savio");
  const [savioData, setSavioData] = useState<Record<string, ChapterData>>({});
  const [lettyData, setLettyData] = useState<Record<string, ChapterData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<StudentKey, boolean>>({ savio: false, letty: false });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<{ student: StudentKey; kind: "days" | "done" | "in_progress" | "flagged" | "tests" | "rewards"; title: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [savioRemote, lettyRemote] = await Promise.all([
        fetchTrackerData(ROWS.savio.rowId),
        fetchTrackerData(ROWS.letty.rowId),
      ]);
      const savio = savioRemote || loadLocal(ROWS.savio.localKey) || {};
      const letty = lettyRemote || loadLocal(ROWS.letty.localKey) || {};
      if (!alive) return;
      setSavioData(savio);
      setLettyData(letty);
      saveLocal(ROWS.savio.localKey, savio);
      saveLocal(ROWS.letty.localKey, letty);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const persistSavio = useCallback(async (next: Record<string, ChapterData>) => {
    setSavioData(next);
    saveLocal(ROWS.savio.localKey, next);
    setSaving(prev => ({ ...prev, savio: true }));
    setSaveError(null);
    const ok = await saveTrackerData(ROWS.savio.rowId, next);
    setSaving(prev => ({ ...prev, savio: false }));
    if (!ok) setSaveError("Could not save Savvy's grammar data to Supabase. Changes may only be saved on this device until the connection is fixed.");
  }, []);

  const persistLetty = useCallback(async (next: Record<string, ChapterData>) => {
    setLettyData(next);
    saveLocal(ROWS.letty.localKey, next);
    setSaving(prev => ({ ...prev, letty: true }));
    setSaveError(null);
    const ok = await saveTrackerData(ROWS.letty.rowId, next);
    setSaving(prev => ({ ...prev, letty: false }));
    if (!ok) setSaveError("Could not save Letty's grammar data to Supabase. Changes may only be saved on this device until the connection is fixed.");
  }, []);

  const cards = useMemo(() => ({
    savio: getGrammarStats(ROWS.savio.subject, savioData),
    letty: getGrammarStats(ROWS.letty.subject, lettyData),
  }), [savioData, lettyData]);

  const videoRewards = useMemo(() => ({
    savio: getGrammarRewardSummary(ROWS.savio.subject, savioData),
    letty: getGrammarRewardSummary(ROWS.letty.subject, lettyData),
  }), [savioData, lettyData]);
  const savioVideoLedger = useRewardRedemptions("savio-video");
  const lettyVideoLedger = useRewardRedemptions("letty-video");
  const lettyEntertainmentLedger = useRewardRedemptions("letty-entertainment");

  const tracker = selected === "savio"
    ? {
        id: "savio",
        label: ROWS.savio.label,
        rowId: ROWS.savio.rowId,
	        subject: ROWS.savio.subject,
	        data: savioData,
	        saving: saving.savio,
	        days: getDaysSummary("savio"),
          rewardLedger: savioVideoLedger,
	        onChange: persistSavio,
	      }
    : {
        id: "letty",
        label: ROWS.letty.label,
        rowId: ROWS.letty.rowId,
	        subject: ROWS.letty.subject,
	        data: lettyData,
	        saving: saving.letty,
	        days: getDaysSummary("letty"),
          rewardLedger: lettyVideoLedger,
          entertainmentLedger: lettyEntertainmentLedger,
          rewardMode: "split" as const,
	        onChange: persistLetty,
	      };

  const openDetail = (
    event: MouseEvent,
    student: StudentKey,
    kind: "days" | "done" | "in_progress" | "flagged" | "tests" | "rewards",
    title: string
  ) => {
    event.stopPropagation();
    setSelected(student);
    setDetailModal({ student, kind, title });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg,#eef2ff 0%,#f8fafc 56%,#f5f3ff 100%)", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        html,body{margin:0;padding:0;width:100%;overflow-x:hidden}
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:none}}
        @media(max-width:1100px){
          .common-wrap{padding:18px 32px!important}
          .common-cards{grid-template-columns:1fr!important}
          .common-top{align-items:flex-start!important}
          .common-card-inner{align-items:flex-start!important}
          .common-card-side{min-width:0!important;justify-items:start!important}
          .common-card-side button{text-align:left!important}
          .common-card-reward{display:none!important}
        }
        @media(max-width:700px){
          .common-wrap{padding:14px 16px!important}
          .common-top{flex-direction:column!important;align-items:flex-start!important}
          .common-card-inner{flex-direction:column!important;align-items:flex-start!important}
          .common-card-side{width:100%!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}
        }
        @media(max-width:430px){
          .common-card-side{grid-template-columns:1fr!important}
        }
      `}</style>

      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "10px 20px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/" style={{ textDecoration: "none", padding: "6px 14px", borderRadius: 10, background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 13 }}>📚 Savvy's</a>
        <span style={{ padding: "6px 14px", borderRadius: 10, background: "#7c3aed", color: "white", fontWeight: 800, fontSize: 13 }}>🗂️ Common</span>
        <a href="/l" style={{ textDecoration: "none", padding: "6px 14px", borderRadius: 10, background: "#fdf2f8", color: "#be185d", fontWeight: 700, fontSize: 13 }}>🎀 Letty's</a>
      </div>

      <main className="common-wrap" style={{ width: "100%", padding: "18px 80px" }}>
	        <div className="common-top" style={{ background: "linear-gradient(135deg,#312e81,#7c3aed)", color: "white", borderRadius: 18, padding: "22px 26px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "0 12px 30px rgba(79,70,229,.22)" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 24 }}>Common</div>
            <div style={{ fontSize: 13, opacity: .82, marginTop: 4 }}>English Grammar for Savvy's and Letty's</div>
          </div>
	          <div style={{ fontSize: 12, opacity: .8 }}>{loading ? "Loading saved scores..." : "Supabase-backed scores"}</div>
	        </div>
	        {saveError && (
	          <div style={{ margin: "-4px 0 16px", padding: "10px 14px", borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13, fontWeight: 700 }}>
	            {saveError}
	          </div>
	        )}

	        <div className="common-cards" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(220px,1fr))", gap: 14, marginBottom: 16 }}>
          {(["savio", "letty"] as StudentKey[]).map(key => {
            const row = ROWS[key];
            const stat = cards[key];
            const reward = videoRewards[key];
            const lettySplitEarned = reward.total / 2;
            const lettyVideoBalance = lettySplitEarned - lettyVideoLedger.spent;
            const lettyEntertainmentBalance = lettySplitEarned - lettyEntertainmentLedger.spent;
            const ledger = key === "savio" ? savioVideoLedger : lettyVideoLedger;
            const rewardBalance = key === "savio" ? reward.total - ledger.spent : lettyVideoBalance + lettyEntertainmentBalance;
            const active = selected === key;
	            return (
	              <div key={key} role="button" tabIndex={0} onClick={() => setSelected(key)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelected(key); }} style={cardStyle(active, row.subject.color)}>
	                <div className="common-card-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
	                  <div>
	                    <div style={{ fontSize: 30 }}>{key === "savio" ? "📚" : "🎀"}</div>
	                    <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18, color: "#0f172a" }}>{row.label} English Grammar</div>
	                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
	                      <button type="button" onClick={(e) => openDetail(e, key, "days", `${row.label} Days`)} style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#047857", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
	                        {getDaysSummary(key).daysLeft}/{getDaysSummary(key).totalDays} days
	                      </button>
	                      <button type="button" onClick={(e) => openDetail(e, key, "done", `${row.label} Completed / Revised`)} style={{ border: "1px solid #dbeafe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
	                        {stat.done}/{stat.chapters} chapters
	                      </button>
	                      <button type="button" onClick={(e) => openDetail(e, key, "tests", `${row.label} Test Scores`)} style={{ border: "1px solid #cffafe", background: "#ecfeff", color: "#0e7490", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
	                        {stat.tests} test score{stat.tests !== 1 ? "s" : ""}
	                      </button>
	                      <button type="button" onClick={(e) => openDetail(e, key, "in_progress", `${row.label} In Progress`)} style={{ border: "1px solid #fde68a", background: "#fffbeb", color: "#b45309", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
	                        🔄 {stat.prog}
	                      </button>
	                      {stat.flagged > 0 && (
	                        <button type="button" onClick={(e) => openDetail(e, key, "flagged", `${row.label} Flagged`)} style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
	                          🚩 {stat.flagged}
	                        </button>
	                      )}
	                    </div>
	                  </div>
		                  <div className="common-card-side" style={{ display: "grid", gap: 10, justifyItems: "end", minWidth: 112 }}>
		                    <button type="button" onClick={(e) => openDetail(e, key, "done", `${row.label} Completed / Revised`)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "right" }}>
		                      <div style={{ color: row.subject.color, fontWeight: 950, fontSize: 28, lineHeight: 1 }}>{stat.pct}%</div>
		                      <div style={{ color: "#64748b", fontWeight: 900, fontSize: 11, marginTop: 3 }}>Complete</div>
		                    </button>
		                    <button type="button" onClick={(e) => openDetail(e, key, "tests", `${row.label} Test Scores`)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "right" }}>
		                      <div style={{ color: stat.testPct === null ? "#94a3b8" : scoreColor(stat.testPct), fontWeight: 950, fontSize: 24, lineHeight: 1 }}>
		                        {stat.testPct === null ? "-" : `${stat.testPct}%`}
		                      </div>
		                      <div style={{ color: "#64748b", fontWeight: 900, fontSize: 11, marginTop: 3 }}>Test total</div>
		                    </button>
                        <RewardBadge
                          className="common-card-reward"
                          tone="video"
                          icon="📺"
                          label={key === "savio" ? "Learning Videos" : "Grammar Reward"}
                          value={rewardBalance}
                          unit="min"
                          caption={key === "savio" ? "learning videos only" : "50% video • 50% entertainment"}
                          compact
                          onClick={() => setDetailModal({ student: key, kind: "rewards", title: key === "savio" ? `${row.label} Learning Video Minutes` : `${row.label} Grammar Reward Split` })}
                        />
                        {key === "letty" && (
                          <button
                            type="button"
                            className="common-card-reward"
                            onClick={(e) => openDetail(e, key, "rewards", `${row.label} Grammar Reward Split`)}
                            style={{ border: "1px solid #ddd6fe", background: "#f5f3ff", color: "#4c1d95", borderRadius: 12, padding: "7px 9px", cursor: "pointer", textAlign: "left", width: "100%", fontSize: 11, fontWeight: 850, lineHeight: 1.35 }}
                          >
                            <span style={{ display: "block" }}>Videos: {formatRewardAmount(lettyVideoBalance)} min</span>
                            <span style={{ display: "block" }}>Entertainment: {formatRewardAmount(lettyEntertainmentBalance)} min</span>
                          </button>
                        )}
		                  </div>
		                </div>
	              </div>
	            );
          })}
        </div>

	        <CommonEnglishGrammar
	          loading={loading}
	          trackers={[tracker]}
	        />

	        <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.title || "Details"}>
	          {detailModal && (() => {
		            const row = ROWS[detailModal.student];
		            const data = detailModal.student === "savio" ? savioData : lettyData;
		            const chapters = getChapters(row.subject);
		            if (detailModal.kind === "days") {
		              const days = getDaysSummary(detailModal.student);
		              return (
		                <div>
		                  <div style={{ fontSize: 34, fontWeight: 950, color: "#047857", marginBottom: 8 }}>
		                    {days.daysLeft}/{days.totalDays} days
		                  </div>
		                  <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
		                    Remaining days out of the full countdown period.
		                    <br />
		                    Exam date: {days.examLabel}
		                  </div>
		                </div>
		              );
                }
                if (detailModal.kind === "rewards") {
                  const isLetty = detailModal.student === "letty";
                  const lettySplitEarned = videoRewards.letty.total / 2;
                  return (
                    <RewardBreakdown
                      summary={videoRewards[detailModal.student]}
                      unit="minutes"
                      title={isLetty ? `${row.label} grammar reward split` : `${row.label} learning video balance`}
                      emptyText="No grammar test scores yet."
                      note={isLetty
                        ? "Calculated from Letty's English Grammar test scores. Exactly 50% is available for learning videos and 50% for entertainment; each balance is deducted separately and can go negative."
                        : "Calculated from Savvy's English Grammar test scores. This reward is for learning videos only, such as PW, Vedantu, Next Topper, or similar."}
                    >
                      {isLetty ? (
                        <>
                          <RewardRedeemer
                            ledger={lettyVideoLedger}
                            earned={lettySplitEarned}
                            unit="minutes"
                            label="learning videos"
                          />
                          <RewardRedeemer
                            ledger={lettyEntertainmentLedger}
                            earned={lettySplitEarned}
                            unit="minutes"
                            label="entertainment"
                          />
                        </>
                      ) : (
                        <RewardRedeemer
                          ledger={savioVideoLedger}
                          earned={videoRewards.savio.total}
                          unit="minutes"
                          label="learning videos"
                        />
                      )}
                    </RewardBreakdown>
                  );
                }
		            if (detailModal.kind === "tests") {
	              const tests = chapters.flatMap(ch =>
	                (data[ch.id]?.tests || []).map(t => ({ ...t, chapterName: ch.name }))
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

	            const matched = chapters.filter(ch => {
	              const d = data[ch.id];
	              if (detailModal.kind === "done") return ["completed", "revised"].includes(d?.status || "");
	              if (detailModal.kind === "flagged") return !!d?.revision;
	              return d?.status === detailModal.kind;
	            });
	            return matched.length === 0 ? (
	              <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0", fontSize: 14 }}>No chapters found.</div>
	            ) : (
	              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
	                {matched.map(ch => (
	                  <div key={ch.id} style={{ fontSize: 13, color: "#374151", padding: "7px 0 7px 12px", borderLeft: `3px solid ${row.subject.color}55` }}>
	                    {ch.name}
	                  </div>
	                ))}
	              </div>
	            );
	          })()}
	        </Modal>
	      </main>
	    </div>
	  );
}

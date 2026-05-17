/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties, ReactNode } from "react";

export interface RewardTestInput {
  id?: string | number;
  label: string;
  subLabel?: string;
  obtained: string | number;
  max: string | number;
}

export interface MonthlyRewardInput {
  id?: string | number;
  label: string;
  subLabel?: string;
  percentage: number | null;
  scoreText?: string;
  complete?: boolean;
}

export interface PointRewardInput {
  id?: string | number;
  label: string;
  subLabel?: string;
  points: number;
  scoreText?: string;
  rule?: string;
}

export interface RewardEntry {
  id: string;
  label: string;
  subLabel: string;
  scoreText: string;
  percent: number | null;
  roundedPercent: number | null;
  reward: number;
  rule: string;
}

export interface RewardSummary {
  total: number;
  earned: number;
  deducted: number;
  count: number;
  entries: RewardEntry[];
}

type RewardTone = "entertainment" | "video" | "coins";

export const REMARK_REWARD_OPTIONS = [
  { label: "Outstanding", points: 20 },
  { label: "Excellent", points: 15 },
  { label: "Very Good", points: 10 },
  { label: "Good", points: 5 },
  { label: "Satisfactory", points: 2 },
  { label: "Needs Improvement", points: 0 },
  { label: "Needs Attention", points: -2 },
  { label: "Poor", points: -5 },
];

function toFiniteNumber(value: string | number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function roundedRewardPercent(percent: number) {
  return Math.ceil(clampPercent(percent));
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function signedAmount(value: number) {
  if (value > 0) return `+${formatAmount(value)}`;
  return formatAmount(value);
}

export function pointsForRemark(remark: string) {
  return REMARK_REWARD_OPTIONS.find(option => option.label === remark)?.points ?? 0;
}

export function performanceMinutesFromPercent(percent: number) {
  const rounded = roundedRewardPercent(percent);
  if (rounded >= 100) return rounded - 90 + 50;
  if (rounded >= 95) return rounded - 90 + 25;
  if (rounded >= 91) return rounded - 90 + 10;
  if (rounded >= 80) return 5;
  if (rounded >= 75) return 0;
  return rounded - 75;
}

export function monthlyCoinsFromPercent(percent: number) {
  const rounded = roundedRewardPercent(percent);
  if (rounded >= 96) return (rounded - 90) * 50;
  if (rounded >= 91) return (rounded - 90) * 25;
  if (rounded >= 80) return 10;
  if (rounded >= 70) return 5;
  if (rounded >= 60) return 2;
  if (rounded >= 50) return 1;
  return 0;
}

function finishSummary(entries: RewardEntry[]): RewardSummary {
  const total = entries.reduce((sum, entry) => sum + entry.reward, 0);
  const earned = entries.reduce((sum, entry) => sum + Math.max(0, entry.reward), 0);
  const deducted = entries.reduce((sum, entry) => sum + Math.min(0, entry.reward), 0);
  return { total, earned, deducted, count: entries.length, entries };
}

export function buildPerformanceRewardSummary(tests: RewardTestInput[]): RewardSummary {
  const entries = tests.flatMap((test, index): RewardEntry[] => {
    const obtained = toFiniteNumber(test.obtained);
    const max = toFiniteNumber(test.max);
    if (obtained === null || max === null || max <= 0) return [];
    const percent = clampPercent((obtained / max) * 100);
    const roundedPercent = roundedRewardPercent(percent);
    const reward = performanceMinutesFromPercent(percent);
    const rule = roundedPercent >= 100
      ? "100% +50 bonus"
      : roundedPercent >= 95
        ? "95%-99% +25 bonus"
        : roundedPercent >= 91
          ? "91%-94% +10 bonus"
          : roundedPercent >= 80
            ? "80%-90% fixed reward"
            : roundedPercent >= 75
              ? "75%-79% neutral"
              : "Below 75% deduction";
    return [{
      id: String(test.id ?? `${test.label}-${index}`),
      label: test.label,
      subLabel: test.subLabel || "",
      scoreText: `${obtained}/${max}`,
      percent,
      roundedPercent,
      reward,
      rule,
    }];
  });

  return finishSummary(entries);
}

export function buildMonthlyRewardSummary(rows: MonthlyRewardInput[]): RewardSummary {
  const entries = rows.map((row, index): RewardEntry => {
    if (!row.complete || row.percentage === null) {
      return {
        id: String(row.id ?? `${row.label}-${index}`),
        label: row.label,
        subLabel: row.subLabel || "",
        scoreText: row.scoreText || "Incomplete",
        percent: null,
        roundedPercent: null,
        reward: 0,
        rule: "Incomplete monthly total",
      };
    }
    const percent = clampPercent(row.percentage);
    const roundedPercent = roundedRewardPercent(percent);
    const reward = monthlyCoinsFromPercent(percent);
    const rule = roundedPercent >= 96
      ? "96%-100% x50 band"
      : roundedPercent >= 91
        ? "91%-95% x25 band"
        : roundedPercent >= 80
          ? "80%-90% fixed band"
          : roundedPercent >= 50
            ? "50%-79% fixed band"
            : "Below 50%";
    return {
      id: String(row.id ?? `${row.label}-${index}`),
      label: row.label,
      subLabel: row.subLabel || "",
      scoreText: row.scoreText || `${formatAmount(percent)}%`,
      percent,
      roundedPercent,
      reward,
      rule,
    };
  });

  return finishSummary(entries);
}

export function buildPointRewardSummary(rows: PointRewardInput[]): RewardSummary {
  const entries = rows.map((row, index): RewardEntry => {
    const points = Number.isFinite(row.points) ? row.points : 0;
    return {
      id: String(row.id ?? `${row.label}-${index}`),
      label: row.label,
      subLabel: row.subLabel || "",
      scoreText: row.scoreText || `${signedAmount(points)} points`,
      percent: null,
      roundedPercent: null,
      reward: points,
      rule: row.rule || "Saved remark points",
    };
  });

  return finishSummary(entries);
}

const toneStyles: Record<RewardTone, {
  iconBg: string;
  badgeBg: string;
  shadow: string;
  border: string;
  accent: string;
}> = {
  entertainment: {
    iconBg: "linear-gradient(135deg,#fef3c7,#f59e0b)",
    badgeBg: "linear-gradient(135deg,rgba(17,24,39,.72),rgba(88,28,135,.62)), radial-gradient(circle at 18% 18%,rgba(250,204,21,.9),transparent 30%), radial-gradient(circle at 88% 20%,rgba(34,211,238,.58),transparent 32%)",
    shadow: "0 14px 34px rgba(250,204,21,.24), inset 0 1px 0 rgba(255,255,255,.26)",
    border: "rgba(253,224,71,.72)",
    accent: "#fde047",
  },
  video: {
    iconBg: "linear-gradient(135deg,#dcfce7,#14b8a6)",
    badgeBg: "linear-gradient(135deg,rgba(6,78,59,.78),rgba(15,118,110,.62)), radial-gradient(circle at 22% 20%,rgba(187,247,208,.88),transparent 30%), radial-gradient(circle at 84% 24%,rgba(251,191,36,.58),transparent 34%)",
    shadow: "0 14px 34px rgba(20,184,166,.24), inset 0 1px 0 rgba(255,255,255,.26)",
    border: "rgba(167,243,208,.72)",
    accent: "#86efac",
  },
  coins: {
    iconBg: "linear-gradient(135deg,#fff7ed,#f59e0b)",
    badgeBg: "linear-gradient(135deg,rgba(120,53,15,.76),rgba(180,83,9,.64)), radial-gradient(circle at 18% 18%,rgba(253,224,71,.95),transparent 30%), radial-gradient(circle at 84% 22%,rgba(255,255,255,.5),transparent 30%)",
    shadow: "0 14px 38px rgba(245,158,11,.32), inset 0 1px 0 rgba(255,255,255,.28)",
    border: "rgba(252,211,77,.82)",
    accent: "#fef08a",
  },
};

export function RewardBadge({
  tone,
  icon,
  label,
  value,
  unit,
  caption,
  onClick,
  compact = false,
  className,
  style,
}: {
  tone: RewardTone;
  icon: string;
  label: string;
  value: number;
  unit: string;
  caption: string;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const toneStyle = toneStyles[tone];
  const buttonStyle: CSSProperties = {
    position: "relative",
    isolation: "isolate",
    flex: compact ? "0 1 180px" : "0 1 235px",
    minWidth: compact ? 168 : 205,
    border: `1px solid ${toneStyle.border}`,
    borderRadius: 18,
    padding: compact ? "10px 12px" : "12px 14px",
    background: toneStyle.badgeBg,
    color: "white",
    boxShadow: toneStyle.shadow,
    cursor: onClick ? "pointer" : "default",
    fontFamily: "inherit",
    overflow: "hidden",
    textAlign: "left",
  };

  return (
    <button type="button" className={className} onClick={onClick} style={{ ...buttonStyle, ...style }} aria-label={`${label}: ${formatAmount(value)} ${unit}`}>
      <span style={{ position: "absolute", inset: "0 auto auto 36%", width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,.1)", transform: "translateY(-52px)", zIndex: -1 }} />
      <span style={{ position: "absolute", inset: "auto 10px 8px auto", width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,.08)", zIndex: -1 }} />
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: compact ? 34 : 40, height: compact ? 34 : 40, borderRadius: 12, background: toneStyle.iconBg, display: "grid", placeItems: "center", boxShadow: "0 8px 20px rgba(0,0,0,.18)", fontSize: compact ? 18 : 22, color: "#0f172a", flex: "0 0 auto" }}>
          {icon}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: compact ? 10 : 11, fontWeight: 950, letterSpacing: 1.2, textTransform: "uppercase", color: toneStyle.accent }}>
            {label}
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
            <span style={{ fontSize: compact ? 25 : 31, fontWeight: 950, lineHeight: 1 }}>{formatAmount(value)}</span>
            <span style={{ fontSize: compact ? 12 : 13, fontWeight: 900, opacity: .9 }}>{unit}</span>
          </span>
          <span style={{ display: "block", fontSize: compact ? 10 : 11, opacity: .78, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {caption}
          </span>
        </span>
      </span>
    </button>
  );
}

export function RewardBreakdown({
  summary,
  unit,
  title,
  emptyText,
  note,
  children,
}: {
  summary: RewardSummary;
  unit: string;
  title: string;
  emptyText: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <div style={{ borderRadius: 16, padding: "14px 16px", background: "linear-gradient(135deg,#fffbeb,#ecfeff)", border: "1px solid #fde68a", marginBottom: 14 }}>
        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 950, letterSpacing: 1.4, textTransform: "uppercase" }}>{title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <span style={{ color: "#0f172a", fontSize: 34, fontWeight: 950 }}>{formatAmount(summary.total)}</span>
          <span style={{ color: "#92400e", fontSize: 13, fontWeight: 900 }}>{unit}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, fontSize: 12, fontWeight: 850 }}>
          <span style={{ color: "#047857", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 999, padding: "3px 8px" }}>Earned {formatAmount(summary.earned)}</span>
          {summary.deducted < 0 && <span style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 999, padding: "3px 8px" }}>Deductions {formatAmount(summary.deducted)}</span>}
          <span style={{ color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 999, padding: "3px 8px" }}>{summary.count} score{summary.count !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.55, marginBottom: 12 }}>
        {note}
      </div>
      {children}

      {summary.entries.length === 0 ? (
        <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0", fontSize: 14 }}>{emptyText}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {summary.entries.map((entry, index) => {
            const rewardColor = entry.reward > 0 ? "#047857" : entry.reward < 0 ? "#b91c1c" : "#64748b";
            const rewardBg = entry.reward > 0 ? "#ecfdf5" : entry.reward < 0 ? "#fef2f2" : "#f8fafc";
            const percentText = entry.percent === null ? "Not comparable" : `${formatAmount(entry.percent)}%`;
            const roundedText = entry.roundedPercent === null ? "" : `Reward % ${entry.roundedPercent}`;
            return (
              <div key={`${entry.id}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: index < summary.entries.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.label}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{entry.subLabel}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
                    {entry.scoreText} • {percentText}{roundedText ? ` • ${roundedText}` : ""} • {entry.rule}
                  </div>
                </div>
                <div style={{ color: rewardColor, background: rewardBg, border: `1px solid ${entry.reward > 0 ? "#bbf7d0" : entry.reward < 0 ? "#fecaca" : "#e2e8f0"}`, borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 950, minWidth: 64, textAlign: "center" }}>
                  {signedAmount(entry.reward)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useState } from "react";

const SUPA_URL = "https://mlfgdutctvbvqwebqajp.supabase.co";
const SUPA_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmdkdXRjdHZidnF3ZWJxYWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ2MDIsImV4cCI6MjA4OTgxMDYwMn0.TPBeT6y-fFGAgcME_mmKqBUYHFUMVB1FO3wrAhneKW4";

const ROW_ID = "reward_redemptions_v1";
const LOCAL_KEY = "reward_redemptions_v1";
const EVENT_NAME = "reward-redemptions-updated";

export type RewardWalletId =
  | "savio-entertainment"
  | "letty-entertainment"
  | "savio-video"
  | "letty-video"
  | "savio-school-tests"
  | "leticia-school-tests"
  | "savio-school-remarks"
  | "leticia-school-remarks";

export interface RedemptionEntry {
  id: string;
  amount: number;
  note: string;
  createdAt: string;
}

type RedemptionStore = Record<string, RedemptionEntry[]>;

export interface RewardLedgerControls {
  walletId: RewardWalletId;
  entries: RedemptionEntry[];
  spent: number;
  saving: boolean;
  error: string | null;
  addRedemption: (amount: number, note: string) => Promise<boolean>;
  deleteRedemption: (id: string) => Promise<boolean>;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function normalizeStore(value: unknown): RedemptionStore {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value as Record<string, unknown>).reduce<RedemptionStore>((acc, [walletId, rawEntries]) => {
    if (!Array.isArray(rawEntries)) return acc;
    const entries = rawEntries.flatMap((entry): RedemptionEntry[] => {
      if (!entry || typeof entry !== "object") return [];
      const row = entry as Partial<RedemptionEntry>;
      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount <= 0 || !row.id || !row.createdAt) return [];
      return [{
        id: String(row.id),
        amount,
        note: typeof row.note === "string" ? row.note : "",
        createdAt: String(row.createdAt),
      }];
    });
    if (entries.length) acc[walletId] = entries;
    return acc;
  }, {});
}

function loadLocalStore(): RedemptionStore {
  try {
    return normalizeStore(JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"));
  } catch {
    return {};
  }
}

function saveLocalStore(store: RedemptionStore) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
  } catch {
    // localStorage may be unavailable in private browsing.
  }
}

async function fetchRemoteStore(): Promise<RedemptionStore | null> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/tracker_data?id=eq.${ROW_ID}&select=data`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const data = (await res.json())?.[0]?.data;
    return data && typeof data === "object" ? normalizeStore(data) : {};
  } catch {
    return null;
  }
}

async function saveRemoteStore(store: RedemptionStore): Promise<boolean> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/tracker_data`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: ROW_ID, data: store }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function emitStore(store: RedemptionStore) {
  saveLocalStore(store);
  window.dispatchEvent(new CustomEvent<RedemptionStore>(EVENT_NAME, { detail: store }));
}

export function useRewardRedemptions(walletId: RewardWalletId): RewardLedgerControls {
  const [store, setStore] = useState<RedemptionStore>(() => loadLocalStore());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRemoteStore().then(remote => {
      if (!alive || remote === null) return;
      setStore(remote);
      saveLocalStore(remote);
    });

    const onUpdate = (event: Event) => {
      const next = normalizeStore((event as CustomEvent<RedemptionStore>).detail);
      setStore(next);
    };
    window.addEventListener(EVENT_NAME, onUpdate);
    return () => {
      alive = false;
      window.removeEventListener(EVENT_NAME, onUpdate);
    };
  }, []);

  const entries = useMemo(() => [...(store[walletId] || [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [store, walletId]);
  const spent = useMemo(() => entries.reduce((sum, entry) => sum + entry.amount, 0), [entries]);

  const persist = useCallback(async (next: RedemptionStore) => {
    setSaving(true);
    setError(null);
    setStore(next);
    emitStore(next);
    const ok = await saveRemoteStore(next);
    setSaving(false);
    if (!ok) setError("Could not save this redemption to Supabase. It is saved on this device until the connection works again.");
    return ok;
  }, []);

  const addRedemption = useCallback(async (amount: number, note: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const remote = await fetchRemoteStore();
    const base = remote || store;
    const nextEntry: RedemptionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    return persist({ ...base, [walletId]: [...(base[walletId] || []), nextEntry] });
  }, [persist, store, walletId]);

  const deleteRedemption = useCallback(async (id: string) => {
    const remote = await fetchRemoteStore();
    const base = remote || store;
    return persist({ ...base, [walletId]: (base[walletId] || []).filter(entry => entry.id !== id) });
  }, [persist, store, walletId]);

  return { walletId, entries, spent, saving, error, addRedemption, deleteRedemption };
}

export function RewardRedeemer({
  ledger,
  earned,
  unit,
  label,
}: {
  ledger: RewardLedgerControls;
  earned: number;
  unit: string;
  label: string;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const balance = earned - ledger.spent;

  const redeem = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError("Enter a valid amount to redeem.");
      return;
    }
    const ok = await ledger.addRedemption(parsed, note);
    if (ok) {
      setAmount("");
      setNote("");
      setFormError(null);
    }
  };

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Total", value: earned, color: earned >= 0 ? "#047857" : "#b91c1c", bg: earned >= 0 ? "#ecfdf5" : "#fef2f2" },
          { label: "Used", value: ledger.spent, color: "#b45309", bg: "#fffbeb" },
          { label: "Balance", value: balance, color: balance >= 0 ? "#1d4ed8" : "#b91c1c", bg: balance >= 0 ? "#eff6ff" : "#fef2f2" },
        ].map(item => (
          <div key={item.label} style={{ borderRadius: 12, padding: "10px 12px", background: item.bg, border: "1px solid rgba(148,163,184,.24)" }}>
            <div style={{ color: "#64748b", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: .9 }}>{item.label}</div>
            <div style={{ color: item.color, fontSize: 20, fontWeight: 950, marginTop: 2 }}>{formatAmount(item.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 14, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 12 }}>
        <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 900, marginBottom: 4 }}>Deduct used {label}</div>
        <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45, marginBottom: 8 }}>
          You can deduct even when the balance is negative. For example, -10 minus 10 becomes -20.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
          <input
            type="number"
            min="1"
            step="1"
            placeholder={unit}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 13, outline: "none" }}
          />
          <input
            placeholder="What was it used for?"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 13, outline: "none" }}
          />
        </div>
        {(formError || ledger.error) && <div style={{ color: "#b91c1c", fontSize: 12, fontWeight: 800, marginTop: 8 }}>{formError || ledger.error}</div>}
        <button
          type="button"
          onClick={redeem}
          disabled={ledger.saving}
          style={{ marginTop: 10, border: "none", borderRadius: 10, padding: "9px 12px", background: "#0f172a", color: "white", fontWeight: 900, cursor: ledger.saving ? "wait" : "pointer", width: "100%" }}
        >
          {ledger.saving ? "Saving..." : "Deduct"}
        </button>
      </div>

      {ledger.entries.length > 0 && (
        <div>
          <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 900, marginBottom: 8 }}>Deduction history</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ledger.entries.map(entry => (
              <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.note || "Used reward"}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                </div>
                <div style={{ color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 950 }}>
                  -{formatAmount(entry.amount)}
                </div>
                <button
                  type="button"
                  onClick={() => void ledger.deleteRedemption(entry.id)}
                  title="Delete deduction"
                  style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontWeight: 900 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

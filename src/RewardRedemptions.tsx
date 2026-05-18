/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useState } from "react";

const SUPA_URL = "https://mlfgdutctvbvqwebqajp.supabase.co";
const SUPA_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmdkdXRjdHZidnF3ZWJxYWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ2MDIsImV4cCI6MjA4OTgxMDYwMn0.TPBeT6y-fFGAgcME_mmKqBUYHFUMVB1FO3wrAhneKW4";

const ROW_ID = "reward_redemptions_v1";
const LOCAL_KEY = "reward_redemptions_v1";
const EVENT_NAME = "reward-redemptions-updated";
const FAMILY_PRIVILEGE_ROW_ID = "family_privilege_cards_v1";
const FAMILY_PRIVILEGE_LOCAL_KEY = "family_privilege_cards_v1";
const FAMILY_PRIVILEGE_EVENT_NAME = "family-privilege-cards-updated";

export interface RewardCardOption {
  id: string;
  label: string;
  value: number;
}

const DEFAULT_FAMILY_PRIVILEGE_CARDS: RewardCardOption[] = [
  { id: "movie", label: "Movie", value: 100 },
  { id: "outing-1-day", label: "Outing - 1 day", value: 500 },
  { id: "dinner", label: "Dinner", value: 100 },
];

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

export interface RewardCardCatalogControls {
  cards: RewardCardOption[];
  saving: boolean;
  error: string | null;
  addCard: (label: string, value: number) => Promise<boolean>;
  updateCard: (id: string, label: string, value: number) => Promise<boolean>;
  deleteCard: (id: string) => Promise<boolean>;
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

function normalizeCards(value: unknown): RewardCardOption[] {
  if (!Array.isArray(value)) return DEFAULT_FAMILY_PRIVILEGE_CARDS;
  return value.flatMap((row): RewardCardOption[] => {
    if (!row || typeof row !== "object") return [];
    const card = row as Partial<RewardCardOption>;
    const value = Number(card.value);
    const label = typeof card.label === "string" ? card.label.trim() : "";
    const id = typeof card.id === "string" ? card.id.trim() : "";
    if (!id || !label || !Number.isFinite(value) || value <= 0) return [];
    return [{ id, label, value }];
  });
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

function loadLocalCards(): RewardCardOption[] {
  try {
    const raw = localStorage.getItem(FAMILY_PRIVILEGE_LOCAL_KEY);
    return raw ? normalizeCards(JSON.parse(raw)) : DEFAULT_FAMILY_PRIVILEGE_CARDS;
  } catch {
    return DEFAULT_FAMILY_PRIVILEGE_CARDS;
  }
}

function saveLocalCards(cards: RewardCardOption[]) {
  try {
    localStorage.setItem(FAMILY_PRIVILEGE_LOCAL_KEY, JSON.stringify(cards));
  } catch {
    // localStorage may be unavailable in private browsing.
  }
}

async function fetchRemoteCards(): Promise<RewardCardOption[] | null> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/tracker_data?id=eq.${FAMILY_PRIVILEGE_ROW_ID}&select=data`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const data = (await res.json())?.[0]?.data;
    return normalizeCards(data);
  } catch {
    return null;
  }
}

async function saveRemoteCards(cards: RewardCardOption[]): Promise<boolean> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/tracker_data`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: FAMILY_PRIVILEGE_ROW_ID, data: cards }),
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

function emitCards(cards: RewardCardOption[]) {
  saveLocalCards(cards);
  window.dispatchEvent(new CustomEvent<RewardCardOption[]>(FAMILY_PRIVILEGE_EVENT_NAME, { detail: cards }));
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

export function useFamilyPrivilegeCards(): RewardCardCatalogControls {
  const [cards, setCards] = useState<RewardCardOption[]>(() => loadLocalCards());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRemoteCards().then(remote => {
      if (!alive || remote === null) return;
      setCards(remote);
      saveLocalCards(remote);
    });

    const onUpdate = (event: Event) => {
      setCards(normalizeCards((event as CustomEvent<RewardCardOption[]>).detail));
    };
    window.addEventListener(FAMILY_PRIVILEGE_EVENT_NAME, onUpdate);
    return () => {
      alive = false;
      window.removeEventListener(FAMILY_PRIVILEGE_EVENT_NAME, onUpdate);
    };
  }, []);

  const persist = useCallback(async (next: RewardCardOption[]) => {
    const normalized = normalizeCards(next);
    setSaving(true);
    setError(null);
    setCards(normalized);
    emitCards(normalized);
    const ok = await saveRemoteCards(normalized);
    setSaving(false);
    if (!ok) setError("Could not save this card to Supabase. It is saved on this device until the connection works again.");
    return ok;
  }, []);

  const addCard = useCallback(async (label: string, value: number) => {
    const cleanLabel = label.trim();
    if (!cleanLabel || !Number.isFinite(value) || value <= 0) return false;
    const remote = await fetchRemoteCards();
    const base = remote || cards;
    const idBase = cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card";
    const id = `${idBase}-${Date.now()}`;
    return persist([...base, { id, label: cleanLabel, value }]);
  }, [cards, persist]);

  const updateCard = useCallback(async (id: string, label: string, value: number) => {
    const cleanLabel = label.trim();
    if (!id || !cleanLabel || !Number.isFinite(value) || value <= 0) return false;
    const remote = await fetchRemoteCards();
    const base = remote || cards;
    return persist(base.map(card => card.id === id ? { ...card, label: cleanLabel, value } : card));
  }, [cards, persist]);

  const deleteCard = useCallback(async (id: string) => {
    if (!id) return false;
    const remote = await fetchRemoteCards();
    const base = remote || cards;
    return persist(base.filter(card => card.id !== id));
  }, [cards, persist]);

  return { cards, saving, error, addCard, updateCard, deleteCard };
}

export function RewardRedeemer({
  ledger,
  earned,
  unit,
  label,
  presetOptions,
  onAddPresetOption,
  onUpdatePresetOption,
  onDeletePresetOption,
  presetLabel = "reward card",
}: {
  ledger: RewardLedgerControls;
  earned: number;
  unit: string;
  label: string;
  presetOptions?: RewardCardOption[];
  onAddPresetOption?: (label: string, value: number) => Promise<boolean>;
  onUpdatePresetOption?: (id: string, label: string, value: number) => Promise<boolean>;
  onDeletePresetOption?: (id: string) => Promise<boolean>;
  presetLabel?: string;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [newPresetValue, setNewPresetValue] = useState("");
  const [editingPresetId, setEditingPresetId] = useState("");
  const [editingPresetLabel, setEditingPresetLabel] = useState("");
  const [editingPresetValue, setEditingPresetValue] = useState("");
  const [managingPresets, setManagingPresets] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const balance = earned - ledger.spent;
  const selectedPreset = presetOptions?.find(option => option.id === selectedPresetId);

  const redeem = async () => {
    const parsed = selectedPreset ? selectedPreset.value : Number(amount);
    const redemptionNote = selectedPreset ? selectedPreset.label : note;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError(presetOptions ? `Select a ${presetLabel} to redeem.` : "Enter a valid amount to redeem.");
      return;
    }
    const ok = await ledger.addRedemption(parsed, redemptionNote);
    if (ok) {
      setAmount("");
      setNote("");
      setSelectedPresetId("");
      setFormError(null);
    }
  };

  const addPreset = async () => {
    const parsed = Number(newPresetValue);
    if (!onAddPresetOption || !newPresetLabel.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setFormError(`Enter a valid ${presetLabel} name and value.`);
      return;
    }
    const ok = await onAddPresetOption(newPresetLabel, parsed);
    if (ok) {
      setNewPresetLabel("");
      setNewPresetValue("");
      setFormError(null);
    }
  };

  const startEditPreset = (option: RewardCardOption) => {
    setEditingPresetId(option.id);
    setEditingPresetLabel(option.label);
    setEditingPresetValue(String(option.value));
    setFormError(null);
  };

  const updatePreset = async () => {
    const parsed = Number(editingPresetValue);
    if (!onUpdatePresetOption || !editingPresetId || !editingPresetLabel.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setFormError(`Enter a valid ${presetLabel} name and value.`);
      return;
    }
    const ok = await onUpdatePresetOption(editingPresetId, editingPresetLabel, parsed);
    if (ok) {
      setEditingPresetId("");
      setEditingPresetLabel("");
      setEditingPresetValue("");
      setFormError(null);
    }
  };

  const deletePreset = async (option: RewardCardOption) => {
    if (!onDeletePresetOption) return;
    if (!window.confirm(`Delete ${option.label}?`)) return;
    const ok = await onDeletePresetOption(option.id);
    if (ok) {
      if (selectedPresetId === option.id) setSelectedPresetId("");
      if (editingPresetId === option.id) {
        setEditingPresetId("");
        setEditingPresetLabel("");
        setEditingPresetValue("");
      }
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
        {presetOptions ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 92px", gap: 8 }}>
              <select
                value={selectedPresetId}
                onChange={e => setSelectedPresetId(e.target.value)}
                style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 13, outline: "none", background: "white", color: "#0f172a" }}
              >
                <option value="">Select {presetLabel}</option>
                {presetOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 13, color: selectedPreset ? "#0f172a" : "#94a3b8", background: "white", fontWeight: 900, textAlign: "center" }}>
                {selectedPreset ? formatAmount(selectedPreset.value) : unit}
              </div>
            </div>
            {onAddPresetOption && (
              <div style={{ marginTop: 10, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                <div style={{ color: "#0f172a", fontSize: 12, fontWeight: 900, marginBottom: 7 }}>Add new {presetLabel}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 88px", gap: 8 }}>
                  <input
                    placeholder="Card name"
                    value={newPresetLabel}
                    onChange={e => setNewPresetLabel(e.target.value)}
                    style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 13, outline: "none" }}
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder={unit}
                    value={newPresetValue}
                    onChange={e => setNewPresetValue(e.target.value)}
                    style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", fontSize: 13, outline: "none" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addPreset}
                  disabled={ledger.saving}
                  style={{ marginTop: 8, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px", background: "white", color: "#0f172a", fontWeight: 900, cursor: "pointer", width: "100%" }}
                >
                  Add Card
                </button>
              </div>
            )}
            {(onUpdatePresetOption || onDeletePresetOption) && presetOptions.length > 0 && (
              <div style={{ marginTop: 10, borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setManagingPresets(prev => !prev);
                    setEditingPresetId("");
                    setEditingPresetLabel("");
                    setEditingPresetValue("");
                  }}
                  style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px", background: managingPresets ? "#0f172a" : "white", color: managingPresets ? "white" : "#0f172a", fontWeight: 900, cursor: "pointer", width: "100%" }}
                >
                  {managingPresets ? "Hide Cards" : "Manage Cards"}
                </button>
                {managingPresets && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {presetOptions.map(option => {
                      const isEditing = editingPresetId === option.id;
                      return (
                        <div key={option.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 9, background: "white" }}>
                          {isEditing ? (
                            <div style={{ display: "grid", gap: 8 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 86px", gap: 8 }}>
                                <input
                                  value={editingPresetLabel}
                                  onChange={e => setEditingPresetLabel(e.target.value)}
                                  style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 9, padding: "8px 9px", fontSize: 13, outline: "none" }}
                                />
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={editingPresetValue}
                                  onChange={e => setEditingPresetValue(e.target.value)}
                                  style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 9, padding: "8px 9px", fontSize: 13, outline: "none" }}
                                />
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={updatePreset}
                                  disabled={ledger.saving}
                                  style={{ border: "none", borderRadius: 9, padding: "8px 9px", background: "#0f172a", color: "white", fontWeight: 900, cursor: "pointer" }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPresetId("");
                                    setEditingPresetLabel("");
                                    setEditingPresetValue("");
                                  }}
                                  style={{ border: "1px solid #cbd5e1", borderRadius: 9, padding: "8px 9px", background: "white", color: "#0f172a", fontWeight: 900, cursor: "pointer" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{option.label}</div>
                                <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{formatAmount(option.value)} {unit}</div>
                              </div>
                              {onUpdatePresetOption && (
                                <button
                                  type="button"
                                  onClick={() => startEditPreset(option)}
                                  style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 8px", background: "#f8fafc", color: "#0f172a", fontWeight: 900, cursor: "pointer" }}
                                >
                                  Edit
                                </button>
                              )}
                              {onDeletePresetOption && (
                                <button
                                  type="button"
                                  onClick={() => void deletePreset(option)}
                                  style={{ border: "1px solid #fecaca", borderRadius: 8, padding: "6px 8px", background: "#fef2f2", color: "#b91c1c", fontWeight: 900, cursor: "pointer" }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
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
        )}
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

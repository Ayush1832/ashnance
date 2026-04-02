"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./owner.module.css";

type Section = "pool" | "burn" | "stats";

const NAV: { key: Section; icon: string; label: string }[] = [
  { key: "pool",  icon: "💰", label: "PROFIT POOL"  },
  { key: "burn",  icon: "🔥", label: "BURN CONFIG"  },
  { key: "stats", icon: "📊", label: "STATS"        },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface ProfitPool {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  initiatorEmail: string;
  approverEmail: string | null;
  status: "PENDING" | "EXECUTED" | "CANCELLED";
  owner1Wallet: string;
  owner2Wallet: string;
  owner1Amount: number;
  owner2Amount: number;
  createdAt: string;
  executedAt: string | null;
}

interface BurnConfig {
  jackpot_prob: number;
  jackpot_amount: number;
  big_prob: number;
  big_amount: number;
  medium_prob: number;
  medium_amount: number;
  small_amount: number;
  ash_reward_min: number;
  ash_reward_max: number;
  constant_factor: number;
  reward_pool_split: number;
  profit_pool_split: number;
  referral_commission: number;
}

interface Stats {
  totalUsers: number;
  totalBurns: number;
  activeVips: number;
  totalBurned: number;
  rewardPoolBalance: number;
  profitPoolBalance: number;
  profitPoolTotalDeposited: number;
  profitPoolTotalWithdrawn: number;
}

const DEFAULT_CONFIG: BurnConfig = {
  jackpot_prob: 0.01, jackpot_amount: 2500,
  big_prob: 0.05,     big_amount: 500,
  medium_prob: 0.20,  medium_amount: 200,
  small_amount: 50,
  ash_reward_min: 200, ash_reward_max: 500,
  constant_factor: 100,
  reward_pool_split: 0.5, profit_pool_split: 0.5,
  referral_commission: 0.1,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function calcEV(cfg: BurnConfig): { winProb: number; evUsdc: number; evAsh: number } {
  const weight = 1.0; // base weight for $4.99 burn
  const winProb = weight / (weight + cfg.constant_factor);

  const prizeRollExpected =
    cfg.jackpot_prob * cfg.jackpot_amount +
    (cfg.big_prob - cfg.jackpot_prob) * cfg.big_amount +
    (cfg.medium_prob - cfg.big_prob) * cfg.medium_amount +
    (1 - cfg.medium_prob) * cfg.small_amount;

  const evUsdc = winProb * prizeRollExpected - 4.99;
  const avgAsh = (cfg.ash_reward_min + cfg.ash_reward_max) / 2;
  const evAsh = (1 - winProb) * avgAsh;

  return { winProb: winProb * 100, evUsdc, evAsh };
}

function fmt2(n: number) { return n.toFixed(2); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

// ── Main Component ─────────────────────────────────────────────────────────
export default function OwnerPage() {
  const router = useRouter();
  const [ready,     setReady]     = useState(false);
  const [denied,    setDenied]    = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [section,   setSection]   = useState<Section>("pool");

  // Pool state
  const [pool,      setPool]      = useState<ProfitPool | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [pending,   setPending]   = useState<WithdrawalRequest | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolAction, setPoolAction] = useState<string | null>(null);
  const [poolError,  setPoolError]  = useState<string | null>(null);

  // Burn config state
  const [cfg,       setCfg]       = useState<BurnConfig>(DEFAULT_CONFIG);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState<string | null>(null);

  // Stats state
  const [stats,     setStats]     = useState<Stats | null>(null);

  // ── Auth check ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { router.replace("/owner-login"); return; }
    api.setToken(token);

    api.owner.me().then((res: any) => {
      setOwnerEmail(res.email ?? "");
      setReady(true);
    }).catch(() => {
      setDenied(true);
      setReady(true);
    });
  }, [router]);

  // ── Load profit pool ───────────────────────────────────────────────────
  const loadPool = useCallback(async () => {
    try {
      setPoolLoading(true);
      const res = (await api.owner.profitPool()) as any;
      const data = res.data ?? res;
      setPool(data.pool);
      setWithdrawals(data.withdrawals ?? []);
      const pend = (data.withdrawals ?? []).find((w: WithdrawalRequest) => w.status === "PENDING") ?? null;
      setPending(pend);
    } catch { /* ignore */ }
    finally { setPoolLoading(false); }
  }, []);

  // ── Load burn config ───────────────────────────────────────────────────
  const loadBurnConfig = useCallback(async () => {
    try {
      setCfgLoading(true);
      const res = (await api.owner.getBurnConfig()) as any;
      const data = res.data ?? res;
      setCfg({ ...DEFAULT_CONFIG, ...data });
    } catch { /* ignore */ }
    finally { setCfgLoading(false); }
  }, []);

  // ── Load stats ─────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = (await api.owner.stats()) as any;
      setStats(res.data ?? res);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!ready || denied) return;
    loadPool();
    loadBurnConfig();
    loadStats();
  }, [ready, denied, loadPool, loadBurnConfig, loadStats]);

  // ── Actions ────────────────────────────────────────────────────────────
  async function initiateWithdrawal() {
    setPoolError(null);
    setPoolAction("Initiating...");
    try {
      await api.owner.initiateWithdrawal();
      await loadPool();
    } catch (e: any) {
      setPoolError(e.message ?? "Failed to initiate");
    } finally { setPoolAction(null); }
  }

  async function approveWithdrawal() {
    if (!pending) return;
    setPoolError(null);
    setPoolAction("Approving & Executing...");
    try {
      await api.owner.approveWithdrawal(pending.id);
      await loadPool();
    } catch (e: any) {
      setPoolError(e.message ?? "Failed to approve");
    } finally { setPoolAction(null); }
  }

  async function cancelWithdrawal() {
    if (!pending) return;
    setPoolError(null);
    setPoolAction("Cancelling...");
    try {
      await api.owner.cancelWithdrawal(pending.id);
      await loadPool();
    } catch (e: any) {
      setPoolError(e.message ?? "Failed to cancel");
    } finally { setPoolAction(null); }
  }

  async function saveBurnConfig() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.owner.saveBurnConfig(cfg as unknown as Record<string, number>);
      setSaveMsg("SAVED SUCCESSFULLY");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      setSaveMsg("ERROR: " + (e.message ?? "Save failed"));
    } finally { setSaving(false); }
  }

  function updateCfg(key: keyof BurnConfig, val: number) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  function handleLogout() {
    api.clearToken();
    router.replace("/owner-login");
  }

  // ── Render guards ──────────────────────────────────────────────────────
  if (!ready) return null;

  if (denied) {
    return (
      <div className={styles.denied}>
        <div className={styles.deniedIcon}>🚫</div>
        <div className={styles.deniedTitle}>ACCESS DENIED</div>
        <div className={styles.deniedSub}>YOUR ACCOUNT IS NOT AUTHORISED FOR OWNER ACCESS</div>
        <button
          className={styles.btnGhost}
          style={{ marginTop: "24px" }}
          onClick={() => { api.clearToken(); router.replace("/login"); }}
        >
          GO BACK
        </button>
      </div>
    );
  }

  const ev = calcEV(cfg);
  const balance = Number(pool?.balance ?? 0);
  const o1Amt = balance * 0.6;
  const o2Amt = balance * 0.4;
  const isInitiator = pending?.initiatorEmail === ownerEmail;
  const canApprove  = !!pending && !isInitiator;

  return (
    <div className={styles.layout}>
      {/* ── SIDEBAR ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>ASHNANCE</div>
        <div className={styles.sidebarLogoSub}>OWNER PORTAL</div>

        {NAV.map((n) => (
          <button
            key={n.key}
            className={`${styles.navItem} ${section === n.key ? styles.navItemActive : ""}`}
            onClick={() => setSection(n.key)}
          >
            <span>{n.icon}</span>
            {n.label}
          </button>
        ))}

        <div className={styles.sidebarFooter}>
          <div className={styles.ownerBadge}>👑 OWNER</div>
          <div style={{ fontSize: "8px", color: "#333", letterSpacing: "1px", marginBottom: "10px", wordBreak: "break-all" }}>
            {ownerEmail}
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>LOGOUT</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className={styles.main}>

        {/* ════════ PROFIT POOL ════════ */}
        {section === "pool" && (
          <>
            <div className={styles.pageTitle}>PROFIT POOL</div>
            <div className={styles.pageSub}>MULTI-SIG WITHDRAWAL — BOTH OWNERS MUST SIGN</div>

            {poolLoading ? (
              <div style={{ color: "#444", fontSize: "10px", letterSpacing: "2px" }}>LOADING...</div>
            ) : (
              <>
                {/* Balance */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>CURRENT BALANCE</div>
                  <div className={styles.poolBalance}>${fmt2(balance)} USDC</div>
                  <div className={styles.poolSub}>
                    TOTAL DEPOSITED: ${fmt2(Number(pool?.totalDeposited ?? 0))} &nbsp;•&nbsp;
                    TOTAL WITHDRAWN: ${fmt2(Number(pool?.totalWithdrawn ?? 0))}
                  </div>

                  {/* Split preview */}
                  <div className={styles.ownerSplit}>
                    <div className={styles.splitCard}>
                      <div className={styles.splitLabel}>OWNER 1 (60%)</div>
                      <div className={styles.splitPct}>60%</div>
                      <div className={styles.splitAmt}>${fmt2(o1Amt)}</div>
                    </div>
                    <div className={styles.splitCard}>
                      <div className={styles.splitLabel}>OWNER 2 (40%)</div>
                      <div className={styles.splitPct}>40%</div>
                      <div className={styles.splitAmt}>${fmt2(o2Amt)}</div>
                    </div>
                  </div>

                  {/* Pending request */}
                  {pending && (
                    <div className={styles.pendingBanner}>
                      <div className={styles.pendingTitle}>⏳ WITHDRAWAL PENDING APPROVAL</div>
                      <div className={styles.pendingInfo}>
                        AMOUNT: ${fmt2(Number(pending.amount))} USDC<br />
                        INITIATED BY: {pending.initiatorEmail}<br />
                        CREATED: {new Date(pending.createdAt).toLocaleString()}<br />
                        {isInitiator
                          ? "WAITING FOR THE OTHER OWNER TO APPROVE."
                          : "YOU MUST APPROVE THIS WITHDRAWAL TO EXECUTE IT."}
                      </div>
                    </div>
                  )}

                  {poolError && <div className={styles.errorMsg}>⚠ {poolError.toUpperCase()}</div>}

                  {/* Action buttons */}
                  <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
                    {!pending && (
                      <button
                        className={styles.btnFire}
                        onClick={initiateWithdrawal}
                        disabled={!!poolAction || balance <= 0}
                      >
                        {poolAction ?? "INITIATE WITHDRAWAL"}
                      </button>
                    )}
                    {canApprove && (
                      <button
                        className={styles.btnFire}
                        onClick={approveWithdrawal}
                        disabled={!!poolAction}
                      >
                        {poolAction ?? "✓ APPROVE & EXECUTE"}
                      </button>
                    )}
                    {pending && (
                      <button
                        className={styles.btnDanger}
                        onClick={cancelWithdrawal}
                        disabled={!!poolAction}
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                </div>

                {/* Withdrawal History */}
                {withdrawals.length > 0 && (
                  <div className={styles.panel}>
                    <div className={styles.panelTitle}>WITHDRAWAL HISTORY</div>
                    <table className={styles.txTable}>
                      <thead>
                        <tr>
                          <th>DATE</th>
                          <th>AMOUNT</th>
                          <th>INITIATED BY</th>
                          <th>APPROVED BY</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((w) => (
                          <tr key={w.id}>
                            <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                            <td style={{ color: "#27AE60" }}>${fmt2(Number(w.amount))}</td>
                            <td>{w.initiatorEmail}</td>
                            <td>{w.approverEmail ?? "—"}</td>
                            <td className={
                              w.status === "EXECUTED"  ? styles.statusExecuted  :
                              w.status === "PENDING"   ? styles.statusPending   :
                              styles.statusCancelled
                            }>{w.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ════════ BURN CONFIG ════════ */}
        {section === "burn" && (
          <>
            <div className={styles.pageTitle}>BURN CONFIG</div>
            <div className={styles.pageSub}>ADJUST BURN MECHANICS IN REAL TIME</div>

            {cfgLoading ? (
              <div style={{ color: "#444", fontSize: "10px", letterSpacing: "2px" }}>LOADING...</div>
            ) : (
              <>
                <div className={styles.configGrid}>
                  {/* Prize Probabilities */}
                  <div className={styles.configGroup}>
                    <div className={styles.configGroupTitle}>PRIZE PROBABILITIES</div>

                    {[
                      { key: "jackpot_prob", label: "JACKPOT PROB", min: 0.001, max: 0.05, step: 0.001, fmt: (v: number) => (v*100).toFixed(1)+"%" },
                      { key: "big_prob",     label: "BIG PRIZE CUMULATIVE",  min: 0.01, max: 0.10, step: 0.005, fmt: (v: number) => (v*100).toFixed(1)+"%" },
                      { key: "medium_prob",  label: "MEDIUM CUMULATIVE", min: 0.05, max: 0.30, step: 0.01,  fmt: (v: number) => (v*100).toFixed(1)+"%" },
                    ].map(({ key, label, min, max, step, fmt }) => (
                      <div className={styles.sliderRow} key={key}>
                        <div className={styles.sliderLabel}>
                          <span>{label}</span>
                          <span className={styles.sliderValue}>{fmt(cfg[key as keyof BurnConfig])}</span>
                        </div>
                        <input
                          type="range"
                          className={styles.slider}
                          min={min} max={max} step={step}
                          value={cfg[key as keyof BurnConfig]}
                          onChange={(e) => updateCfg(key as keyof BurnConfig, parseFloat(e.target.value))}
                        />
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"8px", color:"#333" }}>
                          <span>{(min*100).toFixed(1)}%</span><span>{(max*100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Prize Amounts */}
                  <div className={styles.configGroup}>
                    <div className={styles.configGroupTitle}>PRIZE AMOUNTS (USDC)</div>

                    {[
                      { key: "jackpot_amount", label: "JACKPOT", min: 500,  max: 10000, step: 100 },
                      { key: "big_amount",     label: "BIG",     min: 100,  max: 2000,  step: 50  },
                      { key: "medium_amount",  label: "MEDIUM",  min: 50,   max: 500,   step: 25  },
                      { key: "small_amount",   label: "SMALL",   min: 10,   max: 200,   step: 5   },
                    ].map(({ key, label, min, max, step }) => (
                      <div className={styles.sliderRow} key={key}>
                        <div className={styles.sliderLabel}>
                          <span>{label}</span>
                          <span className={styles.sliderValue}>${cfg[key as keyof BurnConfig]}</span>
                        </div>
                        <input
                          type="range"
                          className={styles.slider}
                          min={min} max={max} step={step}
                          value={cfg[key as keyof BurnConfig]}
                          onChange={(e) => updateCfg(key as keyof BurnConfig, parseFloat(e.target.value))}
                        />
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"8px", color:"#333" }}>
                          <span>${min}</span><span>${max}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ASH Rewards */}
                  <div className={styles.configGroup}>
                    <div className={styles.configGroupTitle}>ASH REWARDS ON LOSS</div>

                    {[
                      { key: "ash_reward_min", label: "MIN ASH", min: 50,   max: 1000, step: 10 },
                      { key: "ash_reward_max", label: "MAX ASH", min: 100,  max: 2000, step: 10 },
                    ].map(({ key, label, min, max, step }) => (
                      <div className={styles.sliderRow} key={key}>
                        <div className={styles.sliderLabel}>
                          <span>{label}</span>
                          <span className={styles.sliderValue}>{cfg[key as keyof BurnConfig]} ASH</span>
                        </div>
                        <input
                          type="range"
                          className={styles.slider}
                          min={min} max={max} step={step}
                          value={cfg[key as keyof BurnConfig]}
                          onChange={(e) => updateCfg(key as keyof BurnConfig, parseFloat(e.target.value))}
                        />
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"8px", color:"#333" }}>
                          <span>{min}</span><span>{max}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Game Balance */}
                  <div className={styles.configGroup}>
                    <div className={styles.configGroupTitle}>GAME BALANCE</div>

                    <div className={styles.sliderRow}>
                      <div className={styles.sliderLabel}>
                        <span>CONSTANT FACTOR (difficulty)</span>
                        <span className={styles.sliderValue}>{cfg.constant_factor}</span>
                      </div>
                      <input
                        type="range" className={styles.slider}
                        min={10} max={500} step={5}
                        value={cfg.constant_factor}
                        onChange={(e) => updateCfg("constant_factor", parseFloat(e.target.value))}
                      />
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"8px", color:"#333" }}>
                        <span>10 (easy)</span><span>500 (hard)</span>
                      </div>
                    </div>

                    <div className={styles.sliderRow}>
                      <div className={styles.sliderLabel}>
                        <span>REWARD POOL SPLIT</span>
                        <span className={styles.sliderValue}>{fmtPct(cfg.reward_pool_split)}</span>
                      </div>
                      <input
                        type="range" className={styles.slider}
                        min={0.1} max={0.9} step={0.05}
                        value={cfg.reward_pool_split}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateCfg("reward_pool_split", v);
                          updateCfg("profit_pool_split", parseFloat((1 - v).toFixed(2)));
                        }}
                      />
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"8px", color:"#333" }}>
                        <span>10% prizes</span><span>90% prizes</span>
                      </div>
                    </div>

                    <div style={{ fontSize:"9px", color:"#444", letterSpacing:"1px", marginTop:"8px" }}>
                      PROFIT SPLIT: {fmtPct(cfg.profit_pool_split)} (auto-calculated)
                    </div>

                    <div className={styles.sliderRow} style={{ marginTop:"16px" }}>
                      <div className={styles.sliderLabel}>
                        <span>REFERRAL COMMISSION</span>
                        <span className={styles.sliderValue}>{fmtPct(cfg.referral_commission)}</span>
                      </div>
                      <input
                        type="range" className={styles.slider}
                        min={0.01} max={0.20} step={0.01}
                        value={cfg.referral_commission}
                        onChange={(e) => updateCfg("referral_commission", parseFloat(e.target.value))}
                      />
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"8px", color:"#333" }}>
                        <span>1%</span><span>20%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* EV Calculator */}
                <div className={styles.evCalc}>
                  <div className={styles.evTitle}>EXPECTED VALUE CALCULATOR (per $4.99 burn)</div>
                  <div className={styles.evGrid}>
                    <div className={styles.evItem}>
                      <div className={styles.evLabel}>WIN PROBABILITY</div>
                      <div className={styles.evVal}>{ev.winProb.toFixed(3)}%</div>
                    </div>
                    <div className={styles.evItem}>
                      <div className={styles.evLabel}>EXPECTED USDC</div>
                      <div className={styles.evVal} style={{ color: ev.evUsdc >= 0 ? "#27AE60" : "#ff6b6b" }}>
                        ${fmt2(ev.evUsdc)}
                      </div>
                    </div>
                    <div className={styles.evItem}>
                      <div className={styles.evLabel}>EXPECTED ASH</div>
                      <div className={styles.evVal}>{ev.evAsh.toFixed(0)}</div>
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div style={{ marginTop: "24px", display: "flex", alignItems: "center" }}>
                  <button
                    className={styles.btnFire}
                    onClick={saveBurnConfig}
                    disabled={saving}
                  >
                    {saving ? "SAVING..." : "💾 SAVE CONFIGURATION"}
                  </button>
                  {saveMsg && (
                    <span className={saveMsg.startsWith("ERROR") ? styles.errorMsg : styles.saveMsg}>
                      {saveMsg}
                    </span>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ════════ STATS ════════ */}
        {section === "stats" && (
          <>
            <div className={styles.pageTitle}>PLATFORM STATS</div>
            <div className={styles.pageSub}>REAL-TIME OVERVIEW</div>

            {!stats ? (
              <div style={{ color: "#444", fontSize: "10px", letterSpacing: "2px" }}>LOADING...</div>
            ) : (
              <div className={styles.statsGrid}>
                {[
                  { label: "TOTAL USERS",       value: stats.totalUsers.toLocaleString(),               cls: "" },
                  { label: "TOTAL BURNS",        value: stats.totalBurns.toLocaleString(),               cls: styles.statValueFire },
                  { label: "ACTIVE VIPs",        value: stats.activeVips.toLocaleString(),               cls: styles.statValueGold },
                  { label: "TOTAL BURNED (USDC)", value: "$" + fmt2(stats.totalBurned),                 cls: styles.statValueFire },
                  { label: "REWARD POOL",        value: "$" + fmt2(stats.rewardPoolBalance),             cls: styles.statValueGreen },
                  { label: "PROFIT POOL",        value: "$" + fmt2(stats.profitPoolBalance),             cls: styles.statValueGreen },
                  { label: "PROFIT DEPOSITED",   value: "$" + fmt2(stats.profitPoolTotalDeposited),      cls: "" },
                  { label: "PROFIT WITHDRAWN",   value: "$" + fmt2(stats.profitPoolTotalWithdrawn),      cls: styles.statValueGold },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={styles.statCard}>
                    <div className={styles.statLabel}>{label}</div>
                    <div className={`${styles.statValue} ${cls}`}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

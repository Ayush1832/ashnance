"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./owner.module.css";

type Section = "pool" | "burn" | "rounds" | "stats" | "solvency";

const NAV: { key: Section; icon: string; label: string }[] = [
  { key: "pool",     icon: "💰", label: "PROFIT POOL"  },
  { key: "burn",     icon: "🔥", label: "BURN CONFIG"  },
  { key: "rounds",   icon: "🏆", label: "ROUNDS"       },
  { key: "stats",    icon: "📊", label: "STATS"        },
  { key: "solvency", icon: "🏦", label: "SOLVENCY"     },
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
  status: "PENDING" | "EXECUTED" | "CANCELLED" | "PARTIAL";
  owner1Wallet: string;
  owner2Wallet: string;
  owner1Amount: number;
  owner2Amount: number;
  createdAt: string;
  executedAt: string | null;
}

interface BurnConfig {
  ash_reward_percent: number;
  reward_pool_split: number;
  profit_pool_split: number;
  referral_commission: number;
  min_burn_amount: number;
  boost_cost_ash: number;
  prize_pool_target: number;
  vip_holy_fire_bonus: number;
  // Balance requirement configs (req #3, #4, #6, #7, #8)
  weight_cap: number;
  referral_weight_cap_pct: number;
  prize_safety_pct: number;
  round_time_limit_hours: number;
  anti_snipe_seconds: number;
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

interface Solvency {
  masterWallet: string;
  onChainUsdc: number;
  totalLiabilities: number;
  breakdown: {
    userBalances: number;
    rewardPool: number;
    profitPool: number;
  };
  surplus: number;
  ratio: number;
  solvent: boolean;
}

interface Round {
  id: string;
  roundNumber: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  prizePoolTarget: number;
  currentPool: number;
  winnerId: string | null;
  winner?: { username: string } | null;
  prizeAmount: number | null;
  startedAt: string;
  endedAt: string | null;
}

const DEFAULT_CONFIG: BurnConfig = {
  ash_reward_percent: 1.0,
  reward_pool_split: 0.5,
  profit_pool_split: 0.5,
  referral_commission: 0.1,
  min_burn_amount: 5.0,
  boost_cost_ash: 1000,
  prize_pool_target: 500,
  vip_holy_fire_bonus: 0.50,
  weight_cap: 300,
  referral_weight_cap_pct: 0.40,
  prize_safety_pct: 0.70,
  round_time_limit_hours: 24,
  anti_snipe_seconds: 10,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt2(n: number) { return n.toFixed(2); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

interface SimResult {
  burnAmount: number;
  weight: number;
  ashReward: number;
  rewardPoolShare: number;
  profitPoolShare: number;
  poolContributionPct: number;
}

function simulate(cfg: BurnConfig, burnAmount: number, vipBonus: number, boostBonus: number): SimResult {
  const baseUnit = 4.99;
  const weight = (burnAmount / baseUnit) + vipBonus + boostBonus;
  const ashReward = Math.floor((burnAmount * cfg.ash_reward_percent) / 0.01);
  const rewardPoolShare = burnAmount * cfg.reward_pool_split;
  const profitPoolShare = burnAmount * cfg.profit_pool_split;
  const poolContributionPct = (rewardPoolShare / cfg.prize_pool_target) * 100;
  return { burnAmount, weight, ashReward, rewardPoolShare, profitPoolShare, poolContributionPct };
}

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

  // Simulator state
  const [simAmount, setSimAmount] = useState("5");
  const [simVip,    setSimVip]    = useState<"none" | "HOLY_FIRE">("none");
  const [simBoost,  setSimBoost]  = useState(false);

  // Stats state
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [solvency,  setSolvency]  = useState<Solvency | null>(null);
  const [solvLoading, setSolvLoading] = useState(false);

  // Rounds state
  const [activeRound,   setActiveRound]   = useState<Round | null>(null);
  const [roundHistory,  setRoundHistory]  = useState<Round[]>([]);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [roundAction,   setRoundAction]   = useState<string | null>(null);
  const [roundError,    setRoundError]    = useState<string | null>(null);
  const [newTarget,     setNewTarget]     = useState("500");
  const [newTimeLimit,  setNewTimeLimit]  = useState("24"); // req #6: time limit in hours

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

  // ── Load solvency ───────────────────────────────────────────────────────
  const loadSolvency = useCallback(async () => {
    setSolvLoading(true);
    try {
      const res = (await api.owner.solvency()) as any;
      setSolvency(res.data ?? res);
    } catch { /* ignore */ } finally {
      setSolvLoading(false);
    }
  }, []);

  // ── Load rounds ─────────────────────────────────────────────────────────
  const loadRounds = useCallback(async () => {
    setRoundsLoading(true);
    setRoundError(null);
    try {
      const res = (await api.owner.rounds()) as any;
      const data = res.data ?? res;
      setActiveRound(data.active ?? null);
      setRoundHistory(data.history ?? data.rounds ?? []);
    } catch (e: any) {
      setRoundError(e.message ?? "Failed to load rounds");
    } finally {
      setRoundsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || denied) return;
    loadPool();
    loadBurnConfig();
    loadStats();
    loadSolvency();
  }, [ready, denied, loadPool, loadBurnConfig, loadStats, loadSolvency]);

  useEffect(() => {
    if (!ready || denied || section !== "rounds") return;
    loadRounds();
  }, [ready, denied, section, loadRounds]);

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

  async function handleCreateRound() {
    const target = parseFloat(newTarget);
    if (isNaN(target) || target < 1) return;
    const timeLimitHours = parseFloat(newTimeLimit);
    if (isNaN(timeLimitHours) || timeLimitHours <= 0) return;
    setRoundAction("Creating...");
    setRoundError(null);
    try {
      await api.owner.createRound(target, timeLimitHours);
      await loadRounds();
    } catch (e: any) {
      setRoundError(e.message ?? "Failed to create round");
    } finally { setRoundAction(null); }
  }

  async function handleEndRound() {
    if (!activeRound) return;
    setRoundAction("Ending...");
    setRoundError(null);
    try {
      await api.owner.endRound(activeRound.id);
      await loadRounds();
    } catch (e: any) {
      setRoundError(e.message ?? "Failed to end round");
    } finally { setRoundAction(null); }
  }

  async function handleCancelRound() {
    if (!activeRound) return;
    setRoundAction("Cancelling...");
    setRoundError(null);
    try {
      await api.owner.cancelRound(activeRound.id);
      await loadRounds();
    } catch (e: any) {
      setRoundError(e.message ?? "Failed to cancel round");
    } finally { setRoundAction(null); }
  }

  function handleLogout() {
    api.clearToken();
    router.replace("/owner-login");
  }

  // ── Render guards ──────────────────────────────────────────────────────
  if (!ready) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "24px", height: "24px", border: "2px solid rgba(255,77,0,0.3)", borderTopColor: "#FF4D00", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

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

  const balance = Number(pool?.balance ?? 0);
  const o1Amt = balance * 0.6;
  const o2Amt = balance * 0.4;
  const isInitiator = pending?.initiatorEmail === ownerEmail;
  const canApprove  = !!pending && !isInitiator;

  return (
    <div className={styles.layout}>
      {/* ── SIDEBAR ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <img src="/logo-horizontal.png" alt="Ashnance" style={{ width: "130px", height: "auto" }} />
        </div>
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
                              w.status === "PARTIAL"   ? styles.statusPartial   :
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
            <div className={styles.pageSub}>CHANGE HOW BURNS WORK — TAKES EFFECT IMMEDIATELY AFTER SAVE</div>

            {cfgLoading ? (
              <div style={{ color: "#444", fontSize: "10px", letterSpacing: "2px" }}>LOADING...</div>
            ) : (
              <>
                {/* ASH REWARDS */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>🪙 ASH REWARDS (earned on every burn)</div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                      ASH Reward % of Burn Value
                      <span style={{ color: "#333", marginLeft: "8px" }}>
                        1.0 = 100% — burn $1 → earn 100 ASH ($1 at $0.01/ASH)
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="number" step={0.1} min={0} max={2}
                        value={cfg.ash_reward_percent}
                        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateCfg("ash_reward_percent", v); }}
                        style={{
                          width: "120px", background: "#0a0a0a",
                          border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px",
                          color: "#fff", padding: "10px 12px",
                          fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px",
                        }}
                      />
                      <span style={{ fontSize: "10px", color: "#888", letterSpacing: "1px" }}>
                        = {Math.floor((1 * cfg.ash_reward_percent) / 0.01)} ASH per $1 burned
                      </span>
                    </div>
                  </div>
                </div>

                {/* GAME BALANCE */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>⚖️ GAME BALANCE</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Reward Pool % (from each burn)
                        <span style={{ color: "#333", marginLeft: "8px" }}>Rest goes to profit pool. e.g. 50 = 50%</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={5} min={10} max={90}
                          value={Math.round(cfg.reward_pool_split * 100)}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) / 100;
                            if (!isNaN(v) && v >= 0.1 && v <= 0.9) {
                              updateCfg("reward_pool_split", v);
                              updateCfg("profit_pool_split", parseFloat((1 - v).toFixed(2)));
                            }
                          }}
                          style={{
                            flex: 1, background: "#0a0a0a",
                            border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px",
                            color: "#fff", padding: "10px 12px",
                            fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px",
                          }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "32px" }}>%</span>
                      </div>
                      <div style={{ fontSize: "8px", color: "#444", marginTop: "4px", letterSpacing: "1px" }}>
                        Profit pool gets: {Math.round(cfg.profit_pool_split * 100)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Referral Commission %
                        <span style={{ color: "#333", marginLeft: "8px" }}>% of burn paid to referrer. e.g. 10 = 10%</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={1} min={0} max={20}
                          value={Math.round(cfg.referral_commission * 100)}
                          onChange={(e) => { const v = parseFloat(e.target.value) / 100; if (!isNaN(v)) updateCfg("referral_commission", v); }}
                          style={{
                            flex: 1, background: "#0a0a0a",
                            border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px",
                            color: "#fff", padding: "10px 12px",
                            fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px",
                          }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "32px" }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BURN RULES */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>🔧 BURN RULES</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Min Burn Amount (USDC)
                        <span style={{ color: "#333", marginLeft: "8px" }}>Smallest allowed burn (entry fee)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={0.01} min={1}
                          value={cfg.min_burn_amount}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) updateCfg("min_burn_amount", v); }}
                          style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "36px" }}>USDC</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        ASH Boost Cost
                        <span style={{ color: "#333", marginLeft: "8px" }}>ASH burned to activate 1-hour boost</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={100} min={0}
                          value={cfg.boost_cost_ash}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateCfg("boost_cost_ash", v); }}
                          style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "36px" }}>ASH</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Default Prize Pool Target
                        <span style={{ color: "#333", marginLeft: "8px" }}>Round ends when pool hits this amount</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={50} min={10}
                          value={cfg.prize_pool_target}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) updateCfg("prize_pool_target", v); }}
                          style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "36px" }}>USDC</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VIP BONUSES */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>👑 VIP WEIGHT BONUS</div>
                  <div style={{ fontSize: "9px", color: "#555", letterSpacing: "1px", marginBottom: "16px" }}>
                    Added to base weight on every burn — higher weight = better leaderboard rank
                  </div>
                  <div style={{ maxWidth: "240px" }}>
                    <div style={{ fontSize: "9px", color: "#FFB800", letterSpacing: "1px", marginBottom: "6px" }}>💎 HOLY FIRE</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="number" step={0.05} min={0} max={2}
                        value={cfg.vip_holy_fire_bonus}
                        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateCfg("vip_holy_fire_bonus", v); }}
                        style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                      />
                      <span style={{ fontSize: "10px", color: "#555" }}>+{(cfg.vip_holy_fire_bonus * 100).toFixed(0)}% weight</span>
                    </div>
                    <div style={{ fontSize: "8px", color: "#444", marginTop: "4px", letterSpacing: "1px" }}>
                      Also grants +20% ASH on every burn (hardcoded)
                    </div>
                  </div>
                </div>

                {/* BALANCE RULES — req #3, #4, #6, #7, #8 */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>⚖️ BALANCE RULES</div>
                  <div style={{ fontSize: "9px", color: "#555", letterSpacing: "1px", marginBottom: "16px" }}>
                    FAIRNESS AND ANTI-DOMINATION SETTINGS — CHANGE WITH CARE
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    {/* req #3 — Weight Cap */}
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Weight Cap <span style={{ color: "#FF4D00" }}>(req #3)</span>
                        <span style={{ color: "#333", marginLeft: "8px" }}>Max effective weight; diminishing returns above this</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={10} min={50}
                          value={cfg.weight_cap}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) updateCfg("weight_cap", v); }}
                          style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "36px" }}>max</span>
                      </div>
                    </div>
                    {/* req #4 — Referral Cap */}
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Referral Weight Cap % <span style={{ color: "#FF4D00" }}>(req #4)</span>
                        <span style={{ color: "#333", marginLeft: "8px" }}>Max % of total weight from referral bonus</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={5} min={0} max={80}
                          value={Math.round(cfg.referral_weight_cap_pct * 100)}
                          onChange={(e) => { const v = parseFloat(e.target.value) / 100; if (!isNaN(v) && v >= 0 && v < 1) updateCfg("referral_weight_cap_pct", v); }}
                          style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "36px" }}>%</span>
                      </div>
                    </div>
                    {/* req #7 — Prize Safety Limit */}
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Prize Safety Limit % <span style={{ color: "#FF4D00" }}>(req #7)</span>
                        <span style={{ color: "#333", marginLeft: "8px" }}>Max prize as % of reward pool balance</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={5} min={10} max={100}
                          value={Math.round(cfg.prize_safety_pct * 100)}
                          onChange={(e) => { const v = parseFloat(e.target.value) / 100; if (!isNaN(v) && v > 0 && v <= 1) updateCfg("prize_safety_pct", v); }}
                          style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "36px" }}>%</span>
                      </div>
                    </div>
                    {/* req #6 — Default Round Time Limit */}
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Default Round Time Limit <span style={{ color: "#FF4D00" }}>(req #6)</span>
                        <span style={{ color: "#333", marginLeft: "8px" }}>Hours before round auto-ends (0 = no limit)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={1} min={0}
                          value={cfg.round_time_limit_hours}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) updateCfg("round_time_limit_hours", v); }}
                          style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "36px" }}>hours</span>
                      </div>
                    </div>
                    {/* req #8 — Anti-Snipe Seconds */}
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Anti-Snipe Hold (seconds) <span style={{ color: "#FF4D00" }}>(req #8)</span>
                        <span style={{ color: "#333", marginLeft: "8px" }}>Rank #1 must hold position this long before winning</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={1} min={0}
                          value={cfg.anti_snipe_seconds}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) updateCfg("anti_snipe_seconds", v); }}
                          style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                        />
                        <span style={{ fontSize: "10px", color: "#555", minWidth: "36px" }}>secs</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
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

                {/* ── BURN SIMULATOR ── */}
                {(() => {
                  const vipBonusVal = simVip === "HOLY_FIRE" ? cfg.vip_holy_fire_bonus : 0;
                  const boostBonusVal = simBoost ? 0.50 : 0;
                  const burnAmt = parseFloat(simAmount) || 0;
                  const sim = burnAmt >= cfg.min_burn_amount
                    ? simulate(cfg, burnAmt, vipBonusVal, boostBonusVal)
                    : null;

                  return (
                    <div className={styles.panel} style={{ marginTop: "32px", borderColor: "rgba(255,184,0,0.25)" }}>
                      <div className={styles.panelTitle} style={{ color: "#FFB800" }}>🎲 BURN SIMULATOR</div>
                      <div style={{ fontSize: "9px", color: "#555", letterSpacing: "1px", marginBottom: "20px" }}>
                        TEST ANY BURN AMOUNT WITH THE CURRENT CONFIG TO SEE EXACT WEIGHT AND RETURNS
                      </div>

                      {/* Inputs */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                        <div>
                          <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>BURN AMOUNT (USDC)</div>
                          <input
                            type="number" min={cfg.min_burn_amount} step="1"
                            value={simAmount}
                            onChange={(e) => setSimAmount(e.target.value)}
                            style={{
                              width: "100%", boxSizing: "border-box",
                              background: "#0a0a0a", border: "1px solid rgba(255,184,0,0.3)",
                              borderRadius: "4px", color: "#FFB800", padding: "10px 12px",
                              fontFamily: "inherit", fontSize: "16px", letterSpacing: "1px",
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>VIP TIER</div>
                          <select
                            value={simVip}
                            onChange={(e) => setSimVip(e.target.value as typeof simVip)}
                            style={{
                              width: "100%", background: "#0a0a0a",
                              border: "1px solid rgba(255,184,0,0.3)", borderRadius: "4px",
                              color: "#fff", padding: "10px 12px",
                              fontFamily: "inherit", fontSize: "12px", letterSpacing: "1px",
                            }}
                          >
                            <option value="none">None (+0.0 weight)</option>
                            <option value="HOLY_FIRE">Holy Fire (+{cfg.vip_holy_fire_bonus.toFixed(2)} weight)</option>
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>ASH BOOST</div>
                          <button
                            onClick={() => setSimBoost(!simBoost)}
                            style={{
                              width: "100%", padding: "10px 12px",
                              background: simBoost ? "rgba(255,77,0,0.2)" : "#0a0a0a",
                              border: `1px solid ${simBoost ? "rgba(255,77,0,0.5)" : "rgba(255,184,0,0.3)"}`,
                              borderRadius: "4px", color: simBoost ? "#FF4D00" : "#555",
                              fontFamily: "inherit", fontSize: "12px", letterSpacing: "2px", cursor: "pointer",
                            }}
                          >
                            {simBoost ? "ON (+0.50 weight)" : "OFF"}
                          </button>
                        </div>
                      </div>

                      {burnAmt < cfg.min_burn_amount && (
                        <div style={{ fontSize: "10px", color: "#555", letterSpacing: "1px" }}>
                          Enter at least ${cfg.min_burn_amount.toFixed(2)} to simulate.
                        </div>
                      )}

                      {sim && (
                        <>
                          {/* Weight & outcomes */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                            {[
                              { label: "WEIGHT EARNED",     value: sim.weight.toFixed(2) + "x",                 color: "#FF4D00" },
                              { label: "ASH REWARD",        value: sim.ashReward.toLocaleString() + " ASH",     color: "#FFB800" },
                              { label: "→ REWARD POOL",     value: "$" + fmt2(sim.rewardPoolShare),             color: "#27AE60" },
                              { label: "→ PROFIT POOL",     value: "$" + fmt2(sim.profitPoolShare),             color: "#aaa" },
                            ].map(({ label, value, color }) => (
                              <div key={label} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "14px 16px" }}>
                                <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "6px" }}>{label}</div>
                                <div style={{ fontSize: "18px", color }}>{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Pool contribution */}
                          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "14px 16px" }}>
                            <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "8px" }}>
                              ROUND POOL CONTRIBUTION — at ${fmt2(cfg.prize_pool_target)} target
                            </div>
                            <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", marginBottom: "6px" }}>
                              <div style={{ height: "100%", width: `${Math.min(100, sim.poolContributionPct)}%`, background: "#FF4D00", borderRadius: "3px" }} />
                            </div>
                            <div style={{ fontSize: "10px", color: "#FF4D00" }}>
                              {sim.poolContributionPct.toFixed(2)}% of prize pool target per burn
                            </div>
                            <div style={{ fontSize: "8px", color: "#333", marginTop: "4px" }}>
                              {fmtPct(cfg.reward_pool_split)} of burn → round pool &nbsp;•&nbsp;
                              every burn earns ASH regardless of outcome
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}

        {/* ════════ ROUNDS ════════ */}
        {section === "rounds" && (
          <>
            <div className={styles.pageTitle}>ROUND MANAGEMENT</div>
            <div className={styles.pageSub}>CREATE ROUNDS AND PAY OUT WINNERS — WINNER = #1 BY WEIGHT WHEN POOL HITS TARGET</div>

            {roundsLoading ? (
              <div style={{ color: "#444", fontSize: "10px", letterSpacing: "2px" }}>LOADING...</div>
            ) : (
              <>
                {/* Active Round */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>
                    {activeRound ? `🟢 ROUND #${activeRound.roundNumber} — ACTIVE` : "⭕ NO ACTIVE ROUND"}
                  </div>

                  {activeRound ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
                        {[
                          { label: "CURRENT POOL",  value: "$" + fmt2(Number(activeRound.currentPool)),      color: "#27AE60" },
                          { label: "TARGET",         value: "$" + fmt2(Number(activeRound.prizePoolTarget)),  color: "#FFB800" },
                          { label: "STARTED",        value: new Date(activeRound.startedAt).toLocaleDateString(), color: "#aaa" },
                          {
                            label: "AUTO-ENDS",
                            value: (activeRound as any).endsAt
                              ? new Date((activeRound as any).endsAt).toLocaleString()
                              : "NO LIMIT",
                            color: (activeRound as any).endsAt ? "#FF4D00" : "#444",
                          },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "14px 16px" }}>
                            <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "6px" }}>{label}</div>
                            <div style={{ fontSize: "18px", color }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "6px" }}>
                          <span>POOL PROGRESS</span>
                          <span>{((Number(activeRound.currentPool) / Number(activeRound.prizePoolTarget)) * 100).toFixed(1)}%</span>
                        </div>
                        <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min(100, (Number(activeRound.currentPool) / Number(activeRound.prizePoolTarget)) * 100)}%`,
                            background: "linear-gradient(90deg, #FF4D00, #FFB800)",
                            borderRadius: "4px",
                            transition: "width 0.3s ease",
                          }} />
                        </div>
                      </div>

                      {roundError && <div className={styles.errorMsg}>⚠ {roundError.toUpperCase()}</div>}

                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <button
                          className={styles.btnFire}
                          onClick={handleEndRound}
                          disabled={!!roundAction}
                        >
                          {roundAction === "Ending..." ? "ENDING..." : "🏆 END ROUND & PAY WINNER"}
                        </button>
                        <button
                          className={styles.btnDanger}
                          onClick={handleCancelRound}
                          disabled={!!roundAction}
                        >
                          {roundAction === "Cancelling..." ? "CANCELLING..." : "✕ CANCEL (NO PAYOUT)"}
                        </button>
                      </div>
                      <div style={{ fontSize: "8px", color: "#333", marginTop: "10px", letterSpacing: "1px" }}>
                        END ROUND: pays the full pool to the #1 leaderboard user now. CANCEL: emergency only — no prize paid.
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "9px", color: "#555", letterSpacing: "1px", marginBottom: "20px" }}>
                        No active round. Create one to start accepting pool contributions from burns.
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>PRIZE POOL TARGET (USDC)</div>
                          <input
                            type="number" step={50} min={10}
                            value={newTarget}
                            onChange={(e) => setNewTarget(e.target.value)}
                            style={{
                              background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)",
                              borderRadius: "4px", color: "#fff", padding: "10px 14px",
                              fontFamily: "inherit", fontSize: "16px", letterSpacing: "1px", width: "140px",
                            }}
                          />
                        </div>
                        {/* req #6 — Time limit */}
                        <div>
                          <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                            TIME LIMIT (HOURS) <span style={{ color: "#FF4D00" }}>(req #6)</span>
                          </div>
                          <input
                            type="number" step={1} min={1}
                            value={newTimeLimit}
                            onChange={(e) => setNewTimeLimit(e.target.value)}
                            style={{
                              background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)",
                              borderRadius: "4px", color: "#fff", padding: "10px 14px",
                              fontFamily: "inherit", fontSize: "16px", letterSpacing: "1px", width: "100px",
                            }}
                          />
                        </div>
                        <button
                          className={styles.btnFire}
                          style={{ alignSelf: "flex-end" }}
                          onClick={handleCreateRound}
                          disabled={!!roundAction || parseFloat(newTarget) < 1 || parseFloat(newTimeLimit) <= 0}
                        >
                          {roundAction === "Creating..." ? "CREATING..." : "🏆 CREATE ROUND"}
                        </button>
                      </div>

                      {roundError && <div className={styles.errorMsg} style={{ marginTop: "12px" }}>⚠ {roundError.toUpperCase()}</div>}
                    </>
                  )}
                </div>

                {/* Round History */}
                {roundHistory.length > 0 && (
                  <div className={styles.panel}>
                    <div className={styles.panelTitle}>ROUND HISTORY</div>
                    <table className={styles.txTable}>
                      <thead>
                        <tr>
                          <th>ROUND</th>
                          <th>STATUS</th>
                          <th>PRIZE TARGET</th>
                          <th>FINAL POOL</th>
                          <th>WINNER</th>
                          <th>PRIZE PAID</th>
                          <th>ENDED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roundHistory.map((r) => (
                          <tr key={r.id}>
                            <td style={{ color: "#FFB800" }}>#{r.roundNumber}</td>
                            <td className={
                              r.status === "COMPLETED"  ? styles.statusExecuted  :
                              r.status === "ACTIVE"     ? styles.statusPending   :
                              styles.statusCancelled
                            }>{r.status}</td>
                            <td>${fmt2(Number(r.prizePoolTarget))}</td>
                            <td style={{ color: "#27AE60" }}>${fmt2(Number(r.currentPool))}</td>
                            <td>{r.winner?.username ?? (r.winnerId ? r.winnerId.slice(0, 8) + "..." : "—")}</td>
                            <td style={{ color: r.prizeAmount ? "#27AE60" : "#444" }}>
                              {r.prizeAmount ? "$" + fmt2(Number(r.prizeAmount)) : "—"}
                            </td>
                            <td>{r.endedAt ? new Date(r.endedAt).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {roundHistory.length === 0 && !activeRound && !roundsLoading && (
                  <div style={{ color: "#333", fontSize: "9px", letterSpacing: "2px", marginTop: "12px" }}>NO ROUND HISTORY YET</div>
                )}
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

        {/* ════════ SOLVENCY ════════ */}
        {section === "solvency" && (
          <>
            <div className={styles.pageTitle}>SOLVENCY CHECK</div>
            <div className={styles.pageSub}>MASTER WALLET vs. TOTAL PLATFORM LIABILITIES</div>

            <button
              className="btn btn-ghost"
              style={{ marginBottom: "24px", fontSize: "10px" }}
              onClick={loadSolvency}
              disabled={solvLoading}
            >
              {solvLoading ? "FETCHING..." : "↻ REFRESH"}
            </button>

            {solvLoading && !solvency ? (
              <div style={{ color: "#444", fontSize: "10px", letterSpacing: "2px" }}>LOADING...</div>
            ) : solvency ? (
              <>
                {/* Status banner */}
                <div style={{
                  padding: "16px 20px",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  background: solvency.solvent ? "rgba(74,222,128,0.08)" : "rgba(255,77,0,0.12)",
                  border: `1px solid ${solvency.solvent ? "rgba(74,222,128,0.3)" : "rgba(255,77,0,0.4)"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}>
                  <span style={{ fontSize: "28px" }}>{solvency.solvent ? "✅" : "🚨"}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", letterSpacing: "2px", color: solvency.solvent ? "#4ade80" : "#FF4D00" }}>
                      {solvency.solvent ? "SOLVENT" : "UNDERFUNDED"}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px", marginTop: "4px" }}>
                      {solvency.solvent
                        ? `SURPLUS: $${solvency.surplus.toFixed(2)} USDC — MASTER WALLET IS ADEQUATELY FUNDED`
                        : `SHORTFALL: $${Math.abs(solvency.surplus).toFixed(2)} USDC — TOP UP MASTER WALLET IMMEDIATELY`}
                    </div>
                  </div>
                </div>

                {/* Numbers grid */}
                <div className={styles.statsGrid}>
                  {[
                    { label: "ON-CHAIN BALANCE",   value: "$" + solvency.onChainUsdc.toFixed(2),          cls: solvency.solvent ? styles.statValueGreen : styles.statValueFire, hint: "Actual USDC in master wallet" },
                    { label: "TOTAL LIABILITIES",  value: "$" + solvency.totalLiabilities.toFixed(2),     cls: "",                                                               hint: "Sum of all obligations" },
                    { label: "SURPLUS / SHORTFALL", value: (solvency.surplus >= 0 ? "+" : "") + "$" + solvency.surplus.toFixed(2), cls: solvency.surplus >= 0 ? styles.statValueGreen : styles.statValueFire, hint: "On-chain minus liabilities" },
                    { label: "COVERAGE RATIO",     value: (solvency.ratio * 100).toFixed(1) + "%",        cls: solvency.ratio >= 1 ? styles.statValueGreen : styles.statValueFire, hint: "100%+ = fully funded" },
                    { label: "USER BALANCES",      value: "$" + solvency.breakdown.userBalances.toFixed(2), cls: "",                                                              hint: "Sum of all user USDC ledger balances" },
                    { label: "REWARD POOL",        value: "$" + solvency.breakdown.rewardPool.toFixed(2),  cls: "",                                                              hint: "Prize pot" },
                    { label: "PROFIT POOL",        value: "$" + solvency.breakdown.profitPool.toFixed(2),  cls: styles.statValueGold,                                            hint: "Owners' accumulated profit" },
                  ].map(({ label, value, cls, hint }) => (
                    <div key={label} className={styles.statCard}>
                      <div className={styles.statLabel}>{label}</div>
                      <div className={`${styles.statValue} ${cls}`}>{value}</div>
                      <div style={{ fontSize: "8px", color: "#333", letterSpacing: "1px", marginTop: "4px" }}>{hint}</div>
                    </div>
                  ))}
                </div>

                {/* Master wallet address */}
                <div style={{ marginTop: "24px", padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "8px", color: "#333", letterSpacing: "2px", marginBottom: "6px" }}>MASTER WALLET ADDRESS</div>
                  <div style={{ fontSize: "11px", color: "#555", fontFamily: "monospace", letterSpacing: "0.5px", wordBreak: "break-all" }}>
                    {solvency.masterWallet}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: "#444", fontSize: "10px", letterSpacing: "2px" }}>FAILED TO LOAD — CHECK BACKEND CONNECTION</div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

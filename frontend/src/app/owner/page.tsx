"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./owner.module.css";

type Section = "pool" | "burn" | "stats" | "solvency";

const NAV: { key: Section; icon: string; label: string }[] = [
  { key: "pool",     icon: "💰", label: "PROFIT POOL"  },
  { key: "burn",     icon: "🔥", label: "BURN CONFIG"  },
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
  jackpot_prob: number;
  jackpot_amount: number;
  big_prob: number;
  big_amount: number;
  medium_prob: number;
  medium_amount: number;
  small_amount: number;
  ash_reward_percent: number;
  constant_factor: number;
  reward_pool_split: number;
  profit_pool_split: number;
  referral_commission: number;
  min_burn_amount: number;
  boost_cost_ash: number;
  vip_spark_bonus: number;
  vip_active_ash_bonus: number;
  vip_holy_fire_bonus: number;
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

const DEFAULT_CONFIG: BurnConfig = {
  jackpot_prob: 0.01, jackpot_amount: 2500,
  big_prob: 0.05,     big_amount: 500,
  medium_prob: 0.20,  medium_amount: 200,
  small_amount: 50,
  ash_reward_percent: 1.0,
  constant_factor: 100,
  reward_pool_split: 0.5, profit_pool_split: 0.5,
  referral_commission: 0.1,
  min_burn_amount: 4.99,
  boost_cost_ash: 1000,
  vip_spark_bonus: 0.10,
  vip_active_ash_bonus: 0.25,
  vip_holy_fire_bonus: 0.50,
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
  // ASH on loss: ash_reward_percent of burn value at $0.01/ASH
  const ashOnLose = (4.99 * cfg.ash_reward_percent) / 0.01;
  const evAsh = (1 - winProb) * ashOnLose;

  return { winProb: winProb * 100, evUsdc, evAsh };
}

function fmt2(n: number) { return n.toFixed(2); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

interface SimResult {
  burnAmount: number;
  weight: number;
  winChance: number;
  loseChance: number;
  rewardPoolShare: number;
  profitPoolShare: number;
  // on win
  jackpotChance: number; jackpotPrize: number;
  bigChance: number;     bigPrize: number;
  mediumChance: number;  mediumPrize: number;
  smallChance: number;   smallPrize: number;
  // on lose
  ashOnLose: number; // exact ASH tokens awarded
  // expected
  evUsdc: number; evAsh: number;
}

function simulate(cfg: BurnConfig, burnAmount: number, vipBonus: number, boostBonus: number): SimResult {
  const weight = (burnAmount / cfg.min_burn_amount) + vipBonus + boostBonus;
  const winChance = weight / (weight + cfg.constant_factor);
  const loseChance = 1 - winChance;

  const rewardPoolShare = burnAmount * cfg.reward_pool_split;
  const profitPoolShare = burnAmount * cfg.profit_pool_split;

  const jackpotChance = winChance * cfg.jackpot_prob;
  const bigChance     = winChance * (cfg.big_prob - cfg.jackpot_prob);
  const mediumChance  = winChance * (cfg.medium_prob - cfg.big_prob);
  const smallChance   = winChance * (1 - cfg.medium_prob);

  const evUsdc =
    jackpotChance * cfg.jackpot_amount +
    bigChance     * cfg.big_amount +
    mediumChance  * cfg.medium_amount +
    smallChance   * cfg.small_amount -
    burnAmount;

  const ashOnLose = Math.floor((burnAmount * cfg.ash_reward_percent) / 0.01);
  const evAsh = loseChance * ashOnLose;

  return {
    burnAmount, weight, winChance, loseChance,
    rewardPoolShare, profitPoolShare,
    jackpotChance, jackpotPrize: cfg.jackpot_amount,
    bigChance,     bigPrize:     cfg.big_amount,
    mediumChance,  mediumPrize:  cfg.medium_amount,
    smallChance,   smallPrize:   cfg.small_amount,
    ashOnLose,
    evUsdc, evAsh,
  };
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
  const [simAmount, setSimAmount] = useState("4.99");
  const [simVip,    setSimVip]    = useState<"none"|"SPARK"|"ACTIVE_ASH"|"HOLY_FIRE">("none");
  const [simBoost,  setSimBoost]  = useState(false);

  // Stats state
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [solvency,  setSolvency]  = useState<Solvency | null>(null);
  const [solvLoading, setSolvLoading] = useState(false);

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

  useEffect(() => {
    if (!ready || denied) return;
    loadPool();
    loadBurnConfig();
    loadStats();
    loadSolvency();
  }, [ready, denied, loadPool, loadBurnConfig, loadStats, loadSolvency]);

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
                {/* PRIZE SECTION */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>💎 PRIZES</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    {[
                      { key: "jackpot_amount", label: "💎 Jackpot Prize", unit: "USDC", hint: "Amount winner receives for jackpot" },
                      { key: "jackpot_prob",   label: "💎 Jackpot Chance", unit: "%",   hint: "e.g. 1 = 1% chance", multiplier: 100, decimals: 2 },
                      { key: "big_amount",     label: "🔥 Big Prize",      unit: "USDC", hint: "Amount for big prize" },
                      { key: "big_prob",       label: "🔥 Big Chance",     unit: "%",   hint: "Cumulative e.g. 5 = 5%", multiplier: 100, decimals: 2 },
                      { key: "medium_amount",  label: "✨ Medium Prize",   unit: "USDC", hint: "Amount for medium prize" },
                      { key: "medium_prob",    label: "✨ Medium Chance",  unit: "%",   hint: "Cumulative e.g. 20 = 20%", multiplier: 100, decimals: 1 },
                      { key: "small_amount",   label: "⚡ Small Prize",    unit: "USDC", hint: "Amount for small prize" },
                    ].map(({ key, label, unit, hint, multiplier = 1, decimals = 0 }) => {
                      const raw = cfg[key as keyof BurnConfig];
                      const display = raw * multiplier;
                      return (
                        <div key={key}>
                          <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                            {label}
                            <span style={{ color: "#333", marginLeft: "8px" }}>{hint}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="number"
                              step={decimals > 0 ? 0.01 : 1}
                              min={0}
                              value={parseFloat(display.toFixed(decimals))}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value) / multiplier;
                                if (!isNaN(v)) updateCfg(key as keyof BurnConfig, v);
                              }}
                              style={{
                                flex: 1, background: "#0a0a0a",
                                border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px",
                                color: "#fff", padding: "10px 12px",
                                fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px",
                              }}
                            />
                            <span style={{ fontSize: "10px", color: "#555", letterSpacing: "1px", minWidth: "32px" }}>{unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ASH REWARDS */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>🪙 ASH REWARDS (given when user loses)</div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                      ASH Reward % of Burn Value
                      <span style={{ color: "#333", marginLeft: "8px" }}>
                        1.0 = 100% — burn $1 → lose → 100 ASH ($1 at $0.01/ASH)
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
                        Win Difficulty (Constant Factor)
                        <span style={{ color: "#333", marginLeft: "8px" }}>Higher = harder to win. Default 100</span>
                      </div>
                      <input
                        type="number" step={5} min={1}
                        value={cfg.constant_factor}
                        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateCfg("constant_factor", v); }}
                        style={{
                          width: "100%", boxSizing: "border-box", background: "#0a0a0a",
                          border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px",
                          color: "#fff", padding: "10px 12px",
                          fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px",
                        }}
                      />
                    </div>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div>
                      <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>
                        Min Burn Amount (USDC)
                        <span style={{ color: "#333", marginLeft: "8px" }}>Smallest allowed burn</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number" step={0.01} min={0.01}
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
                        <span style={{ color: "#333", marginLeft: "8px" }}>ASH tokens burned to activate boost</span>
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
                  </div>
                </div>

                {/* VIP BONUSES */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>👑 VIP WEIGHT BONUSES</div>
                  <div style={{ fontSize: "9px", color: "#555", letterSpacing: "1px", marginBottom: "16px" }}>
                    Added to base weight — higher weight = better win chance
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    {([
                      { key: "vip_spark_bonus",      label: "⚡ SPARK",       color: "#aaa" },
                      { key: "vip_active_ash_bonus",  label: "🔥 ACTIVE ASH",  color: "#FF4D00" },
                      { key: "vip_holy_fire_bonus",   label: "💎 HOLY FIRE",   color: "#FFB800" },
                    ] as { key: keyof BurnConfig; label: string; color: string }[]).map(({ key, label, color }) => (
                      <div key={key}>
                        <div style={{ fontSize: "9px", color, letterSpacing: "1px", marginBottom: "6px" }}>{label}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="number" step={0.05} min={0} max={2}
                            value={cfg[key]}
                            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateCfg(key, v); }}
                            style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px", color: "#fff", padding: "10px 12px", fontFamily: "inherit", fontSize: "14px", letterSpacing: "1px" }}
                          />
                          <span style={{ fontSize: "10px", color: "#555" }}>+{(cfg[key] as number * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* EV Preview */}
                <div className={styles.evCalc}>
                  <div className={styles.evTitle}>LIVE PREVIEW — for a $4.99 burn at default weight (1.0x)</div>
                  <div className={styles.evGrid}>
                    <div className={styles.evItem}>
                      <div className={styles.evLabel}>WIN PROBABILITY</div>
                      <div className={styles.evVal}>{ev.winProb.toFixed(3)}%</div>
                    </div>
                    <div className={styles.evItem}>
                      <div className={styles.evLabel}>EXPECTED USDC VALUE</div>
                      <div className={styles.evVal} style={{ color: ev.evUsdc >= 0 ? "#27AE60" : "#ff6b6b" }}>
                        ${fmt2(ev.evUsdc)}
                      </div>
                    </div>
                    <div className={styles.evItem}>
                      <div className={styles.evLabel}>EXPECTED ASH (on loss)</div>
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

                {/* ── BURN SIMULATOR ── */}
                {(() => {
                  const vipBonusMap = { none: 0, SPARK: cfg.vip_spark_bonus, ACTIVE_ASH: cfg.vip_active_ash_bonus, HOLY_FIRE: cfg.vip_holy_fire_bonus };
                  const boostBonusVal = simBoost ? 0.50 : 0;
                  const burnAmt = parseFloat(simAmount) || 0;
                  const sim = burnAmt >= cfg.min_burn_amount
                    ? simulate(cfg, burnAmt, vipBonusMap[simVip], boostBonusVal)
                    : null;

                  return (
                    <div className={styles.panel} style={{ marginTop: "32px", borderColor: "rgba(255,184,0,0.25)" }}>
                      <div className={styles.panelTitle} style={{ color: "#FFB800" }}>🎲 BURN SIMULATOR</div>
                      <div style={{ fontSize: "9px", color: "#555", letterSpacing: "1px", marginBottom: "20px" }}>
                        TEST ANY BURN AMOUNT WITH THE CURRENT CONFIG TO SEE EXACT PROBABILITIES AND RETURNS
                      </div>

                      {/* Inputs */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                        <div>
                          <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "6px" }}>BURN AMOUNT (USDC)</div>
                          <input
                            type="number" min="4.99" step="0.01"
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
                            <option value="none">None (+0.0x)</option>
                            <option value="SPARK">Spark (+{cfg.vip_spark_bonus.toFixed(2)}x)</option>
                            <option value="ACTIVE_ASH">Active Ash (+{cfg.vip_active_ash_bonus.toFixed(2)}x)</option>
                            <option value="HOLY_FIRE">Holy Fire (+{cfg.vip_holy_fire_bonus.toFixed(2)}x)</option>
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
                            {simBoost ? "ON (+0.50x)" : "OFF"}
                          </button>
                        </div>
                      </div>

                      {burnAmt < 4.99 && (
                        <div style={{ fontSize: "10px", color: "#555", letterSpacing: "1px" }}>
                          Enter at least $4.99 to simulate.
                        </div>
                      )}

                      {sim && (
                        <>
                          {/* Weight & Win/Lose */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                            {[
                              { label: "WEIGHT",          value: sim.weight.toFixed(2) + "x",                      color: "#FF4D00" },
                              { label: "WIN CHANCE",      value: (sim.winChance * 100).toFixed(3) + "%",           color: "#27AE60" },
                              { label: "LOSE CHANCE",     value: (sim.loseChance * 100).toFixed(3) + "%",          color: "#ff6b6b" },
                              { label: "EXPECTED RETURN", value: (sim.evUsdc >= 0 ? "+" : "") + "$" + fmt2(sim.evUsdc), color: sim.evUsdc >= 0 ? "#27AE60" : "#ff6b6b" },
                            ].map(({ label, value, color }) => (
                              <div key={label} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "14px 16px" }}>
                                <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "6px" }}>{label}</div>
                                <div style={{ fontSize: "20px", color }}>{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Pool split */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "14px 16px" }}>
                              <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "4px" }}>GOES TO REWARD POOL</div>
                              <div style={{ fontSize: "18px", color: "#27AE60" }}>${fmt2(sim.rewardPoolShare)} USDC</div>
                              <div style={{ fontSize: "8px", color: "#333", marginTop: "2px" }}>{fmtPct(cfg.reward_pool_split)} of burn</div>
                            </div>
                            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "14px 16px" }}>
                              <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "4px" }}>GOES TO PROFIT POOL</div>
                              <div style={{ fontSize: "18px", color: "#FFB800" }}>${fmt2(sim.profitPoolShare)} USDC</div>
                              <div style={{ fontSize: "8px", color: "#333", marginTop: "2px" }}>{fmtPct(cfg.profit_pool_split)} of burn</div>
                            </div>
                          </div>

                          {/* Prize breakdown */}
                          <div style={{ marginBottom: "8px", fontSize: "9px", color: "#555", letterSpacing: "2px" }}>IF WIN — PRIZE BREAKDOWN</div>
                          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden", marginBottom: "20px" }}>
                            {[
                              { emoji: "💎", label: "JACKPOT",  chance: sim.jackpotChance, prize: sim.jackpotPrize },
                              { emoji: "🔥", label: "BIG",      chance: sim.bigChance,     prize: sim.bigPrize },
                              { emoji: "✨", label: "MEDIUM",   chance: sim.mediumChance,  prize: sim.mediumPrize },
                              { emoji: "⚡", label: "SMALL",    chance: sim.smallChance,   prize: sim.smallPrize },
                            ].map(({ emoji, label, chance, prize }, i) => (
                              <div key={label} style={{
                                display: "grid", gridTemplateColumns: "40px 80px 1fr 100px 100px",
                                alignItems: "center", padding: "12px 16px", gap: "12px",
                                borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              }}>
                                <span style={{ fontSize: "18px" }}>{emoji}</span>
                                <span style={{ fontSize: "10px", color: "#888", letterSpacing: "2px" }}>{label}</span>
                                <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                                  <div style={{ height: "100%", width: `${Math.min(100, chance * 100 * 20)}%`, background: "#FF4D00", borderRadius: "2px" }} />
                                </div>
                                <span style={{ fontSize: "10px", color: "#FF4D00", textAlign: "right" }}>{(chance * 100).toFixed(4)}%</span>
                                <span style={{ fontSize: "12px", color: "#FFB800", textAlign: "right" }}>+${prize} USDC</span>
                              </div>
                            ))}
                          </div>

                          {/* If lose */}
                          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "4px" }}>IF LOSE — ASH REWARD</div>
                              <div style={{ fontSize: "16px", color: "#aaa" }}>{sim.ashOnLose.toLocaleString()} ASH</div>
                              <div style={{ fontSize: "8px", color: "#333", marginTop: "2px" }}>${fmt2(sim.ashOnLose * 0.01)} value at $0.01/ASH</div>
                            </div>
                            <div style={{ fontSize: "32px" }}>💨</div>
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

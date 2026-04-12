"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import styles from "./burn.module.css";

// ---- Types ----
type BurnPhase = "idle" | "burning" | "result";

interface BurnResult {
  ashEarned: number;
  finalWeight: number;
  userCumulativeWeight: number;
  userRoundRank: number | null;
  roundCurrentPool: number;
  roundTargetPool: number;
  roundProgressPercent: number;
  roundEnded: boolean;
  roundWinner: string | null;
  roundPrize: number | null;
  roundNumber: number | null;
}

interface UserStats {
  totalBurns: number;
  cumulativeWeight: number;
  ashBalance: number;
  totalAshEarned: number;
  usdcBalance: number;
}

interface RoundStatus {
  roundNumber: number;
  currentPool: number;
  prizePoolTarget: number;
  progressPercent: number;
  status: string;
  startedAt: string;
}

// ---- Presets ----
const PRESETS = [
  { label: "5 USDC",  amount: 5,  sub: "1.0x WEIGHT" },
  { label: "10 USDC", amount: 10, sub: "2.0x WEIGHT" },
  { label: "25 USDC", amount: 25, sub: "5.0x WEIGHT" },
  { label: "CUSTOM",  amount: 0,  sub: "YOU CHOOSE" },
];

const BURN_MSGS = [
  "FEEDING THE FLAMES...",
  "CLIMBING THE LEADERBOARD...",
  "ACCUMULATING WEIGHT...",
  "THE FIRE GROWS...",
];

function calcWeight(amount: number): number {
  if (amount <= 0) return 0;
  return Math.round((amount / 4.99) * 100) / 100;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function BurnPage() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [customAmt, setCustomAmt] = useState("");
  const [phase, setPhase] = useState<BurnPhase>("idle");
  const [result, setResult] = useState<BurnResult | null>(null);
  const [burnMsg, setBurnMsg] = useState("");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<RoundStatus | null>(null);
  const [userRoundRank, setUserRoundRank] = useState<number | null>(null);
  const [userRoundWeight, setUserRoundWeight] = useState<number>(0);
  // Boost timer state
  const [boostActive, setBoostActive] = useState(false);
  const [boostSecsLeft, setBoostSecsLeft] = useState(0);
  const [boostLoading, setBoostLoading] = useState(false);

  // Load user stats + round status on mount
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      if (token) api.setToken(token);

      const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [walletRes, burnStatsRes, boostRes, roundRes] = await Promise.allSettled([
        api.wallet.balance(),
        api.burn.stats(),
        fetch(`${API_BASE}/api/burn/boost-status`, { headers: authHeaders }).then(r => r.json()),
        fetch(`${API_BASE}/api/round/current`, { headers: authHeaders }).then(r => r.json()),
      ]);

      let merged: Partial<UserStats> = {};

      if (walletRes.status === "fulfilled") {
        const d =
          (walletRes.value as { data?: UserStats }).data ??
          (walletRes.value as UserStats);
        merged = {
          ...merged,
          usdcBalance: Number(d.usdcBalance ?? 0),
          ashBalance:  Number(d.ashBalance  ?? 0),
        };
      }
      if (burnStatsRes.status === "fulfilled") {
        const d = (burnStatsRes.value as { data?: { totalBurns?: number; totalAshEarned?: number; cumulativeWeight?: number } }).data ??
          (burnStatsRes.value as { totalBurns?: number; totalAshEarned?: number; cumulativeWeight?: number });
        merged = {
          ...merged,
          totalBurns:       Number(d?.totalBurns       ?? merged.totalBurns       ?? 0),
          totalAshEarned:   Number(d?.totalAshEarned   ?? 0),
          cumulativeWeight: Number(d?.cumulativeWeight ?? 0),
        };
      }
      if (boostRes.status === "fulfilled") {
        const bd = (boostRes.value as { data?: { active?: boolean; secondsLeft?: number } }).data ?? boostRes.value as { active?: boolean; secondsLeft?: number };
        setBoostActive(!!bd?.active);
        setBoostSecsLeft(Number(bd?.secondsLeft ?? 0));
      }
      if (roundRes.status === "fulfilled") {
        const rd = (roundRes.value as { data?: { round?: RoundStatus | null; userRank?: number | null; userWeight?: number } }).data ?? (roundRes.value as { round?: RoundStatus | null; userRank?: number | null; userWeight?: number });
        setRound(rd?.round ?? null);
        setUserRoundRank(rd?.userRank ?? null);
        setUserRoundWeight(Number(rd?.userWeight ?? 0));
      }

      setStats(merged as UserStats);
    } catch {
      // stats are cosmetic — ignore errors
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Countdown timer for active boost — only restart when boostActive changes
  useEffect(() => {
    if (!boostActive) return;
    const tick = setInterval(() => {
      setBoostSecsLeft(s => {
        if (s <= 1) { setBoostActive(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [boostActive]);

  // Derived state
  const isCustom     = presetIdx === 3;
  const amount       = isCustom ? parseFloat(customAmt) || 0 : PRESETS[presetIdx].amount;
  const weight       = calcWeight(amount);
  const fillPct      = Math.min(100, (weight / 6) * 100);
  const usdcBalance  = stats?.usdcBalance ?? 0;
  const ashBalance   = stats?.ashBalance  ?? 0;
  const BOOST_COST   = 1000;
  const canBurn      = amount >= 5.0 && phase === "idle" && !statsLoading && usdcBalance >= amount;

  // Round progress bar fill
  const roundProgress = round
    ? Math.min(100, (round.currentPool / round.prizePoolTarget) * 100)
    : 0;

  async function handleBurn() {
    if (!canBurn) return;
    setError(null);
    setPhase("burning");
    setBurnMsg(BURN_MSGS[Math.floor(Math.random() * BURN_MSGS.length)]);

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      if (token) api.setToken(token);

      const res = (await api.burn.execute(amount)) as any;
      const raw = res?.data ?? res;

      const data: BurnResult = {
        ashEarned:            Number(raw.ashReward   ?? raw.ashEarned   ?? 0),
        finalWeight:          Number(raw.finalWeight ?? 0),
        userCumulativeWeight: Number(raw.userCumulativeWeight ?? 0),
        userRoundRank:        raw.userRoundRank ?? null,
        roundCurrentPool:     Number(raw.roundCurrentPool   ?? 0),
        roundTargetPool:      Number(raw.roundTargetPool    ?? 0),
        roundProgressPercent: Number(raw.roundProgressPercent ?? 0),
        roundEnded:   !!raw.roundEnded,
        roundWinner:  raw.roundWinner  ?? null,
        roundPrize:   raw.roundPrize != null ? Number(raw.roundPrize) : null,
        roundNumber:  raw.roundNumber  ?? null,
      };

      setResult(data);

      // Update round display from burn result
      if (raw.roundId) {
        setRound(prev => prev ? {
          ...prev,
          currentPool:    data.roundCurrentPool,
          progressPercent: data.roundProgressPercent,
        } : prev);
        setUserRoundRank(data.userRoundRank);
        setUserRoundWeight(data.userCumulativeWeight);
      }

      if (data.roundEnded && data.roundWinner) {
        speak(
          `Round ${data.roundNumber} complete! ${data.roundWinner} wins $${data.roundPrize?.toFixed(2)} U S D C!`
        );
      } else {
        speak(
          `Burn complete! Earned ${data.ashEarned} A S H tokens. Weight now ${data.userCumulativeWeight.toFixed(2)}.`
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Burn failed. Please try again.";
      setError(msg.toUpperCase());
      setPhase("idle");
      return;
    }
    setPhase("result");
    await loadStats();
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;
    utt.pitch = 0.8;
    utt.volume = 0.9;
    window.speechSynthesis.speak(utt);
  }

  function resetBurn() {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setPhase("idle");
    setResult(null);
    setError(null);
  }

  return (
    <>
      {/* ===== DASH HEADER ===== */}
      <div className="dash-header">
        <div className="dash-title">
          BURN <span>NOW</span>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "2px" }}>
          BALANCE:{" "}
          {statsLoading ? (
            <span style={{ color: "var(--text-dim)" }}>LOADING...</span>
          ) : (
            <span style={{ color: "var(--usdc-green)" }}>
              ${Number(stats?.usdcBalance ?? 0).toFixed(2)} USDC
            </span>
          )}
        </div>
      </div>

      {error && <div className={styles.loadErr}>⚠ {error}</div>}

      {/* ===== ROUND PROGRESS PANEL ===== */}
      <div className="panel-box" style={{ marginBottom: "16px" }}>
        <div className="panel-title">
          🏆 ROUND{round ? ` #${round.roundNumber}` : ""} — PRIZE POOL
        </div>
        {!round ? (
          <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "2px", padding: "8px 0" }}>
            NO ACTIVE ROUND — WAITING FOR OWNER TO START ONE
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px", marginBottom: "6px" }}>
              <span>CURRENT: <span style={{ color: "var(--usdc-green)" }}>${round.currentPool.toFixed(2)}</span></span>
              <span>TARGET: <span style={{ color: "var(--fire-orange)" }}>${round.prizePoolTarget.toFixed(2)}</span></span>
            </div>
            <div style={{
              height: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${roundProgress}%`,
                background: "linear-gradient(90deg, #ff4500, var(--fire-orange))",
                boxShadow: "0 0 12px rgba(255,140,66,0.5)",
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>
                {roundProgress.toFixed(1)}% TO PRIZE
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "10px", letterSpacing: "1px" }}>
                {userRoundRank != null ? (
                  <span style={{ color: userRoundRank === 1 ? "var(--gold)" : "var(--fire-orange)" }}>
                    YOUR RANK: <strong>#{userRoundRank}</strong>
                  </span>
                ) : (
                  <span style={{ color: "var(--text-dim)" }}>BURN TO JOIN ROUND</span>
                )}
                {userRoundWeight > 0 && (
                  <span style={{ color: "var(--text-dim)" }}>
                    WEIGHT: <span style={{ color: "var(--fire-orange)" }}>{userRoundWeight.toFixed(2)}</span>
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "1px", marginTop: "8px" }}>
              WINNER = #1 ON LEADERBOARD WHEN POOL HITS TARGET
            </div>
          </>
        )}
      </div>

      <div className={styles.burnLayout}>
        {/* ===== LEFT — MAIN BURN AREA ===== */}
        <div>
          {/* Amount Selection */}
          <div className="panel-box">
            <div className="panel-title">SELECT AMOUNT</div>

            <div className={styles.amountGrid}>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  className={`${styles.amountBtn}${presetIdx === i ? " " + styles.selected : ""}`}
                  onClick={() => {
                    setPresetIdx(i);
                    if (i !== 3) setCustomAmt("");
                  }}
                >
                  <span className={styles.amountBig}>{p.label}</span>
                  <span className={styles.amountSub}>{p.sub}</span>
                </button>
              ))}
            </div>

            {/* Custom input */}
            {isCustom && (
              <div className={styles.customRow}>
                <label>AMOUNT</label>
                <input
                  type="number"
                  min="5.00"
                  step="0.01"
                  placeholder="0.00"
                  className={styles.customInput}
                  value={customAmt}
                  onChange={(e) => setCustomAmt(e.target.value)}
                  autoFocus
                />
                <span className={styles.customUnit}>USDC</span>
              </div>
            )}

            {/* Weight Meter */}
            <div className={styles.luckSection}>
              <div className={styles.luckLabel}>
                ⚡ WEIGHT ACCUMULATION
              </div>
              <div className={styles.luckBar}>
                <div
                  className={styles.luckFill}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <div className={styles.luckMeta}>
                <span style={{ color: "var(--fire-orange)" }}>
                  +{weight.toFixed(2)} WEIGHT THIS BURN
                </span>
                {" → "}
                <span>
                  TOTAL: {((stats?.cumulativeWeight ?? 0) + weight).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Circular Burn Button */}
            <div className={styles.burnBtnWrap}>
              <button
                className={styles.burnCircle}
                onClick={handleBurn}
                disabled={!canBurn}
              >
                <span className={styles.burnCircleEmoji}>🔥</span>
                <span className={styles.burnCircleLabel}>
                  {statsLoading ? "..." : "BURN"}
                </span>
                {!statsLoading && amount >= 5.0 && (
                  <span className={styles.burnCircleAmt}>
                    ${amount.toFixed(2)}
                  </span>
                )}
              </button>
              {!statsLoading && amount >= 5.0 && usdcBalance < amount && phase === "idle" && (
                <div style={{ fontSize: "10px", color: "#ff6b6b", letterSpacing: "1px", textAlign: "center", marginTop: "8px" }}>
                  INSUFFICIENT BALANCE — YOU HAVE ${usdcBalance.toFixed(2)} USDC
                </div>
              )}
            </div>

            <div className={styles.disclaimer}>
              MIN BURN: $5.00 USDC &nbsp;•&nbsp; WINNER = #1 WHEN POOL HITS TARGET
            </div>
          </div>
        </div>

        {/* ===== RIGHT — SIDE STATS ===== */}
        <div className={styles.sidePanel}>
          <div className="panel-box">
            <div className="panel-title">YOUR STATS</div>
            {statsLoading ? (
              <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "2px" }}>
                LOADING...
              </div>
            ) : (
              <>
                <div className={styles.sideStat}>
                  <span className={styles.sideStatLabel}>TOTAL BURNS</span>
                  <span className={`${styles.sideStatVal} ${styles.sideStatFire}`}>
                    {stats?.totalBurns ?? 0}
                  </span>
                </div>
                <div className={styles.sideStat}>
                  <span className={styles.sideStatLabel}>TOTAL WEIGHT</span>
                  <span className={`${styles.sideStatVal} ${styles.sideStatGold}`}>
                    {Number(stats?.cumulativeWeight ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className={styles.sideStat}>
                  <span className={styles.sideStatLabel}>TOTAL ASH EARNED</span>
                  <span className={`${styles.sideStatVal} ${styles.sideStatAsh}`}>
                    {(stats?.totalAshEarned ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className={styles.sideStat}>
                  <span className={styles.sideStatLabel}>ASH BALANCE</span>
                  <span
                    className={`${styles.sideStatVal} ${styles.sideStatAsh}`}
                    style={{ color: ashBalance >= BOOST_COST ? undefined : "#ff6b6b" }}
                  >
                    {ashBalance.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ASH Boost */}
          <div className={styles.ashBoostPanel}>
            <div className={styles.ashBoostTitle}>🔥 BOOST WITH ASH</div>
            <div className={styles.ashBoostDesc}>
              PAY 1,000 ASH TO ACTIVATE +0.5 WEIGHT FOR 1 FULL HOUR — APPLIES
              TO EVERY BURN YOU DO WHILE ACTIVE.
            </div>

            {boostActive ? (
              <div style={{ marginTop: "12px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "rgba(255,140,66,0.12)", border: "1px solid var(--fire-orange)",
                  padding: "10px 14px",
                }}>
                  <span style={{ color: "var(--fire-orange)", fontSize: "16px" }}>⚡</span>
                  <div>
                    <div style={{ fontSize: "11px", letterSpacing: "1px", color: "var(--fire-orange)", fontFamily: "var(--font-display)" }}>
                      BOOST ACTIVE +0.5 WEIGHT
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px", marginTop: "2px" }}>
                      {Math.floor(boostSecsLeft / 60)}m {boostSecsLeft % 60}s REMAINING
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={async () => {
                    if (boostLoading || statsLoading) return;
                    if (ashBalance < BOOST_COST) return;
                    setBoostLoading(true);
                    try {
                      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                      const res = await fetch(`${API_BASE}/api/burn/boost`, {
                        method: "POST",
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      const data = await res.json();
                      if (res.ok && data.data) {
                        setBoostActive(true);
                        setBoostSecsLeft(3600);
                        await loadStats();
                      }
                    } catch {
                      // ignore
                    } finally {
                      setBoostLoading(false);
                    }
                  }}
                  disabled={statsLoading || boostLoading || ashBalance < BOOST_COST}
                  style={{
                    width: "100%", padding: "10px", background: "rgba(255,140,66,0.1)",
                    border: "1px solid rgba(255,140,66,0.4)", color: ashBalance >= BOOST_COST ? "var(--fire-orange)" : "#666",
                    fontSize: "10px", letterSpacing: "2px", cursor: ashBalance >= BOOST_COST ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {boostLoading ? "ACTIVATING..." : "⚡ ACTIVATE BOOST (1,000 ASH / 1 HR)"}
                </button>
                {!statsLoading && ashBalance < BOOST_COST && (
                  <div style={{ fontSize: "9px", color: "#ff6b6b", letterSpacing: "1px", marginTop: "8px" }}>
                    ⚠ NEED {(BOOST_COST - ashBalance).toLocaleString()} MORE ASH
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== BURNING OVERLAY ===== */}
      {phase === "burning" && (
        <div className={styles.burningOverlay}>
          <div className={styles.burningEmoji}>🔥</div>
          <div className={styles.burningText}>{burnMsg}</div>
          <div className={styles.burningSub}>
            UPDATING LEADERBOARD...
          </div>
        </div>
      )}

      {/* ===== RESULT OVERLAY ===== */}
      {phase === "result" && result && (
        <div className={styles.resultOverlay}>
          <div className={styles.resultCard}>
            {result.roundEnded ? (
              <>
                <div className={styles.resultEmoji}>🏆</div>
                <div className={`${styles.resultTitle} ${styles.resultTitleWin}`}>
                  ROUND {result.roundNumber} ENDED!
                </div>
                <div style={{ textAlign: "center", marginBottom: "12px" }}>
                  <div style={{ fontSize: "14px", color: "var(--gold)", letterSpacing: "2px", fontFamily: "var(--font-display)", marginBottom: "4px" }}>
                    WINNER: {result.roundWinner}
                  </div>
                  <div className={`${styles.resultAmt} ${styles.resultAmtWin}`}>
                    ${result.roundPrize?.toFixed(2)} USDC
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px", textAlign: "center", marginBottom: "16px" }}>
                  A NEW ROUND WILL BEGIN SOON
                </div>
              </>
            ) : (
              <>
                <div className={styles.resultEmoji}>🔥</div>
                <div className={`${styles.resultTitle} ${styles.resultTitleLose}`}>
                  BURNED
                </div>
                <div className={`${styles.resultAmt} ${styles.resultAmtAsh}`}>
                  +{result.ashEarned} ASH
                </div>
                <div style={{ display: "flex", gap: "16px", justifyContent: "center", fontSize: "10px", letterSpacing: "1px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--fire-orange)" }}>
                    +{result.finalWeight.toFixed(2)} WEIGHT
                  </span>
                  {result.userRoundRank != null && (
                    <span style={{ color: result.userRoundRank === 1 ? "var(--gold)" : "var(--text-dim)" }}>
                      RANK #{result.userRoundRank}
                    </span>
                  )}
                </div>
                {/* Mini progress bar in result */}
                <div style={{ width: "100%", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--text-dim)", marginBottom: "4px" }}>
                    <span>POOL: ${result.roundCurrentPool.toFixed(2)}</span>
                    <span>TARGET: ${result.roundTargetPool.toFixed(2)}</span>
                  </div>
                  <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${result.roundProgressPercent}%`,
                      background: "linear-gradient(90deg, #ff4500, var(--fire-orange))",
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              </>
            )}

            <div className={styles.resultActions}>
              <button className="btn btn-fire" onClick={resetBurn}>
                🔥 BURN AGAIN
              </button>
              <button className="btn btn-ghost" onClick={resetBurn}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import styles from "./burn.module.css";

// ---- Types ----
type BurnPhase = "idle" | "burning" | "result";

interface BurnResult {
  won: boolean;
  prizeAmount?: number;
  prizeLabel?: string;
  ashEarned: number;
  message?: string;
}

interface UserStats {
  totalBurns: number;
  totalWon: number;
  ashBalance: number;
  totalAshEarned: number;
  usdcBalance: number;
}

// ---- Presets ----
const PRESETS = [
  { label: "4.99 USDC", amount: 4.99, sub: "1.0x WEIGHT" },
  { label: "10 USDC", amount: 10, sub: "2.5x WEIGHT" },
  { label: "50 USDC", amount: 50, sub: "15x WEIGHT" },
  { label: "CUSTOM", amount: 0, sub: "YOU CHOOSE" },
];

const BURN_MSGS = [
  "THE FIRE REVEALS YOUR FATE...",
  "FEEDING THE FLAMES...",
  "THE ORACLE SPEAKS...",
  "IGNITING THE CHAIN...",
];

function calcWeight(amount: number): number {
  if (amount < 4.99) return 0;
  return Math.floor((amount / 4.99) * 10) / 10;
}

function calcWinChance(weight: number): number {
  return Math.min(25, weight * 1.6);
}

export default function BurnPage() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [customAmt, setCustomAmt] = useState("");
  const [useBoost, setUseBoost] = useState(false);
  const [phase, setPhase] = useState<BurnPhase>("idle");
  const [result, setResult] = useState<BurnResult | null>(null);
  const [burnMsg, setBurnMsg] = useState("");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user stats on mount
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      if (token) api.setToken(token);

      const [profileRes, walletRes, burnStatsRes] = await Promise.allSettled([
        api.auth.profile(),
        api.wallet.balance(),
        api.burn.stats(),
      ]);

      let merged: Partial<UserStats> = {};
      if (profileRes.status === "fulfilled") {
        type ProfileShape = { data?: { stats?: { totalBurns?: number; totalWon?: number } }; stats?: { totalBurns?: number; totalWon?: number } };
        const raw = profileRes.value as ProfileShape;
        const stats = raw.data?.stats ?? raw.stats;
        merged = {
          ...merged,
          totalBurns: Number(stats?.totalBurns ?? 0),
          totalWon: Number(stats?.totalWon ?? 0),
        };
      }
      if (walletRes.status === "fulfilled") {
        const d =
          (walletRes.value as { data?: UserStats }).data ??
          (walletRes.value as UserStats);
        merged = {
          ...merged,
          usdcBalance: Number(d.usdcBalance ?? 0),
          ashBalance: Number(d.ashBalance ?? 0),
        };
      }
      if (burnStatsRes.status === "fulfilled") {
        const d = (burnStatsRes.value as { data?: { totalBurns?: number; totalWon?: number; totalAshEarned?: number } }).data ??
          (burnStatsRes.value as { totalBurns?: number; totalWon?: number; totalAshEarned?: number });
        merged = {
          ...merged,
          totalBurns:    Number(d?.totalBurns    ?? merged.totalBurns    ?? 0),
          totalWon:      Number(d?.totalWon       ?? merged.totalWon      ?? 0),
          totalAshEarned: Number(d?.totalAshEarned ?? 0),
        };
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

  // Derive current burn amount
  const isCustom = presetIdx === 3;
  const amount = isCustom
    ? parseFloat(customAmt) || 0
    : PRESETS[presetIdx].amount;
  const weight = calcWeight(amount);
  const winPct = calcWinChance(weight);
  const fillPct = Math.min(100, weight * 6);
  const usdcBalance = stats?.usdcBalance ?? 0;
  const ashBalance  = stats?.ashBalance  ?? 0;
  const BOOST_COST  = 1000; // matches burnCfg.boost_cost_ash default
  const hasEnoughAsh = !useBoost || ashBalance >= BOOST_COST;
  const canBurn = amount >= 4.99 && phase === "idle" && !statsLoading && usdcBalance >= amount && hasEnoughAsh;

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

      // Call real API; fall back to simulated result on network error
      const res = (await api.burn.execute(amount, useBoost)) as any;
      const raw = res?.data ?? res;
      // Normalize backend field names → frontend interface
      const data: BurnResult = {
        won:        raw.isWinner  ?? raw.won        ?? false,
        prizeAmount: raw.prizeAmount ?? null,
        prizeLabel:  raw.prizeTier  ?? raw.prizeLabel ?? null,
        ashEarned:  raw.ashReward  ?? raw.ashEarned  ?? 0,
        message:    raw.message    ?? null,
      };
      setResult(data);
      if (data.won) {
        speak(
          `Congratulations! You won ${data.prizeAmount ? data.prizeAmount + " U S D C" : "a prize"}! The fire rewards the bold!`,
        );
      } else {
        speak(
          `The fire consumed your U S D C, but awarded you ${data.ashEarned} Ash tokens. Keep burning!`,
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
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-dim)",
            letterSpacing: "2px",
          }}
        >
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
                  min="4.99"
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

            {/* Luck Meter */}
            <div className={styles.luckSection}>
              <div className={styles.luckLabel}>
                ⚡ LUCK MULTIPLIER (WEIGHT)
              </div>
              <div className={styles.luckBar}>
                <div
                  className={styles.luckFill}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <div className={styles.luckMeta}>
                <span style={{ color: "var(--fire-orange)" }}>
                  {weight.toFixed(1)}x Weight
                </span>
                {" → "}
                <span>~{winPct.toFixed(1)}% Win Chance</span>
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
                {!statsLoading && amount >= 4.99 && (
                  <span className={styles.burnCircleAmt}>
                    ${amount.toFixed(2)}
                  </span>
                )}
              </button>
              {!statsLoading && amount >= 4.99 && usdcBalance < amount && phase === "idle" && (
                <div style={{ fontSize: "10px", color: "#ff6b6b", letterSpacing: "1px", textAlign: "center", marginTop: "8px" }}>
                  INSUFFICIENT BALANCE — YOU HAVE ${usdcBalance.toFixed(2)} USDC
                </div>
              )}
              {!statsLoading && useBoost && ashBalance < BOOST_COST && phase === "idle" && (
                <div style={{ fontSize: "10px", color: "#ff6b6b", letterSpacing: "1px", textAlign: "center", marginTop: "8px" }}>
                  INSUFFICIENT ASH FOR BOOST — YOU HAVE {ashBalance.toLocaleString()} ASH
                </div>
              )}
            </div>

            <div className={styles.disclaimer}>
              MIN BURN: $4.99 USDC &nbsp;•&nbsp; VRF VERIFIED ON SOLANA
            </div>
          </div>
        </div>

        {/* ===== RIGHT — SIDE STATS ===== */}
        <div className={styles.sidePanel}>
          <div className="panel-box">
            <div className="panel-title">YOUR STATS</div>
            {statsLoading ? (
              <div
                style={{
                  color: "var(--text-dim)",
                  fontSize: "10px",
                  letterSpacing: "2px",
                }}
              >
                LOADING...
              </div>
            ) : (
              <>
                <div className={styles.sideStat}>
                  <span className={styles.sideStatLabel}>TOTAL BURNS</span>
                  <span
                    className={`${styles.sideStatVal} ${styles.sideStatFire}`}
                  >
                    {stats?.totalBurns ?? 0}
                  </span>
                </div>
                <div className={styles.sideStat}>
                  <span className={styles.sideStatLabel}>TOTAL WON</span>
                  <span
                    className={`${styles.sideStatVal} ${styles.sideStatGold}`}
                  >
                    ${Number(stats?.totalWon ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className={styles.sideStat}>
                  <span className={styles.sideStatLabel}>ASH EARNED</span>
                  <span
                    className={`${styles.sideStatVal} ${styles.sideStatAsh}`}
                  >
                    {(stats?.totalAshEarned ?? 0).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ASH Boost */}
          <div className={styles.ashBoostPanel}>
            <div className={styles.ashBoostTitle}>🔥 BOOST WITH ASH</div>
            <div className={styles.ashBoostDesc}>
              USE YOUR ASH TOKENS TO INCREASE YOUR WEIGHT MULTIPLIER AND BOOST
              YOUR WIN CHANCE. COSTS 1,000 ASH PER BURN.
            </div>

            {/* ASH balance row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", fontSize: "9px", letterSpacing: "1px" }}>
              <span style={{ color: "var(--text-dim)" }}>YOUR ASH BALANCE</span>
              <span style={{ color: ashBalance >= BOOST_COST ? "var(--ash-token, #FF8C42)" : "#ff6b6b", fontFamily: "var(--font-display)", fontSize: "13px" }}>
                {statsLoading ? "..." : ashBalance.toLocaleString()} ASH
              </span>
            </div>

            <div className={styles.ashBoostRow}>
              <button
                className={`${styles.ashToggle}${useBoost ? " " + styles.on : ""}`}
                onClick={() => setUseBoost(!useBoost)}
                disabled={!statsLoading && ashBalance < BOOST_COST}
                aria-label="Toggle ASH boost"
                style={{ opacity: !statsLoading && ashBalance < BOOST_COST ? 0.4 : 1, cursor: !statsLoading && ashBalance < BOOST_COST ? "not-allowed" : "pointer" }}
              />
              <span className={styles.ashToggleLabel}>
                ASH BOOST {useBoost ? "ON (+0.5x WEIGHT)" : "OFF"}
              </span>
            </div>

            {!statsLoading && ashBalance < BOOST_COST && (
              <div style={{ fontSize: "9px", color: "#ff6b6b", letterSpacing: "1px", marginTop: "8px" }}>
                ⚠ NEED {(BOOST_COST - ashBalance).toLocaleString()} MORE ASH TO BOOST
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
            VERIFYING ON SOLANA BLOCKCHAIN...
          </div>
        </div>
      )}

      {/* ===== RESULT OVERLAY ===== */}
      {phase === "result" && result && (
        <div className={styles.resultOverlay}>
          <div className={styles.resultCard}>
            <div className={styles.resultEmoji}>{result.won ? "🏆" : "💨"}</div>

            <div
              className={`${styles.resultTitle} ${result.won ? styles.resultTitleWin : styles.resultTitleLose}`}
            >
              {result.won ? "WIN!" : "BURNED"}
            </div>

            {result.won && result.prizeAmount != null && (
              <div className={`${styles.resultAmt} ${styles.resultAmtWin}`}>
                +${Number(result.prizeAmount).toFixed(2)} USDC
              </div>
            )}

            {!result.won && (
              <div className={`${styles.resultAmt} ${styles.resultAmtAsh}`}>
                +{result.ashEarned} ASH
              </div>
            )}

            {result.message && (
              <div className={styles.resultMsg}>
                {result.message.toUpperCase()}
              </div>
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

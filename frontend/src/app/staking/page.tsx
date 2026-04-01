"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface Pool {
  id: string;
  name: string;
  apy: number;
  lockDays: number;
  minStake: number;
  description: string;
}

interface Position {
  id: string;
  amount: number;
  pendingRewards: number;
  rewardsClaimed: number;
  status: "ACTIVE" | "UNLOCKED" | "WITHDRAWN";
  lockedUntil: string;
  isUnlocked: boolean;
  pool: Pool;
  createdAt: string;
}

interface Summary {
  totalStaked: number;
  totalPendingRewards: number;
  totalClaimedAllTime: number;
  activePositions: number;
}

export default function StakingPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ashBalance, setAshBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [staking, setStaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) api.setToken(token);

      const [poolsRes, posRes, sumRes, walletRes] = await Promise.allSettled([
        api.staking.pools(),
        api.staking.positions(),
        api.staking.summary(),
        api.wallet.balance(),
      ]);

      if (poolsRes.status === "fulfilled") {
        const d = (poolsRes.value as { data: Pool[] }).data;
        setPools(d.map(p => ({ ...p, apy: Number(p.apy), lockDays: Number(p.lockDays), minStake: Number(p.minStake) })));
      }
      if (posRes.status === "fulfilled") {
        const d = (posRes.value as { data: Position[] }).data;
        setPositions(d.map(p => ({ ...p, amount: Number(p.amount), pendingRewards: Number(p.pendingRewards), rewardsClaimed: Number(p.rewardsClaimed) })));
      }
      if (sumRes.status === "fulfilled") {
        const d = (sumRes.value as { data: Summary }).data;
        setSummary({ totalStaked: Number(d.totalStaked), totalPendingRewards: Number(d.totalPendingRewards), totalClaimedAllTime: Number(d.totalClaimedAllTime), activePositions: Number(d.activePositions) });
      }
      if (walletRes.status === "fulfilled") {
        const d = (walletRes.value as { data: { ashBalance: number } }).data;
        setAshBalance(Number(d.ashBalance ?? 0));
      }
    } catch {
      setError("Failed to load staking data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleStake() {
    if (!selectedPool || !stakeAmount) return;
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) return setError("Enter a valid amount");
    if (amount < selectedPool.minStake) return setError(`Minimum stake is ${selectedPool.minStake} ASH`);
    if (amount > ashBalance) return setError("Insufficient ASH balance");

    setStaking(true);
    setError(null);
    try {
      await api.staking.stake(selectedPool.id, amount);
      setSuccess(`Successfully staked ${amount} ASH in ${selectedPool.name}!`);
      setSelectedPool(null);
      setStakeAmount("");
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Staking failed");
    } finally {
      setStaking(false);
    }
  }

  async function handleClaim(positionId: string) {
    setError(null);
    try {
      const res = await api.staking.claim(positionId) as { data: { claimed: number } };
      setSuccess(`Claimed ${Number(res.data.claimed).toFixed(2)} ASH rewards!`);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Claim failed");
    }
  }

  async function handleUnstake(positionId: string) {
    setError(null);
    try {
      const res = await api.staking.unstake(positionId) as { data: { total: number } };
      setSuccess(`Unstaked! Received ${Number(res.data.total).toFixed(2)} ASH total.`);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unstake failed");
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--panel-bg, #111)",
    border: "1px solid rgba(255,77,0,0.2)",
    borderRadius: "4px",
    padding: "20px",
    marginBottom: "16px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    letterSpacing: "2px",
    color: "var(--text-dim, #666)",
    textTransform: "uppercase" as const,
  };

  const valStyle: React.CSSProperties = {
    fontSize: "20px",
    fontFamily: "var(--font-display, monospace)",
    color: "var(--fire-orange, #FF4D00)",
    marginTop: "4px",
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim, #666)", letterSpacing: "4px", fontSize: "12px" }}>
        LOADING STAKING DATA...
      </div>
    );
  }

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">ASH <span>STAKING</span></div>
        <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "2px" }}>
          BALANCE: <span style={{ color: "#FFB800" }}>{ashBalance.toLocaleString()} ASH</span>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(255,0,0,0.1)", border: "1px solid #ff4444", color: "#ff4444", padding: "12px 16px", borderRadius: "4px", marginBottom: "16px", fontSize: "11px", letterSpacing: "2px" }}>
          ⚠ {error.toUpperCase()}
        </div>
      )}
      {success && (
        <div style={{ background: "rgba(0,255,100,0.1)", border: "1px solid #00ff64", color: "#00ff64", padding: "12px 16px", borderRadius: "4px", marginBottom: "16px", fontSize: "11px", letterSpacing: "2px" }} onClick={() => setSuccess(null)}>
          ✓ {success.toUpperCase()} (CLICK TO DISMISS)
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "TOTAL STAKED",    val: `${summary.totalStaked.toLocaleString()} ASH`,          color: "#FFB800" },
            { label: "PENDING REWARDS", val: `${summary.totalPendingRewards.toFixed(2)} ASH`,         color: "#FF4D00" },
            { label: "CLAIMED ALL TIME",val: `${summary.totalClaimedAllTime.toFixed(2)} ASH`,         color: "#00ff64" },
            { label: "ACTIVE POSITIONS",val: summary.activePositions.toString(),                      color: "#fff"    },
          ].map((s) => (
            <div key={s.label} style={cardStyle}>
              <div style={labelStyle}>{s.label}</div>
              <div style={{ ...valStyle, color: s.color, fontSize: "16px" }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Pools */}
        <div>
          <div className="panel-box">
            <div className="panel-title">STAKING POOLS</div>
            {pools.map((pool) => (
              <div
                key={pool.id}
                onClick={() => { setSelectedPool(pool); setStakeAmount(""); setError(null); }}
                style={{
                  border: `1px solid ${selectedPool?.id === pool.id ? "var(--fire-orange,#FF4D00)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "4px",
                  padding: "16px",
                  marginBottom: "12px",
                  cursor: "pointer",
                  background: selectedPool?.id === pool.id ? "rgba(255,77,0,0.08)" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "2px" }}>{pool.name}</span>
                  <span style={{ color: "#00ff64", fontFamily: "var(--font-display)", fontSize: "18px" }}>{Number(pool.apy).toFixed(0)}% APY</span>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "10px", color: "var(--text-dim,#666)", letterSpacing: "1px" }}>
                  <span>🔒 {pool.lockDays}-DAY LOCK</span>
                  <span>MIN: {Number(pool.minStake).toLocaleString()} ASH</span>
                </div>
                {pool.description && (
                  <div style={{ fontSize: "10px", color: "var(--text-dim,#666)", marginTop: "6px", letterSpacing: "1px" }}>
                    {pool.description.toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {/* Stake Input */}
            {selectedPool && (
              <div style={{ marginTop: "16px", padding: "16px", background: "rgba(255,77,0,0.05)", border: "1px solid rgba(255,77,0,0.3)", borderRadius: "4px" }}>
                <div style={{ ...labelStyle, marginBottom: "8px" }}>STAKE IN {selectedPool.name}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    min={selectedPool.minStake}
                    step="1"
                    placeholder={`Min ${selectedPool.minStake}`}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    style={{
                      flex: 1,
                      background: "#0a0a0a",
                      border: "1px solid rgba(255,77,0,0.4)",
                      color: "#fff",
                      padding: "10px 12px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "14px",
                      letterSpacing: "1px",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "#FFB800", letterSpacing: "1px" }}>ASH</span>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button
                    onClick={handleStake}
                    disabled={staking}
                    className="btn btn-fire"
                    style={{ flex: 1, fontSize: "11px" }}
                  >
                    {staking ? "STAKING..." : "🔥 STAKE NOW"}
                  </button>
                  <button
                    onClick={() => { setSelectedPool(null); setStakeAmount(""); }}
                    className="btn btn-ghost"
                    style={{ fontSize: "11px" }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Positions */}
        <div>
          <div className="panel-box">
            <div className="panel-title">YOUR POSITIONS</div>
            {positions.filter(p => p.status !== "WITHDRAWN").length === 0 ? (
              <div style={{ color: "var(--text-dim,#666)", fontSize: "11px", letterSpacing: "2px", padding: "20px 0", textAlign: "center" }}>
                NO ACTIVE POSITIONS
              </div>
            ) : (
              positions.filter(p => p.status !== "WITHDRAWN").map((pos) => (
                <div key={pos.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", padding: "14px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "12px", letterSpacing: "2px", color: "#FFB800" }}>
                      {pos.pool.name}
                    </span>
                    <span style={{
                      fontSize: "9px",
                      letterSpacing: "1px",
                      padding: "2px 8px",
                      borderRadius: "2px",
                      background: pos.isUnlocked ? "rgba(0,255,100,0.15)" : "rgba(255,77,0,0.15)",
                      color: pos.isUnlocked ? "#00ff64" : "#FF4D00",
                    }}>
                      {pos.isUnlocked ? "UNLOCKED" : "LOCKED"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                    <div>
                      <div style={labelStyle}>STAKED</div>
                      <div style={{ fontSize: "14px", color: "#fff", fontFamily: "var(--font-mono,monospace)" }}>
                        {Number(pos.amount).toLocaleString()} ASH
                      </div>
                    </div>
                    <div>
                      <div style={labelStyle}>PENDING REWARDS</div>
                      <div style={{ fontSize: "14px", color: "#00ff64", fontFamily: "var(--font-mono,monospace)" }}>
                        +{Number(pos.pendingRewards).toFixed(2)} ASH
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "10px", color: "var(--text-dim,#666)", letterSpacing: "1px", marginBottom: "10px" }}>
                    {pos.isUnlocked
                      ? "✓ LOCK PERIOD COMPLETE — READY TO UNSTAKE"
                      : `🔒 UNLOCKS ${new Date(pos.lockedUntil).toLocaleDateString()}`}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleClaim(pos.id)}
                      className="btn btn-ghost"
                      style={{ flex: 1, fontSize: "10px", padding: "6px" }}
                    >
                      CLAIM REWARDS
                    </button>
                    {pos.isUnlocked && (
                      <button
                        onClick={() => handleUnstake(pos.id)}
                        className="btn btn-fire"
                        style={{ flex: 1, fontSize: "10px", padding: "6px" }}
                      >
                        UNSTAKE
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

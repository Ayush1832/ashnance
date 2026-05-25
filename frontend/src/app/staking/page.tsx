"use client";

import { useState } from "react";
import { Sprout, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, FireButton, GhostButton, StatTile } from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { stakingPools, mockStakingPositions } from "@/lib/mock";
import { fmtNum, countdown } from "@/lib/format";
import { api } from "@/lib/apiClient";
import type { StakingPool } from "@/lib/types";

const POOL_COLORS: Record<string, string> = {
  EMBER:   "text-orange-400 border-orange-400/30",
  FLAME:   "text-fire border-fire/30",
  INFERNO: "text-red-400 border-red-400/30",
};

export default function StakingPage() {
  const { user } = useAuth();
  const [modal, setModal] = useState<StakingPool | null>(null);

  const totalStaked = mockStakingPositions.reduce((s, p) => s + p.staked, 0);
  const totalPending = mockStakingPositions.reduce((s, p) => s + p.pending, 0);

  return (
    <AppShell>
      <SectionHeader eyebrow="Earn yield" title="Stake ASH" sub="Lock ASH in EMBER, FLAME, or INFERNO pools to earn passive yield." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="ASH Balance" value={fmtNum(user.ashBalance) + " ASH"} sub="Available to stake" accent="ash" />
        <StatTile label="Total Staked" value={fmtNum(totalStaked) + " ASH"} sub="Across all pools" accent="fire" />
        <StatTile label="Pending Yield" value={fmtNum(totalPending, 2) + " ASH"} sub="Claimable now" accent="gold" />
      </div>

      {/* Pool cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {stakingPools.map((pool) => {
          const myPos = mockStakingPositions.find((p) => p.poolId === pool.id);
          const color = POOL_COLORS[pool.id];
          return (
            <GlassCard key={pool.id} className={`border ${color.split(" ")[1]}`}>
              <div className={`text-xs uppercase tracking-wider font-bold mb-3 ${color.split(" ")[0]}`}>{pool.name}</div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">APY</span>
                  <span className="font-mono font-bold text-foreground">{pool.apy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lock period</span>
                  <span className="font-mono">{pool.lockDays}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-mono">{fmtNum(pool.minAsh)} ASH</span>
                </div>
                {myPos && (
                  <>
                    <div className="border-t border-border pt-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your stake</span>
                      <span className="font-mono text-foreground">{fmtNum(myPos.staked)} ASH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending</span>
                      <span className="font-mono text-ash">+{fmtNum(myPos.pending, 2)} ASH</span>
                    </div>
                  </>
                )}
              </div>
              <FireButton size="sm" className="w-full" onClick={() => setModal(pool)}
                disabled={user.ashBalance < pool.minAsh}>
                <Sprout className="h-3.5 w-3.5" />
                {myPos ? "Stake More" : "Stake Now"}
              </FireButton>
            </GlassCard>
          );
        })}
      </div>

      {/* Positions */}
      {mockStakingPositions.length > 0 && (
        <GlassCard>
          <div className="text-sm font-semibold mb-4">Your Positions</div>
          <div className="space-y-3">
            {mockStakingPositions.map((pos) => {
              const pool = stakingPools.find((p) => p.id === pos.poolId)!;
              const unlocked = new Date(pos.unlocksAt) <= new Date();
              return (
                <div key={pos.id} className="flex items-center gap-4 glass rounded-lg px-4 py-3">
                  <div className={`text-xs font-bold uppercase ${POOL_COLORS[pos.poolId].split(" ")[0]}`}>{pool.name}</div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Staked</div>
                      <div className="font-mono">{fmtNum(pos.staked)} ASH</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Pending yield</div>
                      <div className="font-mono text-ash">+{fmtNum(pos.pending, 2)} ASH</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{unlocked ? "Unlocked" : "Unlocks in"}</div>
                      <div className="font-mono">{unlocked ? "Now" : countdown(pos.unlocksAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unlocked ? (
                        <FireButton size="sm" onClick={() => toast.success("Unstake request submitted")}>Unstake</FireButton>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Locked</div>
                      )}
                      <GhostButton size="sm" onClick={() => toast.success("Yield claimed!")}>Claim</GhostButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {modal && <StakeModal pool={modal} maxAsh={user.ashBalance} onClose={() => setModal(null)} />}
    </AppShell>
  );
}

function StakeModal({ pool, maxAsh, onClose }: { pool: StakingPool; maxAsh: number; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!a || a < pool.minAsh || a > maxAsh) return;
    setLoading(true);
    try {
      await api.stake({ poolId: pool.id, amount: a });
      toast.success(`Staked ${fmtNum(a)} ASH in ${pool.name}`);
      onClose();
    } catch { toast.error("Staking failed"); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-elevated ring-fire rounded-2xl p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold">Stake — {pool.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5 text-center">
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-muted-foreground">APY</div>
            <div className="font-mono font-bold text-fire">{pool.apy}%</div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Lock</div>
            <div className="font-mono font-bold">{pool.lockDays}d</div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Min</div>
            <div className="font-mono font-bold">{fmtNum(pool.minAsh)} ASH</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Amount (ASH)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(pool.minAsh)}
              className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm font-mono"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Min: {fmtNum(pool.minAsh)} ASH</span>
              <button type="button" onClick={() => setAmount(String(maxAsh))} className="hover:text-foreground">
                Max: {fmtNum(maxAsh)} ASH
              </button>
            </div>
          </div>
          {amount && parseFloat(amount) >= pool.minAsh && (
            <div className="glass rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Estimated yield: <span className="font-mono text-ash">
                +{fmtNum(parseFloat(amount) * pool.apy / 100 * pool.lockDays / 365, 2)} ASH
              </span> after {pool.lockDays} days
            </div>
          )}
          <FireButton type="submit" className="w-full" disabled={loading || !amount}>
            <Lock className="h-4 w-4" />{loading ? "Staking…" : "Confirm Stake"}
          </FireButton>
        </form>
      </div>
    </div>
  );
}

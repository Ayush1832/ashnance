"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Flame, Zap, Star, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, FireButton, RankBadge } from "@/components/ashnance/primitives";
import { RoundProgressRing } from "@/components/ashnance/RoundProgressRing";
import { BurnResultModal, type BurnResult } from "@/components/ashnance/BurnResultModal";
import { useAuth } from "@/hooks/useAuth";
import { mockRound, mockBurnConfig, calcWeight, calcAsh } from "@/lib/mock";
import { fmtUsd, fmtNum, fmtAsh, countdown } from "@/lib/format";
import { api } from "@/lib/apiClient";

const PRESETS = [5, 10, 25, 50, 100, 250];

function playFireSound() {
  try {
    type AudioCtxCtor = typeof AudioContext;
    const Ctor: AudioCtxCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();

    // White-noise crackle burst
    const len = Math.floor(ctx.sampleRate * 0.55);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700;
    bp.Q.value = 0.7;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(1.1, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    noise.connect(bp); bp.connect(g1); g1.connect(ctx.destination);
    noise.start(); noise.stop(ctx.currentTime + 0.55);

    // Low-frequency rumble thump
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.3);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.45, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g2); g2.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch (_e) { /* audio not supported */ }
}

export default function BurnPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [burning, setBurning] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [burnResult, setBurnResult] = useState<BurnResult | null>(null);

  const effective = useCustom ? (parseFloat(custom) || 0) : amount;
  const isVip = user.vip === "HOLY_FIRE";
  const hasBoost = !!user.ashBoostExpiresAt && new Date(user.ashBoostExpiresAt) > new Date();
  const activeReferrals = 3;

  const w = calcWeight(effective, { vip: isVip, boost: hasBoost, activeReferrals });
  const ash = calcAsh(effective, isVip);

  const poolReward = effective * mockBurnConfig.reward_pool_split;
  const poolProfit = effective * mockBurnConfig.profit_pool_split;
  const poolReferral = effective * mockBurnConfig.referral_pool_split;

  const canBurn =
    effective >= mockBurnConfig.min_burn_amount &&
    effective <= mockBurnConfig.max_burn_amount &&
    effective <= user.usdcBalance &&
    mockRound.status === "ACTIVE";

  async function handleBurn() {
    if (!canBurn) return;
    playFireSound();
    setBurning(true);
    try {
      const res = await api.burn(effective);
      setBurnResult({
        amount: effective,
        weight: res.data.weight,
        ash: res.data.ash,
        newRank: res.data.rank,
        prizePool: res.data.newPool,
        prizePoolTarget: mockRound.prizePoolTarget,
      });
    } catch {
      toast.error("Burn failed. Try again.");
    }
    setBurning(false);
  }

  const handleBoost = useCallback(async () => {
    if (user.ashBalance < 1000) { toast.error("Need 1,000 ASH to activate boost"); return; }
    setBoostLoading(true);
    try {
      await api.activateBoost();
      toast.success("🔥 Weight Boost active for 1 hour! +0.5 weight per burn");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Boost failed");
    }
    setBoostLoading(false);
  }, [user.ashBalance]);

  return (
    <AppShell>
      <SectionHeader eyebrow="Compete" title="Burn USDC" sub="Burn USDC to earn weight, climb the leaderboard, and win the prize pool." />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Left column */}
        <div className="space-y-5">

          {/* Amount selector */}
          <GlassCard>
            <div className="text-sm font-medium mb-3">Select amount</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              {PRESETS.map((p) => (
                <button key={p}
                  onClick={() => { setAmount(p); setUseCustom(false); }}
                  className={`h-10 rounded-md text-sm font-semibold transition border ${
                    !useCustom && amount === p
                      ? "bg-fire text-background border-fire glow-fire"
                      : "border-border glass hover:border-primary/40"
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Custom amount"
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setUseCustom(true); }}
                onFocus={() => setUseCustom(true)}
                className="flex-1 h-10 px-3 rounded-md bg-muted border border-border text-sm"
                min={mockBurnConfig.min_burn_amount}
                max={mockBurnConfig.max_burn_amount}
              />
              <span className="h-10 flex items-center px-3 text-sm text-muted-foreground">USDC</span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Min: {fmtUsd(mockBurnConfig.min_burn_amount)} · Max: {fmtUsd(mockBurnConfig.max_burn_amount)}</span>
              <span>Balance: <span className="font-mono text-foreground">{fmtUsd(user.usdcBalance)}</span></span>
            </div>
          </GlassCard>

          {/* Weight breakdown */}
          <GlassCard>
            <div className="text-sm font-medium mb-4">Weight preview</div>
            <div className="space-y-2">
              <WeightRow label="Base weight" value={w.base} icon={<Flame className="h-3.5 w-3.5 text-fire" />} />
              <WeightRow label="VIP bonus (+0.5)" value={w.vipBonus} icon={<Star className="h-3.5 w-3.5 text-gold" />}
                muted={!isVip} mutedMsg="Unlock Holy Fire VIP" />
              <WeightRow label="Boost bonus (+0.5)" value={w.boostBonus} icon={<Zap className="h-3.5 w-3.5 text-ash" />}
                muted={!hasBoost} mutedMsg="Activate boost · 1k ASH" />
              <WeightRow label="Referral bonus" value={w.referralBonus} icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
                muted={w.referralBonus === 0} mutedMsg="Invite friends to earn bonus" />
              <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                <span className="text-sm font-semibold">Final weight</span>
                <span className="font-mono text-xl font-bold text-fire">{w.final.toFixed(2)}</span>
              </div>
            </div>
          </GlassCard>

          {/* Pool split */}
          <GlassCard>
            <div className="text-sm font-medium mb-3">Pool split</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reward Pool</div>
                <div className="font-mono text-lg font-bold text-fire mt-1">{fmtUsd(poolReward)}</div>
                <div className="text-xs text-muted-foreground">40%</div>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit Pool</div>
                <div className="font-mono text-lg font-bold text-[oklch(0.7_0.13_245)] mt-1">{fmtUsd(poolProfit)}</div>
                <div className="text-xs text-muted-foreground">40%</div>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Referral Pool</div>
                <div className="font-mono text-lg font-bold text-ash mt-1">{fmtUsd(poolReferral)}</div>
                <div className="text-xs text-muted-foreground">20%</div>
              </div>
            </div>
          </GlassCard>

          {/* ASH reward + boost */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium">ASH reward</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isVip ? "+20% VIP multiplier applied" : "Upgrade to VIP for +20%"}
                </div>
              </div>
              <div className="font-mono text-2xl font-bold text-ash">+{fmtNum(ash)}</div>
            </div>
            {hasBoost ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-ash/10 border border-ash/30 text-xs text-ash">
                <Zap className="h-3.5 w-3.5" />
                Boost active — +0.5 weight per burn · expires {new Date(user.ashBoostExpiresAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            ) : (
              <button
                onClick={handleBoost}
                disabled={boostLoading || user.ashBalance < 1000}
                className="w-full h-9 rounded-md border border-ash/30 bg-ash/5 text-ash text-sm font-medium transition hover:bg-ash/15 hover:border-ash/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap className="h-3.5 w-3.5" />
                {boostLoading ? "Activating…" : `Activate Boost · 1,000 ASH (you have ${fmtNum(user.ashBalance)})`}
              </button>
            )}
          </GlassCard>

          {/* Burn button */}
          <div className="space-y-2">
            {mockRound.status !== "ACTIVE" && (
              <div className="glass rounded-lg px-4 py-3 text-sm text-warning border border-warning/30">
                No active round — burns are currently paused.
              </div>
            )}
            {effective > user.usdcBalance && (
              <div className="glass rounded-lg px-4 py-3 text-sm text-danger border border-danger/30">
                Insufficient USDC balance.
              </div>
            )}
            <FireButton size="xl" className="w-full" onClick={handleBurn} disabled={!canBurn || burning}>
              <Flame className="h-5 w-5" />
              {burning ? "Burning…" : `BURN ${effective > 0 ? fmtUsd(effective) : "—"}`}
            </FireButton>
            <div className="text-center text-xs text-muted-foreground">
              Anti-snipe: {mockBurnConfig.anti_snipe_seconds}s cooldown applies in the last 60s of a round
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <GlassCard className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Round #{mockRound.number}</div>
            <RoundProgressRing size={160} />
            <div className="mt-3 font-mono text-2xl font-bold text-fire">{fmtUsd(mockRound.prizePool)}</div>
            <div className="text-xs text-muted-foreground">of {fmtUsd(mockRound.prizePoolTarget)} prize pool</div>
            {mockRound.endsAt && (
              <div className="mt-2 text-xs text-muted-foreground">Ends in <span className="font-mono text-foreground">{countdown(mockRound.endsAt)}</span></div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="text-sm font-semibold mb-3">Current Standings</div>
            <div className="space-y-1.5">
              {mockRound.leaderboard.slice(0, 8).map((r) => (
                <div key={r.userId}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm ${r.isYou ? "bg-[rgba(255,69,0,0.12)] border border-primary/40" : "glass"}`}>
                  <RankBadge rank={r.rank} />
                  <span className="flex-1 truncate">{r.isAnonymous ? "Anonymous" : r.username}{r.isYou && " (you)"}</span>
                  <span className="font-mono text-xs">{r.weight.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {!isVip && (
            <GlassCard className="border border-gold/30">
              <div className="text-xs uppercase tracking-wider text-gold mb-2">Holy Fire VIP</div>
              <p className="text-sm text-muted-foreground">+0.5 weight per burn · +20% ASH · VIP badge</p>
              <Link href="/subscribe" className="mt-3 flex items-center gap-1 text-xs text-gold hover:underline">
                Unlock VIP <ChevronRight className="h-3 w-3" />
              </Link>
            </GlassCard>
          )}
        </div>
      </div>

      {burnResult && <BurnResultModal result={burnResult} onClose={() => setBurnResult(null)} />}
    </AppShell>
  );
}

function WeightRow({ label, value, icon, muted, mutedMsg }: {
  label: string; value: number; icon: React.ReactNode;
  muted?: boolean; mutedMsg?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      {muted ? (
        <span className="text-xs text-muted-foreground italic">{mutedMsg}</span>
      ) : (
        <span className={`font-mono text-sm ${value > 0 ? "text-foreground" : "text-muted-foreground"}`}>
          +{value.toFixed(2)}
        </span>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Copy, Users, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { Reveal } from "@/components/motion/Reveal";
import { GlassCard, SectionHeader, FireButton, StatTile } from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import { fmtUsd, fmtNum, timeAgo } from "@/lib/format";
import type { Referral } from "@/lib/types";

const REFERRAL_COMMISSION = 0.10; // 10% — matches backend default

export default function ReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.referrals()
      .then((res) => {
        if (res.success && res.data) setReferrals(res.data as Referral[]);
      })
      .catch(() => toast.error("Failed to load referrals"))
      .finally(() => setLoading(false));
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://ashnance.com";
  const referralUrl = `${origin}/register?ref=${user.referralCode}`;
  const totalEarned = referrals.reduce((s, r) => s + r.earned, 0);
  const totalBurns  = referrals.reduce((s, r) => s + r.burnCount, 0);
  const active      = referrals.filter((r) => r.active).length;

  function copyCode() {
    navigator.clipboard.writeText(user.referralCode);
    toast.success("Referral code copied");
  }

  function copyLink() {
    navigator.clipboard.writeText(referralUrl);
    toast.success("Referral link copied");
  }

  return (
    <AppShell>
      <Reveal>
        <SectionHeader
          eyebrow="Bring burners"
          title="Referrals"
          sub={`Earn ${fmtNum(REFERRAL_COMMISSION * 100)}% of every burn made by your referrals, sourced from the referral pool.`}
        />
      </Reveal>

      <Reveal delay={0.08}>
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Total Earned" value={fmtUsd(totalEarned)} sub="From referral pool" accent="usdc" />
        <StatTile label="Active Referrals" value={active} sub={`${referrals.length} total`} accent="fire" />
        <StatTile label="Referral Burns" value={fmtNum(totalBurns)} sub="Burns by your referrals" accent="ash" />
      </div>

      {/* Code card */}
      <GlassCard ring className="mb-5">
        <div className="text-sm font-medium mb-4">Your referral code</div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 glass rounded-lg px-4 py-3">
            <div className="font-mono text-2xl font-bold tracking-[0.15em] text-fire">
              {user.referralCode || "—"}
            </div>
          </div>
          <FireButton onClick={copyCode} disabled={!user.referralCode}><Copy className="h-4 w-4" /> Copy code</FireButton>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex-1 truncate font-mono">{referralUrl}</span>
          <button onClick={copyLink} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Copy className="h-3 w-3" /> Copy link
          </button>
        </div>
      </GlassCard>

      {/* How it works */}
      <GlassCard className="mb-5">
        <div className="text-sm font-semibold mb-4">How referrals work</div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: <Users className="h-5 w-5 text-primary" />, step: "1. Share your link", desc: "Your referral registers using your code or link." },
            { icon: <TrendingUp className="h-5 w-5 text-ash" />, step: "2. They burn USDC", desc: "Every burn they make triggers a 10% commission for you." },
            { icon: <Zap className="h-5 w-5 text-gold" />, step: "3. You earn USDC", desc: "Commission is paid instantly from the dedicated referral pool." },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="shrink-0 mt-0.5">{s.icon}</div>
              <div>
                <div className="text-sm font-medium">{s.step}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Weight bonus explainer */}
      <GlassCard className="mb-5">
        <div className="text-sm font-semibold mb-2">Weight bonus from referrals</div>
        <p className="text-sm text-muted-foreground">
          Having active referrals also boosts your own burn weight. For every 5 active referrals you have,
          you gain +0.2 bonus weight per burn, capped at 40% of your base weight.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {[5, 10, 15].map((n, i) => (
            <div key={n} className="glass rounded-lg p-2">
              <div className="text-muted-foreground">{n} referrals</div>
              <div className="font-mono font-bold text-fire mt-1">+{(0.2 * (i + 1)).toFixed(1)} wt</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Referrals list */}
      <GlassCard>
        <div className="text-sm font-semibold mb-4">
          Your referrals ({loading ? "…" : referrals.length})
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No referrals yet — share your code!</div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 glass rounded-lg px-4 py-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${r.active ? "bg-success" : "bg-muted-foreground"}`} />
                <span className="text-sm flex-1">{r.username}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(r.joinedAt)}</span>
                <span className="text-xs text-muted-foreground">{r.burnCount} burns</span>
                <span className="font-mono text-sm text-success">+{fmtUsd(r.earned)}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
      </Reveal>
    </AppShell>
  );
}

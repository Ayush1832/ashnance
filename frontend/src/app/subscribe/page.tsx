"use client";

import { useState } from "react";
import { Star, Flame, Zap, Shield } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { Reveal } from "@/components/motion/Reveal";
import { GlassCard, SectionHeader, FireButton } from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { calcWeight, calcAsh } from "@/lib/mock";
import { fmtUsd, fmtNum, countdown } from "@/lib/format";
import { api } from "@/lib/apiClient";

const VIP_PRICE = 24.99;
const VIP_DAYS = 30;

const BENEFITS = [
  { icon: <Flame className="h-5 w-5 text-primary" />, title: "+0.5 Weight per Burn", desc: "Every burn you make gains an extra 0.5 weight on top of the base formula." },
  { icon: <Zap className="h-5 w-5 text-ash" />, title: "+20% ASH Rewards", desc: "Earn 20% more ASH tokens on every burn automatically." },
  { icon: <Star className="h-5 w-5 text-gold" />, title: "VIP Badge", desc: "Exclusive Holy Fire badge displayed on your profile and the leaderboard." },
  { icon: <Shield className="h-5 w-5 text-[oklch(0.7_0.13_245)]" />, title: "Priority Support", desc: "Dedicated support channel with faster response times." },
];

export default function VipPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [simAmount, setSimAmount] = useState(25);

  const isVip = user.vip === "HOLY_FIRE";

  const withoutVip = calcWeight(simAmount, { vip: false });
  const withVip    = calcWeight(simAmount, { vip: true });
  const ashWithout = calcAsh(simAmount, false);
  const ashWith    = calcAsh(simAmount, true);

  async function subscribe() {
    setLoading(true);
    try {
      await api.subscribeVip("HOLY_FIRE");
      toast.success("Holy Fire VIP activated for 30 days!");
    } catch { toast.error("Subscription failed"); }
    setLoading(false);
  }

  return (
    <AppShell>
      <Reveal>
        <SectionHeader eyebrow="VIP" title="Holy Fire VIP" sub="Burn harder. Earn more. Stand out." />
      </Reveal>

      <Reveal delay={0.08}>
      {/* Status card */}
      {isVip ? (
        <GlassCard ring className="mb-6 border border-gold/40">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-gold shrink-0" />
            <div>
              <div className="font-display text-lg font-bold text-gold">Holy Fire VIP — Active</div>
              {user.vipExpiresAt && (
                <div className="text-sm text-muted-foreground">
                  Expires in <span className="font-mono text-foreground">{countdown(user.vipExpiresAt)}</span>
                </div>
              )}
            </div>
            <div className="ml-auto">
              <FireButton onClick={subscribe} disabled={loading} size="sm">
                Renew · {fmtUsd(VIP_PRICE)}
              </FireButton>
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard ring className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-gold shrink-0" />
              <div>
                <div className="font-display text-lg font-bold">Unlock Holy Fire VIP</div>
                <div className="text-sm text-muted-foreground">{fmtUsd(VIP_PRICE)} / {VIP_DAYS} days</div>
              </div>
            </div>
            <div className="sm:ml-auto">
              <FireButton onClick={subscribe} disabled={loading} size="lg">
                <Star className="h-4 w-4" />{loading ? "Processing…" : `Subscribe · ${fmtUsd(VIP_PRICE)}`}
              </FireButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Benefits grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {BENEFITS.map((b) => (
          <GlassCard key={b.title} className="flex gap-4">
            <div className="shrink-0 mt-0.5">{b.icon}</div>
            <div>
              <div className="font-semibold text-sm">{b.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.desc}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Burn simulator */}
      <GlassCard>
        <div className="text-sm font-medium mb-4">Burn simulator — see VIP impact</div>
        <div className="flex items-center gap-3 mb-5">
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={simAmount}
            onChange={(e) => setSimAmount(Number(e.target.value))}
            className="flex-1 accent-fire"
          />
          <span className="font-mono text-sm w-16 text-right">{fmtUsd(simAmount)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Without VIP</div>
            <div className="font-mono text-xl font-bold">{withoutVip.final.toFixed(2)} wt</div>
            <div className="text-xs text-muted-foreground mt-1">+{fmtNum(ashWithout)} ASH</div>
          </div>
          <div className="glass rounded-lg p-4 border border-gold/30">
            <div className="text-xs uppercase tracking-wider text-gold mb-2">With Holy Fire VIP</div>
            <div className="font-mono text-xl font-bold text-gold">{withVip.final.toFixed(2)} wt</div>
            <div className="text-xs text-muted-foreground mt-1">+{fmtNum(ashWith)} ASH</div>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span>Extra weight: <span className="font-mono text-foreground">+{(withVip.final - withoutVip.final).toFixed(2)}</span></span>
          <span>Extra ASH: <span className="font-mono text-ash">+{fmtNum(ashWith - ashWithout)}</span></span>
        </div>
      </GlassCard>
      </Reveal>
    </AppShell>
  );
}

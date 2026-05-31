"use client";

import { Marquee } from "@/components/motion/Marquee";
import { Coins, Flame, Lock, Shield, Trophy, Users, Wallet, Zap } from "lucide-react";

const CHIPS = [
  { icon: Coins, label: "USDC prize pools" },
  { icon: Flame, label: "Deflationary burns" },
  { icon: Shield, label: "On-chain settlement" },
  { icon: Trophy, label: "Winner takes all" },
  { icon: Zap, label: "ASH boosts" },
  { icon: Lock, label: "2FA withdrawals" },
  { icon: Wallet, label: "Self-custody payouts" },
  { icon: Users, label: "Referral rewards" },
];

export function TrustBar() {
  return (
    <section aria-label="Platform highlights" className="relative border-y border-border/60 bg-white/[0.015] py-6">
      <Marquee>
        {CHIPS.map((c) => (
          <div
            key={c.label}
            className="mx-3 inline-flex items-center gap-2.5 whitespace-nowrap text-sm text-muted-foreground"
          >
            <c.icon className="size-4 text-primary/80" />
            {c.label}
            <span className="ml-6 text-border">/</span>
          </div>
        ))}
      </Marquee>
    </section>
  );
}

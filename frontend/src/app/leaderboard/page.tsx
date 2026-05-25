"use client";

import { useState } from "react";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, RankBadge } from "@/components/ashnance/primitives";
import { mockLeaderboards, mockRound } from "@/lib/mock";
import { fmtUsd, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/types";

type Tab = "round" | "winners" | "burners" | "referrers" | "ash";

const TABS: { key: Tab; label: string }[] = [
  { key: "round",     label: "Current Round" },
  { key: "winners",   label: "All-Time Winners" },
  { key: "burners",   label: "Top Burners" },
  { key: "referrers", label: "Top Referrers" },
  { key: "ash",       label: "Most ASH" },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("round");

  return (
    <AppShell>
      <SectionHeader eyebrow="Standings" title="Leaderboard" sub="All-time winners, top burners, top referrers, and ASH holders." />

      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-5 text-xs overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 h-8 rounded whitespace-nowrap px-3 transition",
              tab === t.key ? "bg-fire text-background font-semibold" : "text-muted-foreground hover:text-foreground",
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "round" && <RoundTab />}
      {tab === "winners" && <GlobalTab rows={mockLeaderboards.winners} primary="USDC Won" secondary="Rounds Won" primaryFmt={(v) => fmtUsd(v)} />}
      {tab === "burners" && <GlobalTab rows={mockLeaderboards.burners} primary="Total Burned" secondary="Burns" primaryFmt={(v) => fmtUsd(v)} />}
      {tab === "referrers" && <GlobalTab rows={mockLeaderboards.referrers} primary="Referral Earned" secondary="Referrals" primaryFmt={(v) => fmtUsd(v)} />}
      {tab === "ash" && <GlobalTab rows={mockLeaderboards.ash} primary="ASH Earned" primaryFmt={(v) => fmtNum(v) + " ASH"} />}
    </AppShell>
  );
}

function Podium({ rows }: { rows: { rank: number; username: string; primary: number; fmtPrimary: (v: number) => string; anonymous?: boolean; isYou?: boolean }[] }) {
  const [second, first, third] = [rows[1], rows[0], rows[2]];
  const item = (r: typeof first, height: string) => r ? (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="text-xs text-muted-foreground truncate max-w-[100px]">{r.anonymous ? "Anonymous" : r.username}{r.isYou ? " (you)" : ""}</div>
      <div className="font-mono text-sm font-semibold">{r.fmtPrimary(r.primary)}</div>
      <div className={cn("w-full rounded-t-md flex items-end justify-center pb-2 font-bold text-xl", height, {
        "bg-gradient-to-b from-yellow-400/30 to-yellow-600/10": r.rank === 1,
        "bg-gradient-to-b from-zinc-300/20 to-zinc-500/5": r.rank === 2,
        "bg-gradient-to-b from-amber-700/20 to-amber-900/5": r.rank === 3,
      })}>
        <RankBadge rank={r.rank} />
      </div>
    </div>
  ) : null;

  return (
    <div className="flex items-end gap-2 px-4 mb-5" style={{ height: 160 }}>
      {item(second, "h-[90px]")}
      {item(first, "h-[130px]")}
      {item(third, "h-[70px]")}
    </div>
  );
}

function RoundTab() {
  return (
    <div>
      <div className="mb-4">
        <Podium rows={mockRound.leaderboard.slice(0, 3).map((r) => ({
          rank: r.rank,
          username: r.username,
          primary: r.weight,
          anonymous: r.isAnonymous,
          isYou: r.isYou,
          fmtPrimary: (v: number) => v.toFixed(2) + " wt",
        }))} />
      </div>
      <GlassCard className="p-0 overflow-hidden">
        <div className="divide-y divide-border">
          {mockRound.leaderboard.map((r) => (
            <div key={r.userId} className={cn(
              "flex items-center gap-3 px-5 py-3 text-sm",
              r.isYou && "bg-[rgba(255,69,0,0.08)]",
            )}>
              <RankBadge rank={r.rank} />
              <span className="flex-1">{r.isAnonymous ? "Anonymous" : r.username}{r.isYou ? " (you)" : ""}</span>
              <span className="font-mono text-fire">{r.weight.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function GlobalTab({ rows, primary, secondary, primaryFmt }: {
  rows: LeaderboardRow[];
  primary: string;
  secondary?: string;
  primaryFmt: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-4">
        <Podium rows={rows.slice(0, 3).map((r) => ({ ...r, fmtPrimary: primaryFmt }))} />
      </div>
      <GlassCard className="p-0 overflow-hidden">
        <div className="grid text-xs uppercase tracking-wider text-muted-foreground px-5 py-2 border-b border-border"
          style={{ gridTemplateColumns: "2rem 1fr auto auto" }}>
          <span>#</span><span>User</span>
          {secondary && <span className="text-right mr-6">{secondary}</span>}
          <span className="text-right">{primary}</span>
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.rank}
              className={cn("grid items-center px-5 py-3 text-sm gap-3", r.isYou && "bg-[rgba(255,69,0,0.08)]")}
              style={{ gridTemplateColumns: "2rem 1fr auto auto" }}>
              <RankBadge rank={r.rank} />
              <span className={cn("truncate", r.isYou && "font-medium")}>{r.anonymous ? "Anonymous" : r.username}{r.isYou ? " (you)" : ""}</span>
              {secondary && r.secondary !== undefined
                ? <span className="font-mono text-muted-foreground text-right">{fmtNum(r.secondary)}</span>
                : secondary ? <span /> : null}
              <span className="font-mono text-right text-fire">{primaryFmt(r.primary)}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

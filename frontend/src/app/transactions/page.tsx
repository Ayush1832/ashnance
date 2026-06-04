"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/ashnance/AppShell";
import { Reveal } from "@/components/motion/Reveal";
import { GlassCard, SectionHeader } from "@/components/ashnance/primitives";
import { api } from "@/lib/apiClient";
import { fmtNum } from "@/lib/format";

type TxType = "ALL" | "BURN" | "WIN" | "DEPOSIT" | "WITHDRAW" | "REFERRAL" | "VIP" | "BOOST" | "ASH_CLAIM" | "STAKE";

const FILTER_TABS: { key: TxType; label: string }[] = [
  { key: "ALL",       label: "All"          },
  { key: "BURN",      label: "🔥 Burns"     },
  { key: "WIN",       label: "💥 Wins"      },
  { key: "DEPOSIT",   label: "💵 Deposits"  },
  { key: "WITHDRAW",  label: "↗ Withdrawals" },
  { key: "REFERRAL",  label: "👥 Referral"  },
  { key: "VIP",       label: "👑 VIP"       },
  { key: "BOOST",     label: "⚡ Boost"     },
  { key: "ASH_CLAIM", label: "🪙 ASH Claim" },
  { key: "STAKE",     label: "🌱 Staking"   },
];

const TX_ICONS: Record<string, string> = {
  BURN:      "🔥",
  WIN:       "💥",
  DEPOSIT:   "💵",
  WITHDRAW:  "↗",
  REFERRAL:  "👥",
  VIP:       "👑",
  BOOST:     "⚡",
  ASH_CLAIM: "🪙",
  STAKE:     "🌱",
};

interface Tx {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  desc: string;
  date: string;
}

function amountColor(tx: Tx) {
  if (tx.currency === "ASH") return "text-ash";
  if (tx.type === "WIN" || tx.type === "DEPOSIT" || tx.type === "REFERRAL") return "text-success";
  if (tx.type === "BURN" || tx.type === "WITHDRAW") return "text-fire";
  return "text-foreground";
}

function statusBadge(status: string) {
  if (status === "COMPLETED") return <span className="text-[10px] text-success">✓ Completed</span>;
  if (status === "PROCESSING") return <span className="text-[10px] text-warning">⏳ Processing</span>;
  if (status === "PENDING")    return <span className="text-[10px] text-warning">⏳ Pending</span>;
  return <span className="text-[10px] text-muted-foreground">{status}</span>;
}

export default function TransactionsPage() {
  const [filter, setFilter]   = useState<TxType>("ALL");
  const [search, setSearch]   = useState("");
  const [txList, setTxList]   = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.transactions({ type: filter !== "ALL" ? filter : undefined })
      .then((res) => {
        if (res.success) {
          const items = (res.data as any)?.items ?? [];
          setTxList(items.map((t: any) => ({
            id:       t.id,
            type:     t.type,
            amount:   Number(t.amount),
            currency: t.currency ?? t.asset ?? "USDC",
            status:   t.status,
            desc:     t.description ?? t.desc ?? t.type,
            date:     new Date(t.createdAt ?? t.at ?? t.date ?? Date.now()).toLocaleDateString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            }),
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = txList.filter((tx) => {
    if (filter !== "ALL" && tx.type !== filter) return false;
    const q = search.toLowerCase();
    if (q && !tx.desc.toLowerCase().includes(q) && !tx.id.toLowerCase().includes(q)) return false;
    return true;
  });

  const totalIn  = filtered.filter((t) => t.amount > 0 && t.currency === "USDC").reduce((s, t) => s + t.amount, 0);
  const totalOut = Math.abs(filtered.filter((t) => t.amount < 0 && t.currency === "USDC").reduce((s, t) => s + t.amount, 0));

  return (
    <AppShell>
      <Reveal>
        <SectionHeader eyebrow="Wallet" title="Transaction History" sub="All your burns, wins, deposits, and withdrawals." />
      </Reveal>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`h-8 px-3 rounded-md text-xs font-semibold transition border ${
              filter === tab.key
                ? "bg-fire text-background border-transparent"
                : "glass border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 px-3 rounded-md bg-muted border border-border text-sm w-full max-w-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <GlassCard className="text-center py-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Txs</div>
            <div className="font-mono text-xl font-bold">{filtered.length}</div>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total In</div>
            <div className="font-mono text-xl font-bold text-success">+${fmtNum(totalIn, 2)}</div>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Out</div>
            <div className="font-mono text-xl font-bold text-fire">-${fmtNum(totalOut, 2)}</div>
          </GlassCard>
        </div>
      )}

      {/* Transaction list */}
      <GlassCard>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No transactions found</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-3 px-1 first:pt-0 last:pb-0">
                {/* Icon */}
                <div className="w-9 h-9 rounded-full glass flex items-center justify-center text-base shrink-0">
                  {TX_ICONS[tx.type] ?? "◆"}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{tx.desc}</div>
                  <div className="text-xs text-muted-foreground truncate">{tx.date} · {tx.id.slice(0, 12)}…</div>
                </div>

                {/* Status + type badge */}
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    {tx.type.replace("_", " ")}
                  </div>
                  {statusBadge(tx.status)}
                </div>

                {/* Amount */}
                <div className={`font-mono text-sm font-semibold text-right shrink-0 ${amountColor(tx)}`}>
                  {tx.amount > 0 ? "+" : ""}{fmtNum(tx.amount, 2)} {tx.currency}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}

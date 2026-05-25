"use client";

import { useState } from "react";
import { Copy, ExternalLink, Clock, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, FireButton, GhostButton, StatusBadge, StatTile } from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { mockTransactions, mockWhitelist } from "@/lib/mock";
import { fmtUsd, fmtNum, timeAgo, countdown } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type Tab = "deposit" | "withdraw" | "history" | "whitelist";

export default function WalletPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("deposit");

  return (
    <AppShell>
      <SectionHeader eyebrow="Assets" title="Wallet" sub="Manage your USDC and ASH balances." />

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <StatTile label="USDC Balance" value={fmtUsd(user.usdcBalance)} sub="Available to burn or withdraw" accent="usdc" />
        <StatTile label="ASH Balance" value={fmtNum(user.ashBalance) + " ASH"} sub="Earned from burns" accent="ash" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-5 text-xs">
        {(["deposit","withdraw","history","whitelist"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "flex-1 h-8 rounded capitalize transition",
              tab === t ? "bg-fire text-background font-semibold" : "text-muted-foreground hover:text-foreground",
            )}>
            {t === "whitelist" ? "Whitelist" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "deposit" && <DepositTab user={user} />}
      {tab === "withdraw" && <WithdrawTab user={user} />}
      {tab === "history" && <HistoryTab />}
      {tab === "whitelist" && <WhitelistTab />}
    </AppShell>
  );
}

function DepositTab({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  function copy() {
    navigator.clipboard.writeText(user.depositAddress);
    toast.success("Address copied");
  }
  return (
    <GlassCard>
      <div className="text-sm font-medium mb-4">Your USDC deposit address (Solana)</div>
      <div className="glass rounded-lg p-4 flex items-center gap-3 mb-4">
        <span className="font-mono text-xs break-all flex-1">{user.depositAddress}</span>
        <button onClick={copy} className="shrink-0 p-1.5 rounded hover:bg-white/10 transition"><Copy className="h-4 w-4" /></button>
      </div>
      <GhostButton onClick={copy} className="w-full mb-4"><Copy className="h-4 w-4 inline mr-2" />Copy Address</GhostButton>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>Send <span className="text-foreground font-medium">USDC</span> on the <span className="text-foreground font-medium">Solana</span> network to this address.</p>
        <p>Deposits are credited automatically after 1 confirmation (usually under 30 seconds).</p>
        <p>Minimum deposit: <span className="font-mono text-foreground">$1.00</span> · No maximum.</p>
      </div>
    </GlassCard>
  );
}

function WithdrawTab({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState(user.walletAddress ?? "");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!a || a < 1 || a > user.usdcBalance) return;
    setLoading(true);
    try {
      await api.withdraw({ amount: a, address, twoFaCode: "" });
      toast.success(`Withdrawal of ${fmtUsd(a)} initiated`);
      setAmount("");
    } catch { toast.error("Withdrawal failed"); }
    setLoading(false);
  }

  return (
    <GlassCard>
      <div className="text-sm font-medium mb-4">Withdraw USDC</div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min={1}
            max={user.usdcBalance}
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Min: $1.00</span>
            <button type="button" onClick={() => setAmount(String(user.usdcBalance))}
              className="hover:text-foreground">Max: {fmtUsd(user.usdcBalance)}</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Destination address (Solana)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Solana wallet address"
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">Must be a whitelisted address with 24h cooldown.</p>
        </div>
        <FireButton type="submit" className="w-full" disabled={loading || !amount || !address}>
          <Minus className="h-4 w-4" />{loading ? "Processing…" : "Withdraw"}
        </FireButton>
      </form>
    </GlassCard>
  );
}

function HistoryTab() {
  const typeIcon: Record<string, string> = {
    BURN: "🔥", DEPOSIT: "⬇️", WITHDRAW: "⬆️", WIN: "🏆",
    REFERRAL: "👥", VIP: "⭐", BOOST: "⚡", ASH_CLAIM: "🪙",
  };

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="divide-y divide-border">
        {mockTransactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02]">
            <span className="text-xl w-7 text-center shrink-0">{typeIcon[tx.type] ?? "•"}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{tx.description}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{timeAgo(tx.at)}</span>
                <StatusBadge status={tx.status} />
                {tx.txHash && (
                  <a href={`https://solscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                    {tx.txHash} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <span className={`font-mono text-sm font-medium shrink-0 ${tx.amount > 0 ? "text-success" : "text-foreground"}`}>
              {tx.amount > 0 ? "+" : ""}{tx.asset === "USDC" ? fmtUsd(Math.abs(tx.amount)) : fmtNum(Math.abs(tx.amount)) + " ASH"}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function WhitelistTab() {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setAdding(true);
    try {
      await api.addWhitelist({ address, label });
      toast.success("Address added — 24h cooldown before active");
      setAddress(""); setLabel("");
    } catch { toast.error("Failed to add address"); }
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="text-sm font-medium mb-3">Whitelisted addresses</div>
        <div className="space-y-2">
          {mockWhitelist.map((w) => (
            <div key={w.id} className="flex items-center gap-3 glass rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{w.label ?? "Unlabeled"}</div>
                <div className="font-mono text-xs text-muted-foreground truncate">{w.address}</div>
              </div>
              <div className="text-right shrink-0">
                {w.status === "ACTIVE" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">Active</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-warning">
                    <Clock className="h-3 w-3" />
                    {w.activatesAt ? countdown(w.activatesAt) : "Pending"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-medium mb-4">Add new address</div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Phantom main)"
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Solana wallet address"
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">New addresses have a 24-hour cooldown before they can be used for withdrawals.</p>
          <FireButton type="submit" className="w-full" disabled={adding || !address}>
            <Plus className="h-4 w-4" />{adding ? "Adding…" : "Add Address"}
          </FireButton>
        </form>
      </GlassCard>
    </div>
  );
}

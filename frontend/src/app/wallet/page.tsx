"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ExternalLink, Clock, Plus, Minus, Copy, Check as CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { Reveal } from "@/components/motion/Reveal";
import { GlassCard, SectionHeader, FireButton, GhostButton, StatusBadge, StatTile } from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { fmtUsd, fmtNum, timeAgo, countdown } from "@/lib/format";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { cn } from "@/lib/utils";
import type { Transaction, WhitelistAddress } from "@/lib/types";

type Tab = "deposit" | "withdraw" | "history" | "whitelist";

export default function WalletPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("deposit");

  return (
    <AppShell>
      <Reveal>
        <SectionHeader eyebrow="Assets" title="Wallet" sub="Manage your USDC and ASH balances." />
      </Reveal>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <StatTile label="USDC Balance" value={fmtUsd(user.usdcBalance)} sub="Available to burn or withdraw" accent="usdc" />
        <StatTile label="ASH Balance" value={fmtNum(user.ashBalance) + " ASH"} sub="Earned from burns" accent="ash" />
      </div>

      {/* Tab switcher */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-full glass p-1 text-xs">
        {(["deposit","withdraw","history","whitelist"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "h-8 flex-1 whitespace-nowrap rounded-full capitalize transition-all duration-300",
              tab === t
                ? "bg-fire font-semibold text-background shadow-[0_4px_14px_-4px_rgba(255,69,0,0.55)]"
                : "text-muted-foreground hover:text-foreground",
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
  const [depositAddress, setDepositAddress] = useState<string>(user.depositAddress ?? "");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ credited: boolean; amount: number } | null>(null);

  useEffect(() => {
    if (!depositAddress) {
      api.wallet().then((res) => {
        if (res.success && res.data?.depositAddress) setDepositAddress(res.data.depositAddress as string);
      }).catch(() => {});
    }
  }, [depositAddress]);

  function copy() {
    if (!depositAddress) return;
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function checkDeposit() {
    setChecking(true);
    setResult(null);
    try {
      const res = await api.checkDeposit();
      setResult({ credited: res.data.credited, amount: res.data.amount });
      if (res.data.credited) {
        toast.success(`${fmtUsd(res.data.amount)} credited to your balance`);
        api.profile()
          .then((r) => { if (r.success && r.data) userStore.update(mapProfile(r.data as Record<string, unknown>)); })
          .catch(() => {});
      } else {
        toast("No USDC found yet", { description: "Make sure you sent to the address above and the transaction is confirmed." });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check failed");
    }
    setChecking(false);
  }

  return (
    <GlassCard>
      <div className="text-sm font-medium mb-4">Deposit USDC</div>

      <div className="mb-5">
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Send <span className="text-foreground font-medium">USDC on Solana</span> from any wallet to your unique deposit address below. Any amount, any wallet — no connection required.
        </p>

        <label className="text-xs text-muted-foreground mb-1.5 block">Your deposit address</label>
        <div className="flex items-center gap-2 glass rounded-lg px-4 py-3">
          <span className="flex-1 font-mono text-xs break-all text-foreground leading-relaxed">
            {depositAddress || "Loading…"}
          </span>
          <button
            type="button"
            onClick={copy}
            disabled={!depositAddress}
            className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Minimum deposit: <span className="font-mono text-foreground">$1.00 USDC</span></p>
      </div>

      <div className="mb-5 rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex gap-2"><span className="text-foreground font-medium">1.</span> Copy your deposit address above</div>
        <div className="flex gap-2"><span className="text-foreground font-medium">2.</span> Open any wallet (Phantom, Backpack, exchange, etc.)</div>
        <div className="flex gap-2"><span className="text-foreground font-medium">3.</span> Send USDC on Solana to that address</div>
        <div className="flex gap-2"><span className="text-foreground font-medium">4.</span> Click the button below once sent</div>
      </div>

      <FireButton onClick={checkDeposit} className="w-full" disabled={checking || !depositAddress}>
        <Plus className="h-4 w-4" />
        {checking ? "Checking…" : "I've sent USDC — check now"}
      </FireButton>

      {result && !result.credited && (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          No USDC found at your deposit address yet. Wait for your transaction to confirm on Solana (usually &lt;30s) then try again.
        </div>
      )}
    </GlassCard>
  );
}

function WithdrawTab({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState(user.walletAddress ?? "");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!a || a < 10 || a > user.usdcBalance) return;
    setLoading(true);
    try {
      await api.withdraw({ amount: a, address, twoFaCode });
      toast.success(`Withdrawal of ${fmtUsd(a)} initiated`);
      setAmount("");
      setTwoFaCode("");
      // Refresh balance in header
      api.profile()
        .then((r) => { if (r.success && r.data) userStore.update(mapProfile(r.data as Record<string, unknown>)); })
        .catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    }
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
            min={10}
            max={user.usdcBalance}
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Min: $10.00</span>
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
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">2FA Code</label>
          <input
            type="text"
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value)}
            placeholder="6-digit code"
            maxLength={6}
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm font-mono tracking-widest"
          />
        </div>
        <FireButton type="submit" className="w-full" disabled={loading || !amount || !address}>
          <Minus className="h-4 w-4" />{loading ? "Processing…" : "Withdraw"}
        </FireButton>
      </form>
    </GlassCard>
  );
}

function HistoryTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.transactions()
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as { items?: Transaction[] } | Transaction[];
          const items = Array.isArray(d) ? d : (d.items ?? []);
          setTransactions(items);
        }
      })
      .catch(() => toast.error("Failed to load transactions"))
      .finally(() => setLoading(false));
  }, []);

  const typeIcon: Record<string, string> = {
    BURN: "🔥", DEPOSIT: "⬇️", WITHDRAW: "⬆️", WIN: "🏆",
    REFERRAL: "👥", VIP: "⭐", BOOST: "⚡", ASH_CLAIM: "🪙", STAKE: "🌱",
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="text-sm text-muted-foreground text-center py-8">Loading transactions…</div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-0 overflow-hidden">
      {transactions.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No transactions yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/2">
              <span className="text-xl w-7 text-center shrink-0">{typeIcon[tx.type] ?? "•"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{tx.description}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{timeAgo(tx.at)}</span>
                  <StatusBadge status={tx.status} />
                  {tx.txHash && (
                    <a href={`https://solscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                      {tx.txHash.slice(0, 8)}… <ExternalLink className="h-3 w-3" />
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
      )}
    </GlassCard>
  );
}

function WhitelistTab() {
  const [whitelist, setWhitelist] = useState<WhitelistAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.whitelist()
      .then((res) => {
        if (res.success && res.data) setWhitelist(res.data as WhitelistAddress[]);
      })
      .catch(() => toast.error("Failed to load whitelist"))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setAdding(true);
    try {
      await api.addWhitelist({ address, label });
      toast.success("Address added — 24h cooldown before active");
      setAddress(""); setLabel("");
      // Refresh whitelist
      const res = await api.whitelist();
      if (res.success && res.data) setWhitelist(res.data as WhitelistAddress[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add address");
    }
    setAdding(false);
  }

  async function removeAddress(id: string) {
    try {
      await api.deleteWhitelist(id);
      setWhitelist((prev) => prev.filter((w) => w.id !== id));
      toast.success("Address removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove address");
    }
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="text-sm font-medium mb-3">Whitelisted addresses</div>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
        ) : whitelist.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">No addresses whitelisted yet.</div>
        ) : (
          <div className="space-y-2">
            {whitelist.map((w) => (
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
                <button
                  onClick={() => removeAddress(w.id)}
                  className="ml-2 text-xs text-danger hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
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

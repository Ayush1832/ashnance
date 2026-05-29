"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Clock, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, FireButton, GhostButton, StatusBadge, StatTile } from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { fmtUsd, fmtNum, timeAgo, countdown } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { mapProfile } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { walletOptions, connectWallet, sendUsdcTransfer, truncate, type WalletProvider } from "@/lib/solana";
import type { Transaction, WhitelistAddress } from "@/lib/types";

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
  const [amount, setAmount] = useState("");
  // Always require an explicit connect in this tab: a wallet extension does not
  // expose a live publicKey (needed to sign the transfer) until connect() is
  // called this session, even if the user's address is known from a prior login.
  const [connectedAddr, setConnectedAddr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<WalletProvider | null>(null);
  const [depositing, setDepositing] = useState(false);

  async function connect(providerId: WalletProvider) {
    setConnecting(providerId);
    try {
      const { address } = await connectWallet(providerId);
      setConnectedAddr(address);
      toast.success("Wallet connected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect wallet");
    }
    setConnecting(null);
  }

  async function deposit() {
    const a = parseFloat(amount);
    if (!a || a < 1) { toast.error("Minimum deposit is $1.00"); return; }
    if (!connectedAddr) { toast.error("Connect a wallet first"); return; }
    setDepositing(true);
    try {
      const info = await api.walletPlatformInfo();
      if (!info.success || !info.data?.masterWallet) throw new Error("Could not load deposit details");
      const txHash = await sendUsdcTransfer({
        address: connectedAddr,
        masterWallet: info.data.masterWallet,
        usdcMint: info.data.usdcMint,
        amount: a,
        network: info.data.network,
        memo: user.id,
      });
      await api.deposit({ txHash });
      toast.success(`Deposited ${fmtUsd(a)}`);
      setAmount("");
      // Refresh balance in header
      api.profile()
        .then((r) => { if (r.success && r.data) userStore.update(mapProfile(r.data as Record<string, unknown>)); })
        .catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deposit failed");
    }
    setDepositing(false);
  }

  return (
    <GlassCard>
      <div className="text-sm font-medium mb-4">Deposit USDC</div>

      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1 block">Amount (USDC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min={1}
          className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">Minimum deposit: <span className="font-mono text-foreground">$1.00</span></p>
      </div>

      {connectedAddr ? (
        <>
          <div className="glass rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Paying from</span>
            <span className="font-mono">{truncate(connectedAddr, 6)}</span>
          </div>
          <FireButton onClick={deposit} className="w-full" disabled={depositing || !amount}>
            <Plus className="h-4 w-4" />
            {depositing ? "Confirm in your wallet…" : `Deposit ${amount && parseFloat(amount) > 0 ? fmtUsd(parseFloat(amount)) : "USDC"}`}
          </FireButton>
        </>
      ) : (
        <div>
          <div className="text-xs text-muted-foreground mb-2">Connect a wallet to deposit</div>
          <div className="grid grid-cols-2 gap-2">
            {walletOptions.map((w) => (
              <GhostButton key={w.id} onClick={() => connect(w.id)} disabled={!!connecting} className="w-full">
                <span className="mr-2">{w.icon}</span>{connecting === w.id ? "Connecting…" : w.name}
              </GhostButton>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 text-xs text-muted-foreground mt-4">
        <p>You&apos;ll approve a <span className="text-foreground font-medium">USDC</span> transfer on the <span className="text-foreground font-medium">Solana</span> network in your wallet.</p>
        <p>Funds are credited to your balance once the transaction is confirmed (usually under 30 seconds).</p>
      </div>
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
    if (!a || a < 1 || a > user.usdcBalance) return;
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

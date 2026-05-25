"use client";

import { useState } from "react";
import { AlertTriangle, Play, StopCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, FireButton, GhostButton, StatTile, FireProgress } from "@/components/ashnance/primitives";
import { mockOwnerSolvency, mockProfitPool, mockPendingWithdrawal, mockRound, mockBurnConfig } from "@/lib/mock";
import { fmtUsd, fmtNum } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type Tab = "solvency" | "round" | "config";

export default function OwnerPage() {
  const [tab, setTab] = useState<Tab>("solvency");

  return (
    <AppShell>
      <SectionHeader eyebrow="Control" title="Owner" sub="Solvency, withdrawals, round management, and burn config." />

      {/* Solvency alert */}
      {!mockOwnerSolvency.solvent && (
        <div className="glass rounded-lg px-4 py-3 mb-5 flex items-center gap-3 border border-danger/40 text-danger">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Platform is under-collateralised. Immediate action required.</span>
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-5 text-xs w-fit">
        {(["solvency","round","config"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("h-8 px-5 rounded capitalize transition",
              tab === t ? "bg-fire text-background font-semibold" : "text-muted-foreground hover:text-foreground")}>
            {t === "solvency" ? "Solvency" : t === "round" ? "Round Mgmt" : "Config"}
          </button>
        ))}
      </div>

      {tab === "solvency" && <SolvencyTab />}
      {tab === "round" && <RoundTab />}
      {tab === "config" && <EmissionTab />}
    </AppShell>
  );
}

function SolvencyTab() {
  const s = mockOwnerSolvency;
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function initiateWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!a || !address) return;
    setLoading(true);
    try {
      await api.ownerInitiateWithdrawal(a);
      toast.success("Withdrawal initiated — awaiting second signature");
      setAmount(""); setAddress("");
    } catch { toast.error("Failed"); }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Solvency tiles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="On-chain USDC" value={fmtUsd(s.onChainUsdc)} sub="Master wallet" accent="usdc" />
        <StatTile label="Total Liabilities" value={fmtUsd(s.total)} sub="User bal + pools" accent="fire" />
        <StatTile label="Solvency Ratio"
          value={s.ratio.toFixed(3) + "×"}
          sub={s.solvent ? "Solvent" : "INSOLVENT"}
          accent={s.solvent ? "ash" : "fire"}
          className={!s.solvent ? "border border-danger/40" : ""}
        />
        <StatTile label="Profit Pool" value={fmtUsd(mockProfitPool.balance)} sub={`${fmtUsd(mockProfitPool.totalDeposited)} deposited`} accent="gold" />
      </div>

      {/* Liabilities breakdown */}
      <GlassCard>
        <div className="text-sm font-semibold mb-4">Liabilities breakdown</div>
        <div className="space-y-3">
          {Object.entries(s.liabilities).map(([k, v]) => {
            const label: Record<string, string> = {
              userBalances: "User USDC balances",
              rewardPool: "Reward pool",
              profitPool: "Profit pool",
              referralPool: "Referral pool",
            };
            return (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{label[k] ?? k}</span>
                  <span className="font-mono">{fmtUsd(v)}</span>
                </div>
                <FireProgress value={v} max={s.onChainUsdc} />
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Profit withdrawal */}
      <GlassCard>
        <div className="text-sm font-semibold mb-2">Profit withdrawal (2-sig)</div>
        <p className="text-sm text-muted-foreground mb-4">
          Withdrawals from the profit pool require two owner signatures. Initiate below — the second owner will receive a notification.
        </p>
        {mockPendingWithdrawal ? (
          <div className="glass rounded-lg px-4 py-3 border border-warning/30">
            <div className="text-sm font-medium text-warning">Pending withdrawal: {fmtUsd(mockPendingWithdrawal.amount)}</div>
            <div className="text-xs text-muted-foreground mt-1">Initiated by {mockPendingWithdrawal.initiatedBy}</div>
            <div className="mt-3 flex gap-2">
              <FireButton size="sm" onClick={() => toast.success("Withdrawal approved and executed")}>Approve & Execute</FireButton>
              <GhostButton size="sm" onClick={() => toast.success("Withdrawal cancelled")}>Cancel</GhostButton>
            </div>
          </div>
        ) : (
          <form onSubmit={initiateWithdrawal} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 max-w-2xl">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (USDC)"
              className="h-10 px-3 rounded-md bg-muted border border-border text-sm" />
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Destination address"
              className="h-10 px-3 rounded-md bg-muted border border-border text-sm font-mono" />
            <FireButton type="submit" disabled={loading || !amount || !address}>
              <Download className="h-4 w-4" />{loading ? "Initiating…" : "Initiate"}
            </FireButton>
          </form>
        )}
      </GlassCard>
    </div>
  );
}

function RoundTab() {
  const [loading, setLoading] = useState<string | null>(null);

  async function action(name: string, fn: () => Promise<unknown>) {
    setLoading(name);
    try { await fn(); toast.success(`${name} successful`); }
    catch { toast.error(`${name} failed`); }
    setLoading(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatTile label="Current Round" value={`#${mockRound.number}`} sub={mockRound.status} accent="fire" />
        <StatTile label="Prize Pool" value={fmtUsd(mockRound.prizePool)} sub={`target ${fmtUsd(mockRound.prizePoolTarget)}`} accent="usdc" />
        <StatTile label="Burns / 60s" value={fmtNum(mockRound.burnsLast60s)} sub="live activity" accent="ash" />
      </div>

      <GlassCard>
        <div className="text-sm font-semibold mb-4">Round controls</div>
        <div className="flex flex-wrap gap-3">
          <FireButton
            onClick={() => action("Start round", () => api.adminStats())}
            disabled={!!loading || mockRound.status === "ACTIVE"}>
            <Play className="h-4 w-4" />{loading === "Start round" ? "Starting…" : "Start Round"}
          </FireButton>
          <GhostButton
            onClick={() => action("End round", () => api.adminStats())}
            disabled={!!loading || mockRound.status !== "ACTIVE"}>
            <StopCircle className="h-4 w-4 inline mr-1" />{loading === "End round" ? "Ending…" : "End Round"}
          </GhostButton>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Auto round creation is <span className="font-mono text-foreground">{mockBurnConfig.auto_round_creation ? "enabled" : "disabled"}</span>.
          Rounds auto-start {mockBurnConfig.round_time_limit_hours}h after the previous one ends.
        </p>
      </GlassCard>
    </div>
  );
}

function EmissionTab() {
  const halvingThreshold = mockBurnConfig.emission_halving_threshold;

  return (
    <GlassCard>
      <div className="text-sm font-semibold mb-4">Emission config</div>
      <div className="space-y-4">
        <div className="glass rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Halving threshold</div>
          <div className="font-mono text-2xl font-bold">{fmtNum(halvingThreshold)} ASH</div>
          <p className="text-xs text-muted-foreground mt-2">
            ASH rewards halve every {fmtNum(halvingThreshold)} ASH emitted.
            Each halving halves the multiplier (1 → 0.5 → 0.25 → …).
          </p>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">ASH token price</div>
          <div className="font-mono text-2xl font-bold">$0.01 USD</div>
          <p className="text-xs text-muted-foreground mt-2">
            ASH reward = floor(burnUSDC × ash_reward_percent / 0.01). A $5 burn at 1.0× multiplier = 500 ASH.
          </p>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Auto round creation</div>
          <div className="font-mono text-xl font-bold">{mockBurnConfig.auto_round_creation ? "Enabled" : "Disabled"}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure in admin config tab. When enabled, a new round starts automatically after each round ends.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

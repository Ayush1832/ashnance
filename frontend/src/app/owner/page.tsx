"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Play, StopCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, FireButton, GhostButton, StatTile, FireProgress } from "@/components/ashnance/primitives";
import { fmtUsd, fmtNum } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import type { Round, BurnConfig } from "@/lib/types";

type Tab = "solvency" | "round" | "config";

type SolvencyData = {
  onChainUsdc: number;
  liabilities: Record<string, number>;
  total: number;
  ratio: number;
  solvent: boolean;
};

type ProfitPoolData = {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
};

type PendingWithdrawal = {
  id: string;
  amount: number;
  initiatedBy: string;
  initiatedAt: string;
  status: "PENDING" | "PARTIAL";
} | null;

export default function OwnerPage() {
  const [tab, setTab] = useState<Tab>("solvency");
  const [solvency, setSolvency] = useState<SolvencyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.ownerSolvency()
      .then((res) => { if (res.success && res.data) setSolvency(res.data as SolvencyData); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <SectionHeader eyebrow="Control" title="Owner" sub="Solvency, withdrawals, round management, and burn config." />

      {/* Solvency alert */}
      {!loading && solvency && !solvency.solvent && (
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

      {tab === "solvency" && <SolvencyTab solvency={solvency} loading={loading} />}
      {tab === "round"    && <RoundTab />}
      {tab === "config"   && <EmissionTab />}
    </AppShell>
  );
}

function SolvencyTab({ solvency, loading }: { solvency: SolvencyData | null; loading: boolean }) {
  const [profitPool, setProfitPool] = useState<ProfitPoolData | null>(null);
  const [pending, setPending] = useState<PendingWithdrawal>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.ownerProfitPool()
      .then((res) => { if (res.success && res.data) setProfitPool(res.data as ProfitPoolData); })
      .catch(() => {});
    api.ownerPendingWithdrawal()
      .then((res) => { if (res.success) setPending(res.data as PendingWithdrawal); })
      .catch(() => {});
  }, []);

  async function initiateWithdrawal() {
    setSubmitting(true);
    try {
      await api.ownerInitiateWithdrawal(0); // amount/address come from server env config
      toast.success("Withdrawal initiated — awaiting second owner signature");
      const res = await api.ownerPendingWithdrawal();
      if (res.success) setPending(res.data as PendingWithdrawal);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <GlassCard>
        <div className="text-sm text-muted-foreground text-center py-8">Loading solvency data…</div>
      </GlassCard>
    );
  }

  if (!solvency) {
    return (
      <GlassCard>
        <div className="text-sm text-muted-foreground text-center py-8">No solvency data available.</div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* Solvency tiles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="On-chain USDC" value={fmtUsd(solvency.onChainUsdc)} sub="Master wallet" accent="usdc" />
        <StatTile label="Total Liabilities" value={fmtUsd(solvency.total)} sub="User bal + pools" accent="fire" />
        <StatTile
          label="Solvency Ratio"
          value={solvency.ratio.toFixed(3) + "×"}
          sub={solvency.solvent ? "Solvent" : "INSOLVENT"}
          accent={solvency.solvent ? "ash" : "fire"}
          className={!solvency.solvent ? "border border-danger/40" : ""}
        />
        <StatTile
          label="Profit Pool"
          value={profitPool ? fmtUsd(profitPool.balance) : "—"}
          sub={profitPool ? `${fmtUsd(profitPool.totalDeposited)} deposited` : undefined}
          accent="gold"
        />
      </div>

      {/* Liabilities breakdown */}
      <GlassCard>
        <div className="text-sm font-semibold mb-4">Liabilities breakdown</div>
        <div className="space-y-3">
          {Object.entries(solvency.liabilities).map(([k, v]) => {
            const label: Record<string, string> = {
              userBalances: "User USDC balances",
              rewardPool:   "Reward pool",
              profitPool:   "Profit pool",
              referralPool: "Referral pool",
            };
            return (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{label[k] ?? k}</span>
                  <span className="font-mono">{fmtUsd(v)}</span>
                </div>
                <FireProgress value={v} max={solvency.onChainUsdc} />
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
        {pending ? (
          <div className="glass rounded-lg px-4 py-3 border border-warning/30">
            <div className="text-sm font-medium text-warning">Pending withdrawal: {fmtUsd(pending.amount)}</div>
            <div className="text-xs text-muted-foreground mt-1">Initiated by {pending.initiatedBy}</div>
            <div className="mt-3 flex gap-2">
              <FireButton size="sm" onClick={async () => {
                try {
                  await api.ownerApproveWithdrawal(pending.id);
                  toast.success("Withdrawal approved and executed");
                  setPending(null);
                } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
              }}>Approve & Execute</FireButton>
              <GhostButton size="sm" onClick={async () => {
                try {
                  await api.ownerCancelWithdrawal(pending.id);
                  toast.success("Withdrawal cancelled");
                  setPending(null);
                } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
              }}>Cancel</GhostButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="glass rounded-lg px-4 py-3 text-sm text-muted-foreground">
              Withdraws the full profit pool balance and splits it 60/40 between
              the two owner wallets configured via <code className="text-foreground font-mono text-xs">OWNER_1_WALLET</code> and{" "}
              <code className="text-foreground font-mono text-xs">OWNER_2_WALLET</code>.
            </div>
            <FireButton onClick={initiateWithdrawal} disabled={submitting || !profitPool || profitPool.balance <= 0}>
              <Download className="h-4 w-4" />
              {submitting ? "Initiating…" : profitPool ? `Withdraw ${fmtUsd(profitPool.balance)}` : "Initiate Withdrawal"}
            </FireButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function RoundTab() {
  const [round, setRound] = useState<Round | null>(null);
  const [loadingRound, setLoadingRound] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    api.currentRound()
      .then((res) => { if (res.success && res.data) setRound(res.data as Round); })
      .catch(() => {})
      .finally(() => setLoadingRound(false));
  }, []);

  async function action(name: string, fn: () => Promise<unknown>) {
    setActionLoading(name);
    try {
      await fn();
      toast.success(`${name} successful`);
      // Refresh round
      const res = await api.currentRound();
      if (res.success && res.data) setRound(res.data as Round);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${name} failed`);
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatTile
          label="Current Round"
          value={loadingRound ? "—" : round ? `#${round.number}` : "None"}
          sub={round?.status ?? "No active round"}
          accent="fire"
        />
        <StatTile
          label="Prize Pool"
          value={round ? fmtUsd(round.prizePool) : "—"}
          sub={round ? `target ${fmtUsd(round.prizePoolTarget)}` : undefined}
          accent="usdc"
        />
        <StatTile
          label="Burns / 60s"
          value={round ? fmtNum(round.burnsLast60s) : "—"}
          sub="live activity"
          accent="ash"
        />
      </div>

      <GlassCard>
        <div className="text-sm font-semibold mb-4">Round controls</div>
        <div className="flex flex-wrap gap-3">
          <FireButton
            onClick={() => action("Start round", () => api.ownerCreateRound())}
            disabled={!!actionLoading || round?.status === "ACTIVE"}>
            <Play className="h-4 w-4" />
            {actionLoading === "Start round" ? "Starting…" : "Start Round"}
          </FireButton>
          <GhostButton
            onClick={() => action("End round", () => api.ownerEndRound(round!.id))}
            disabled={!!actionLoading || round?.status !== "ACTIVE"}>
            <StopCircle className="h-4 w-4 inline mr-1" />
            {actionLoading === "End round" ? "Ending…" : "End Round"}
          </GhostButton>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Use the Owner panel burn config to adjust auto round creation and time limits.
        </p>
      </GlassCard>
    </div>
  );
}

function EmissionTab() {
  const [cfg, setCfg] = useState<BurnConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.ownerBurnConfig()
      .then((res) => { if (res.success && res.data) setCfg(res.data as BurnConfig); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !cfg) {
    return (
      <GlassCard>
        <div className="text-sm text-muted-foreground text-center py-8">{loading ? "Loading config…" : "No config."}</div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="text-sm font-semibold mb-4">Emission config</div>
      <div className="space-y-4">
        <div className="glass rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Halving threshold</div>
          <div className="font-mono text-2xl font-bold">{fmtNum(cfg.emission_halving_threshold)} ASH</div>
          <p className="text-xs text-muted-foreground mt-2">
            ASH rewards halve every {fmtNum(cfg.emission_halving_threshold)} ASH emitted.
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
          <div className="font-mono text-xl font-bold">{cfg.auto_round_creation ? "Enabled" : "Disabled"}</div>
          <p className="text-xs text-muted-foreground mt-2">
            When enabled, a new round starts automatically after each round ends.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

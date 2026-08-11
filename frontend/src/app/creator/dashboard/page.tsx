"use client";

import { useState, useEffect } from "react";
import { Plus, Pause, Play, Archive, Copy, ExternalLink, Flag, BarChart3, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { Reveal } from "@/components/motion/Reveal";
import {
  GlassCard, SectionHeader, FireButton, GhostButton, StatTile, StatusBadge, EmptyState,
} from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import { fmtUsd, fmtNum, timeAgo } from "@/lib/format";
import type { Creator, CreatorPool, CreatorPoolAnalytics, CreatorReferralStats, CreatorWithdrawalRequest } from "@/lib/types";

// Flat one-time fee charged to the creator's platform USDC wallet when they
// open a pool (create or duplicate) — mirrors backend config.creatorPools.poolCreationFeeUsdc.
const POOL_CREATION_FEE_USDC = 25;

export default function CreatorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [pools, setPools] = useState<CreatorPool[]>([]);
  const [showCreatePool, setShowCreatePool] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const res = await api.creatorProfile();
      setCreator(res.data as Creator);
      const poolsRes = await api.creatorListPools();
      setPools((poolsRes.data as CreatorPool[]) ?? []);
    } catch {
      setCreator(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
      </AppShell>
    );
  }

  if (!creator) {
    return (
      <AppShell>
        <Reveal>
          <SectionHeader
            eyebrow="Creator Prize Pools"
            title="Launch your own pool"
            sub="Claim your creator profile to start running branded prize pools for your community."
          />
        </Reveal>
        <Reveal delay={0.08}>
          <ClaimProfileForm onClaimed={loadAll} />
        </Reveal>
      </AppShell>
    );
  }

  const totalPoolValue = pools.reduce((s, p) => s + Number(p.currentPoolValue), 0);
  const activePools = pools.filter((p) => p.status === "ACTIVE").length;

  return (
    <AppShell>
      <Reveal>
        <SectionHeader
          eyebrow="Creator Dashboard"
          title={creator.displayName}
          sub={creator.verified
            ? `/pool/${creator.slug} — your pools are live once created.`
            : `/pool/${creator.slug} — pools stay in Draft until admin verifies your creator profile.`}
        />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <StatTile label="Wallet Balance" value={fmtUsd(creator.wallet?.usdcBalance ?? 0)} sub="Available to withdraw" accent="usdc" />
          <StatTile label="Total Earned" value={fmtUsd(creator.wallet?.totalEarned ?? 0)} sub="Lifetime creator revenue" accent="gold" />
          <StatTile label="Active Pools" value={activePools} sub={`${pools.length} total · ${fmtUsd(totalPoolValue)} combined`} accent="fire" />
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <GlassCard className="mb-5 flex items-center justify-between">
          <div className="text-sm">
            {creator.verified ? (
              <span className="text-success">Verified — new pools go live instantly.</span>
            ) : (
              <span className="text-muted-foreground">Awaiting admin verification. You can still create pools; they&apos;ll launch as Draft.</span>
            )}
          </div>
          <FireButton size="sm" onClick={() => setShowCreatePool((v) => !v)}>
            <Plus className="h-4 w-4" /> New Pool
          </FireButton>
        </GlassCard>
      </Reveal>

      {showCreatePool && (
        <Reveal delay={0.14}>
          <CreatePoolForm
            onCreated={() => {
              setShowCreatePool(false);
              loadAll();
            }}
          />
        </Reveal>
      )}

      <Reveal delay={0.16}>
        {pools.length === 0 ? (
          <EmptyState icon={<Plus className="h-8 w-8" />} title="No pools yet" sub="Create your first prize pool above." />
        ) : (
          <div className="space-y-3 mb-6">
            {pools.map((pool) => (
              <PoolRow key={pool.id} pool={pool} creatorSlug={creator.slug} onChange={loadAll} />
            ))}
          </div>
        )}
      </Reveal>

      <Reveal delay={0.2}>
        <div className="grid sm:grid-cols-2 gap-5">
          <WithdrawalPanel wallet={creator.wallet} />
          <ReferralPanel creator={creator} pools={pools} />
        </div>
      </Reveal>
    </AppShell>
  );
}

function ClaimProfileForm({ onClaimed }: { onClaimed: () => void }) {
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!slug || !displayName) {
      toast.error("Slug and display name are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.creatorCreateProfile({ slug, displayName, bio: bio || undefined });
      toast.success("Creator profile claimed!");
      onClaimed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to claim profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard ring className="max-w-lg">
      <div className="text-sm font-semibold mb-4">Claim your creator profile</div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Pool URL slug</label>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-muted-foreground shrink-0">ashnance.com/pool/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="your-name"
              className="flex-1 glass rounded-lg px-3 py-2 text-sm font-mono outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name or brand"
            className="w-full mt-1 glass rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Bio (optional)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full mt-1 glass rounded-lg px-3 py-2 text-sm outline-none resize-none"
          />
        </div>
        <FireButton onClick={submit} disabled={submitting} className="w-full">
          {submitting ? "Claiming…" : "Claim profile"}
        </FireButton>
      </div>
    </GlassCard>
  );
}

function CreatePoolForm({ onCreated }: { onCreated: () => void }) {
  const { user, isAdmin } = useAuth();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minContribution, setMinContribution] = useState("1");
  const [creatorRevenuePercent, setCreatorRevenuePercent] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  // Admins/owners open pools fee-free (platform-run pools, not a creator's paid product) —
  // mirrors the backend exemption in creatorPoolService.chargeCreationFee.
  const canAffordFee = isAdmin || (user.usdcBalance ?? 0) >= POOL_CREATION_FEE_USDC;

  async function submit() {
    const min = Number(minContribution);
    const revenuePct = Number(creatorRevenuePercent) / 100;
    if (!slug || !name || !min || min <= 0) {
      toast.error("Pool slug, name, and a valid minimum contribution are required");
      return;
    }
    if (!canAffordFee) {
      toast.error(`You need at least ${fmtUsd(POOL_CREATION_FEE_USDC)} USDC in your wallet to open a pool.`);
      return;
    }
    setSubmitting(true);
    try {
      await api.creatorCreatePool({
        slug,
        name,
        description: description || undefined,
        minContribution: min,
        creatorRevenuePercent: revenuePct,
      });
      toast.success("Pool created!");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create pool");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard className="mb-5 max-w-lg">
      <div className="text-sm font-semibold mb-1">Create a prize pool</div>
      <div className="text-xs text-muted-foreground mb-4">
        {isAdmin ? (
          "You're exempt from the pool creation fee as an admin/owner."
        ) : (
          <>
            A one-time {fmtUsd(POOL_CREATION_FEE_USDC)} USDC fee is charged from your wallet to open this pool.
            {" "}Your balance: <span className={canAffordFee ? "text-foreground" : "text-danger"}>{fmtUsd(user.usdcBalance ?? 0)}</span>
          </>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Pool slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="summer-giveaway"
            className="w-full mt-1 glass rounded-lg px-3 py-2 text-sm font-mono outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Pool name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer Giveaway"
            className="w-full mt-1 glass rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full mt-1 glass rounded-lg px-3 py-2 text-sm outline-none resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Min contribution (USDC)</label>
            <input
              type="number"
              value={minContribution}
              onChange={(e) => setMinContribution(e.target.value)}
              className="w-full mt-1 glass rounded-lg px-3 py-2 text-sm font-mono outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Your revenue %</label>
            <input
              type="number"
              value={creatorRevenuePercent}
              onChange={(e) => setCreatorRevenuePercent(e.target.value)}
              className="w-full mt-1 glass rounded-lg px-3 py-2 text-sm font-mono outline-none"
            />
          </div>
        </div>
        <FireButton onClick={submit} disabled={submitting || !canAffordFee} className="w-full">
          {submitting ? "Creating…" : isAdmin ? "Create pool" : `Create pool (${fmtUsd(POOL_CREATION_FEE_USDC)} fee)`}
        </FireButton>
      </div>
    </GlassCard>
  );
}

function PoolRow({ pool, creatorSlug, onChange }: { pool: CreatorPool; creatorSlug: string; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<CreatorPoolAnalytics | null>(null);
  const publicUrl = `/pool/${creatorSlug}/${pool.slug}`;

  async function run(action: () => Promise<unknown>, label: string) {
    setBusy(true);
    try {
      await action();
      toast.success(label);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAnalytics() {
    if (!showAnalytics && !analytics) {
      try {
        const res = await api.creatorPoolAnalytics(pool.id);
        setAnalytics(res.data as CreatorPoolAnalytics);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load analytics");
        return;
      }
    }
    setShowAnalytics((v) => !v);
  }

  async function endPool() {
    if (!confirm(`End "${pool.name}" now? This selects the winner(s) by weight and pays out the pool immediately.`)) return;
    await run(() => api.creatorEndPool(pool.id), "Pool ended and prize paid out");
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{pool.name}</span>
            <StatusBadge status={pool.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {fmtUsd(pool.currentPoolValue)} pool value · created {timeAgo(pool.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`); toast.success("Link copied"); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-4 w-4" />
          </button>
          <GhostButton size="sm" onClick={toggleAnalytics}>
            <BarChart3 className="h-3.5 w-3.5" />
          </GhostButton>
          {pool.status === "ACTIVE" && (
            <>
              <GhostButton size="sm" disabled={busy} onClick={() => run(() => api.creatorPausePool(pool.id), "Pool paused")}>
                <Pause className="h-3.5 w-3.5" />
              </GhostButton>
              <GhostButton size="sm" disabled={busy} onClick={endPool}>
                <Flag className="h-3.5 w-3.5" />
              </GhostButton>
            </>
          )}
          {pool.status === "PAUSED" && (
            <>
              <GhostButton size="sm" disabled={busy} onClick={() => run(() => api.creatorResumePool(pool.id), "Pool resumed")}>
                <Play className="h-3.5 w-3.5" />
              </GhostButton>
              <GhostButton size="sm" disabled={busy} onClick={endPool}>
                <Flag className="h-3.5 w-3.5" />
              </GhostButton>
            </>
          )}
          {(pool.status === "ENDED" || pool.status === "PAUSED" || pool.status === "DRAFT") && (
            <GhostButton size="sm" disabled={busy} onClick={() => run(() => api.creatorArchivePool(pool.id), "Pool archived")}>
              <Archive className="h-3.5 w-3.5" />
            </GhostButton>
          )}
        </div>
      </div>

      {showAnalytics && analytics && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Contributions</div>
            <div className="font-mono text-sm mt-1">{fmtNum(analytics.totalContributions)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Raised</div>
            <div className="font-mono text-sm mt-1">{fmtUsd(analytics.totalRaised)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Revenue Earned</div>
            <div className="font-mono text-sm mt-1 text-gold">{fmtUsd(analytics.revenueEarned)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">New / Returning</div>
            <div className="font-mono text-sm mt-1">{analytics.newParticipants} / {analytics.returningParticipants}</div>
          </div>
          {analytics.topContributors.length > 0 && (
            <div className="col-span-2 sm:col-span-4 text-left mt-2">
              <div className="text-xs text-muted-foreground mb-2">Top contributors</div>
              <div className="space-y-1">
                {analytics.topContributors.map((c) => (
                  <div key={c.username} className="flex justify-between text-xs">
                    <span>{c.username}</span>
                    <span className="font-mono">{fmtUsd(c.totalContributed)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function WithdrawalPanel({ wallet }: { wallet?: { usdcBalance: number; totalEarned: number } | null }) {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [requests, setRequests] = useState<CreatorWithdrawalRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.creatorWithdrawals().then((res) => setRequests((res.data as CreatorWithdrawalRequest[]) ?? [])).catch(() => {});
  }, []);

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0 || !address) {
      toast.error("Enter an amount and destination address");
      return;
    }
    setSubmitting(true);
    try {
      await api.creatorRequestWithdrawal({ amount: amt, address });
      toast.success("Withdrawal requested — pending admin approval");
      setAmount("");
      setAddress("");
      const res = await api.creatorWithdrawals();
      setRequests((res.data as CreatorWithdrawalRequest[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 text-sm font-semibold mb-4">
        <Wallet className="h-4 w-4" /> Withdraw earnings
      </div>
      <div className="space-y-2 mb-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Amount (available: ${fmtUsd(wallet?.usdcBalance ?? 0)})`}
          className="w-full glass rounded-lg px-3 py-2 text-sm font-mono outline-none"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Destination Solana address"
          className="w-full glass rounded-lg px-3 py-2 text-sm font-mono outline-none"
        />
        <FireButton size="sm" onClick={submit} disabled={submitting} className="w-full">
          {submitting ? "Requesting…" : "Request withdrawal"}
        </FireButton>
      </div>
      {requests.length > 0 && (
        <div className="space-y-1.5">
          {requests.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs glass rounded-lg px-3 py-2">
              <span className="font-mono">{fmtUsd(r.amount)}</span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function ReferralPanel({ creator, pools }: { creator: Creator; pools: CreatorPool[] }) {
  const [stats, setStats] = useState<CreatorReferralStats | null>(null);

  useEffect(() => {
    api.creatorReferralStats().then((res) => setStats(res.data as CreatorReferralStats)).catch(() => {});
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://ashnance.com";
  // Pool pages live at /pool/[creatorSlug]/[poolSlug] — there is no page at
  // /pool/[creatorSlug] alone, so the referral link must target a real pool.
  const linkPool = pools.find((p) => p.status === "ACTIVE") ?? pools[0];
  const referralUrl = linkPool
    ? `${origin}/pool/${creator.slug}/${linkPool.slug}?ref=${creator.referralCode}`
    : null;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 text-sm font-semibold mb-4">
        <Users className="h-4 w-4" /> Referrals
      </div>
      {referralUrl ? (
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-1 truncate text-xs font-mono glass rounded-lg px-3 py-2">{referralUrl}</span>
          <GhostButton size="sm" onClick={() => { navigator.clipboard.writeText(referralUrl); toast.success("Link copied"); }}>
            <Copy className="h-3.5 w-3.5" />
          </GhostButton>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground mb-4">Create a pool to get a shareable referral link.</div>
      )}
      {stats && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Followers</div>
            <div className="font-mono text-sm mt-1">{stats.totalFollowers}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Via Referral</div>
            <div className="font-mono text-sm mt-1 text-fire">{stats.viaReferral}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Direct</div>
            <div className="font-mono text-sm mt-1">{stats.viaDirect}</div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

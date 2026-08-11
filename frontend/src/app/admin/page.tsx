"use client";

import { useState, useEffect } from "react";
import { Ban, UserCheck, Save, Download, Trash2, BadgeCheck, Snowflake, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Reveal } from "@/components/motion/Reveal";
import { GlassCard, SectionHeader, FireButton, GhostButton, StatTile, FireProgress, StatusBadge } from "@/components/ashnance/primitives";
import { fmtUsd, fmtNum, timeAgo } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { BurnConfig, Round, CreatorWithdrawalRequest } from "@/lib/types";

type Tab = "users" | "config" | "subscribers" | "launch" | "profit" | "rounds" | "creators";

const TAB_LABELS: Record<Tab, string> = {
  users: "Users",
  config: "Config",
  subscribers: "Subscribers",
  launch: "Launch Mode",
  profit: "Profit",
  rounds: "Rounds",
  creators: "Creator Pools",
};

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  vip: string | null;
  banned: boolean;
  createdAt: string;
  usdcBalance: number;
  ashBalance: number;
};

export default function AdminPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER"; // profit withdrawal is owner-only
  const [tab, setTab] = useState<Tab>("users");
  const [round, setRound] = useState<Round | null>(null);
  // Only totalUsers is rendered here; the other tiles read from `round`.
  const [stats, setStats] = useState<{ totalUsers: number } | null>(null);

  useEffect(() => {
    api.currentRound()
      .then((res) => { if (res.success && res.data) setRound(res.data as Round); })
      .catch(() => {});
    api.adminStats()
      .then((res) => { if (res.success && res.data) setStats(res.data as typeof stats); })
      .catch(() => {});
  }, []);

  return (
    <AdminShell>
      <Reveal>
        <SectionHeader eyebrow="Operations" title="Admin" sub="Manage users and platform config." />
      </Reveal>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <StatTile label="Total Users" value={stats ? fmtNum(stats.totalUsers) : "—"} accent="fire" />
        <StatTile
          label="Active Round"
          value={round ? `#${round.number}` : "—"}
          sub={round?.status ?? "No round"}
          accent="usdc"
        />
        <StatTile
          label="Prize Pool"
          value={round ? fmtUsd(round.prizePool) : "—"}
          sub={round ? `of ${fmtUsd(round.prizePoolTarget)}` : undefined}
          accent="gold"
        />
        <StatTile
          label="Burns / min"
          value={round ? fmtNum(round.burnsLast60s) : "—"}
          sub="last 60 seconds"
          accent="ash"
        />
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-5 text-xs w-fit flex-wrap">
        {(["users", "config", "subscribers", "launch", "creators", ...(isOwner ? ["rounds", "profit"] : [])] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("h-8 px-5 rounded transition",
              tab === t ? "bg-fire text-background font-semibold" : "text-muted-foreground hover:text-foreground")}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "config" && <ConfigTab />}
      {tab === "subscribers" && <SubscribersTab />}
      {tab === "launch" && <LaunchTab />}
      {tab === "rounds" && <RoundsTab />}
      {tab === "profit" && <ProfitTab />}
      {tab === "creators" && <CreatorsTab />}
    </AdminShell>
  );
}

type AdminCreator = {
  id: string;
  slug: string;
  displayName: string;
  verified: boolean;
  createdAt: string;
  _count: { pools: number };
  wallet: { usdcBalance: number; totalEarned: number } | null;
};

function CreatorsTab() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER"; // withdrawal approval is owner-only, same tier as profit withdrawals
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [withdrawals, setWithdrawals] = useState<CreatorWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [creatorsRes, withdrawalsRes] = await Promise.all([
        api.adminCreatorList(),
        api.adminPendingCreatorWithdrawals(),
      ]);
      setCreators((creatorsRes.data as AdminCreator[]) ?? []);
      setWithdrawals((withdrawalsRes.data as CreatorWithdrawalRequest[]) ?? []);
    } catch {
      toast.error("Failed to load creator data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function toggleVerify(c: AdminCreator) {
    try {
      if (c.verified) await api.adminUnverifyCreator(c.id);
      else await api.adminVerifyCreator(c.id);
      toast.success(c.verified ? "Creator unverified" : "Creator verified — their pools go live");
      loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function approveWithdrawal(id: string) {
    try {
      await api.adminApproveCreatorWithdrawal(id);
      toast.success("Withdrawal approved and sent on-chain");
      loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    }
  }

  async function rejectWithdrawal(id: string) {
    try {
      await api.adminRejectCreatorWithdrawal(id);
      toast.success("Withdrawal rejected");
      loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rejection failed");
    }
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="text-sm font-semibold mb-4">Creators ({creators.length})</div>
        {creators.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No creators yet</div>
        ) : (
          <div className="space-y-2">
            {creators.map((c) => (
              <div key={c.id} className="flex items-center gap-3 glass rounded-lg px-4 py-3">
                <span className="text-sm flex-1 truncate">{c.displayName} <span className="text-muted-foreground">/pool/{c.slug}</span></span>
                <span className="text-xs text-muted-foreground">{c._count.pools} pools</span>
                <span className="font-mono text-xs text-usdc">{fmtUsd(c.wallet?.usdcBalance ?? 0)}</span>
                <button
                  onClick={() => toggleVerify(c)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 h-6 rounded text-[10px] font-semibold uppercase tracking-wider border transition",
                    c.verified ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  {c.verified ? <BadgeCheck className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />}
                  {c.verified ? "Verified" : "Unverified"}
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold mb-4">Pending withdrawals ({withdrawals.length})</div>
        {withdrawals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Nothing pending</div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center gap-3 glass rounded-lg px-4 py-3">
                <span className="text-sm flex-1 truncate">{w.creator?.displayName ?? "—"}</span>
                <StatusBadge status={w.status} />
                <span className="font-mono text-sm">{fmtUsd(w.amount)}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(w.requestedAt)}</span>
                {isOwner ? (
                  <>
                    <GhostButton size="sm" onClick={() => approveWithdrawal(w.id)}><Check className="h-3.5 w-3.5" /></GhostButton>
                    <GhostButton size="sm" onClick={() => rejectWithdrawal(w.id)}><X className="h-3.5 w-3.5" /></GhostButton>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Owner approval required</span>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.adminUsers()
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as { users?: AdminUser[] } | AdminUser[];
          setUsers(Array.isArray(d) ? d : (d.users ?? []));
        }
      })
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  async function toggleBan(id: string, banned: boolean) {
    try {
      await api.adminBanUser(id, !banned);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, banned: !banned } : u));
      toast.success(!banned ? "User banned" : "User unbanned");
    } catch { toast.error("Action failed"); }
  }

  async function setRole(id: string, role: string) {
    try {
      await api.adminSetUserRole(id, role);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
      toast.success(`Role updated to ${role}`);
    } catch { toast.error("Failed"); }
  }

  if (loading) {
    return (
      <GlassCard>
        <div className="text-sm text-muted-foreground text-center py-8">Loading users…</div>
      </GlassCard>
    );
  }

  // Shared responsive column template so header labels line up with row cells.
  // Mobile drops the Email column (no room for it); sm+ shows all 5.
  const gridCls =
    "grid gap-3 grid-cols-[minmax(0,1fr)_44px_88px_44px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_84px_56px_96px_56px]";

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search users…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-10 px-3 rounded-md bg-muted border border-border text-sm max-w-md"
      />
      <GlassCard className="p-0 overflow-hidden">
        <div className={cn(gridCls, "text-xs uppercase tracking-wider text-muted-foreground px-5 py-2.5 border-b border-border")}>
          <span>User</span><span className="hidden sm:block">Email</span><span className="hidden sm:block text-right">Balance</span><span className="text-center">VIP</span>
          <span className="text-center">Role</span><span className="text-center">Actions</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {search ? "No users match your search." : "No users yet."}
            </div>
          )}
          {filtered.map((u) => (
            <div key={u.id} className={cn(gridCls, "items-center px-5 py-3 text-sm", u.banned && "opacity-60")}>
              <div className="min-w-0">
                <div className="font-medium truncate">{u.username}</div>
                <div className="text-xs text-muted-foreground">{timeAgo(u.createdAt)}</div>
              </div>
              <div className="hidden sm:block text-xs text-muted-foreground truncate">{u.email}</div>
              <div className="hidden sm:block text-right text-xs font-mono">
                <div>{fmtUsd(u.usdcBalance)}</div>
                <div className="text-ash">{fmtNum(u.ashBalance)} ASH</div>
              </div>
              <div className="text-center">
                {u.vip ? <span className="text-gold text-xs">VIP</span> : <span className="text-muted-foreground text-xs">—</span>}
              </div>
              <div className="text-center">
                <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)}
                  className="text-xs bg-muted border border-border rounded px-2 py-1">
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="flex gap-1 justify-center">
                <button onClick={() => toggleBan(u.id, u.banned)}
                  className={cn("p-1.5 rounded transition", u.banned
                    ? "text-success hover:bg-success/10"
                    : "text-danger hover:bg-danger/10")}>
                  {u.banned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ConfigTab() {
  const [cfg, setCfg] = useState<BurnConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.adminConfig()
      .then((res) => {
        if (res.success && res.data) setCfg(res.data as BurnConfig);
      })
      .catch(() => toast.error("Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof BurnConfig, val: number) {
    setCfg((prev) => prev ? { ...prev, [key]: val } : prev);
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      // Persist only the editable fields. The backend config also returns
      // runtime counters (e.g. total_ash_emitted, constant_factor) that are
      // not shown here and must not be overwritten from this form.
      await Promise.all(fields.map((f) => api.adminSetConfig(f.key, cfg[f.key] as number)));
      toast.success("Config saved");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  if (loading || !cfg) {
    return (
      <GlassCard>
        <div className="text-sm text-muted-foreground text-center py-8">{loading ? "Loading config…" : "No config found."}</div>
      </GlassCard>
    );
  }

  const fields: { key: keyof BurnConfig; label: string; step?: number; pct?: boolean }[] = [
    { key: "ash_reward_percent",   label: "ASH reward multiplier",    step: 0.1 },
    { key: "reward_pool_split",    label: "Reward pool split",        step: 0.01, pct: true },
    { key: "profit_pool_split",    label: "Profit pool split",        step: 0.01, pct: true },
    { key: "referral_pool_split",  label: "Referral pool split",      step: 0.01, pct: true },
    { key: "referral_commission",  label: "Referral commission",      step: 0.01, pct: true },
    { key: "min_burn_amount",      label: "Min burn ($USDC)",         step: 1 },
    { key: "max_burn_amount",      label: "Max burn ($USDC)",         step: 100 },
    { key: "base_unit",            label: "Base weight unit",         step: 0.01 },
    { key: "boost_cost_ash",       label: "Boost cost (ASH)",         step: 100 },
    { key: "prize_pool_target",    label: "Prize pool target ($)",    step: 50 },
    { key: "round_time_limit_hours", label: "Round time limit (hrs)", step: 1 },
    { key: "anti_snipe_seconds",   label: "Anti-snipe (secs)",        step: 1 },
    { key: "auto_round_creation",  label: "Auto round creation",      step: 1 },
  ];

  const splitTotal = cfg.reward_pool_split + cfg.profit_pool_split + (cfg.referral_pool_split ?? 0);
  const splitOk = Math.abs(splitTotal - 1) < 0.001;

  return (
    <div className="space-y-4">
      {!splitOk && (
        <div className="glass rounded-lg px-4 py-3 text-sm text-warning border border-warning/30">
          Pool splits must sum to 100% (currently {(splitTotal * 100).toFixed(1)}%).
        </div>
      )}
      <GlassCard>
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map((f) => {
            const val = cfg[f.key] as number;
            return (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                <input
                  type="number"
                  step={f.step}
                  value={val}
                  onChange={(e) => { const n = parseFloat(e.target.value); update(f.key, Number.isNaN(n) ? 0 : n); }}
                  className="w-full h-10 px-3 rounded-md bg-muted border border-border text-sm font-mono"
                />
                {f.pct && (
                  <div className="text-xs text-muted-foreground mt-0.5">{(val * 100).toFixed(1)}%</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5">
          <FireButton onClick={save} disabled={saving || !splitOk}>
            <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Config"}
          </FireButton>
        </div>
      </GlassCard>
    </div>
  );
}

function SubscribersTab() {
  const [subs, setSubs] = useState<
    { id: string; email: string; source: string; ipAddress: string | null; createdAt: string }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(q = "") {
    setLoading(true);
    try {
      const res = await api.adminSubscribers({ search: q });
      if (res.success) { setSubs(res.data.items); setTotal(res.data.total); }
    } catch { toast.error("Failed to load subscribers"); }
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => load(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  async function remove(id: string) {
    try {
      await api.adminDeleteSubscriber(id);
      setSubs((p) => p.filter((s) => s.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success("Subscriber removed");
    } catch { toast.error("Delete failed"); }
  }

  async function exportCsv() {
    try {
      const csv = await api.adminExportSubscribersCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ashnance-subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  }

  const gridCls = "grid gap-3 grid-cols-[minmax(0,1fr)_84px_36px] sm:grid-cols-[minmax(0,1fr)_140px_140px_36px]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 px-3 rounded-md bg-muted border border-border text-sm flex-1 min-w-48 max-w-md"
        />
        <span className="text-sm text-muted-foreground">{total} subscriber{total === 1 ? "" : "s"}</span>
        <GhostButton onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</GhostButton>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className={cn(gridCls, "text-xs uppercase tracking-wider text-muted-foreground px-5 py-2.5 border-b border-border")}>
          <span>Email</span><span className="hidden sm:block">Source</span><span>Joined</span><span />
        </div>
        <div className="divide-y divide-border">
          {loading && <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && subs.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {search ? "No subscribers match your search." : "No subscribers yet."}
            </div>
          )}
          {!loading && subs.map((s) => (
            <div key={s.id} className={cn(gridCls, "items-center px-5 py-3 text-sm")}>
              <div className="truncate">{s.email}</div>
              <div className="hidden sm:block text-xs text-muted-foreground truncate">{s.source}</div>
              <div className="text-xs text-muted-foreground">{timeAgo(s.createdAt)}</div>
              <button onClick={() => remove(s.id)} className="p-1.5 rounded text-danger hover:bg-danger/10 justify-self-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LaunchTab() {
  const [launchMode, setLaunchMode] = useState(false);
  const [launchAt, setLaunchAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.adminLaunch()
      .then((res) => {
        if (res.success) {
          setLaunchMode(res.data.launchMode);
          setLaunchAt(res.data.launchAt ? toLocalInput(res.data.launchAt) : "");
        }
      })
      .catch(() => toast.error("Failed to load launch settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.adminSetLaunch({
        launchMode,
        launchAt: launchAt ? new Date(launchAt).toISOString() : null,
      });
      toast.success("Launch settings saved");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  if (loading) {
    return <GlassCard><div className="text-sm text-muted-foreground text-center py-8">Loading…</div></GlassCard>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg font-semibold">Launch Mode</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              When ON, the public sees the Coming Soon page across the whole site.
              Admins and owners keep full access. Turn OFF to instantly restore the
              live platform — no data is lost.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={launchMode}
            onClick={() => setLaunchMode((v) => !v)}
            className={cn(
              "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200",
              launchMode ? "bg-fire" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                launchMode ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
        {launchMode && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-warning">
            Launch Mode is ON — visitors currently see the Coming Soon page.
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <label className="text-xs text-muted-foreground mb-1 block">Launch date &amp; time (countdown target)</label>
        <input
          type="datetime-local"
          value={launchAt}
          onChange={(e) => setLaunchAt(e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-muted border border-border text-sm font-mono max-w-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">Leave empty to hide the countdown timer on the Coming Soon page.</p>
      </GlassCard>

      <FireButton onClick={save} disabled={saving}>
        <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Launch Settings"}
      </FireButton>
    </div>
  );
}

type ProfitPool = { balance: number; totalDeposited: number; totalWithdrawn: number };
type Solvency = { onChainUsdc: number; total: number; ratio: number; solvent: boolean; liabilities?: Record<string, number> };

function ProfitTab() {
  const [pool, setPool] = useState<ProfitPool | null>(null);
  const [solvency, setSolvency] = useState<Solvency | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    try {
      const [pp, sv] = await Promise.all([
        api.ownerProfitPool().catch(() => null),
        api.ownerSolvency().catch(() => null),
      ]);
      if (pp?.success && pp.data) setPool(pp.data as ProfitPool);
      if (sv?.success && sv.data) setSolvency(sv.data as Solvency);
    } catch { toast.error("Failed to load profit data"); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function withdraw() {
    if (!pool || pool.balance <= 0) return;
    if (!confirming) { setConfirming(true); return; } // click once to arm, again to execute
    setConfirming(false);
    setBusy(true);
    try {
      await api.ownerWithdrawProfit();
      toast.success("Withdrawal executed — receipts emailed to both owners.");
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    setBusy(false);
  }

  if (loading) {
    return <GlassCard><div className="text-sm text-muted-foreground text-center py-8">Loading profit data…</div></GlassCard>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatTile label="Profit Pool" value={pool ? fmtUsd(pool.balance) : "—"} sub={pool ? `${fmtUsd(pool.totalWithdrawn)} withdrawn` : undefined} accent="gold" />
        <StatTile label="On-chain USDC" value={solvency ? fmtUsd(solvency.onChainUsdc) : "—"} sub="Master wallet" accent="usdc" />
        <StatTile
          label="Solvency"
          value={solvency ? `${solvency.ratio.toFixed(2)}×` : "—"}
          sub={solvency ? (solvency.solvent ? "Solvent" : "INSOLVENT") : undefined}
          accent={solvency && !solvency.solvent ? "fire" : "ash"}
        />
      </div>

      {solvency?.liabilities && (
        <GlassCard>
          <div className="text-sm font-semibold mb-4">Liabilities breakdown</div>
          <div className="space-y-3">
            {Object.entries(solvency.liabilities).map(([k, v]) => {
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
                  <FireProgress value={v} max={solvency.onChainUsdc || 1} />
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="font-display text-lg font-semibold">Withdraw Profit</div>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
          Withdraws the full profit pool and splits it 60/40 between the two owner wallets.
          Any owner can execute this directly — both owners get an email receipt with the breakdown.
        </p>
        <div className="flex items-center gap-3">
          <FireButton onClick={withdraw} disabled={busy || !pool || pool.balance <= 0}>
            <Download className="h-4 w-4" />
            {busy
              ? "Withdrawing…"
              : confirming
                ? `Confirm — withdraw ${pool ? fmtUsd(pool.balance) : ""}?`
                : pool ? `Withdraw ${fmtUsd(pool.balance)}` : "Withdraw"}
          </FireButton>
          {confirming && !busy && (
            <GhostButton size="sm" onClick={() => setConfirming(false)}>Cancel</GhostButton>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function RoundsTab() {
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.currentRound();
      setRound(res.success && res.data ? (res.data as Round) : null);
    } catch { /* no active round */ }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createRound() {
    setBusy(true);
    try { await api.ownerCreateRound(); toast.success("Round created"); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    setBusy(false);
  }

  async function endRound() {
    if (!round) return;
    setBusy(true);
    try { await api.ownerEndRound(round.id); toast.success("Round ended — winner selected"); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    setBusy(false);
  }

  if (loading) {
    return <GlassCard><div className="text-sm text-muted-foreground text-center py-8">Loading round…</div></GlassCard>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      {round ? (
        <GlassCard>
          <div className="grid sm:grid-cols-3 gap-4">
            <StatTile label="Round" value={`#${round.number}`} sub={round.status} accent="fire" />
            <StatTile label="Prize Pool" value={fmtUsd(round.prizePool)} sub={`target ${fmtUsd(round.prizePoolTarget)}`} accent="gold" />
            <StatTile label="Burns / min" value={fmtNum(round.burnsLast60s)} sub="last 60s" accent="ash" />
          </div>
          <p className="text-sm text-muted-foreground mt-4 mb-3 max-w-md">
            Ending a round selects the #1 weight holder as the winner and pays out the prize pool.
          </p>
          <FireButton onClick={endRound} disabled={busy}>{busy ? "Ending…" : "End Round & Pick Winner"}</FireButton>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="font-display text-lg font-semibold">No active round</div>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
            Create a round so users can burn and compete for the prize pool.
          </p>
          <FireButton onClick={createRound} disabled={busy}>{busy ? "Creating…" : "Create New Round"}</FireButton>
        </GlassCard>
      )}
    </div>
  );
}

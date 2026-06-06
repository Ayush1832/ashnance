"use client";

import { useState, useEffect } from "react";
import { Ban, UserCheck, Save, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { Reveal } from "@/components/motion/Reveal";
import { GlassCard, SectionHeader, FireButton, GhostButton, StatTile } from "@/components/ashnance/primitives";
import { fmtUsd, fmtNum, timeAgo } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import type { BurnConfig, Round } from "@/lib/types";

type Tab = "users" | "config" | "subscribers" | "launch";

const TAB_LABELS: Record<Tab, string> = {
  users: "Users",
  config: "Config",
  subscribers: "Subscribers",
  launch: "Launch Mode",
};

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  vip: string | null;
  banned: boolean;
  createdAt: string;
};

export default function AdminPage() {
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
    <AppShell>
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
        {(["users","config","subscribers","launch"] as Tab[]).map((t) => (
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
    </AppShell>
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
    "grid gap-3 grid-cols-[minmax(0,1fr)_44px_88px_44px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_56px_96px_56px]";

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
          <span>User</span><span className="hidden sm:block">Email</span><span className="text-center">VIP</span>
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
    <div className="space-y-4">
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
            onClick={() => setLaunchMode((v) => !v)}
            aria-pressed={launchMode}
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", launchMode ? "bg-fire" : "bg-border")}
          >
            <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-transform", launchMode ? "translate-x-6" : "translate-x-1")} />
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

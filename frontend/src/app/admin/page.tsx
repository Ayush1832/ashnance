"use client";

import { useState } from "react";
import { Ban, UserCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, FireButton, StatTile } from "@/components/ashnance/primitives";
import { mockAdminUsers, mockBurnConfig, mockRound } from "@/lib/mock";
import { fmtUsd, fmtNum, timeAgo } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type Tab = "users" | "config";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <AppShell>
      <SectionHeader eyebrow="Operations" title="Admin" sub="Manage users and platform config." />

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <StatTile label="Total Users" value={fmtNum(mockAdminUsers.length)} accent="fire" />
        <StatTile label="Active Round" value={`#${mockRound.number}`} sub={mockRound.status} accent="usdc" />
        <StatTile label="Prize Pool" value={fmtUsd(mockRound.prizePool)} sub={`of ${fmtUsd(mockRound.prizePoolTarget)}`} accent="gold" />
        <StatTile label="Burns / min" value={fmtNum(mockRound.burnsLast60s)} sub="last 60 seconds" accent="ash" />
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-5 text-xs w-fit">
        {(["users","config"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("h-8 px-5 rounded capitalize transition",
              tab === t ? "bg-fire text-background font-semibold" : "text-muted-foreground hover:text-foreground")}>
            {t === "users" ? "Users" : "Config"}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "config" && <ConfigTab />}
    </AppShell>
  );
}

function UsersTab() {
  const [users, setUsers] = useState(mockAdminUsers);
  const [search, setSearch] = useState("");

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
        <div className="grid text-xs uppercase tracking-wider text-muted-foreground px-5 py-2.5 border-b border-border"
          style={{ gridTemplateColumns: "1fr 1fr auto auto auto" }}>
          <span>User</span><span>Email</span><span className="text-center">VIP</span>
          <span className="text-center">Role</span><span className="text-center">Actions</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((u) => (
            <div key={u.id} className={cn("grid items-center px-5 py-3 gap-3 text-sm", u.banned && "opacity-60")}
              style={{ gridTemplateColumns: "1fr 1fr auto auto auto" }}>
              <div>
                <div className="font-medium truncate">{u.username}</div>
                <div className="text-xs text-muted-foreground">{timeAgo(u.createdAt)}</div>
              </div>
              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
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
  const [cfg, setCfg] = useState({ ...mockBurnConfig });
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof cfg, val: number) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  async function save() {
    setLoading(true);
    try {
      await api.ownerSetBurnConfig(cfg);
      toast.success("Config saved");
    } catch { toast.error("Failed to save"); }
    setLoading(false);
  }

  const fields: { key: keyof typeof cfg; label: string; step?: number; pct?: boolean }[] = [
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

  const splitTotal = cfg.reward_pool_split + cfg.profit_pool_split + cfg.referral_pool_split;
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
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
              <input
                type="number"
                step={f.step}
                value={f.pct ? (cfg[f.key] as number) : cfg[f.key]}
                onChange={(e) => update(f.key, parseFloat(e.target.value))}
                className="w-full h-10 px-3 rounded-md bg-muted border border-border text-sm font-mono"
              />
              {f.pct && (
                <div className="text-xs text-muted-foreground mt-0.5">{((cfg[f.key] as number) * 100).toFixed(1)}%</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5">
          <FireButton onClick={save} disabled={loading || !splitOk}>
            <Save className="h-4 w-4" />{loading ? "Saving…" : "Save Config"}
          </FireButton>
        </div>
      </GlassCard>
    </div>
  );
}

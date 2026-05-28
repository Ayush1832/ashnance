import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame, Wallet, Trophy, Gem, Sprout, Users, Settings, Shield, Crown,
  Bell, Menu, X, LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalToasts } from "@/hooks/useToasts";
import { api } from "@/lib/apiClient";
import { socket } from "@/lib/socketClient";
import { fmtUsd, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Round } from "@/lib/types";

const navItems = [
  { to: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { to: "/burn",        label: "Burn",        icon: Flame,    accent: true },
  { to: "/wallet",      label: "Wallet",      icon: Wallet },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/subscribe",   label: "VIP",         icon: Gem },
  { to: "/staking",     label: "Stake ASH",   icon: Sprout },
  { to: "/referrals",   label: "Referrals",   icon: Users },
  { to: "/settings",    label: "Settings",    icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  useGlobalToasts();
  const { user, isAdmin, isOwner, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; text: string; at: number }[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  useEffect(() => {
    api.publicRound()
      .then((res) => { if (res.success && res.data) setRound(res.data as Round); })
      .catch(() => {/* no round */});
  }, []);

  // Accumulate socket events as notifications + keep round data live
  useEffect(() => {
    const unBurn = socket.on("burn:new", (payload) => {
      const e = payload as { user: string; amount: number; ashReward: number; weight: number; timestamp: string };
      const now = Date.now();
      setNotifications((prev) => [
        { id: String(now), text: `🔥 ${e.user} burned $${e.amount.toFixed(0)} USDC`, at: now },
        ...prev.slice(0, 19),
      ]);
    });
    const unProgress = socket.on("round:progress", (payload) => {
      const p = payload as { currentPool: number; targetPool: number; progressPercent: number; timestamp: string };
      setRound((prev) => prev ? {
        ...prev,
        prizePool: Number(p.currentPool),
        prizePoolTarget: Number(p.targetPool),
      } : prev);
    });
    const unLeaderboard = socket.on("leaderboard:update", () => {
      // Backend sends no payload — re-fetch round to get updated leaderboard
      api.publicRound()
        .then((res) => { if (res.success && res.data) setRound(res.data as Round); })
        .catch(() => {});
    });
    const unDeposit = socket.on("deposit:confirmed", (payload) => {
      const p = payload as { amount: number };
      setNotifications((prev) => [
        { id: String(Date.now()), text: `💵 Deposit of $${p.amount?.toFixed(2)} confirmed`, at: Date.now() },
        ...prev.slice(0, 19),
      ]);
    });
    const unRoundEnded = socket.on("round:ended", (payload) => {
      const p = payload as { winner?: string; prize?: number };
      setNotifications((prev) => [
        { id: String(Date.now()), text: `🏆 Round ended — winner: ${p.winner ?? "unknown"} ($${p.prize?.toFixed(0) ?? 0})`, at: Date.now() },
        ...prev.slice(0, 19),
      ]);
      setRound((prev) => prev ? { ...prev, status: "ENDED" } : prev);
    });
    const unReferral = socket.on("referral:earned", (payload) => {
      const p = payload as { amount: number };
      setNotifications((prev) => [
        { id: String(Date.now()), text: `👥 Referral reward: +$${p.amount?.toFixed(2)}`, at: Date.now() },
        ...prev.slice(0, 19),
      ]);
    });
    return () => { unBurn(); unProgress(); unLeaderboard(); unDeposit(); unRoundEnded(); unReferral(); };
  }, []);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  const poolPct = round
    ? Math.min(100, (round.prizePool / round.prizePoolTarget) * 100)
    : 0;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar shrink-0 sticky top-0 h-screen">
        <Link href="/dashboard" className="flex items-center gap-2 px-5 h-16 border-b border-border">
          <span className="text-2xl">🔥</span>
          <span className="font-display text-lg font-bold tracking-tight">Ashnance</span>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((it) => (
            <Link key={it.to} href={it.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive(it.to)
                  ? "bg-[rgba(255,69,0,0.12)] text-foreground border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-white/4 hover:text-foreground",
                'accent' in it && it.accent && "font-semibold",
              )}>
              <it.icon className={cn("h-4 w-4", isActive(it.to) && 'accent' in it && it.accent && "text-primary")} />
              <span>{it.label}</span>
              {'accent' in it && it.accent && isActive(it.to) && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-primary">live</span>
              )}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm mt-4 border-t border-border pt-4",
              isActive("/admin") ? "text-warning" : "text-muted-foreground hover:text-foreground"
            )}>
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
          {isOwner && (
            <Link href="/owner" className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm",
              isActive("/owner") ? "text-gold" : "text-muted-foreground hover:text-foreground"
            )}>
              <Crown className="h-4 w-4" /> Owner
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
          Ashnance · Burn-to-Earn
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 md:px-6 gap-3">
          <button className="md:hidden p-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          {round && (
            <Link href="/burn" className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md glass hover:glow-fire transition-shadow">
              <Flame className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Round #{round.number}</span>
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full progress-fire" style={{ width: `${poolPct}%` }} />
              </div>
              <span className="font-mono text-xs">{fmtUsd(round.prizePool)}</span>
            </Link>
          )}
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-md glass text-xs text-[oklch(0.7_0.13_245)]">
            <span className="font-mono">${fmtNum(user.usdcBalance, 2)}</span>
            <span className="text-muted-foreground">USDC</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-md glass text-xs text-ash">
            <span className="font-mono">{fmtNum(user.ashBalance)}</span>
            <span className="text-muted-foreground">ASH</span>
          </div>
          <div className="relative" ref={bellRef}>
            <button
              className="p-2 rounded-md hover:bg-muted relative"
              onClick={() => setBellOpen((v) => !v)}
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-11 w-80 glass-elevated rounded-md py-1 text-sm z-40 max-h-80 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="px-3 py-2.5 border-b border-border/50 last:border-0">
                      <div className="text-xs">{n.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-full bg-fire flex items-center justify-center text-xs font-bold text-background">
              {user.username ? user.username.slice(0,2).toUpperCase() : "?"}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 w-48 glass-elevated rounded-md py-1 text-sm z-40">
                <Link href="/settings" className="block px-3 py-2 hover:bg-muted">Profile</Link>
                <Link href="/settings" className="block px-3 py-2 hover:bg-muted">Settings</Link>
                <button onClick={logout} className="block w-full text-left px-3 py-2 hover:bg-muted text-danger">Log out</button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 md:px-6 py-6 pb-24 md:pb-6">{children}</main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-background/95 backdrop-blur-md border-t border-border flex">
          {[
            { to: "/dashboard",   label: "Home",  icon: LayoutDashboard },
            { to: "/burn",        label: "Burn",  icon: Flame },
            { to: "/wallet",      label: "Wallet", icon: Wallet },
            { to: "/leaderboard", label: "Board", icon: Trophy },
          ].map((it) => (
            <Link key={it.to} href={it.to} className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[11px]",
              isActive(it.to) ? "text-primary" : "text-muted-foreground"
            )}>
              <it.icon className="h-5 w-5" /> {it.label}
            </Link>
          ))}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
          >
            <Menu className="h-5 w-5" /> More
          </button>
        </nav>
      </div>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70" onClick={() => setSidebarOpen(false)}>
          <aside className="w-64 h-full bg-sidebar p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-display text-lg">🔥 Ashnance</span>
              <button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {navItems.map((it) => (
              <Link key={it.to} href={it.to} onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted">
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            ))}
            {isAdmin && <Link href="/admin" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-warning"><Shield className="h-4 w-4" /> Admin</Link>}
            {isOwner && <Link href="/owner" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gold"><Crown className="h-4 w-4" /> Owner</Link>}
          </aside>
        </div>
      )}
    </div>
  );
}

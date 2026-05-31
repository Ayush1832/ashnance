"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame, Wallet, Trophy, Gem, Sprout, Users, Settings, Shield, Crown,
  Bell, Menu, X, LayoutDashboard,
} from "lucide-react";
import { Logo } from "./Logo";
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
        { id: String(now), text: `🔥 ${e.user} burned $${Number(e.amount).toFixed(0)} USDC`, at: now },
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
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-gradient-to-b from-sidebar to-background md:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo size="md" href="/dashboard" />
        </div>
        <nav data-lenis-prevent className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navItems.map((it) => (
            <Link key={it.to} href={it.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                isActive(it.to)
                  ? "bg-fire/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                'accent' in it && it.accent && "font-semibold",
              )}>
              {isActive(it.to) && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-fire shadow-[0_0_10px_rgba(255,69,0,0.85)]" />
              )}
              <it.icon className={cn("size-4 transition-colors", isActive(it.to) ? "text-primary" : "group-hover:text-foreground")} />
              <span>{it.label}</span>
              {'accent' in it && it.accent && isActive(it.to) && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-primary">live</span>
              )}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className={cn(
              "mt-4 flex items-center gap-3 rounded-xl border-t border-border px-3 py-2.5 pt-4 text-sm transition-colors",
              isActive("/admin") ? "text-warning" : "text-muted-foreground hover:text-foreground"
            )}>
              <Shield className="size-4" /> Admin
            </Link>
          )}
          {isOwner && (
            <Link href="/owner" className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              isActive("/owner") ? "text-gold" : "text-muted-foreground hover:text-foreground"
            )}>
              <Crown className="size-4" /> Owner
            </Link>
          )}
        </nav>
        <div className="border-t border-border p-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 animate-pulse rounded-full bg-success" /> All systems operational
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl md:px-6">
          <button className="p-2 md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-5" />
          </button>
          {round && (
            <Link href="/burn" className="hidden items-center gap-2 rounded-full glass px-3 py-1.5 transition-shadow duration-300 hover:glow-fire md:flex">
              <Flame className="size-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Round #{round.number}</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div className="h-full progress-fire" style={{ width: `${poolPct}%` }} />
              </div>
              <span className="font-mono text-xs">{fmtUsd(round.prizePool)}</span>
            </Link>
          )}
          <div className="flex-1" />
          <div className="hidden h-9 items-center gap-2 rounded-full glass px-3 text-xs text-[oklch(0.7_0.13_245)] sm:flex">
            <span className="font-mono">${fmtNum(user.usdcBalance, 2)}</span>
            <span className="text-muted-foreground">USDC</span>
          </div>
          <div className="hidden h-9 items-center gap-2 rounded-full glass px-3 text-xs text-ash sm:flex">
            <span className="font-mono">{fmtNum(user.ashBalance)}</span>
            <span className="text-muted-foreground">ASH</span>
          </div>
          <div className="relative" ref={bellRef}>
            <button
              className="relative rounded-full p-2 transition-colors hover:bg-white/[0.06]"
              onClick={() => setBellOpen((v) => !v)}
            >
              <Bell className="size-4 text-muted-foreground" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
              )}
            </button>
            {bellOpen && (
              <div data-lenis-prevent className="absolute right-0 top-12 z-40 max-h-80 w-80 animate-slide-in-top overflow-y-auto rounded-2xl glass-elevated py-1 text-sm">
                <div className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="border-b border-border/50 px-3 py-2.5 last:border-0">
                      <div className="text-xs">{n.text}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
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
              className="grid size-9 place-items-center rounded-full bg-fire text-xs font-bold text-background shadow-[0_4px_14px_-4px_rgba(255,69,0,0.6)] ring-1 ring-white/15 transition-transform duration-300 hover:scale-105">
              {user.username ? user.username.slice(0,2).toUpperCase() : "?"}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-40 w-48 animate-slide-in-top rounded-2xl glass-elevated py-1 text-sm">
                <Link href="/settings" className="block px-3 py-2 transition-colors hover:bg-white/[0.06]">Profile</Link>
                <Link href="/settings" className="block px-3 py-2 transition-colors hover:bg-white/[0.06]">Settings</Link>
                <button onClick={logout} className="block w-full px-3 py-2 text-left text-danger transition-colors hover:bg-white/[0.06]">Log out</button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-border bg-background/80 backdrop-blur-xl md:hidden">
          {[
            { to: "/dashboard",   label: "Home",  icon: LayoutDashboard },
            { to: "/burn",        label: "Burn",  icon: Flame },
            { to: "/wallet",      label: "Wallet", icon: Wallet },
            { to: "/leaderboard", label: "Board", icon: Trophy },
          ].map((it) => (
            <Link key={it.to} href={it.to} className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
              isActive(it.to) ? "text-primary" : "text-muted-foreground"
            )}>
              <it.icon className="size-5" /> {it.label}
            </Link>
          ))}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
          >
            <Menu className="size-5" /> More
          </button>
        </nav>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}>
          <aside data-lenis-prevent className="h-full w-72 space-y-1 overflow-y-auto bg-gradient-to-b from-sidebar to-background p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <Logo size="md" />
              <button onClick={() => setSidebarOpen(false)}><X className="size-5" /></button>
            </div>
            {navItems.map((it) => (
              <Link key={it.to} href={it.to} onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isActive(it.to) ? "bg-fire/10 text-foreground" : "hover:bg-white/[0.04]",
                )}>
                <it.icon className={cn("size-4", isActive(it.to) && "text-primary")} /> {it.label}
              </Link>
            ))}
            {isAdmin && <Link href="/admin" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-warning"><Shield className="size-4" /> Admin</Link>}
            {isOwner && <Link href="/owner" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gold"><Crown className="size-4" /> Owner</Link>}
          </aside>
        </div>
      )}
    </div>
  );
}

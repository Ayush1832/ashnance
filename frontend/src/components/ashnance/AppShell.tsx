import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame, Wallet, Trophy, Gem, Sprout, Users, Settings, Shield, Crown,
  Bell, Menu, X, LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalToasts } from "@/hooks/useToasts";
import { mockRound } from "@/lib/mock";
import { fmtUsd, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const path = usePathname();
  const isActive = (to: string) => path === to || path.startsWith(to + "/");
  const poolPct = Math.min(100, (mockRound.prizePool / mockRound.prizePoolTarget) * 100);

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
          <Link href="/burn" className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md glass hover:glow-fire transition-shadow">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Round #{mockRound.number}</span>
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full progress-fire" style={{ width: `${poolPct}%` }} />
            </div>
            <span className="font-mono text-xs">{fmtUsd(mockRound.prizePool)}</span>
          </Link>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-md glass text-xs text-[oklch(0.7_0.13_245)]">
            <span className="font-mono">${fmtNum(user.usdcBalance, 2)}</span>
            <span className="text-muted-foreground">USDC</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-md glass text-xs text-ash">
            <span className="font-mono">{fmtNum(user.ashBalance)}</span>
            <span className="text-muted-foreground">ASH</span>
          </div>
          <button className="p-2 rounded-md hover:bg-muted relative">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-full bg-fire flex items-center justify-center text-xs font-bold text-background">
              {user.username.slice(0,2).toUpperCase()}
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
            { to: "/burn", label: "Burn", icon: Flame },
            { to: "/wallet", label: "Wallet", icon: Wallet },
            { to: "/leaderboard", label: "Board", icon: Trophy },
            { to: "/dashboard", label: "More", icon: Menu },
          ].map((it) => (
            <Link key={it.to} href={it.to} className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[11px]",
              isActive(it.to) ? "text-primary" : "text-muted-foreground"
            )}>
              <it.icon className="h-5 w-5" /> {it.label}
            </Link>
          ))}
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

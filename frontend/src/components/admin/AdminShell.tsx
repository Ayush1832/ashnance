"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";

function hasSession() {
  return typeof window !== "undefined" && !!localStorage.getItem("accessToken");
}

// Chrome + access guard for the admin console. Only ADMIN/OWNER accounts may
// enter; everyone else is bounced to the admin login. Deliberately minimal — it
// does NOT show the player navigation.
export function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const nav = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!hasSession()) nav.replace("/admin/login");
  }, [nav]);

  useEffect(() => {
    if (!user) return; // useAuth still loading the profile
    if (user.role === "ADMIN" || user.role === "OWNER") setOk(true);
    else nav.replace("/admin/login");
  }, [user, nav]);

  if (!hasSession()) return <div className="min-h-screen bg-background" />;
  if (!ok) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Verifying admin access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-fire text-background">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[9px] font-semibold uppercase leading-none tracking-[0.25em] text-primary/80">Ashnance</div>
            <div className="font-display text-sm font-bold leading-tight">Admin Console</div>
          </div>
        </div>
        <button
          onClick={async () => { await api.logout(); nav.replace("/admin/login"); }}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import { ComingSoon } from "./ComingSoon";

// Routes that stay reachable in launch mode so an admin can sign in and toggle it
// off. A non-admin who logs in here still hits the gate on every other route.
const EXEMPT = ["/login", "/register", "/auth", "/admin"];

function hasSession() {
  return typeof window !== "undefined" && !!localStorage.getItem("accessToken");
}

/**
 * When Launch Mode is ON, non-admin visitors see the Coming Soon page across the
 * whole site; admins/owners get full access. The backend platform is untouched —
 * toggling Launch Mode off in the admin panel instantly restores the real site.
 */
export function LaunchGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [launchMode, setLaunchMode] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .launchStatus()
      .then((res) => {
        setLaunchMode(res.data.launchMode);
      })
      .catch(() => setLaunchMode(false)); // fail open — never hard-block the site if status is unreachable
  }, []);

  // Resolving launch status — render a dark placeholder (matches theme, no flash).
  if (launchMode === null) return <div className="min-h-screen bg-background" />;

  if (!launchMode) return <>{children}</>;

  const isAdmin = user?.role === "ADMIN" || user?.role === "OWNER";
  const exempt = EXEMPT.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isAdmin || exempt) return <>{children}</>;

  // A logged-in session may belong to an admin whose profile is still loading
  // (useAuth fetches it) — wait before deciding to show Coming Soon.
  if (hasSession() && !user) return <div className="min-h-screen bg-background" />;

  return <ComingSoon />;
}

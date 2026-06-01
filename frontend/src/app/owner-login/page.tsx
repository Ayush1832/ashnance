"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Logo } from "@/components/ashnance/Logo";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // If already logged in and owner, go straight to panel
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setChecking(false); return; }

    fetch(`${API}/api/owner/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (res.ok) router.replace("/owner");
      else setChecking(false);
    }).catch(() => setChecking(false));
  }, [router]);

  function handleGoogleLogin() {
    localStorage.setItem("ownerLoginAttempt", "1");
    window.location.href = `${API}/api/auth/google`;
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-white/15 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div className="pointer-events-none absolute inset-0 bg-fire-radial" />
      <div className="pointer-events-none absolute inset-0 ember-bg" />

      <div className="relative w-full max-w-sm">
        <div className="glass-elevated ring-fire rounded-2xl p-8 text-center">
          <div className="mb-2 flex justify-center">
            <Logo size="lg" />
          </div>
          <div className="mb-7 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Owner Portal</div>

          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
            <Lock className="size-6" />
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight">Owner access only</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            This portal is restricted to authorised owners. Log in with your registered Google account.
          </p>

          <button
            onClick={handleGoogleLogin}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#111] transition-transform duration-300 hover:scale-[1.01]"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
              <path fill="#4285F4" d="M44.5 20H24v8h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
              <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.4-5L32 35.2C29.9 36.6 27.1 37.5 24 37.5c-5.7 0-10.6-3.8-12.4-9.1l-7 5.4C8.5 41.5 15.6 46 24 46z"/>
              <path fill="#EA4335" d="M44.5 20H24v8h11.8c-.9 2.5-2.5 4.6-4.6 6l6.4 5c3.8-3.5 6.4-8.7 6.4-15 0-1.3-.2-2.7-.5-4z"/>
            </svg>
            Continue with Google
          </button>

          <div className="mt-5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Unauthorised access attempts are logged
          </div>
        </div>
      </div>
    </div>
  );
}

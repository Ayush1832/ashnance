"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { userStore } from "@/lib/userStore";
import { api, mapProfile } from "@/lib/apiClient";

function AuthCallback() {
  const router         = useRouter();
  const [msg, setMsg]  = useState("SIGNING YOU IN...");
  const processedRef   = useRef(false);

  useEffect(() => {
    // Run exactly once even if React re-invokes the effect (Strict Mode, dep changes)
    if (processedRef.current) return;
    processedRef.current = true;

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const scheduleRedirect = (path: string, delay = 1500) => {
      const id = setTimeout(() => { if (!cancelled) router.replace(path); }, delay);
      timeouts.push(id);
    };

    async function handleCallback() {
      // Snapshot hash + query BEFORE clearing anything so a re-render can't lose it.
      const hash       = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      const query      = typeof window !== "undefined" ? window.location.search.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(query);

      const accessToken  = hashParams.get("accessToken")  ?? queryParams.get("token");
      const refreshToken = hashParams.get("refreshToken") ?? queryParams.get("refreshToken");
      const error        = hashParams.get("error") ?? queryParams.get("error");

      // Clear the fragment so tokens don't sit in the address bar — AFTER reading.
      if (typeof window !== "undefined" && hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }

      if (cancelled) return;

      if (error || !accessToken) {
        setMsg("SIGN-IN CANCELLED");
        scheduleRedirect("/login");
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      // Owner login attempt → verify and redirect to owner panel
      const ownerAttempt = localStorage.getItem("ownerLoginAttempt");
      if (ownerAttempt) {
        localStorage.removeItem("ownerLoginAttempt");
        setMsg("VERIFYING OWNER ACCESS...");
        try {
          const res = await fetch(
            (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/owner/me",
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (cancelled) return;
          if (res.ok) {
            setMsg("OWNER ACCESS GRANTED");
            try {
              const profileRes = await api.profile();
              if (!cancelled && profileRes.success && profileRes.data) {
                userStore.update(mapProfile(profileRes.data as Record<string, unknown>));
              }
            } catch { /* non-fatal */ }
            if (!cancelled) router.replace("/owner");
            return;
          }
        } catch { /* fall through */ }
        if (!cancelled) {
          setMsg("ACCESS DENIED — NOT AN OWNER");
          scheduleRedirect("/login");
        }
        return;
      }

      // Apply pending referral code (set before Google OAuth redirect)
      const pendingReferral = localStorage.getItem("pendingReferral");
      if (pendingReferral) {
        localStorage.removeItem("pendingReferral");
        try { await api.applyReferral(pendingReferral); } catch { /* non-fatal */ }
        if (cancelled) return;
      }

      // Fetch user profile and store it
      try {
        const profileRes = await api.profile();
        if (!cancelled && profileRes.success && profileRes.data) {
          userStore.update(mapProfile(profileRes.data as Record<string, unknown>));
        }
      } catch {
        // Non-fatal — useAuth will retry on next page load
      }

      if (!cancelled) {
        setMsg("WELCOME! REDIRECTING...");
        router.replace("/dashboard");
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
      for (const id of timeouts) clearTimeout(id);
    };
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--background)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      letterSpacing: "4px",
      color: "var(--primary)",
      fontSize: "24px",
      gap: "16px",
    }}>
      <div style={{ fontSize: "48px" }}>🔥</div>
      {msg}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        background: "#080808",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FF4D00",
        fontSize: "24px",
        letterSpacing: "4px",
      }}>
        🔥 LOADING...
      </div>
    }>
      <AuthCallback />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallback() {
  const router      = useRouter();
  const params      = useSearchParams();
  const [msg, setMsg] = useState("SIGNING YOU IN...");

  useEffect(() => {
    async function handleCallback() {
      // Tokens are in the URL fragment (hash) to avoid server logs and browser history.
      // Fall back to query params for backwards compatibility.
      const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);

      const accessToken  = hashParams.get("accessToken")  || params.get("accessToken");
      const refreshToken = hashParams.get("refreshToken") || params.get("refreshToken");
      const error        = hashParams.get("error")        || params.get("error");

      // Clear the fragment so tokens don't sit in the address bar
      if (typeof window !== "undefined" && hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }

      if (error || !accessToken) {
        setMsg("SIGN-IN CANCELLED");
        setTimeout(() => router.replace("/login"), 1500);
        return;
      }

      localStorage.setItem("accessToken",  accessToken);
      localStorage.setItem("refreshToken", refreshToken || "");

      // If this was an owner login attempt, verify and redirect to owner panel
      const ownerAttempt = localStorage.getItem("ownerLoginAttempt");
      if (ownerAttempt) {
        localStorage.removeItem("ownerLoginAttempt");
        setMsg("VERIFYING OWNER ACCESS...");
        try {
          const res = await fetch(
            (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/owner/me",
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (res.ok) {
            setMsg("OWNER ACCESS GRANTED");
            router.replace("/owner");
            return;
          }
        } catch { /* fall through to normal redirect */ }
        setMsg("ACCESS DENIED — NOT AN OWNER");
        setTimeout(() => router.replace("/login"), 1500);
        return;
      }

      setMsg("WELCOME! REDIRECTING...");
      router.replace("/connect-wallet");
    }
    handleCallback();
  }, [params, router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--black)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      letterSpacing: "4px",
      color: "var(--fire-orange)",
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

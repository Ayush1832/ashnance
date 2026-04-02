"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallback() {
  const router      = useRouter();
  const params      = useSearchParams();
  const [msg, setMsg] = useState("SIGNING YOU IN...");

  useEffect(() => {
    async function handleCallback() {
      const accessToken  = params.get("accessToken");
      const refreshToken = params.get("refreshToken");
      const error        = params.get("error");

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

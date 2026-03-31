"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallback() {
  const router      = useRouter();
  const params      = useSearchParams();
  const [msg, setMsg] = useState("SIGNING YOU IN...");

  useEffect(() => {
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

    setMsg("WELCOME! REDIRECTING...");
    router.replace("/dashboard");
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

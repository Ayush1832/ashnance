"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "24px", height: "24px", border: "2px solid rgba(255,77,0,0.3)", borderTopColor: "#FF4D00", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050505",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "#0a0a0a",
        border: "1px solid rgba(255,77,0,0.3)",
        borderRadius: "8px",
        padding: "48px 36px",
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: "4px" }}>
          <img src="/logo.png" alt="Ashnance" style={{ width: "160px", height: "auto" }} />
        </div>
        <div style={{
          fontSize: "9px",
          color: "#555",
          letterSpacing: "4px",
          marginBottom: "40px",
        }}>
          OWNER PORTAL
        </div>

        <div style={{ fontSize: "56px", marginBottom: "24px" }}>🔐</div>

        <div style={{
          fontFamily: "var(--font-display, monospace)",
          fontSize: "16px",
          letterSpacing: "4px",
          color: "#fff",
          marginBottom: "8px",
        }}>
          OWNER ACCESS ONLY
        </div>
        <div style={{
          fontSize: "10px",
          color: "#444",
          letterSpacing: "1px",
          lineHeight: "1.8",
          marginBottom: "36px",
        }}>
          THIS PORTAL IS RESTRICTED TO AUTHORISED OWNERS.
          LOGIN WITH YOUR REGISTERED GOOGLE ACCOUNT.
        </div>

        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: "#fff",
            border: "none",
            borderRadius: "4px",
            color: "#111",
            fontFamily: "var(--font-display, monospace)",
            fontSize: "12px",
            letterSpacing: "2px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M44.5 20H24v8h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
            <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
            <path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.4-5L32 35.2C29.9 36.6 27.1 37.5 24 37.5c-5.7 0-10.6-3.8-12.4-9.1l-7 5.4C8.5 41.5 15.6 46 24 46z"/>
            <path fill="#EA4335" d="M44.5 20H24v8h11.8c-.9 2.5-2.5 4.6-4.6 6l6.4 5c3.8-3.5 6.4-8.7 6.4-15 0-1.3-.2-2.7-.5-4z"/>
          </svg>
          CONTINUE WITH GOOGLE
        </button>

        <div style={{ fontSize: "9px", color: "#333", letterSpacing: "1px", marginTop: "20px" }}>
          UNAUTHORISED ACCESS ATTEMPTS ARE LOGGED
        </div>
      </div>
    </div>
  );
}

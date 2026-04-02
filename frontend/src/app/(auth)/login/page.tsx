"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Tab = "LOGIN" | "REGISTER";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---- OTP helpers ----
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`login-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`login-otp-${index - 1}`)?.focus();
    }
  };

  // ---- Step 1: send OTP ----
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setOtpSent(true);
      setSuccess("OTP sent — check your inbox.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 2: verify OTP & login ----
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("Enter all 6 digits");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Login failed");
      const tokens = data.data;
      if (tokens?.accessToken) {
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken || "");
      }
      window.location.href = "/connect-wallet";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePhantomLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = (window as any).phantom?.solana ?? (window as any).solana;
      if (!provider?.isPhantom) {
        window.open("https://phantom.app/", "_blank");
        setError("Phantom not detected. Install it and refresh this page.");
        return;
      }
      await provider.connect();
      const publicKey: string = provider.publicKey.toBase58();
      const message = `Sign in to Ashnance\ntimestamp:${Date.now()}`;
      const encoded = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encoded, "utf8");
      const sigArray = Array.from(signature as Uint8Array);
      const res = await api.auth.wallet(publicKey, sigArray, message) as { data: { accessToken: string; refreshToken: string } };
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken || "");
      localStorage.setItem("walletAddress", publicKey);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Wallet connection failed";
      setError(msg.includes("rejected") ? "Signature rejected in Phantom. Please approve to continue." : msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setOtpSent(false);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setSuccess("");
  };

  return (
    <div className={styles["auth-page"]}>
      <div className={styles["auth-container"]}>
        {/* Logo */}
        <Link href="/" className={styles["auth-logo"]}>
          ASHNANCE
        </Link>

        {/* Card */}
        <div className={styles["auth-card"]}>
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab${activeTab === "REGISTER" ? "" : " active"}`}
              onClick={() => {
                resetForm();
                setActiveTab("LOGIN");
              }}
            >
              LOGIN
            </button>
            <Link
              href="/register"
              className="auth-tab"
              style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              REGISTER
            </Link>
          </div>

          {/* Error / Success banners */}
          {error && <div className={styles["auth-error"]}>{error}</div>}
          {success && <div className={styles["auth-success"]}>{success}</div>}

          {/* Step 1 — email entry */}
          {!otpSent && (
            <form className={styles["auth-form"]} onSubmit={handleSendOtp}>
              <div className="form-group">
                <label htmlFor="login-email">EMAIL</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">PASSWORD / OTP</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter password or leave blank for OTP"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className={styles["auth-submit"]} disabled={loading}>
                {loading && <span className={styles["auth-loading"]} />}
                {loading ? "SENDING..." : "LOGIN"}
              </button>
            </form>
          )}

          {/* Step 2 — OTP verification */}
          {otpSent && (
            <form className={styles["auth-form"]} onSubmit={handleLogin}>
              <p style={{ fontSize: "10px", letterSpacing: "1px", color: "var(--text-dim)", textAlign: "center", marginBottom: "4px" }}>
                CODE SENT TO
              </p>
              <p style={{ fontSize: "12px", color: "var(--text)", textAlign: "center", marginBottom: "4px", letterSpacing: "1px" }}>
                {email}
              </p>

              <div className={styles["otp-group"]}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`login-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={styles["otp-input"]}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                className={styles["auth-submit"]}
                disabled={loading || otp.some((d) => !d)}
              >
                {loading && <span className={styles["auth-loading"]} />}
                {loading ? "VERIFYING..." : "LOGIN"}
              </button>

              <button
                type="button"
                className={styles["back-link"]}
                onClick={() => { setOtpSent(false); setOtp(["", "", "", "", "", ""]); setError(""); setSuccess(""); }}
              >
                ← CHANGE EMAIL
              </button>
            </form>
          )}

          {/* Divider */}
          <div className={styles["auth-divider"]}>— OR CONTINUE WITH —</div>

          {/* Social buttons */}
          <div className={styles["social-grid"]}>
            {/* Google */}
            <button
              className={styles["social-btn-branded"]}
              type="button"
              onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Google</span>
            </button>

            {/* Telegram */}
            <button className={styles["social-btn-branded"]} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#26A5E4"/>
                <path d="M5.5 11.5l12-5-4 13-3-4-5 3 3-4.5 7-4.5-8.5 4.5-4.5 1.5z" fill="white" fillOpacity="0.9"/>
              </svg>
              <span>Telegram</span>
            </button>

            {/* Twitter / X */}
            <button className={styles["social-btn-branded"]} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Twitter</span>
            </button>

            {/* Phantom */}
            <button
              className={`${styles["social-btn-branded"]} ${styles["phantom-btn"]}`}
              type="button"
              onClick={handlePhantomLogin}
            >
              <svg width="18" height="18" viewBox="0 0 128 128" fill="none">
                <rect width="128" height="128" rx="26" fill="#AB9FF2"/>
                <path d="M110.6 64c0 25.7-20.9 46.6-46.6 46.6S17.4 89.7 17.4 64 38.3 17.4 64 17.4 110.6 38.3 110.6 64z" fill="#AB9FF2"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M17.4 64C17.4 38.3 38.3 17.4 64 17.4c25.7 0 46.6 20.9 46.6 46.6 0 2.6-.2 5.1-.6 7.6H91.3c.3-2.5.5-5 .5-7.6 0-15.3-12.4-27.7-27.8-27.7-15.3 0-27.7 12.4-27.7 27.7s12.4 27.7 27.7 27.7c5 0 9.7-1.3 13.7-3.7l10.2 9.6C81.9 106 73.3 109.3 64 109.3 38.3 110.6 17.4 89.7 17.4 64z" fill="white" fillOpacity="0.15"/>
                <ellipse cx="52" cy="60" rx="7" ry="9" fill="white"/>
                <ellipse cx="76" cy="60" rx="7" ry="9" fill="white"/>
                <ellipse cx="50" cy="58" rx="3" ry="4" fill="#AB9FF2"/>
                <ellipse cx="74" cy="58" rx="3" ry="4" fill="#AB9FF2"/>
              </svg>
              <span>Phantom</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={styles["auth-footer"]}>
          No account?&nbsp;
          <Link href="/register">REGISTER HERE</Link>
        </div>
      </div>
    </div>
  );
}

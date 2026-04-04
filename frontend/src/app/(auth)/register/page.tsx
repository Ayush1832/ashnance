"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [referral, setReferral] = useState("");
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
      document.getElementById(`reg-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`reg-otp-${index - 1}`)?.focus();
    }
  };

  // ---- Step 1: send OTP ----
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !username) {
      setError("Email and username are required");
      return;
    }
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

  // ---- Step 2: verify OTP & register ----
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("Enter all 6 digits");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, string> = { email, username, otp: otpCode };
      if (referral.trim()) body.referralCode = referral.trim();

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Registration failed");
      const tokens = data.data;
      if (tokens?.accessToken) {
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken || "");
      }
      window.location.href = "/connect-wallet";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["auth-page"]}>
      <div className={styles["auth-container"]}>
        {/* Logo */}
        <Link href="/" className={styles["auth-logo"]}>
          <img src="/logo.png" alt="Ashnance" style={{ width: "180px", height: "auto" }} />
        </Link>

        {/* Card */}
        <div className={styles["auth-card"]}>
          {/* Tabs */}
          <div className="auth-tabs">
            <Link
              href="/login"
              className="auth-tab"
              style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              LOGIN
            </Link>
            <button className="auth-tab active" type="button">
              REGISTER
            </button>
          </div>

          {/* Error / Success banners */}
          {error && <div className={styles["auth-error"]}>{error}</div>}
          {success && <div className={styles["auth-success"]}>{success}</div>}

          {/* Step 1 — registration fields */}
          {!otpSent && (
            <form className={styles["auth-form"]} onSubmit={handleSendOtp}>
              <div className="form-group">
                <label htmlFor="reg-email">EMAIL</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-username">USERNAME</label>
                <input
                  id="reg-username"
                  type="text"
                  placeholder="choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-referral">
                  REFERRAL CODE&nbsp;
                  <span style={{ color: "var(--text-dim)", letterSpacing: "1px" }}>(OPTIONAL)</span>
                </label>
                <input
                  id="reg-referral"
                  type="text"
                  placeholder="enter referral code"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <button type="submit" className={styles["auth-submit"]} disabled={loading}>
                {loading && <span className={styles["auth-loading"]} />}
                {loading ? "SENDING OTP..." : "SEND OTP"}
              </button>
            </form>
          )}

          {/* Step 2 — OTP verification */}
          {otpSent && (
            <form className={styles["auth-form"]} onSubmit={handleRegister}>
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
                    id={`reg-otp-${i}`}
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
                {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
              </button>

              <button
                type="button"
                className={styles["back-link"]}
                onClick={() => { setOtpSent(false); setOtp(["", "", "", "", "", ""]); setError(""); setSuccess(""); }}
              >
                ← BACK TO FORM
              </button>
            </form>
          )}

          {/* Divider */}
          <div className={styles["auth-divider"]}>— OR CONTINUE WITH —</div>

          {/* Social buttons */}
          <div className={styles["social-grid"]}>
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
            <button className={styles["social-btn-branded"]} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#26A5E4"/>
                <path d="M5.5 11.5l12-5-4 13-3-4-5 3 3-4.5 7-4.5-8.5 4.5-4.5 1.5z" fill="white" fillOpacity="0.9"/>
              </svg>
              <span>Telegram</span>
            </button>
            <button className={styles["social-btn-branded"]} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Twitter</span>
            </button>
            <button className={`${styles["social-btn-branded"]} ${styles["phantom-btn"]}`} type="button">
              <svg width="18" height="18" viewBox="0 0 128 128" fill="none">
                <rect width="128" height="128" rx="26" fill="#AB9FF2"/>
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
          Already have an account?&nbsp;
          <Link href="/login">LOGIN HERE</Link>
        </div>
      </div>
    </div>
  );
}

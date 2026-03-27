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
      if (!res.ok) throw new Error(data.message || "Registration failed");
      if (data.token) {
        localStorage.setItem("ash_token", data.token);
      }
      window.location.href = "/dashboard";
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
          ASHNANCE
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

          {/* Social buttons 2x2 */}
          <div className="social-login">
            <button className="social-btn" type="button">
              <span>🟢</span> Google
            </button>
            <button className="social-btn" type="button">
              <span>✈️</span> Telegram
            </button>
            <button className="social-btn" type="button">
              <span>𝕏</span> Twitter
            </button>
            <button className="social-btn" type="button">
              <span>👻</span> Phantom
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

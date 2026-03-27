"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";

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
      if (!res.ok) throw new Error(data.message || "Login failed");
      if (data.token) {
        localStorage.setItem("ash_token", data.token);
      }
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
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
          No account?&nbsp;
          <Link href="/register">REGISTER HERE</Link>
        </div>
      </div>
    </div>
  );
}

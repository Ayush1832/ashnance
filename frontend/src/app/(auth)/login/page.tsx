"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";

type AuthTab = "email" | "wallet";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>("email");
  const [email, setEmail] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setShowOTP(true);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  return (
    <div className={styles["auth-page"]}>
      <div className={styles["auth-container"]}>
        {/* Logo */}
        <div className={styles["auth-header"]}>
          <Link href="/" className={styles["auth-logo"]}>
            <div className={styles["auth-logo-icon"]}>🔥</div>
            <span>Ashnance</span>
          </Link>
          <h1 className={styles["auth-title"]}>Welcome Back</h1>
          <p className={styles["auth-subtitle"]}>
            Log in to continue your burning journey
          </p>
        </div>

        {/* Auth Card */}
        <div className={`glass-card ${styles["auth-card"]}`}>
          {/* Tabs */}
          <div className={styles["auth-tabs"]}>
            <button
              className={`${styles["auth-tab"]} ${activeTab === "email" ? styles.active : ""}`}
              onClick={() => { setActiveTab("email"); setShowOTP(false); }}
            >
              Email Login
            </button>
            <button
              className={`${styles["auth-tab"]} ${activeTab === "wallet" ? styles.active : ""}`}
              onClick={() => { setActiveTab("wallet"); setShowOTP(false); }}
            >
              Connect Wallet
            </button>
          </div>

          {activeTab === "email" && !showOTP && (
            <>
              {/* Social Auth */}
              <div className={styles["social-auth"]}>
                <button className={styles["social-btn"]}>
                  <span className={styles["social-icon"]}>🔵</span>
                  Continue with Google
                </button>
                <div className={styles["social-row"]}>
                  <button className={styles["social-btn"]}>
                    <span className={styles["social-icon"]}>𝕏</span>
                    X (Twitter)
                  </button>
                  <button className={styles["social-btn"]}>
                    <span className={styles["social-icon"]}>✈️</span>
                    Telegram
                  </button>
                </div>
              </div>

              <div className={styles["auth-divider"]}>
                <span>or continue with email</span>
              </div>

              {/* Email Form */}
              <form className={styles["auth-form"]} onSubmit={handleEmailSubmit}>
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]} htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={styles["form-input"]}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles["auth-submit"]}>
                  Send Login Code
                </button>
              </form>
            </>
          )}

          {activeTab === "email" && showOTP && (
            <>
              {/* OTP Verification */}
              <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
                <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-sm)" }}>
                  We sent a 6-digit code to
                </p>
                <p style={{ fontSize: "var(--fs-body)", color: "var(--text-primary)", fontWeight: 600 }}>
                  {email}
                </p>
              </div>

              <div className={styles["otp-group"]}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={styles["otp-input"]}
                    value={digit}
                    onChange={(e) => handleOTPChange(i, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(i, e)}
                  />
                ))}
              </div>

              <div style={{ marginTop: "var(--space-xl)" }}>
                <button
                  className={styles["auth-submit"]}
                  disabled={otp.some((d) => !d)}
                >
                  Verify & Login
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: "var(--space-lg)" }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary-container)",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "var(--fs-body-sm)",
                  }}
                  onClick={() => setShowOTP(false)}
                >
                  ← Change email
                </button>
              </div>
            </>
          )}

          {activeTab === "wallet" && (
            <>
              <p style={{
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: "var(--fs-body-sm)",
                marginBottom: "var(--space-xl)",
              }}>
                Connect your Solana wallet to sign in instantly
              </p>

              <div className={styles["wallet-grid"]}>
                <button className={styles["wallet-btn"]}>
                  <span className={styles["wallet-icon"]}>👻</span>
                  Phantom
                </button>
                <button className={styles["wallet-btn"]}>
                  <span className={styles["wallet-icon"]}>☀️</span>
                  Solflare
                </button>
                <button className={styles["wallet-btn"]}>
                  <span className={styles["wallet-icon"]}>🎒</span>
                  Backpack
                </button>
              </div>

              <div className={styles["auth-divider"]}>
                <span>or use WalletConnect</span>
              </div>

              <button className={styles["social-btn"]} style={{ width: "100%" }}>
                <span className={styles["social-icon"]}>🔗</span>
                WalletConnect
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles["auth-footer"]}>
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/register">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

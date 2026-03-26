"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";

type AuthTab = "email" | "wallet";

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [referralCode, setReferralCode] = useState("");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && username) {
      setShowOTP(true);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`reg-otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`reg-otp-${index - 1}`);
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
          <h1 className={styles["auth-title"]}>Create Account</h1>
          <p className={styles["auth-subtitle"]}>
            Join the burn community and start earning
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
              Email Sign Up
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
                  Sign up with Google
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
                <span>or sign up with email</span>
              </div>

              {/* Registration Form */}
              <form className={styles["auth-form"]} onSubmit={handleEmailSubmit}>
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]} htmlFor="reg-username">
                    Username
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    className={styles["form-input"]}
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]} htmlFor="reg-email">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className={styles["form-input"]}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]} htmlFor="reg-referral">
                    Referral Code <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    id="reg-referral"
                    type="text"
                    className={styles["form-input"]}
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
                </div>

                <button type="submit" className={styles["auth-submit"]}>
                  Create Account
                </button>

                <p className={styles["form-hint"]} style={{ textAlign: "center" }}>
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </>
          )}

          {activeTab === "email" && showOTP && (
            <>
              <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
                <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-sm)" }}>
                  Verify your email — code sent to
                </p>
                <p style={{ fontSize: "var(--fs-body)", color: "var(--text-primary)", fontWeight: 600 }}>
                  {email}
                </p>
              </div>

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
                  Verify & Create Account
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
                  ← Back to form
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
                Connect your Solana wallet to create an account instantly
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

              <p className={styles["form-hint"]} style={{ textAlign: "center", marginTop: "var(--space-lg)" }}>
                You&apos;ll sign a message to prove wallet ownership. No gas fees required.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles["auth-footer"]}>
          <p>
            Already have an account?{" "}
            <Link href="/login">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

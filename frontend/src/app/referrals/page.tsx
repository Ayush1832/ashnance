"use client";

import { useState } from "react";
import Link from "next/link";
import dashStyles from "../dashboard/dashboard.module.css";
import styles from "../wallet/wallet.module.css";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "🔥", label: "Burn Now", href: "/burn" },
  { icon: "💳", label: "Wallet", href: "/wallet" },
  { icon: "👥", label: "Referrals", href: "/referrals", active: true },
  { icon: "🏆", label: "Leaderboard", href: "/leaderboard" },
  { icon: "📜", label: "Transactions", href: "/transactions" },
];

const referralHistory = [
  { user: "AhmedX", date: "Today", burns: 12, earned: "$5.94" },
  { user: "SarahCrypto", date: "Yesterday", burns: 8, earned: "$3.96" },
  { user: "OmarFire", date: "2 days ago", burns: 25, earned: "$12.45" },
  { user: "FatimaWeb3", date: "3 days ago", burns: 5, earned: "$2.49" },
  { user: "CarlosSOL", date: "1 week ago", burns: 42, earned: "$20.86" },
];

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  const referralLink = "https://ashnance.io/ref/BurnMaster42";
  const referralCode = "BurnMaster42";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles["wallet-page"]}>
      {/* Sidebar */}
      <aside className={dashStyles.sidebar}>
        <div className={dashStyles["sidebar-header"]}>
          <Link href="/" className={dashStyles["sidebar-logo"]}>
            <div className={dashStyles["sidebar-logo-icon"]}>🔥</div>
            <span>Ashnance</span>
          </Link>
        </div>
        <nav className={dashStyles["sidebar-nav"]}>
          <div className={dashStyles["nav-section"]}>
            <p className={dashStyles["nav-section-label"]}>Main</p>
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`${dashStyles["nav-item"]} ${item.active ? dashStyles.active : ""}`}
              >
                <span className={dashStyles["nav-icon"]}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className={dashStyles["sidebar-footer"]}>
          <button className={`${dashStyles["sidebar-cta"]} ${dashStyles.vip}`}>
            👑 Holy Fire VIP
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles["wallet-main"]}>
        <div className={styles["wallet-content"]}>
          <div className={styles["page-header"]}>
            <h1>👥 Referral Program</h1>
            <p>Earn 10% of every burn your referrals make — instant USDC rewards</p>
          </div>

          {/* Stats */}
          <div className={styles["wallet-balances"]}>
            <div className={`glass-card ${styles["wallet-balance-card"]}`}>
              <div className={styles["wb-label"]}>💰 Total Earned</div>
              <div className={`${styles["wb-value"]} ${styles.usdc}`}>$48.50</div>
              <div className={styles["wb-sub"]}>Lifetime referral earnings</div>
            </div>
            <div className={`glass-card ${styles["wallet-balance-card"]}`}>
              <div className={styles["wb-label"]}>👥 Total Referrals</div>
              <div className={`${styles["wb-value"]} ${styles.ash}`}>23</div>
              <div className={styles["wb-sub"]}>Active burners referred</div>
            </div>
            <div className={`glass-card ${styles["wallet-balance-card"]}`}>
              <div className={styles["wb-label"]}>🔥 Their Burns</div>
              <div className={`${styles["wb-value"]} ${styles.referral}`}>142</div>
              <div className={styles["wb-sub"]}>Total burns by referrals</div>
            </div>
          </div>

          {/* Referral Link */}
          <div className="glass-card" style={{ padding: "var(--space-xl)", marginBottom: "var(--space-xl)" }}>
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-body)",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "var(--space-lg)",
            }}>
              🔗 Your Referral Link
            </h3>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
              padding: "var(--space-md)",
              background: "var(--bg-surface-lowest)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-lg)",
            }}>
              <code style={{
                flex: 1,
                fontSize: "var(--fs-body-sm)",
                color: "var(--primary-container)",
                wordBreak: "break-all",
                fontFamily: "monospace",
              }}>
                {referralLink}
              </code>
              <button
                className={styles["copy-btn"]}
                onClick={handleCopy}
                style={{
                  background: copied ? "var(--success)" : undefined,
                  color: copied ? "#fff" : undefined,
                }}
              >
                {copied ? "✅ Copied!" : "📋 Copy"}
              </button>
            </div>

            <p style={{
              fontSize: "var(--fs-caption)",
              color: "var(--text-secondary)",
              marginBottom: "var(--space-lg)",
            }}>
              Your code: <strong style={{ color: "var(--primary-container)" }}>{referralCode}</strong>
            </p>

            {/* Share Buttons */}
            <div style={{
              display: "flex",
              gap: "var(--space-sm)",
              flexWrap: "wrap",
            }}>
              {[
                { label: "𝕏 Share on X", bg: "#1a1a2e" },
                { label: "✈️ Share on Telegram", bg: "#0088cc22" },
                { label: "📱 WhatsApp", bg: "#25D36622" },
              ].map((btn) => (
                <button
                  key={btn.label}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "var(--radius-md)",
                    background: btn.bg,
                    color: "var(--text-primary)",
                    fontSize: "var(--fs-caption)",
                    fontWeight: 500,
                    cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.08)",
                    transition: "all 150ms ease",
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Referral History */}
          <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-body)",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "var(--space-lg)",
            }}>
              📊 Referral Activity
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "var(--fs-body-sm)",
              }}>
                <thead>
                  <tr style={{
                    borderBottom: "1px solid var(--outline-variant)",
                  }}>
                    {["User", "Joined", "Burns", "You Earned"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left",
                        padding: "var(--space-sm) var(--space-md)",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                        fontSize: "var(--fs-caption)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referralHistory.map((ref, i) => (
                    <tr key={i} style={{
                      borderBottom: "1px solid rgba(89, 65, 57, 0.1)",
                    }}>
                      <td style={{ padding: "var(--space-md)", color: "var(--text-primary)", fontWeight: 500 }}>
                        {ref.user}
                      </td>
                      <td style={{ padding: "var(--space-md)", color: "var(--text-secondary)" }}>
                        {ref.date}
                      </td>
                      <td style={{ padding: "var(--space-md)", color: "var(--primary-container)", fontWeight: 600 }}>
                        {ref.burns}
                      </td>
                      <td style={{ padding: "var(--space-md)", color: "var(--success)", fontWeight: 600 }}>
                        {ref.earned}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

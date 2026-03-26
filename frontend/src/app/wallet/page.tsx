"use client";

import { useState } from "react";
import Link from "next/link";
import dashStyles from "../dashboard/dashboard.module.css";
import styles from "./wallet.module.css";

type WalletTab = "deposit" | "withdraw" | "history";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "🔥", label: "Burn Now", href: "/burn" },
  { icon: "💳", label: "Wallet", href: "/wallet", active: true },
  { icon: "👥", label: "Referrals", href: "/referrals" },
  { icon: "🏆", label: "Leaderboard", href: "/leaderboard" },
  { icon: "📜", label: "Transactions", href: "/transactions" },
];

const txHistory = [
  { id: 1, type: "deposit", title: "USDC Deposit", time: "Today, 10:30 AM", amount: "+500.00 USDC", amountClass: "positive" },
  { id: 2, type: "burn", title: "Burned 10 USDC", time: "Today, 10:32 AM", amount: "-10.00 USDC", amountClass: "negative" },
  { id: 3, type: "win", title: "Won Medium Prize", time: "Today, 10:32 AM", amount: "+200.00 USDC", amountClass: "gold" },
  { id: 4, type: "burn", title: "Burned 4.99 USDC", time: "Today, 10:45 AM", amount: "-4.99 USDC", amountClass: "negative" },
  { id: 5, type: "referral", title: "Referral Reward", time: "Yesterday", amount: "+0.49 USDC", amountClass: "positive" },
  { id: 6, type: "withdraw", title: "Withdrawal", time: "Yesterday", amount: "-100.00 USDC", amountClass: "negative" },
];

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<WalletTab>("deposit");
  const [txFilter, setTxFilter] = useState("all");

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
            <h1>💳 Wallet</h1>
            <p>Manage your USDC and ASH balances</p>
          </div>

          {/* Balances */}
          <div className={styles["wallet-balances"]}>
            <div className={`glass-card ${styles["wallet-balance-card"]}`}>
              <div className={styles["wb-label"]}>💵 USDC Balance</div>
              <div className={`${styles["wb-value"]} ${styles.usdc}`}>$1,245.50</div>
              <div className={styles["wb-sub"]}>Available for burn/withdraw</div>
            </div>
            <div className={`glass-card ${styles["wallet-balance-card"]}`}>
              <div className={styles["wb-label"]}>🔥 ASH Tokens</div>
              <div className={`${styles["wb-value"]} ${styles.ash}`}>12,450</div>
              <div className={styles["wb-sub"]}>Use for boosts & trading</div>
            </div>
            <div className={`glass-card ${styles["wallet-balance-card"]}`}>
              <div className={styles["wb-label"]}>👥 Referral Earnings</div>
              <div className={`${styles["wb-value"]} ${styles.referral}`}>$48.50</div>
              <div className={styles["wb-sub"]}>Lifetime referral rewards</div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles["wallet-tabs"]}>
            {(["deposit", "withdraw", "history"] as WalletTab[]).map((tab) => (
              <button
                key={tab}
                className={`${styles["wallet-tab"]} ${activeTab === tab ? styles.active : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "deposit" ? "💳 Deposit" : tab === "withdraw" ? "💸 Withdraw" : "📜 History"}
              </button>
            ))}
          </div>

          {/* Deposit */}
          {activeTab === "deposit" && (
            <div className={styles["deposit-section"]}>
              <div className={`glass-card ${styles["deposit-method"]}`}>
                <h3>📍 Deposit Address</h3>
                <div className={styles["deposit-address-box"]}>
                  <p className={styles["deposit-address-label"]}>Your unique Solana USDC deposit address:</p>
                  <div className={styles["deposit-address"]}>
                    <code>7xK9mFz3Rg4cVnPq2tW8jYbE5hNd6sLf</code>
                    <button className={styles["copy-btn"]}>📋 Copy</button>
                  </div>
                </div>
                <p className={styles["deposit-note"]}>
                  <strong>⚠️ Only send USDC (SPL) on Solana network.</strong><br />
                  Minimum deposit: 1 USDC. Deposits reflect within 1–2 minutes.
                </p>
              </div>

              <div className={`glass-card ${styles["deposit-method"]}`}>
                <h3>🔗 Connect Wallet</h3>
                <div className={styles["wallet-connect-grid"]}>
                  {[
                    { icon: "👻", name: "Phantom", desc: "Most popular Solana wallet" },
                    { icon: "☀️", name: "Solflare", desc: "Advanced Solana wallet" },
                    { icon: "🎒", name: "Backpack", desc: "Multi-chain wallet" },
                  ].map((wallet) => (
                    <button key={wallet.name} className={styles["wallet-connect-btn"]}>
                      <span className={styles["wc-icon"]}>{wallet.icon}</span>
                      <div>
                        <div className={styles["wc-name"]}>{wallet.name}</div>
                        <div className={styles["wc-desc"]}>{wallet.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Withdraw */}
          {activeTab === "withdraw" && (
            <div className={`glass-card ${styles["withdraw-section"]}`} style={{ padding: "var(--space-xl)" }}>
              <form className={styles["withdraw-form"]}>
                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                  <label style={{ fontSize: "var(--fs-body-sm)", fontWeight: 500, color: "var(--text-primary)" }}>
                    Withdraw Amount
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    style={{
                      padding: "0.8rem 1rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-surface-lowest)",
                      color: "var(--text-primary)",
                      fontSize: "var(--fs-body)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      border: "1px solid transparent",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-secondary)" }}>
                    Available: $1,245.50 USDC • Min: $10.00
                  </span>
                </div>

                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                  <label style={{ fontSize: "var(--fs-body-sm)", fontWeight: 500, color: "var(--text-primary)" }}>
                    Withdrawal Address
                  </label>
                  <input
                    type="text"
                    placeholder="Solana wallet address"
                    style={{
                      padding: "0.8rem 1rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-surface-lowest)",
                      color: "var(--text-primary)",
                      fontSize: "var(--fs-body)",
                      fontFamily: "var(--font-body)",
                      border: "1px solid transparent",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{
                  padding: "var(--space-md)",
                  background: "rgba(255, 170, 0, 0.08)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(255, 170, 0, 0.15)",
                  fontSize: "var(--fs-caption)",
                  color: "var(--warning)",
                }}>
                  🔐 2FA verification will be required to complete withdrawal
                </div>

                <button type="button" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
                  💸 Request Withdrawal
                </button>
              </form>
            </div>
          )}

          {/* History */}
          {activeTab === "history" && (
            <div className={`glass-card ${styles["tx-history"]}`}>
              <div className={styles["tx-filters"]}>
                {["all", "deposits", "burns", "wins", "withdrawals", "referrals"].map((f) => (
                  <button
                    key={f}
                    className={`${styles["tx-filter-btn"]} ${txFilter === f ? styles.active : ""}`}
                    onClick={() => setTxFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className={dashStyles["tx-list"]}>
                {txHistory.map((tx) => (
                  <div key={tx.id} className={dashStyles["tx-item"]}>
                    <div className={`${dashStyles["tx-icon"]} ${dashStyles[tx.type]}`}>
                      {tx.type === "deposit" && "💳"}
                      {tx.type === "burn" && "🔥"}
                      {tx.type === "win" && "🏆"}
                      {tx.type === "withdraw" && "💸"}
                      {tx.type === "referral" && "👥"}
                    </div>
                    <div className={dashStyles["tx-info"]}>
                      <div className={dashStyles["tx-title"]}>{tx.title}</div>
                      <div className={dashStyles["tx-time"]}>{tx.time}</div>
                    </div>
                    <div className={`${dashStyles["tx-amount"]} ${dashStyles[tx.amountClass]}`}>
                      {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

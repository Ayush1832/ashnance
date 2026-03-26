"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/dashboard", active: true },
  { icon: "🔥", label: "Burn Now", href: "/burn", badge: "" },
  { icon: "💳", label: "Wallet", href: "/wallet" },
  { icon: "👥", label: "Referrals", href: "/referrals" },
  { icon: "🏆", label: "Leaderboard", href: "/leaderboard" },
  { icon: "📜", label: "Transactions", href: "/transactions" },
];

const settingsNav = [
  { icon: "⚙️", label: "Settings", href: "/settings" },
  { icon: "🤖", label: "AI Assistant", href: "#" },
];

const mockTransactions = [
  { id: 1, type: "burn", title: "Burned 10 USDC", time: "2 min ago", amount: "-10.00 USDC", amountClass: "negative" },
  { id: 2, type: "win", title: "Won Medium Prize!", time: "2 min ago", amount: "+200.00 USDC", amountClass: "gold" },
  { id: 3, type: "burn", title: "Burned 4.99 USDC", time: "15 min ago", amount: "-4.99 USDC", amountClass: "negative" },
  { id: 4, type: "referral", title: "Referral from Omar", time: "1 hour ago", amount: "+0.49 USDC", amountClass: "positive" },
  { id: 5, type: "deposit", title: "Deposited USDC", time: "3 hours ago", amount: "+500.00 USDC", amountClass: "positive" },
];

const tickerEvents = [
  { dot: "win", name: "Sarah", action: "won", amount: "250 USDC", amountClass: "win" },
  { dot: "burn", name: "Ahmed", action: "burned", amount: "10 USDC", amountClass: "burn-amt" },
  { dot: "ash", name: "John", action: "earned", amount: "300 ASH", amountClass: "" },
  { dot: "win", name: "Fatima", action: "won", amount: "500 USDC", amountClass: "win" },
  { dot: "burn", name: "Carlos", action: "burned", amount: "50 USDC", amountClass: "burn-amt" },
  { dot: "win", name: "Alex", action: "won", amount: "2500 USDC", amountClass: "win" },
  { dot: "ash", name: "Mia", action: "earned", amount: "450 ASH", amountClass: "" },
  { dot: "burn", name: "Raj", action: "burned", amount: "100 USDC", amountClass: "burn-amt" },
  { dot: "ash", name: "Luna", action: "earned", amount: "200 ASH", amountClass: "" },
  { dot: "win", name: "Wei", action: "won", amount: "50 USDC", amountClass: "win" },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles["dashboard-layout"]}>
      {/* Sidebar Overlay (mobile) */}
      <div
        className={`${styles["sidebar-overlay"]} ${sidebarOpen ? styles.show : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ====== SIDEBAR ====== */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}>
        <div className={styles["sidebar-header"]}>
          <Link href="/" className={styles["sidebar-logo"]}>
            <div className={styles["sidebar-logo-icon"]}>🔥</div>
            <span>Ashnance</span>
          </Link>
        </div>

        <nav className={styles["sidebar-nav"]}>
          <div className={styles["nav-section"]}>
            <p className={styles["nav-section-label"]}>Main</p>
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`${styles["nav-item"]} ${item.active ? styles.active : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles["nav-icon"]}>{item.icon}</span>
                {item.label}
                {item.badge !== undefined && item.badge !== "" && (
                  <span className={styles["nav-badge"]}>{item.badge}</span>
                )}
              </Link>
            ))}
          </div>

          <div className={styles["nav-section"]}>
            <p className={styles["nav-section-label"]}>Account</p>
            {settingsNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={styles["nav-item"]}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles["nav-icon"]}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className={styles["sidebar-footer"]}>
          <button className={`${styles["sidebar-cta"]} ${styles.vip}`}>
            👑 Upgrade to Holy Fire
          </button>
          <button className={`${styles["sidebar-cta"]} ${styles.telegram}`}>
            ✈️ Join Telegram
          </button>
        </div>
      </aside>

      {/* ====== MAIN CONTENT ====== */}
      <main className={styles["main-content"]}>
        {/* Top Bar */}
        <header className={styles.topbar}>
          <div className={styles["topbar-left"]}>
            <button
              className={styles["mobile-toggle"]}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <h2>Welcome back, Burner 🔥</h2>
            <p>Keep Burning, Keep Earning</p>
          </div>
          <div className={styles["topbar-right"]}>
            <button className={styles["topbar-btn"]} aria-label="Notifications">
              🔔
              <span className={styles["notif-dot"]}></span>
            </button>
            <button className={styles["topbar-btn"]} aria-label="Search">
              🔍
            </button>
            <div className={styles["topbar-avatar"]}>🦊</div>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles["page-content"]}>
          {/* Balance Cards */}
          <div className={styles["balance-row"]}>
            <div className={`glass-card ${styles["balance-card"]} ${styles.usdc}`}>
              <div className={styles["balance-label"]}>
                💵 USDC Balance
              </div>
              <div className={`${styles["balance-value"]} ${styles["usdc-val"]}`}>
                $1,245.50
              </div>
              <div className={`${styles["balance-change"]} ${styles.positive}`}>
                ↑ +$200.00 today
              </div>
            </div>

            <div className={`glass-card ${styles["balance-card"]} ${styles.ash}`}>
              <div className={styles["balance-label"]}>
                🔥 ASH Balance
              </div>
              <div className={`${styles["balance-value"]} ${styles["ash-val"]}`}>
                12,450
              </div>
              <div className={`${styles["balance-change"]} ${styles.positive}`}>
                ↑ +1,200 today
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles["quick-actions"]}>
            <button className={`${styles["action-btn"]} ${styles.deposit}`}>
              💳 Deposit
            </button>
            <button className={`${styles["action-btn"]} ${styles.withdraw}`}>
              💸 Withdraw
            </button>
            <button className={`${styles["action-btn"]} ${styles.burn}`}>
              🔥 Burn Now
            </button>
          </div>

          {/* Stats Grid */}
          <div className={styles["stats-grid"]}>
            <div className={`glass-card ${styles["stat-card"]}`}>
              <div className={styles["stat-label"]}>Total Burns</div>
              <div className={styles["stat-value"]}>142</div>
              <div className={styles["stat-sub"]}>Last: 2 min ago</div>
            </div>
            <div className={`glass-card ${styles["stat-card"]}`}>
              <div className={styles["stat-label"]}>Win Rate</div>
              <div className={styles["stat-value"]}>8.4%</div>
              <div className={styles["stat-sub"]}>12 wins total</div>
            </div>
            <div className={`glass-card ${styles["stat-card"]}`}>
              <div className={styles["stat-label"]}>Total ASH Earned</div>
              <div className={styles["stat-value"]}>34.2K</div>
              <div className={styles["stat-sub"]}>+1,200 today</div>
            </div>
            <div className={`glass-card ${styles["stat-card"]}`}>
              <div className={styles["stat-label"]}>Biggest Win</div>
              <div className={styles["stat-value"]}>$500</div>
              <div className={styles["stat-sub"]}>Big Prize 🔥</div>
            </div>
          </div>

          {/* Bottom Sections */}
          <div className={styles["dashboard-bottom"]}>
            {/* Recent Transactions */}
            <div className="glass-card" style={{ padding: "var(--space-lg) 0" }}>
              <div className={styles["section-header"]}>
                <h3>Recent Transactions</h3>
                <Link href="/transactions">View All →</Link>
              </div>
              <div className={styles["tx-list"]}>
                {mockTransactions.map((tx) => (
                  <div key={tx.id} className={styles["tx-item"]}>
                    <div className={`${styles["tx-icon"]} ${styles[tx.type]}`}>
                      {tx.type === "burn" && "🔥"}
                      {tx.type === "win" && "🏆"}
                      {tx.type === "deposit" && "💳"}
                      {tx.type === "withdraw" && "💸"}
                      {tx.type === "referral" && "👥"}
                    </div>
                    <div className={styles["tx-info"]}>
                      <div className={styles["tx-title"]}>{tx.title}</div>
                      <div className={styles["tx-time"]}>{tx.time}</div>
                    </div>
                    <div className={`${styles["tx-amount"]} ${styles[tx.amountClass]}`}>
                      {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Activity */}
            <div className="glass-card" style={{ padding: "var(--space-lg) 0" }}>
              <div className={styles["section-header"]}>
                <h3>🔴 Live Activity</h3>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--success)" }}>
                  ● Live
                </span>
              </div>
              <div className={styles["mini-ticker"]}>
                {tickerEvents.map((event, i) => (
                  <div key={i} className={styles["mini-ticker-item"]}>
                    <span className={`${styles["ticker-dot"]} ${styles[event.dot]}`}></span>
                    <span className={styles["ticker-name"]}>{event.name}</span>
                    <span>{event.action}</span>
                    <span className={`${styles["ticker-amount"]} ${event.amountClass ? styles[event.amountClass] : ""}`}>
                      {event.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

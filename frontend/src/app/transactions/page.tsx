"use client";

import { useState } from "react";
import Link from "next/link";
import dashStyles from "../dashboard/dashboard.module.css";
import walletStyles from "../wallet/wallet.module.css";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "🔥", label: "Burn Now", href: "/burn" },
  { icon: "💳", label: "Wallet", href: "/wallet" },
  { icon: "📜", label: "Transactions", href: "/transactions", active: true },
  { icon: "🏆", label: "Leaderboard", href: "/leaderboard" },
];

const allTransactions = [
  { id: "TX001", type: "BURN", amount: -4.99, currency: "USDC", status: "COMPLETED", desc: "Burned $4.99 USDC", date: "Today, 14:32" },
  { id: "TX002", type: "WIN", amount: 50, currency: "USDC", status: "COMPLETED", desc: "Won Small prize", date: "Today, 14:32" },
  { id: "TX003", type: "BURN", amount: -10, currency: "USDC", status: "COMPLETED", desc: "Burned $10 USDC", date: "Today, 12:15" },
  { id: "TX004", type: "DEPOSIT", amount: 100, currency: "USDC", status: "COMPLETED", desc: "Deposited 100 USDC", date: "Yesterday" },
  { id: "TX005", type: "REFERRAL_REWARD", amount: 0.49, currency: "USDC", status: "COMPLETED", desc: "Referral from AhmedX", date: "Yesterday" },
  { id: "TX006", type: "WITHDRAWAL", amount: -50, currency: "USDC", status: "PROCESSING", desc: "Withdrawal to 9xkG...3hPq", date: "2 days ago" },
  { id: "TX007", type: "BURN", amount: -50, currency: "USDC", status: "COMPLETED", desc: "Burned $50 USDC", date: "2 days ago" },
  { id: "TX008", type: "WIN", amount: 200, currency: "USDC", status: "COMPLETED", desc: "Won Medium prize", date: "3 days ago" },
  { id: "TX009", type: "VIP_PURCHASE", amount: -24.99, currency: "USDC", status: "COMPLETED", desc: "Holy Fire subscription", date: "1 week ago" },
  { id: "TX010", type: "ASH_BOOST", amount: -1000, currency: "ASH", status: "COMPLETED", desc: "Burn boost activated", date: "1 week ago" },
];

const typeColors: Record<string, string> = {
  BURN: "#e74c3c",
  WIN: "#2ecc71",
  DEPOSIT: "#3498db",
  WITHDRAWAL: "#e67e22",
  REFERRAL_REWARD: "#9b59b6",
  VIP_PURCHASE: "#f1c40f",
  ASH_BOOST: "#1abc9c",
};

const typeLabels: Record<string, string> = {
  BURN: "🔥 Burn",
  WIN: "🏆 Win",
  DEPOSIT: "📥 Deposit",
  WITHDRAWAL: "📤 Withdraw",
  REFERRAL_REWARD: "👥 Referral",
  VIP_PURCHASE: "👑 VIP",
  ASH_BOOST: "⚡ Boost",
};

export default function TransactionsPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = allTransactions.filter((tx) => {
    if (filter !== "ALL" && tx.type !== filter) return false;
    if (search && !tx.desc.toLowerCase().includes(search.toLowerCase()) && !tx.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={walletStyles["wallet-page"]}>
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
      </aside>

      <main className={walletStyles["wallet-main"]}>
        <div className={walletStyles["wallet-content"]}>
          <div className={walletStyles["page-header"]}>
            <h1>📜 Transaction History</h1>
            <p>All your deposits, withdrawals, burns, and rewards</p>
          </div>

          {/* Filters */}
          <div className="glass-card" style={{ padding: "var(--space-lg)", marginBottom: "var(--space-lg)", display: "flex", gap: "var(--space-md)", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="🔍 Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "0.6rem 1rem",
                background: "var(--bg-surface-lowest)",
                border: "1px solid var(--outline-variant)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "var(--fs-body-sm)",
              }}
            />
            <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
              {["ALL", "BURN", "WIN", "DEPOSIT", "WITHDRAWAL", "REFERRAL_REWARD"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: filter === t ? "var(--primary-container)" : "var(--bg-surface-lowest)",
                    color: filter === t ? "#fff" : "var(--text-secondary)",
                    border: "1px solid " + (filter === t ? "transparent" : "var(--outline-variant)"),
                    borderRadius: "var(--radius-pill)",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}
                >
                  {t === "ALL" ? "All" : typeLabels[t]?.split(" ")[1] || t}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction List */}
          <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-body-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                    {["Type", "Description", "Amount", "Status", "Date"].map((h) => (
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
                  {filtered.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid rgba(89,65,57,0.08)" }}>
                      <td style={{ padding: "var(--space-md)" }}>
                        <span style={{
                          padding: "0.25rem 0.6rem",
                          background: `${typeColors[tx.type]}15`,
                          color: typeColors[tx.type],
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}>
                          {typeLabels[tx.type] || tx.type}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-md)", color: "var(--text-primary)" }}>{tx.desc}</td>
                      <td style={{
                        padding: "var(--space-md)",
                        color: tx.amount > 0 ? "var(--success)" : "var(--error)",
                        fontWeight: 700,
                        fontFamily: "var(--font-display)",
                      }}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount} {tx.currency}
                      </td>
                      <td style={{ padding: "var(--space-md)" }}>
                        <span style={{
                          color: tx.status === "COMPLETED" ? "var(--success)" : "var(--warning-text)",
                          fontSize: "var(--fs-caption)",
                          fontWeight: 500,
                        }}>
                          {tx.status === "COMPLETED" ? "✅" : "⏳"} {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-md)", color: "var(--text-secondary)", fontSize: "var(--fs-caption)" }}>{tx.date}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "var(--space-xl)", textAlign: "center", color: "var(--text-secondary)" }}>
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

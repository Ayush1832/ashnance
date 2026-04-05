"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const navItems = [
  { icon: "📊", label: "DASHBOARD",   href: "/dashboard" },
  { icon: "🔥", label: "BURN NOW",    href: "/burn" },
  { icon: "💰", label: "WALLET",      href: "/wallet" },
  { icon: "👥", label: "REFERRALS",   href: "/referrals" },
  { icon: "👑", label: "VIP",         href: "/subscribe" },
  { icon: "📋", label: "HISTORY",     href: "/transactions" },
  { icon: "🏆", label: "LEADERBOARD", href: "/leaderboard" },
  { icon: "💎", label: "STAKING",     href: "/staking" },
  { icon: "⚙️", label: "SETTINGS",   href: "/settings" },
];

type TxType = "ALL" | "BURN" | "WIN" | "DEPOSIT" | "WITHDRAWAL" | "REFERRAL_REWARD" | "VIP_PURCHASE";

const FILTER_TABS: { key: TxType; label: string }[] = [
  { key: "ALL",             label: "ALL"         },
  { key: "BURN",            label: "🔥 BURNS"    },
  { key: "WIN",             label: "💥 WINS"     },
  { key: "DEPOSIT",         label: "💵 DEPOSITS" },
  { key: "WITHDRAWAL",      label: "→ WITHDRAWALS" },
  { key: "REFERRAL_REWARD", label: "👥 REFERRAL" },
  { key: "VIP_PURCHASE",    label: "👑 VIP"      },
];

interface Tx {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  desc: string;
  date: string;
}

const MOCK_TXS: Tx[] = [
  { id: "TX001", type: "BURN",            amount: -4.99,  currency: "USDC", status: "COMPLETED",  desc: "Burned $4.99 USDC",           date: "Today, 14:32" },
  { id: "TX002", type: "WIN",             amount: 50,     currency: "USDC", status: "COMPLETED",  desc: "Won Small prize",              date: "Today, 14:32" },
  { id: "TX003", type: "BURN",            amount: -10,    currency: "USDC", status: "COMPLETED",  desc: "Burned $10 USDC",              date: "Today, 12:15" },
  { id: "TX004", type: "DEPOSIT",         amount: 100,    currency: "USDC", status: "COMPLETED",  desc: "Deposited 100 USDC",           date: "Yesterday" },
  { id: "TX005", type: "REFERRAL_REWARD", amount: 0.49,   currency: "USDC", status: "COMPLETED",  desc: "Referral commission — AhmedX", date: "Yesterday" },
  { id: "TX006", type: "WITHDRAWAL",      amount: -50,    currency: "USDC", status: "PROCESSING", desc: "Withdrawal to 9xkG...3hPq",    date: "2 days ago" },
  { id: "TX007", type: "BURN",            amount: -50,    currency: "USDC", status: "COMPLETED",  desc: "Burned $50 USDC",              date: "2 days ago" },
  { id: "TX008", type: "WIN",             amount: 200,    currency: "USDC", status: "COMPLETED",  desc: "Won Medium prize",             date: "3 days ago" },
  { id: "TX009", type: "VIP_PURCHASE",    amount: -24.99, currency: "USDC", status: "COMPLETED",  desc: "Holy Fire VIP subscription",   date: "1 week ago" },
  { id: "TX010", type: "BURN",            amount: -25,    currency: "USDC", status: "COMPLETED",  desc: "Burned $25 USDC",              date: "1 week ago" },
];

const TX_ICONS: Record<string, string> = {
  BURN:            "🔥",
  WIN:             "💥",
  DEPOSIT:         "💵",
  WITHDRAWAL:      "→",
  REFERRAL_REWARD: "👥",
  VIP_PURCHASE:    "👑",
};

const TX_COLORS: Record<string, string> = {
  BURN:            "var(--fire-red)",
  WIN:             "var(--usdc-green)",
  DEPOSIT:         "#3498db",
  WITHDRAWAL:      "var(--fire-orange)",
  REFERRAL_REWARD: "#9b59b6",
  VIP_PURCHASE:    "var(--gold)",
};

export default function TransactionsPage() {
  const pathname = usePathname();
  const router   = useRouter();

  const [filter, setFilter]   = useState<TxType>("ALL");
  const [search, setSearch]   = useState("");
  const [txList, setTxList]   = useState<Tx[]>(MOCK_TXS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;
    setLoading(true);
    const params = filter !== "ALL" ? `?type=${filter}` : "";
    fetch(`${API}/api/wallet/transactions${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        const txs = res?.data?.transactions ?? res?.transactions ?? (Array.isArray(res) ? res : []);
        if (Array.isArray(txs) && txs.length > 0) {
          setTxList(txs.map((t: any) => ({
            id:       t.id,
            type:     t.type,
            amount:   Number(t.amount),
            currency: t.currency ?? "USDC",
            status:   t.status,
            desc:     t.description ?? t.desc ?? t.type,
            date:     new Date(t.createdAt ?? t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          })));
        } else if (Array.isArray(txs)) {
          setTxList([]); // real empty list — don't show mock
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  function handleLogout() {
    if (typeof window !== "undefined") localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken");
    router.push("/");
  }

  const filtered = txList.filter((tx) => {
    if (filter !== "ALL" && tx.type !== filter) return false;
    const q = search.toLowerCase();
    if (q && !tx.desc.toLowerCase().includes(q) && !tx.id.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="dash-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo-horizontal.png" alt="Ashnance" style={{ width: "140px", height: "auto" }} />
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${pathname.startsWith(item.href) ? " active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="user-avatar">🔥</div>
            <div>
              <div className="user-name">BURNER</div>
              <div className="user-status">STANDARD</div>
            </div>
          </div>
          <button
            className="nav-item"
            onClick={handleLogout}
            style={{ width: "100%", background: "none", border: "none", marginTop: "8px" }}
          >
            <span className="nav-icon">🚪</span>LOGOUT
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="dash-content">
        <div className="dash-header">
          <h1 className="dash-title">TRANSACTION <span>HISTORY</span></h1>
        </div>

        {/* Filter tab bar */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "16px" }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={filter === tab.key ? "btn-fire btn" : "btn-ghost btn"}
              style={{ fontSize: "9px", letterSpacing: "1px", padding: "6px 12px" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="SEARCH TRANSACTIONS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "var(--black)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: "10px 14px",
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              letterSpacing: "1px",
              outline: "none",
            }}
          />
        </div>

        {/* Transaction list */}
        <div className="panel-box">
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-dim)", letterSpacing: "2px", fontSize: "11px" }}>
              LOADING...
            </div>
          ) : (
            <div className="tx-list">
              {filtered.map((tx) => (
                <div key={tx.id} className="tx-item">
                  {/* Icon */}
                  <div className="tx-icon" style={{ color: TX_COLORS[tx.type] || "var(--text-dim)" }}>
                    {TX_ICONS[tx.type] || "◆"}
                  </div>

                  {/* Details */}
                  <div className="tx-details">
                    <div className="tx-type">{tx.desc}</div>
                    <div className="tx-date">{tx.date} · {tx.id}</div>
                  </div>

                  {/* Type badge */}
                  <div style={{ marginRight: "12px" }}>
                    <span style={{
                      fontSize: "8px",
                      letterSpacing: "1px",
                      padding: "2px 8px",
                      background: `${TX_COLORS[tx.type] || "var(--border)"}18`,
                      border: `1px solid ${TX_COLORS[tx.type] || "var(--border)"}40`,
                      color: TX_COLORS[tx.type] || "var(--text-dim)",
                    }}>
                      {tx.type.replace("_", " ")}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="tx-amount">
                    <div className={`amount ${tx.amount > 0 ? "pos" : tx.currency === "ASH" ? "ash-col" : "neg"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount} {tx.currency}
                    </div>
                    <div className="tx-status">
                      {tx.status === "COMPLETED" ? "✓ COMPLETED" : tx.status === "PROCESSING" ? "⏳ PROCESSING" : tx.status}
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)", fontSize: "11px", letterSpacing: "2px" }}>
                  NO TRANSACTIONS FOUND
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary stats */}
        {filtered.length > 0 && (
          <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { label: "TOTAL TXS",   value: String(filtered.length),                                      cls: "" },
              { label: "TOTAL IN",    value: `+$${filtered.filter((t) => Number(t.amount) > 0 && t.currency === "USDC").reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}`, cls: "usdc" },
              { label: "TOTAL OUT",   value: `-$${Math.abs(filtered.filter((t) => Number(t.amount) < 0 && t.currency === "USDC").reduce((s, t) => s + Number(t.amount), 0)).toFixed(2)}`, cls: "fire" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                padding: "10px 16px",
              }}>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${s.cls}`} style={{ fontSize: "22px" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

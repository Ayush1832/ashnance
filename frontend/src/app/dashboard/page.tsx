"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import styles from "./dashboard.module.css";

// ---- Types ----
interface Profile {
  username: string;
  email: string;
  role: string;
  isVip: boolean;
  referralCode: string;
  totalBurns: number;
  ashBalance: number;
}

interface WalletData {
  usdcBalance: number;
  ashBalance: number;
  cumulativeWeight: number;
  depositAddress: string;
}

interface Transaction {
  id: string;
  type: string;
  amountUsdc?: number;
  amountAsh?: number;
  createdAt: string;
  status: string;
  prizeAmount?: number;
}

// ---- Static ticker events (doubled for seamless loop) ----
const TICKER_ITEMS = [
  { dot: "win",  name: "Burner#2831", action: "won",    amount: "250 USDC",  cls: "win"  },
  { dot: "burn", name: "Burner#7492", action: "burned",  amount: "10 USDC",   cls: "burn" },
  { dot: "ash",  name: "Burner#5614", action: "earned", amount: "300 ASH",   cls: "ash"  },
  { dot: "win",  name: "Burner#1245", action: "won",    amount: "500 USDC",  cls: "win"  },
  { dot: "burn", name: "Burner#9021", action: "burned",  amount: "50 USDC",   cls: "burn" },
  { dot: "win",  name: "Burner#3357", action: "won",    amount: "2500 USDC", cls: "win"  },
  { dot: "ash",  name: "Burner#8803", action: "earned", amount: "450 ASH",   cls: "ash"  },
  { dot: "burn", name: "Burner#6678", action: "burned",  amount: "100 USDC",  cls: "burn" },
  { dot: "win",  name: "Burner#4492", action: "won",    amount: "50 USDC",   cls: "win"  },
];
const TICKER_DOUBLE = [...TICKER_ITEMS, ...TICKER_ITEMS];

function txIcon(type: string) {
  switch (type) {
    case "burn":     return "🔥";
    case "win":      return "🏆";
    case "deposit":  return "💳";
    case "withdraw": return "💸";
    case "referral": return "👥";
    default:         return "📋";
  }
}

function txAmountClass(type: string) {
  if (type === "win" || type === "deposit" || type === "referral") return "pos";
  return "neg";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [wallet,         setWallet]         = useState<WalletData | null>(null);
  const [txList,         setTxList]         = useState<Transaction[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [onchainBalance, setOnchainBalance] = useState<number | null>(null);
  const [walletAddress,  setWalletAddress]  = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) api.setToken(token);

      const [profileRes, walletRes, txRes] = await Promise.allSettled([
        api.auth.profile(),
        api.wallet.balance(),
        api.wallet.transactions(undefined, 1, 5),
      ]);

      if (profileRes.status === "fulfilled") {
        const d = profileRes.value as { data: Profile };
        setProfile(d.data ?? (d as unknown as Profile));
      }
      if (walletRes.status === "fulfilled") {
        const d = walletRes.value as { data: WalletData };
        setWallet(d.data ?? (d as unknown as WalletData));
      }
      if (txRes.status === "fulfilled") {
        const d = txRes.value as { data: { transactions: Transaction[] } };
        const arr = d.data?.transactions ?? (d as unknown as Transaction[]);
        setTxList(Array.isArray(arr) ? arr.slice(0, 5) : []);
      }

      // Load on-chain balance if wallet is connected
      const addr = typeof window !== "undefined" ? localStorage.getItem("walletAddress") : null;
      if (addr) {
        setWalletAddress(addr);
        try {
          const ob = await api.wallet.onchain(addr) as { data: { usdcBalance: number } };
          setOnchainBalance(Number(ob.data?.usdcBalance ?? 0));
        } catch { /* non-critical */ }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load dashboard";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const usdcBalance = Number(wallet?.usdcBalance ?? 0);
  const ashBalance  = Number(wallet?.ashBalance  ?? profile?.ashBalance ?? 0);
  const totalBurns       = Number(profile?.totalBurns ?? 0);
  const cumulativeWeight = Number(wallet?.cumulativeWeight ?? 0);
  const username    = profile?.username   ?? "BURNER";
  const isVip       = profile?.isVip      ?? false;

  return (
    <>
      {/* ===== CONNECTED WALLET BANNER ===== */}
      {walletAddress && (
        <div style={{
          background: "linear-gradient(90deg, rgba(255,183,0,0.10) 0%, rgba(255,77,0,0.08) 100%)",
          border: "1px solid rgba(255,183,0,0.35)",
          borderLeft: "3px solid #FFB800",
          padding: "14px 24px",
          marginBottom: "0",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}>
          {/* Wallet icon + address */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "200px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(255,183,0,0.15)", border: "1px solid rgba(255,183,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0,
            }}>
              👻
            </div>
            <div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "2px", marginBottom: "2px" }}>
                CONNECTED WALLET
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", color: "#FFB800", letterSpacing: "2px" }}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            </div>
          </div>

          {/* On-chain balance */}
          {onchainBalance !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0,
              }}>
                💵
              </div>
              <div>
                <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "2px", marginBottom: "2px" }}>
                  ON-CHAIN BALANCE
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#4ade80", letterSpacing: "2px" }}>
                  ${onchainBalance.toFixed(2)} <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>USDC</span>
                </div>
              </div>
            </div>
          )}

          {/* Disconnect */}
          <button
            style={{
              marginLeft: "auto",
              background: "rgba(255,77,0,0.08)",
              border: "1px solid rgba(255,77,0,0.25)",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: "9px",
              letterSpacing: "2px",
              padding: "8px 14px",
              fontFamily: "var(--font-display)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,77,0,0.6)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,77,0,0.25)"; }}
            onClick={() => {
              localStorage.removeItem("walletAddress");
              setWalletAddress(null);
              setOnchainBalance(null);
            }}
          >
            DISCONNECT ✕
          </button>
        </div>
      )}

      {/* ===== DASH HEADER ===== */}
      <div className="dash-header">
        <div className="dash-title">
          DASHBOARD <span>🔥</span>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "2px" }}>
          WELCOME BACK, {username.toUpperCase()}
          {isVip && <span className="vip-badge">VIP</span>}
        </div>
      </div>

      {/* ===== LIVE TICKER ===== */}
      <div className={`ticker-wrap ${styles.tickerWrap}`}>
        <div className="ticker-inner">
          {TICKER_DOUBLE.map((ev, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-dot">●</span>
              <span className={ev.cls === "win" ? "win" : ev.cls === "ash" ? "ash-col" : ""}>
                {ev.name}
              </span>{" "}
              {ev.action}{" "}
              <strong className={ev.cls === "win" ? "win" : ev.cls === "ash" ? "ash-col" : ""}>
                {ev.amount}
              </strong>
            </span>
          ))}
        </div>
      </div>

      {/* ===== ERROR ===== */}
      {error && <div className={styles.errorState}>⚠ {error}</div>}

      {/* ===== LOADING ===== */}
      {loading && <div className={styles.loadingState}>LOADING...</div>}

      {/* ===== STAT GRID ===== */}
      {!loading && (
        <div className="stat-grid">
          <div className="stat-card clip-card">
            <div className="stat-label">USDC BALANCE</div>
            <div className="stat-value usdc">${usdcBalance.toFixed(2)}</div>
            <div className="stat-sub">AVAILABLE TO BURN</div>
          </div>
          <div className="stat-card clip-card">
            <div className="stat-label">ASH BALANCE</div>
            <div className="stat-value ash">{ashBalance.toLocaleString()}</div>
            <div className="stat-sub">USE FOR BOOSTS</div>
          </div>
          <div className="stat-card clip-card">
            <div className="stat-label">TOTAL BURNS</div>
            <div className="stat-value fire">{totalBurns}</div>
            <div className="stat-sub">LIFETIME BURNS</div>
          </div>
          <div className="stat-card clip-card">
            <div className="stat-label">CURRENT WEIGHT</div>
            <div className="stat-value gold">{cumulativeWeight.toFixed(2)}</div>
            <div className="stat-sub">LEADERBOARD RANK</div>
          </div>
        </div>
      )}

      {/* ===== QUICK ACTIONS ===== */}
      <div className={styles.quickActions}>
        <Link href="/burn" className="btn btn-fire">🔥 BURN NOW</Link>
        <Link href="/wallet" className="btn btn-ghost">💳 DEPOSIT</Link>
      </div>

      {/* ===== BOTTOM GRID ===== */}
      {!loading && (
        <div className={styles.bottomGrid}>
          {/* Recent Transactions */}
          <div className="panel-box">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>RECENT TRANSACTIONS</span>
              <Link href="/transactions" className={styles.sectionLink}>VIEW ALL →</Link>
            </div>
            {txList.length === 0 ? (
              <div style={{ color: "var(--text-dim)", fontSize: "11px", letterSpacing: "1px", padding: "12px 0" }}>
                NO TRANSACTIONS YET
              </div>
            ) : (
              <div className="tx-list">
                {txList.map((tx) => {
                  const amt = tx.type === "win"
                    ? `+${Number(tx.prizeAmount ?? 0).toFixed(2)} USDC`
                    : tx.type === "deposit"
                    ? `+${Number(tx.amountUsdc ?? 0).toFixed(2)} USDC`
                    : tx.type === "burn"
                    ? `-${Number(tx.amountUsdc ?? 0).toFixed(2)} USDC`
                    : tx.amountUsdc != null
                    ? `${Number(tx.amountUsdc) >= 0 ? "+" : ""}${Number(tx.amountUsdc).toFixed(2)} USDC`
                    : `${tx.amountAsh ?? 0} ASH`;

                  const cls = txAmountClass(tx.type);

                  return (
                    <div key={tx.id} className="tx-item">
                      <div className="tx-icon">{txIcon(tx.type)}</div>
                      <div className="tx-details">
                        <div className="tx-type">{tx.type.toUpperCase()}</div>
                        <div className="tx-date">{formatDate(tx.createdAt)}</div>
                      </div>
                      <div className="tx-amount">
                        <div className={`amount ${cls}`}>{amt}</div>
                        <div className="tx-status">{tx.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Activity Feed */}
          <div className="panel-box">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>🔴 LIVE</span>
            </div>
            <div className={styles.feedList}>
              {TICKER_ITEMS.map((ev, i) => (
                <div key={i} className={styles.feedItem}>
                  <span
                    className={`${styles.feedDot} ${
                      ev.dot === "win"  ? styles.feedDotWin  :
                      ev.dot === "burn" ? styles.feedDotBurn :
                      styles.feedDotAsh
                    }`}
                  />
                  <span className={styles.feedName}>{ev.name}</span>
                  <span>{ev.action}</span>
                  <span
                    className={
                      ev.cls === "win"  ? styles.feedAmtWin  :
                      ev.cls === "burn" ? styles.feedAmtBurn :
                      styles.feedAmtAsh
                    }
                  >
                    {ev.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

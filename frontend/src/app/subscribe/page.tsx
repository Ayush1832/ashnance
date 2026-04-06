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
  { icon: "⚙️", label: "SETTINGS",   href: "/settings" },
];

const HOLY_FIRE = {
  key:         "holy_fire",
  title:       "HOLY FIRE",
  price:       "$24.99",
  period:      "/mo",
  weightBonus: "+0.50",
  ashBonus:    "+20% ASH",
  raffle:      true,
  badge:       true,
  benefits: [
    "+0.50 weight bonus on every burn",
    "+20% extra ASH tokens on every loss",
    "Weekly exclusive raffle entry",
    "VIP badge on profile",
    "Priority AI assistant hints",
    "Early access to new features",
    "Exclusive VIP-only promotions",
  ],
};

interface VipStatus {
  tier: string | null;
  active: boolean;
  expiresAt?: string;
}

export default function SubscribePage() {
  const pathname = usePathname();
  const router   = useRouter();

  const [selected] = useState("holy_fire");
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [loading, setLoading]     = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [msg, setMsg]             = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API}/api/vip/status`, { headers })
      .then((r) => r.json())
      .then((data) => setVipStatus(data))
      .catch(() => setVipStatus({ tier: null, active: false }))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    if (typeof window !== "undefined") localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken");
    router.push("/");
  }

  async function handleSubscribe() {
    setSubLoading(true);
    setMsg("");
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API}/api/vip/subscribe`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tier: selected }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("SUCCESS! VIP subscription activated.");
        setVipStatus({ tier: selected, active: true });
      } else {
        setMsg(data.message || "Subscription failed. Check your USDC balance.");
      }
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setSubLoading(false);
    }
  }

  return (
    <div className="dash-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          ASHNANCE
          <span>KEEP BURNING</span>
        </div>
        <nav className="sidebar-nav">
          <Link href="/dashboard" className={`nav-item${pathname === "/dashboard" ? " active" : ""}`}>
            <span className="nav-icon">📊</span>DASHBOARD
          </Link>
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
              <div className="user-status">
                {!loading && vipStatus?.active ? vipStatus.tier?.toUpperCase() ?? "VIP" : "STANDARD"}
              </div>
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
        {/* Header banner */}
        <div style={{
          background: "linear-gradient(135deg, var(--fire-red) 0%, var(--fire-orange) 60%, var(--gold) 100%)",
          padding: "32px 28px",
          marginBottom: "28px",
          clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "42px",
              letterSpacing: "4px",
              color: "#FFF",
              lineHeight: 1,
              marginBottom: "8px",
            }}>
              HOLY 🔥 FIRE VIP
            </div>
            <div style={{ fontSize: "12px", letterSpacing: "2px", color: "rgba(255,255,255,0.85)" }}>
              MAXIMIZE YOUR BURNS WITH EXCLUSIVE VIP BONUSES
            </div>
          </div>
        </div>

        {/* Current status banner */}
        {!loading && vipStatus?.active && (
          <div className="panel-box" style={{
            borderColor: "var(--gold)",
            background: "rgba(255,184,0,0.06)",
            marginBottom: "24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>👑</span>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--gold)", letterSpacing: "2px" }}>
                  ACTIVE VIP: {vipStatus.tier?.toUpperCase()}
                </div>
                {vipStatus.expiresAt && (
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px", marginTop: "2px" }}>
                    RENEWS: {new Date(vipStatus.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <span className="vip-badge" style={{ marginLeft: "auto" }}>ACTIVE</span>
            </div>
          </div>
        )}

        {/* Holy Fire card */}
        <div className="panel-box" style={{
          borderColor: "var(--gold)",
          background: "var(--panel2)",
          boxShadow: "0 0 24px rgba(255,184,0,0.08)",
          marginBottom: "24px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            top: 14,
            right: -28,
            background: "var(--gold)",
            color: "#000",
            fontSize: "8px",
            fontWeight: 700,
            padding: "4px 36px",
            transform: "rotate(45deg)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}>
            EXCLUSIVE
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "32px", flexWrap: "wrap" }}>
            {/* Left: price */}
            <div style={{ minWidth: "160px" }}>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: "32px",
                letterSpacing: "3px",
                color: "var(--gold)",
                marginBottom: "4px",
              }}>
                {HOLY_FIRE.title}
              </div>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: "44px",
                color: "var(--fire-orange)",
                lineHeight: 1,
                marginBottom: "8px",
              }}>
                {HOLY_FIRE.price}<span style={{ fontSize: "16px", color: "var(--text-dim)" }}>{HOLY_FIRE.period}</span>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                <span style={{ fontSize: "9px", letterSpacing: "1px", padding: "3px 8px", background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.2)", color: "var(--fire-orange)" }}>
                  {HOLY_FIRE.weightBonus} WEIGHT
                </span>
                <span style={{ fontSize: "9px", letterSpacing: "1px", padding: "3px 8px", background: "rgba(176,96,48,0.1)", border: "1px solid rgba(176,96,48,0.2)", color: "var(--ash-token)" }}>
                  {HOLY_FIRE.ashBonus}
                </span>
                <span style={{ fontSize: "9px", letterSpacing: "1px", padding: "3px 8px", background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.2)", color: "var(--gold)" }}>
                  RAFFLE
                </span>
              </div>
            </div>

            {/* Right: benefits */}
            <div style={{ flex: 1, borderLeft: "1px solid var(--border)", paddingLeft: "32px", minWidth: "200px" }}>
              {HOLY_FIRE.benefits.map((b, bi) => (
                <div key={bi} style={{
                  display: "flex",
                  gap: "8px",
                  fontSize: "11px",
                  color: "var(--text-dim)",
                  letterSpacing: "0.5px",
                  marginBottom: "10px",
                  lineHeight: 1.4,
                }}>
                  <span style={{ color: "var(--gold)", flexShrink: 0, fontSize: "10px" }}>✦</span>
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="panel-box" style={{
          background: "linear-gradient(135deg, rgba(204,17,0,0.08), rgba(255,77,0,0.04))",
          borderColor: "rgba(255,77,0,0.3)",
          textAlign: "center",
          padding: "32px",
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            letterSpacing: "3px",
            color: "var(--text)",
            marginBottom: "8px",
          }}>
            READY TO ASCEND?
          </div>
          <div style={{
            fontSize: "11px",
            color: "var(--text-dim)",
            letterSpacing: "1px",
            marginBottom: "24px",
          }}>
            HOLY FIRE SUBSCRIPTION — PAID FROM YOUR USDC BALANCE. CANCEL ANYTIME.
          </div>

          {msg && (
            <div style={{
              fontSize: "11px",
              letterSpacing: "1px",
              marginBottom: "16px",
              color: msg.startsWith("SUCCESS") ? "var(--usdc-green)" : "var(--fire-red)",
            }}>
              {msg}
            </div>
          )}

          <button
            className="btn-fire btn"
            onClick={handleSubscribe}
            disabled={subLoading}
            style={{ fontSize: "14px", padding: "14px 40px", letterSpacing: "3px" }}
          >
            {subLoading ? "PROCESSING..." : "👑 SUBSCRIBE TO HOLY FIRE"}
          </button>

          <div style={{ marginTop: "16px", fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>
            By subscribing you agree to our Terms of Service. Funds are deducted from your USDC balance.
          </div>
        </div>
      </div>
    </div>
  );
}

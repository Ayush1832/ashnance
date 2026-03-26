"use client";

import { useState } from "react";
import Link from "next/link";
import dashStyles from "../dashboard/dashboard.module.css";
import walletStyles from "../wallet/wallet.module.css";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "🔥", label: "Burn Now", href: "/burn" },
  { icon: "💳", label: "Wallet", href: "/wallet" },
  { icon: "👑", label: "Holy Fire", href: "/subscribe", active: true },
  { icon: "🏆", label: "Leaderboard", href: "/leaderboard" },
];

const benefits = [
  { icon: "⚖️", text: "+0.50 Weight Bonus on every burn", highlight: true },
  { icon: "💰", text: "+20% extra ASH tokens on every loss", highlight: true },
  { icon: "🎰", text: "Weekly exclusive raffle entry" },
  { icon: "🤖", text: "Priority AI assistant hints" },
  { icon: "🏷️", text: "Holy Fire VIP badge on profile" },
  { icon: "🚀", text: "Early access to new features & beta" },
  { icon: "🎯", text: "Exclusive VIP-only promotions" },
  { icon: "📊", text: "Advanced burn analytics dashboard" },
];

const tiers = [
  {
    name: "Spark",
    price: "Free",
    weightBonus: "+0.10",
    ashBonus: "—",
    raffle: false,
    badge: "🔸",
    current: false,
  },
  {
    name: "Active Ash",
    price: "$9.99/mo",
    weightBonus: "+0.25",
    ashBonus: "+10%",
    raffle: false,
    badge: "🔶",
    current: false,
  },
  {
    name: "Holy Fire",
    price: "$24.99/mo",
    weightBonus: "+0.50",
    ashBonus: "+20%",
    raffle: true,
    badge: "👑",
    current: false,
    featured: true,
  },
];

export default function SubscribePage() {
  const [selectedTier, setSelectedTier] = useState("Holy Fire");

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
            <h1>👑 Holy Fire VIP</h1>
            <p>Maximize your burns with exclusive VIP bonuses and perks</p>
          </div>

          {/* Tier Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "var(--space-lg)",
            marginBottom: "var(--space-xl)",
          }}>
            {tiers.map((tier) => (
              <div
                key={tier.name}
                onClick={() => setSelectedTier(tier.name)}
                className="glass-card"
                style={{
                  padding: "var(--space-xl)",
                  cursor: "pointer",
                  border: selectedTier === tier.name
                    ? "2px solid var(--primary-container)"
                    : "2px solid transparent",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 200ms ease",
                }}
              >
                {tier.featured && (
                  <div style={{
                    position: "absolute",
                    top: 12,
                    right: -30,
                    background: "var(--primary-container)",
                    color: "#fff",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "4px 36px",
                    transform: "rotate(45deg)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}>
                    Best Value
                  </div>
                )}
                <div style={{ fontSize: "2rem", marginBottom: "var(--space-sm)" }}>{tier.badge}</div>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--fs-body)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "var(--space-xs)",
                }}>{tier.name}</h3>
                <div style={{
                  fontSize: "var(--fs-h3)",
                  fontWeight: 800,
                  color: "var(--primary-container)",
                  marginBottom: "var(--space-lg)",
                }}>{tier.price}</div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-secondary)", lineHeight: 2 }}>
                  <div>Weight: <strong style={{ color: "var(--success)" }}>{tier.weightBonus}</strong></div>
                  <div>ASH Bonus: <strong>{tier.ashBonus}</strong></div>
                  <div>Raffle: {tier.raffle ? "✅" : "❌"}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="glass-card" style={{ padding: "var(--space-xl)", marginBottom: "var(--space-xl)" }}>
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-body)",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "var(--space-lg)",
            }}>
              🔥 Holy Fire Benefits
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-md)" }}>
              {benefits.map((b, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  padding: "var(--space-md)",
                  background: b.highlight ? "rgba(230, 126, 34, 0.08)" : "var(--bg-surface-lowest)",
                  borderRadius: "var(--radius-md)",
                  border: b.highlight ? "1px solid rgba(230, 126, 34, 0.2)" : "1px solid transparent",
                }}>
                  <span style={{ fontSize: "1.3rem" }}>{b.icon}</span>
                  <span style={{
                    fontSize: "var(--fs-body-sm)",
                    color: b.highlight ? "var(--primary-container)" : "var(--text-primary)",
                    fontWeight: b.highlight ? 600 : 400,
                  }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscribe CTA */}
          <div className="glass-card" style={{
            padding: "var(--space-xl)",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(230,126,34,0.1), rgba(211,84,0,0.05))",
          }}>
            <h3 style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-h3)",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "var(--space-sm)",
            }}>
              Ready to ascend? 🔥
            </h3>
            <p style={{
              color: "var(--text-secondary)",
              fontSize: "var(--fs-body-sm)",
              marginBottom: "var(--space-lg)",
            }}>
              {selectedTier} subscription — paid from your USDC balance. Cancel anytime.
            </p>
            <button style={{
              padding: "1rem 3rem",
              background: "linear-gradient(135deg, var(--primary-container), #d35400)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-pill)",
              fontSize: "var(--fs-body)",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 200ms ease",
              boxShadow: "0 4px 20px rgba(230,126,34,0.3)",
            }}>
              👑 Subscribe to {selectedTier}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

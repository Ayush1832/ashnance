"use client";

import { useState } from "react";
import Link from "next/link";
import dashStyles from "../dashboard/dashboard.module.css";
import styles from "../wallet/wallet.module.css";

type LeaderboardTab = "winners" | "burners" | "referrals" | "ash";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "🔥", label: "Burn Now", href: "/burn" },
  { icon: "💳", label: "Wallet", href: "/wallet" },
  { icon: "👥", label: "Referrals", href: "/referrals" },
  { icon: "🏆", label: "Leaderboard", href: "/leaderboard", active: true },
  { icon: "📜", label: "Transactions", href: "/transactions" },
];

const leaderboardData: Record<LeaderboardTab, { name: string; avatar: string; score: string }[]> = {
  winners: [
    { name: "CryptoKing", avatar: "👑", score: "$12,500" },
    { name: "BlazeMaster", avatar: "🔥", score: "$8,200" },
    { name: "MoonBurn", avatar: "🌙", score: "$6,750" },
    { name: "AshLord", avatar: "⚡", score: "$5,100" },
    { name: "FireStorm", avatar: "🌪️", score: "$4,800" },
    { name: "PhoenixRise", avatar: "🦅", score: "$3,600" },
    { name: "BurnQueen", avatar: "💎", score: "$3,200" },
    { name: "SolanaFire", avatar: "☀️", score: "$2,800" },
    { name: "EmberKnight", avatar: "🛡️", score: "$2,500" },
    { name: "AshTrader", avatar: "📈", score: "$2,100" },
  ],
  burners: [
    { name: "FireStorm", avatar: "🌪️", score: "2,450 burns" },
    { name: "BlazeMaster", avatar: "🔥", score: "1,890 burns" },
    { name: "BurnQueen", avatar: "💎", score: "1,620 burns" },
    { name: "CryptoKing", avatar: "👑", score: "1,450 burns" },
    { name: "AshLord", avatar: "⚡", score: "1,200 burns" },
    { name: "PhoenixRise", avatar: "🦅", score: "980 burns" },
    { name: "MoonBurn", avatar: "🌙", score: "870 burns" },
    { name: "SolanaFire", avatar: "☀️", score: "720 burns" },
    { name: "EmberKnight", avatar: "🛡️", score: "650 burns" },
    { name: "AshTrader", avatar: "📈", score: "540 burns" },
  ],
  referrals: [
    { name: "AshLord", avatar: "⚡", score: "145 refs" },
    { name: "CryptoKing", avatar: "👑", score: "120 refs" },
    { name: "BurnQueen", avatar: "💎", score: "98 refs" },
    { name: "BlazeMaster", avatar: "🔥", score: "87 refs" },
    { name: "FireStorm", avatar: "🌪️", score: "72 refs" },
    { name: "MoonBurn", avatar: "🌙", score: "65 refs" },
    { name: "PhoenixRise", avatar: "🦅", score: "54 refs" },
    { name: "SolanaFire", avatar: "☀️", score: "48 refs" },
    { name: "EmberKnight", avatar: "🛡️", score: "36 refs" },
    { name: "AshTrader", avatar: "📈", score: "29 refs" },
  ],
  ash: [
    { name: "BlazeMaster", avatar: "🔥", score: "1.2M ASH" },
    { name: "FireStorm", avatar: "🌪️", score: "980K ASH" },
    { name: "CryptoKing", avatar: "👑", score: "850K ASH" },
    { name: "BurnQueen", avatar: "💎", score: "720K ASH" },
    { name: "AshLord", avatar: "⚡", score: "650K ASH" },
    { name: "MoonBurn", avatar: "🌙", score: "520K ASH" },
    { name: "PhoenixRise", avatar: "🦅", score: "480K ASH" },
    { name: "SolanaFire", avatar: "☀️", score: "350K ASH" },
    { name: "EmberKnight", avatar: "🛡️", score: "290K ASH" },
    { name: "AshTrader", avatar: "📈", score: "210K ASH" },
  ],
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("winners");

  const data = leaderboardData[activeTab];
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  // Reorder for podium: [2nd, 1st, 3rd]
  const podiumOrder = [top3[1], top3[0], top3[2]];

  return (
    <div className={styles["leaderboard-page"]}>
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
      <main className={styles["leaderboard-main"]}>
        <div className={styles["leaderboard-content"]}>
          <div className={styles["page-header"]}>
            <h1>🏆 Leaderboard</h1>
            <p>See who&apos;s dominating the burn arena</p>
          </div>

          {/* Tabs */}
          <div className={styles["leaderboard-tabs"]}>
            {([
              { key: "winners" as const, label: "🏆 Top Winners" },
              { key: "burners" as const, label: "🔥 Most Burns" },
              { key: "referrals" as const, label: "👥 Referral Kings" },
              { key: "ash" as const, label: "💎 ASH Holders" },
            ]).map((tab) => (
              <button
                key={tab.key}
                className={`${styles["lb-tab"]} ${activeTab === tab.key ? styles.active : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Podium */}
          <div className={styles.podium}>
            {podiumOrder.map((user, i) => (
              <div key={i} className={styles["podium-place"]}>
                <div className={styles["podium-avatar"]}>{user.avatar}</div>
                <div className={styles["podium-name"]}>{user.name}</div>
                <div className={styles["podium-val"]}>{user.score}</div>
                <div className={styles["podium-bar"]}></div>
                <div className={styles["podium-rank"]}>
                  {i === 0 ? "🥈" : i === 1 ? "🥇" : "🥉"}
                </div>
              </div>
            ))}
          </div>

          {/* Rankings Table */}
          <div className={`glass-card ${styles["lb-table"]}`}>
            {rest.map((user, i) => (
              <div key={i} className={styles["lb-row"]}>
                <div className={styles["lb-rank"]}>#{i + 4}</div>
                <div className={styles["lb-user"]}>
                  <div className={styles["lb-avatar"]}>{user.avatar}</div>
                  <div className={styles["lb-name"]}>{user.name}</div>
                </div>
                <div className={styles["lb-score"]}>{user.score}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

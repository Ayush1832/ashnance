"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Tab = "round" | "winners" | "burners" | "referrers" | "ash";

const TABS: { key: Tab; label: string }[] = [
  { key: "round",     label: "ROUND LEADERS" },
  { key: "winners",   label: "TOP WINNERS" },
  { key: "burners",   label: "TOP BURNERS" },
  { key: "referrers", label: "REFERRAL KINGS" },
  { key: "ash",       label: "ASH HOLDERS" },
];

const ENDPOINTS: Record<Tab, string> = {
  round:     "/api/round/leaderboard",
  winners:   "/api/leaderboard/winners",
  burners:   "/api/leaderboard/burners",
  referrers: "/api/leaderboard/referrers",
  ash:       "/api/leaderboard/ash",
};

const MOCK: Record<Tab, { name: string; value: string }[]> = {
  round: [
    { name: "FireStorm",   value: "42.50 WEIGHT" },
    { name: "BlazeMaster", value: "38.20 WEIGHT" },
    { name: "CryptoKing",  value: "31.00 WEIGHT" },
    { name: "AshLord",     value: "28.40 WEIGHT" },
    { name: "MoonBurn",    value: "24.10 WEIGHT" },
    { name: "PhoenixRise", value: "19.80 WEIGHT" },
    { name: "BurnQueen",   value: "17.50 WEIGHT" },
    { name: "SolanaFire",  value: "15.20 WEIGHT" },
    { name: "EmberKnight", value: "12.00 WEIGHT" },
    { name: "AshTrader",   value: "8.40 WEIGHT" },
  ],
  winners: [
    { name: "CryptoKing",  value: "$12,500" },
    { name: "BlazeMaster", value: "$8,200"  },
    { name: "MoonBurn",    value: "$6,750"  },
    { name: "AshLord",     value: "$5,100"  },
    { name: "FireStorm",   value: "$4,800"  },
    { name: "PhoenixRise", value: "$3,600"  },
    { name: "BurnQueen",   value: "$3,200"  },
    { name: "SolanaFire",  value: "$2,800"  },
    { name: "EmberKnight", value: "$2,500"  },
    { name: "AshTrader",   value: "$2,100"  },
  ],
  burners: [
    { name: "FireStorm",   value: "2,450 burns" },
    { name: "BlazeMaster", value: "1,890 burns" },
    { name: "BurnQueen",   value: "1,620 burns" },
    { name: "CryptoKing",  value: "1,450 burns" },
    { name: "AshLord",     value: "1,200 burns" },
    { name: "PhoenixRise", value: "980 burns"   },
    { name: "MoonBurn",    value: "870 burns"   },
    { name: "SolanaFire",  value: "720 burns"   },
    { name: "EmberKnight", value: "650 burns"   },
    { name: "AshTrader",   value: "540 burns"   },
  ],
  referrers: [
    { name: "AshLord",     value: "145 refs" },
    { name: "CryptoKing",  value: "120 refs" },
    { name: "BurnQueen",   value: "98 refs"  },
    { name: "BlazeMaster", value: "87 refs"  },
    { name: "FireStorm",   value: "72 refs"  },
    { name: "MoonBurn",    value: "65 refs"  },
    { name: "PhoenixRise", value: "54 refs"  },
    { name: "SolanaFire",  value: "48 refs"  },
    { name: "EmberKnight", value: "36 refs"  },
    { name: "AshTrader",   value: "29 refs"  },
  ],
  ash: [
    { name: "BlazeMaster", value: "1.2M ASH" },
    { name: "FireStorm",   value: "980K ASH" },
    { name: "CryptoKing",  value: "850K ASH" },
    { name: "BurnQueen",   value: "720K ASH" },
    { name: "AshLord",     value: "650K ASH" },
    { name: "MoonBurn",    value: "520K ASH" },
    { name: "PhoenixRise", value: "480K ASH" },
    { name: "SolanaFire",  value: "350K ASH" },
    { name: "EmberKnight", value: "290K ASH" },
    { name: "AshTrader",   value: "210K ASH" },
  ],
};

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

interface Entry { name: string; value: string; }

export default function LeaderboardPage() {
  const pathname = usePathname();
  const router   = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("round");
  const [data, setData]           = useState<Entry[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${API}${ENDPOINTS[activeTab]}`, { headers })
      .then((r) => r.json())
      .then((json) => {
        // Round leaderboard returns { data: { leaderboard: [...], round: {...} } }
        if (activeTab === "round") {
          const leaderboard = json?.data?.leaderboard ?? json?.leaderboard ?? json?.data ?? [];
          if (Array.isArray(leaderboard) && leaderboard.length > 0) {
            setData(leaderboard.map((e: Record<string, string | number>) => ({
              name:  String(e.username ?? e.name ?? "???"),
              value: `${Number(e.cumulativeWeight ?? e.weight ?? 0).toFixed(2)} WEIGHT`,
            })));
          } else {
            setData(MOCK[activeTab]);
          }
          return;
        }
        // Standard leaderboard format
        if (Array.isArray(json) && json.length > 0) {
          setData(json.map((e: Record<string, string | number>) => ({
            name:  String(e.username ?? e.name ?? "???"),
            value: String(e.value ?? e.score ?? e.amount ?? "—"),
          })));
        } else {
          setData(MOCK[activeTab]);
        }
      })
      .catch(() => setData(MOCK[activeTab]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  function handleLogout() {
    if (typeof window !== "undefined") localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken");
    router.push("/");
  }

  const rankClass = (i: number) => i === 0 ? " gold-rank" : i === 1 ? " silver-rank" : i === 2 ? " bronze-rank" : "";
  const badge     = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

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
          <h1 className="dash-title">LEADER<span>BOARD</span></h1>
        </div>

        {/* Tab buttons */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "24px", flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? "btn-fire btn" : "btn-ghost btn"}
              style={{ fontSize: "10px", letterSpacing: "2px", padding: "8px 16px" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top 3 podium */}
        {!loading && data.length >= 3 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.15fr 1fr",
            gap: "12px",
            marginBottom: "20px",
            alignItems: "flex-end",
          }}>
            {/* 2nd */}
            <div className="panel-box clip-card" style={{ textAlign: "center", padding: "20px 16px", marginBottom: 0 }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🥈</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#CCC", letterSpacing: "2px", marginBottom: "4px" }}>
                {data[1].name}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--fire-orange)" }}>
                {data[1].value}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "32px", color: "#CCC", marginTop: "8px" }}>2</div>
            </div>
            {/* 1st */}
            <div style={{
              background: "var(--panel2)",
              border: "1px solid var(--gold)",
              padding: "28px 16px",
              textAlign: "center",
              clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))",
              boxShadow: "0 0 30px rgba(255, 184, 0, 0.15)",
            }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>🥇</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--gold)", letterSpacing: "2px", marginBottom: "4px" }}>
                {data[0].name}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: "var(--fire-orange)" }}>
                {data[0].value}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "42px", color: "var(--gold)", marginTop: "8px" }}>1</div>
            </div>
            {/* 3rd */}
            <div className="panel-box clip-card" style={{ textAlign: "center", padding: "20px 16px", marginBottom: 0 }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🥉</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#CD7F32", letterSpacing: "2px", marginBottom: "4px" }}>
                {data[2].name}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--fire-orange)" }}>
                {data[2].value}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "32px", color: "#CD7F32", marginTop: "8px" }}>3</div>
            </div>
          </div>
        )}

        {/* Ranked list */}
        <div className="panel-box">
          <div className="panel-title">📊 FULL RANKINGS</div>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-dim)", letterSpacing: "2px", fontSize: "11px" }}>
              LOADING...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.map((entry, i) => (
                <div key={i} className="lb-item">
                  <div className={`lb-rank${rankClass(i)}`}>
                    {badge(i) ? (
                      <span>{badge(i)}</span>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <div className="lb-name" style={{ flex: 1, fontSize: "12px", letterSpacing: "1px" }}>
                    {entry.name}
                  </div>
                  <div className="lb-val">{entry.value}</div>
                </div>
              ))}
              {data.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)", fontSize: "11px", letterSpacing: "2px" }}>
                  NO DATA YET
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

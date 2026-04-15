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
    { name: "AshTrader",   value: "8.40 WEIGHT"  },
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

interface Entry { name: string; value: string; distanceToFirst?: number; }

interface RoundMeta {
  roundNumber: number;
  currentPool: number;
  prizePoolTarget: number;
  progressPercent: number;
  endsAt?: string | null;
}

interface UserContext {
  userRank: number | null;
  userWeight: number;
  userDistanceToFirst: number | null;
}

export default function LeaderboardPage() {
  const pathname = usePathname();
  const router   = useRouter();

  const [activeTab,    setActiveTab]    = useState<Tab>("round");
  const [data,         setData]         = useState<Entry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [roundMeta,    setRoundMeta]    = useState<RoundMeta | null>(null);
  const [userCtx,      setUserCtx]      = useState<UserContext>({ userRank: null, userWeight: 0, userDistanceToFirst: null });

  useEffect(() => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${API}${ENDPOINTS[activeTab]}`, { headers })
      .then((r) => r.json())
      .then((json) => {
        if (activeTab === "round") {
          // Enhanced round leaderboard: { data: { leaderboard, round, userRank, userWeight, userDistanceToFirst } }
          const payload = json?.data ?? json;
          const leaderboard = payload?.leaderboard ?? payload?.data ?? [];
          const round = payload?.round ?? null;

          if (round) {
            setRoundMeta({
              roundNumber:    round.roundNumber,
              currentPool:    Number(round.currentPool),
              prizePoolTarget: Number(round.prizePoolTarget),
              progressPercent: Number(round.progressPercent ?? 0),
              endsAt:         round.endsAt ?? null,
            });
          }

          setUserCtx({
            userRank:           payload?.userRank ?? null,
            userWeight:         Number(payload?.userWeight ?? 0),
            userDistanceToFirst: payload?.userDistanceToFirst ?? null,
          });

          if (Array.isArray(leaderboard) && leaderboard.length > 0) {
            setData(leaderboard.map((e: Record<string, string | number>) => ({
              name:           String(e.username ?? e.name ?? "???"),
              value:          `${Number(e.cumulativeWeight ?? e.weight ?? 0).toFixed(2)} WEIGHT`,
              distanceToFirst: Number(e.distanceToFirst ?? 0),
            })));
          } else {
            setData(MOCK[activeTab]);
          }
          return;
        }

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
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    router.push("/");
  }

  const rankClass = (i: number) => i === 0 ? " gold-rank" : i === 1 ? " silver-rank" : i === 2 ? " bronze-rank" : "";
  const badge     = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

  const timeLeft = roundMeta?.endsAt ? (() => {
    const diff = new Date(roundMeta.endsAt).getTime() - Date.now();
    if (diff <= 0) return "ENDING SOON";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m LEFT`;
  })() : null;

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
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
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

        {/* req #10 — Round Progress Bar (central, for round tab) */}
        {activeTab === "round" && roundMeta && (
          <div className="panel-box" style={{ marginBottom: "20px", padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", letterSpacing: "2px", color: "var(--fire-orange)" }}>
                🏆 ROUND #{roundMeta.roundNumber} — PRIZE POOL PROGRESS
              </div>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", fontSize: "10px", letterSpacing: "1px" }}>
                {timeLeft && (
                  <span style={{ color: "var(--text-dim)", background: "rgba(255,140,66,0.08)", border: "1px solid rgba(255,140,66,0.2)", padding: "3px 8px" }}>
                    ⏱ {timeLeft}
                  </span>
                )}
                <span style={{ color: "var(--usdc-green)", fontFamily: "var(--font-display)", fontSize: "13px" }}>
                  ${roundMeta.currentPool.toFixed(2)}
                </span>
                <span style={{ color: "var(--text-dim)" }}>/</span>
                <span style={{ color: "var(--fire-orange)", fontFamily: "var(--font-display)", fontSize: "13px" }}>
                  ${roundMeta.prizePoolTarget.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Progress bar — req #10 central and visually clear */}
            <div style={{ position: "relative", height: "18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,140,66,0.2)", overflow: "hidden", borderRadius: "2px" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, roundMeta.progressPercent)}%`,
                background: "linear-gradient(90deg, #ff4500, var(--fire-orange), #FFB800)",
                boxShadow: "0 0 12px rgba(255,140,66,0.5)",
                transition: "width 0.6s ease",
              }} />
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: "11px",
                letterSpacing: "2px",
                color: "#fff",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}>
                {Math.min(100, roundMeta.progressPercent).toFixed(1)}% TO PRIZE
              </div>
            </div>

            {/* req #9 — User rank + distance to #1 */}
            {(userCtx.userRank !== null || userCtx.userWeight > 0) && (
              <div style={{ display: "flex", gap: "20px", marginTop: "12px", flexWrap: "wrap", fontSize: "10px", letterSpacing: "1px" }}>
                {userCtx.userRank !== null && (
                  <span style={{ color: userCtx.userRank === 1 ? "var(--gold)" : "var(--fire-orange)" }}>
                    YOUR RANK: <strong style={{ fontFamily: "var(--font-display)", fontSize: "13px" }}>
                      #{userCtx.userRank}
                    </strong>
                  </span>
                )}
                {userCtx.userWeight > 0 && (
                  <span style={{ color: "var(--text-dim)" }}>
                    WEIGHT: <span style={{ color: "var(--fire-orange)", fontFamily: "var(--font-display)" }}>
                      {userCtx.userWeight.toFixed(2)}
                    </span>
                  </span>
                )}
                {userCtx.userDistanceToFirst !== null && userCtx.userRank !== 1 && (
                  <span style={{ color: "var(--text-dim)" }}>
                    DISTANCE TO #1:{" "}
                    <span style={{ color: "#ff6b6b", fontFamily: "var(--font-display)" }}>
                      -{userCtx.userDistanceToFirst.toFixed(2)}
                    </span>
                  </span>
                )}
                {userCtx.userRank === 1 && (
                  <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "2px" }}>
                    👑 YOU ARE LEADING!
                  </span>
                )}
              </div>
            )}
          </div>
        )}

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

        {/* req #9 — Full rankings with distance to #1 column for round tab */}
        <div className="panel-box">
          <div className="panel-title">
            📊 FULL RANKINGS {activeTab === "round" ? "— TOP 10" : ""}
          </div>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-dim)", letterSpacing: "2px", fontSize: "11px" }}>
              LOADING...
            </div>
          ) : (
            <>
              {/* Column header for round tab */}
              {activeTab === "round" && data.length > 0 && (
                <div style={{ display: "flex", fontSize: "9px", color: "var(--text-dim)", letterSpacing: "2px", padding: "4px 0 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "6px" }}>
                  <div style={{ width: "44px" }}>RANK</div>
                  <div style={{ flex: 1 }}>USERNAME</div>
                  <div style={{ width: "120px", textAlign: "right" }}>WEIGHT</div>
                  <div style={{ width: "120px", textAlign: "right" }}>-DIST TO #1</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {data.map((entry, i) => (
                  <div key={i} className="lb-item" style={{ alignItems: "center" }}>
                    <div className={`lb-rank${rankClass(i)}`}>
                      {badge(i) ? <span>{badge(i)}</span> : <span>{i + 1}</span>}
                    </div>
                    <div className="lb-name" style={{ flex: 1, fontSize: "12px", letterSpacing: "1px" }}>
                      {entry.name}
                    </div>
                    <div className="lb-val">{entry.value}</div>
                    {/* req #9 — Distance to #1 column (round tab only, skip #1 itself) */}
                    {activeTab === "round" && i > 0 && entry.distanceToFirst !== undefined && (
                      <div style={{ width: "120px", textAlign: "right", fontSize: "10px", color: "#ff6b6b", letterSpacing: "1px", fontFamily: "var(--font-display)" }}>
                        -{entry.distanceToFirst.toFixed(2)}
                      </div>
                    )}
                    {activeTab === "round" && i === 0 && (
                      <div style={{ width: "120px", textAlign: "right", fontSize: "10px", color: "var(--gold)", letterSpacing: "1px" }}>
                        LEADING 👑
                      </div>
                    )}
                  </div>
                ))}
                {data.length === 0 && (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)", fontSize: "11px", letterSpacing: "2px" }}>
                    NO DATA YET
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

interface Referrer {
  username: string;
  referrals: number;
  earned: string;
}

export default function ReferralsPage() {
  const pathname = usePathname();
  const router   = useRouter();

  const [copied, setCopied]     = useState(false);
  const [refCode, setRefCode]   = useState("LOADING...");
  const [stats, setStats]       = useState({ friends: 0, earned: "0.00", commission: "10%" });
  const [leaders, setLeaders]   = useState<Referrer[]>([]);
  const [loading, setLoading]   = useState(true);

  const referralLink = `https://www.ashnance.com/ref/${refCode}`;

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) { router.replace("/login"); return; }
    const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/api/auth/profile`, { headers }).then((r) => r.json()).catch(() => null),
      fetch(`${API}/api/leaderboard/referrers`, { headers }).then((r) => r.json()).catch(() => null),
    ]).then(([profileRes, lb]) => {
      const profile = profileRes?.data ?? profileRes;
      if (profile?.referralCode) setRefCode(profile.referralCode);
      if (profile) {
        setStats({
          friends:    Number(profile.referralCount  ?? 0),
          earned:     Number(profile.referralEarned ?? 0).toFixed(2),
          commission: "10%",
        });
      }
      const lbArr = lb?.data ?? lb;
      if (Array.isArray(lbArr) && lbArr.length > 0) {
        setLeaders(lbArr.slice(0, 8).map((e: any) => ({
          username: e.username ?? "???",
          referrals: Number(e.referrals ?? e.totalReferrals ?? 0),
          earned: `$${Number(e.earned ?? e.totalEarned ?? 0).toFixed(2)}`,
        })));
      } else {
        setLeaders([]);
      }
    }).finally(() => setLoading(false));
  }, [router]);

  function handleCopy() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLogout() {
    if (typeof window !== "undefined") localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken");
    router.push("/");
  }

  function shareX() {
    window.open(`https://twitter.com/intent/tweet?text=Burn+USDC+and+win+big+on+%40Ashnance!+Use+my+ref+link:+${encodeURIComponent(referralLink)}`, "_blank");
  }
  function shareTelegram() {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Burn+USDC+and+win+big+on+Ashnance!`, "_blank");
  }
  function shareWhatsApp() {
    window.open(`https://wa.me/?text=Burn+USDC+and+win+on+Ashnance!+${encodeURIComponent(referralLink)}`, "_blank");
  }

  const rankColor = (i: number) => i === 0 ? "var(--gold)" : i === 1 ? "#CCC" : i === 2 ? "#CD7F32" : "var(--text-dim)";

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
          <h1 className="dash-title">REFERRAL <span>PROGRAM</span></h1>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Friends Joined</div>
            <div className="stat-value fire">{loading ? "—" : stats.friends}</div>
            <div className="stat-sub">Active burners referred</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">USDC Earned</div>
            <div className="stat-value usdc">${loading ? "—" : stats.earned}</div>
            <div className="stat-sub">Lifetime referral earnings</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Your Commission</div>
            <div className="stat-value gold">10%</div>
            <div className="stat-sub">Per referral burn, instant</div>
          </div>
        </div>

        {/* Referral link */}
        <div className="panel-box">
          <div className="panel-title">🔗 YOUR REFERRAL LINK</div>
          <div className="copy-box" style={{ marginBottom: "14px" }}>
            <span className="addr">{referralLink}</span>
            <button
              className="copy-btn"
              onClick={handleCopy}
              style={copied ? { borderColor: "var(--usdc-green)", color: "var(--usdc-green)" } : {}}
            >
              {copied ? "COPIED!" : "COPY"}
            </button>
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px", marginBottom: "16px" }}>
            CODE: <span style={{ color: "var(--fire-orange)", fontWeight: 700 }}>{refCode}</span>
          </div>

          {/* Share buttons */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              className="btn-ghost btn"
              onClick={shareX}
              style={{ fontSize: "11px", letterSpacing: "1px" }}
            >
              𝕏 SHARE ON X
            </button>
            <button
              className="btn-ghost btn"
              onClick={shareTelegram}
              style={{ fontSize: "11px", letterSpacing: "1px" }}
            >
              ✈️ TELEGRAM
            </button>
            <button
              className="btn-ghost btn"
              onClick={shareWhatsApp}
              style={{ fontSize: "11px", letterSpacing: "1px" }}
            >
              💬 WHATSAPP
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="panel-box">
          <div className="panel-title">⚡ HOW IT WORKS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[
              { step: "01", title: "SHARE LINK", desc: "Share your unique referral link with friends" },
              { step: "02", title: "THEY BURN",  desc: "Your referral signs up and burns USDC" },
              { step: "03", title: "YOU EARN",   desc: "You instantly receive 10% of every burn they make" },
            ].map((s) => (
              <div key={s.step} style={{ borderLeft: "2px solid var(--fire-orange)", paddingLeft: "14px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: "var(--fire-orange)", lineHeight: 1 }}>{s.step}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", letterSpacing: "2px", color: "var(--text)", marginBottom: "4px" }}>{s.title}</div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="panel-box">
          <div className="panel-title">🏆 TOP REFERRERS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {leaders.map((user, i) => (
              <div key={i} className="lb-item">
                <div
                  className={`lb-rank${i === 0 ? " gold-rank" : i === 1 ? " silver-rank" : i === 2 ? " bronze-rank" : ""}`}
                  style={{ color: rankColor(i) }}
                >
                  {i + 1}
                </div>
                <div className="lb-name">{user.username ?? `****${i}`}</div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", marginRight: "16px" }}>
                  {user.referrals} refs
                </div>
                <div className="lb-val" style={{ color: "var(--usdc-green)", fontSize: "16px" }}>
                  {user.earned}
                </div>
              </div>
            ))}
            {leaders.length === 0 && !loading && (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)", fontSize: "11px", letterSpacing: "2px" }}>
                NO DATA YET
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

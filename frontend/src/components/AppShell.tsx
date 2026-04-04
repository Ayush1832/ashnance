"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { icon: "📊", label: "DASHBOARD",   href: "/dashboard"    },
  { icon: "🔥", label: "BURN NOW",    href: "/burn"         },
  { icon: "💰", label: "WALLET",      href: "/wallet"       },
  { icon: "👥", label: "REFERRALS",   href: "/referrals"    },
  { icon: "👑", label: "VIP",         href: "/subscribe"    },
  { icon: "📋", label: "HISTORY",     href: "/transactions" },
  { icon: "🏆", label: "LEADERBOARD", href: "/leaderboard"  },
  { icon: "💎", label: "STAKING",     href: "/staking"      },
  { icon: "⚙️", label: "SETTINGS",   href: "/settings"     },
];

interface AppShellProps {
  children: React.ReactNode;
  username?: string;
  isVip?: boolean;
}

export default function AppShell({ children, username = "BURNER", isVip = false }: AppShellProps) {
  const pathname = usePathname();
  const router   = useRouter();

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    router.push("/");
  }

  return (
    <div className="dash-layout">
      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo-horizontal.png" alt="Ashnance" style={{ width: "140px", height: "auto", display: "block" }} />
          <span>KEEP BURNING</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? " active" : ""}`}
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
              <div className="user-name">{username}</div>
              <div className="user-status">{isVip ? "VIP" : "STANDARD"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ width: "100%", background: "none", border: "none", marginTop: "8px", cursor: "pointer" }}
          >
            <span className="nav-icon">🚪</span>
            LOGOUT
          </button>
        </div>
      </aside>

      {/* ===== CONTENT ===== */}
      <div className="dash-content">
        {children}
      </div>
    </div>
  );
}

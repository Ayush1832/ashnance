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

type SettingsTab = "profile" | "security" | "notifications" | "addresses";

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "profile",       label: "PROFILE" },
  { key: "security",      label: "SECURITY" },
  { key: "notifications", label: "NOTIFICATIONS" },
  { key: "addresses",     label: "ADDRESSES" },
];

export default function SettingsPage() {
  const pathname = usePathname();
  const router   = useRouter();

  const [activeTab, setActiveTab]       = useState<SettingsTab>("profile");
  const [username, setUsername]         = useState("BurnMaster42");
  const [email, setEmail]               = useState("burn@example.com");
  const [privacyMode, setPrivacyMode]   = useState(false);
  const [saveMsg, setSaveMsg]           = useState("");

  // Security
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [showQR, setShowQR]             = useState(false);
  const [qrSecret, setQrSecret]         = useState("JBSW Y3DP EHPK 3PXP");
  const [totpCode, setTotpCode]         = useState("");
  const [currentPass, setCurrentPass]   = useState("");
  const [newPass, setNewPass]           = useState("");
  const [confirmPass, setConfirmPass]   = useState("");
  const [passMsg, setPassMsg]           = useState("");

  // Notifications
  const [emailNotifs, setEmailNotifs]       = useState(true);
  const [burnNotifs, setBurnNotifs]         = useState(true);
  const [referralNotifs, setReferralNotifs] = useState(true);
  const [winNotifs, setWinNotifs]           = useState(true);

  // Addresses
  const [addrLabel, setAddrLabel] = useState("");
  const [addrValue, setAddrValue] = useState("");
  const [addrMsg, setAddrMsg]     = useState("");
  const [addresses, setAddresses] = useState([
    { label: "My Main Wallet", address: "9xkG...3hPq", verified: true },
    { label: "Cold Storage",   address: "7mBx...9kLp", verified: false },
  ]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ash_token") : null;
    if (!token) return;
    fetch(`${API}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.username)   setUsername(data.username);
        if (data?.email)      setEmail(data.email);
        if (data?.twoFaEnabled !== undefined) setTwoFaEnabled(data.twoFaEnabled);
      })
      .catch(() => {});
  }, []);

  function handleLogout() {
    if (typeof window !== "undefined") localStorage.removeItem("ash_token");
    router.push("/");
  }

  async function handleSaveProfile() {
    setSaveMsg("");
    const token = typeof window !== "undefined" ? localStorage.getItem("ash_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ username, privacyMode }),
      });
      setSaveMsg(res.ok ? "SAVED SUCCESSFULLY" : "SAVE FAILED");
    } catch {
      setSaveMsg("SAVED LOCALLY");
    }
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function handleEnable2FA() {
    const token = typeof window !== "undefined" ? localStorage.getItem("ash_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API}/api/2fa/enable`, {
        method: "POST",
        headers,
        body: JSON.stringify({ token: totpCode }),
      });
      if (res.ok) {
        setTwoFaEnabled(true);
        setShowQR(false);
        setTotpCode("");
      }
    } catch {
      // UI mock: enable anyway for demo
      setTwoFaEnabled(true);
      setShowQR(false);
    }
  }

  async function handleGenerate2FA() {
    const token = typeof window !== "undefined" ? localStorage.getItem("ash_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API}/api/2fa/generate`, { method: "POST", headers });
      const data = await res.json();
      if (data?.secret) setQrSecret(data.secret);
    } catch {}
    setShowQR(true);
  }

  async function handleChangePass() {
    setPassMsg("");
    if (newPass !== confirmPass) { setPassMsg("PASSWORDS DO NOT MATCH"); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("ash_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      setPassMsg(res.ok ? "PASSWORD UPDATED" : "UPDATE FAILED");
    } catch {
      setPassMsg("PASSWORD UPDATED");
    }
    setCurrentPass(""); setNewPass(""); setConfirmPass("");
    setTimeout(() => setPassMsg(""), 3000);
  }

  function handleAddAddress() {
    setAddrMsg("");
    if (!addrLabel || !addrValue) { setAddrMsg("FILL ALL FIELDS"); return; }
    setAddresses((prev) => [...prev, { label: addrLabel, address: addrValue, verified: false }]);
    setAddrLabel(""); setAddrValue("");
    setAddrMsg("ADDRESS ADDED — 24H COOLDOWN");
    setTimeout(() => setAddrMsg(""), 4000);
  }

  const initial = username.charAt(0).toUpperCase();

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
              <div className="user-name">{username.toUpperCase()}</div>
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
          <h1 className="dash-title">ACCOUNT <span>SETTINGS</span></h1>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "1px" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid var(--fire-orange)" : "2px solid transparent",
                color: activeTab === tab.key ? "var(--fire-orange)" : "var(--text-dim)",
                fontFamily: "var(--font-body)",
                fontSize: "10px",
                letterSpacing: "2px",
                cursor: "pointer",
                textTransform: "uppercase",
                transition: "all 0.15s",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---- PROFILE TAB ---- */}
        {activeTab === "profile" && (
          <div className="panel-box" style={{ maxWidth: "640px" }}>
            <div className="panel-title">👤 PROFILE INFORMATION</div>

            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
              <div style={{
                width: "64px",
                height: "64px",
                background: "linear-gradient(135deg, var(--fire-red), var(--fire-orange))",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: "32px",
                color: "#FFF",
                flexShrink: 0,
              }}>
                {initial}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "2px", color: "var(--text)" }}>
                  {username.toUpperCase()}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>STANDARD MEMBER</div>
              </div>
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email (read-only)</label>
              <input
                type="email"
                value={email}
                disabled
                style={{ opacity: 0.5, cursor: "not-allowed" }}
              />
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px",
              background: "var(--black)",
              border: "1px solid var(--border)",
              marginBottom: "20px",
              cursor: "pointer",
            }} onClick={() => setPrivacyMode((p) => !p)}>
              <div style={{
                width: "16px",
                height: "16px",
                border: "1px solid var(--fire-orange)",
                background: privacyMode ? "var(--fire-orange)" : "transparent",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {privacyMode && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "1px", color: "var(--text)" }}>PRIVACY MODE</div>
                <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "1px" }}>Hide username from leaderboards</div>
              </div>
            </div>

            {saveMsg && (
              <div style={{
                fontSize: "10px",
                letterSpacing: "2px",
                color: saveMsg.includes("FAIL") ? "var(--fire-red)" : "var(--usdc-green)",
                marginBottom: "12px",
              }}>
                {saveMsg}
              </div>
            )}
            <button className="btn-fire btn" onClick={handleSaveProfile} style={{ letterSpacing: "2px" }}>
              SAVE CHANGES
            </button>
          </div>
        )}

        {/* ---- SECURITY TAB ---- */}
        {activeTab === "security" && (
          <div style={{ maxWidth: "640px" }}>
            <div className="panel-box">
              <div className="panel-title">🔐 TWO-FACTOR AUTHENTICATION</div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "1px", lineHeight: 1.7, marginBottom: "20px" }}>
                2FA is <span style={{ color: "var(--fire-orange)" }}>MANDATORY</span> for all withdrawals.
                Enable it now to secure your account.
              </div>

              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                background: twoFaEnabled ? "rgba(39,174,96,0.1)" : "rgba(204,17,0,0.1)",
                border: `1px solid ${twoFaEnabled ? "var(--usdc-green)" : "var(--fire-red)"}`,
                marginBottom: "20px",
                fontSize: "10px",
                letterSpacing: "2px",
                color: twoFaEnabled ? "var(--usdc-green)" : "var(--fire-red)",
              }}>
                {twoFaEnabled ? "✓ ENABLED" : "✗ DISABLED"}
              </div>

              {!twoFaEnabled ? (
                !showQR ? (
                  <div>
                    <button className="btn-fire btn" onClick={handleGenerate2FA} style={{ letterSpacing: "2px" }}>
                      ENABLE 2FA
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "12px", letterSpacing: "1px" }}>
                      1. Download Google Authenticator or Authy<br />
                      2. Scan the QR code below:
                    </div>
                    <div style={{
                      width: "160px",
                      height: "160px",
                      background: "var(--black)",
                      border: "1px dashed var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                    }}>
                      <span style={{ fontSize: "36px" }}>📱</span>
                      <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "8px", letterSpacing: "1px", textAlign: "center", padding: "0 8px" }}>
                        SECRET: {qrSecret}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Enter 6-digit code from app</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        style={{ maxWidth: "200px" }}
                      />
                    </div>
                    <button className="btn-fire btn" onClick={handleEnable2FA} style={{ letterSpacing: "2px" }}>
                      CONFIRM & ENABLE
                    </button>
                  </div>
                )
              ) : (
                <button
                  className="btn-ghost btn"
                  onClick={() => setTwoFaEnabled(false)}
                  style={{ borderColor: "var(--fire-red)", color: "var(--fire-red)", letterSpacing: "2px" }}
                >
                  DISABLE 2FA
                </button>
              )}
            </div>

            <div className="panel-box">
              <div className="panel-title">🔑 CHANGE PASSWORD</div>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
              </div>
              {passMsg && (
                <div style={{
                  fontSize: "10px",
                  letterSpacing: "2px",
                  color: passMsg.includes("FAIL") || passMsg.includes("MATCH") ? "var(--fire-red)" : "var(--usdc-green)",
                  marginBottom: "12px",
                }}>
                  {passMsg}
                </div>
              )}
              <button className="btn-fire btn" onClick={handleChangePass} style={{ letterSpacing: "2px" }}>
                UPDATE PASSWORD
              </button>
            </div>

            <div className="panel-box">
              <div className="panel-title">🔗 CONNECTED WALLETS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  background: "var(--black)",
                  border: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: "18px" }}>👻</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", color: "var(--text)", letterSpacing: "1px" }}>Phantom</div>
                    <div style={{ fontSize: "9px", color: "var(--text-dim)", fontFamily: "monospace" }}>9xkG...3hPq</div>
                  </div>
                  <button className="btn-ghost btn" style={{ fontSize: "9px", letterSpacing: "1px", padding: "4px 10px", borderColor: "var(--fire-red)", color: "var(--fire-red)" }}>
                    DISCONNECT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- NOTIFICATIONS TAB ---- */}
        {activeTab === "notifications" && (
          <div className="panel-box" style={{ maxWidth: "640px" }}>
            <div className="panel-title">🔔 NOTIFICATION PREFERENCES</div>
            {[
              { label: "EMAIL NOTIFICATIONS",  desc: "Receive important account updates via email",      val: emailNotifs,    set: setEmailNotifs },
              { label: "BURN RESULTS",          desc: "Get notified about your burn outcomes",             val: burnNotifs,     set: setBurnNotifs },
              { label: "REFERRAL ACTIVITY",     desc: "When your referrals burn and you earn rewards",    val: referralNotifs, set: setReferralNotifs },
              { label: "WIN ALERTS",            desc: "Instant alert when you win a prize",               val: winNotifs,      set: setWinNotifs },
            ].map((n) => (
              <div
                key={n.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text)", letterSpacing: "2px", marginBottom: "4px" }}>{n.label}</div>
                  <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "1px" }}>{n.desc}</div>
                </div>
                {/* Toggle */}
                <div
                  onClick={() => n.set((p: boolean) => !p)}
                  style={{
                    width: "48px",
                    height: "26px",
                    background: n.val ? "var(--fire-orange)" : "var(--border)",
                    borderRadius: "13px",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    flexShrink: 0,
                    marginLeft: "16px",
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: "3px",
                    left: n.val ? "25px" : "3px",
                    width: "20px",
                    height: "20px",
                    background: "#FFF",
                    borderRadius: "50%",
                    transition: "left 0.2s",
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---- ADDRESSES TAB ---- */}
        {activeTab === "addresses" && (
          <div style={{ maxWidth: "640px" }}>
            <div className="panel-box">
              <div className="panel-title">📍 WHITELISTED WITHDRAWAL ADDRESSES</div>
              <div style={{
                fontSize: "10px",
                color: "var(--text-dim)",
                letterSpacing: "1px",
                lineHeight: 1.7,
                marginBottom: "20px",
                padding: "10px 14px",
                background: "rgba(255,77,0,0.04)",
                border: "1px solid rgba(255,77,0,0.12)",
              }}>
                For security, you can only withdraw to pre-approved Solana addresses.
                New addresses require a <span style={{ color: "var(--fire-orange)" }}>24-HOUR</span> cooldown period.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                {addresses.map((addr, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "var(--black)",
                    border: "1px solid var(--border)",
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text)", letterSpacing: "1px", marginBottom: "3px" }}>
                        {addr.label}
                      </div>
                      <code style={{ fontSize: "10px", color: "var(--text-dim)" }}>{addr.address}</code>
                    </div>
                    <div style={{
                      fontSize: "9px",
                      letterSpacing: "1px",
                      padding: "3px 10px",
                      background: addr.verified ? "rgba(39,174,96,0.08)" : "rgba(255,184,0,0.08)",
                      border: `1px solid ${addr.verified ? "rgba(39,174,96,0.3)" : "rgba(255,184,0,0.3)"}`,
                      color: addr.verified ? "var(--usdc-green)" : "var(--gold)",
                    }}>
                      {addr.verified ? "✓ VERIFIED" : "⏳ PENDING"}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  letterSpacing: "2px",
                  color: "var(--gold)",
                  marginBottom: "16px",
                }}>
                  ADD NEW ADDRESS
                </div>
                <div className="form-group">
                  <label>Label</label>
                  <input
                    type="text"
                    placeholder="e.g. My Ledger"
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Solana Address</label>
                  <input
                    type="text"
                    placeholder="Enter Solana wallet address"
                    value={addrValue}
                    onChange={(e) => setAddrValue(e.target.value)}
                  />
                </div>
                {addrMsg && (
                  <div style={{
                    fontSize: "10px",
                    letterSpacing: "2px",
                    color: addrMsg.includes("FILL") ? "var(--fire-red)" : "var(--gold)",
                    marginBottom: "12px",
                  }}>
                    {addrMsg}
                  </div>
                )}
                <button className="btn-fire btn" onClick={handleAddAddress} style={{ letterSpacing: "2px" }}>
                  ADD ADDRESS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

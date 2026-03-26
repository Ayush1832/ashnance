"use client";

import { useState } from "react";
import Link from "next/link";
import dashStyles from "../dashboard/dashboard.module.css";
import styles from "./settings.module.css";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "🔥", label: "Burn Now", href: "/burn" },
  { icon: "💳", label: "Wallet", href: "/wallet" },
  { icon: "👥", label: "Referrals", href: "/referrals" },
  { icon: "🏆", label: "Leaderboard", href: "/leaderboard" },
  { icon: "⚙️", label: "Settings", href: "/settings", active: true },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications" | "addresses">("profile");
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [burnNotifs, setBurnNotifs] = useState(true);
  const [referralNotifs, setReferralNotifs] = useState(true);

  const tabs = [
    { key: "profile", label: "👤 Profile", id: "profile" },
    { key: "security", label: "🔐 Security", id: "security" },
    { key: "notifications", label: "🔔 Notifications", id: "notifications" },
    { key: "addresses", label: "📍 Addresses", id: "addresses" },
  ] as const;

  return (
    <div className={styles.settingsPage}>
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

      <main className={styles.settingsMain}>
        <div className={styles.settingsContent}>
          <div className={styles.pageHeader}>
            <h1>⚙️ Settings</h1>
            <p>Manage your account, security, and preferences</p>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className={`glass-card ${styles.settingsCard}`}>
              <h3>Profile Information</h3>
              <div className={styles.formGroup}>
                <label>Username</label>
                <input type="text" defaultValue="BurnMaster42" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input type="email" defaultValue="burn@example.com" className={styles.input} disabled />
                <span className={styles.hint}>Email cannot be changed</span>
              </div>
              <div className={styles.formGroup}>
                <label>Country</label>
                <select className={styles.input} defaultValue="US">
                  <option value="">Select country</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="AE">UAE</option>
                  <option value="IN">India</option>
                  <option value="SG">Singapore</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>
                  <input type="checkbox" checked={privacyMode} onChange={(e) => setPrivacyMode(e.target.checked)} />
                  {" "}Privacy Mode — hide username from leaderboards
                </label>
              </div>
              <button className={styles.saveBtn}>💾 Save Changes</button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className={`glass-card ${styles.settingsCard}`}>
              <h3>🔐 Two-Factor Authentication</h3>
              <p className={styles.securityDesc}>
                2FA is <strong>mandatory for all withdrawals</strong>. Enable it now to secure your account.
              </p>

              <div className={styles.twoFaSection}>
                <div className={styles.twoFaStatus}>
                  <span className={twoFaEnabled ? styles.statusOn : styles.statusOff}>
                    {twoFaEnabled ? "✅ Enabled" : "❌ Disabled"}
                  </span>
                </div>

                {!twoFaEnabled ? (
                  <div className={styles.twoFaSetup}>
                    <p>1. Download Google Authenticator or Authy</p>
                    <p>2. Scan the QR code below:</p>
                    <div className={styles.qrPlaceholder}>
                      <span>📱 QR Code</span>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Secret: JBSW Y3DP EHPK 3PXP
                      </p>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Enter 6-digit code from app</label>
                      <input type="text" maxLength={6} placeholder="000000" className={styles.input} />
                    </div>
                    <button className={styles.saveBtn} onClick={() => setTwoFaEnabled(true)}>
                      🔐 Enable 2FA
                    </button>
                  </div>
                ) : (
                  <button className={styles.dangerBtn} onClick={() => setTwoFaEnabled(false)}>
                    Disable 2FA
                  </button>
                )}
              </div>

              <hr className={styles.divider} />

              <h3>🔑 Change Password</h3>
              <div className={styles.formGroup}>
                <label>Current Password</label>
                <input type="password" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input type="password" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <input type="password" className={styles.input} />
              </div>
              <button className={styles.saveBtn}>🔑 Update Password</button>

              <hr className={styles.divider} />

              <h3>🔗 Connected Wallets</h3>
              <div className={styles.walletList}>
                <div className={styles.walletItem}>
                  <span>👻 Phantom</span>
                  <span className={styles.walletAddr}>9xkG...3hPq</span>
                  <button className={styles.dangerBtnSmall}>Disconnect</button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className={`glass-card ${styles.settingsCard}`}>
              <h3>🔔 Notification Preferences</h3>
              <div className={styles.notifItem}>
                <div>
                  <strong>Email Notifications</strong>
                  <p>Receive important account updates via email</p>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.notifItem}>
                <div>
                  <strong>Burn Results</strong>
                  <p>Get notified about your burn outcomes</p>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={burnNotifs} onChange={(e) => setBurnNotifs(e.target.checked)} />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.notifItem}>
                <div>
                  <strong>Referral Activity</strong>
                  <p>When your referrals burn and you earn rewards</p>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={referralNotifs} onChange={(e) => setReferralNotifs(e.target.checked)} />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === "addresses" && (
            <div className={`glass-card ${styles.settingsCard}`}>
              <h3>📍 Whitelisted Withdrawal Addresses</h3>
              <p className={styles.securityDesc}>
                For security, you can only withdraw to pre-approved addresses. New addresses require 24-hour cooldown.
              </p>

              <div className={styles.addressList}>
                <div className={styles.addressItem}>
                  <div>
                    <strong>My Main Wallet</strong>
                    <code>9xkG...3hPq</code>
                  </div>
                  <span className={styles.verifiedBadge}>✅ Verified</span>
                </div>
                <div className={styles.addressItem}>
                  <div>
                    <strong>Cold Storage</strong>
                    <code>7mBx...9kLp</code>
                  </div>
                  <span className={styles.pendingBadge}>⏳ Pending (22h left)</span>
                </div>
              </div>

              <hr className={styles.divider} />

              <h3>Add New Address</h3>
              <div className={styles.formGroup}>
                <label>Label</label>
                <input type="text" placeholder="e.g. My Ledger" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Solana Address</label>
                <input type="text" placeholder="Enter Solana address" className={styles.input} />
              </div>
              <button className={styles.saveBtn}>📍 Add Address</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

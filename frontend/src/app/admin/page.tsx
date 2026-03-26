"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./admin.module.css";

const adminNav = [
  { icon: "📊", label: "Overview", key: "overview" },
  { icon: "🏆", label: "Prizes", key: "prizes" },
  { icon: "👥", label: "Referrals", key: "referrals" },
  { icon: "👑", label: "VIP", key: "vip" },
  { icon: "🪙", label: "ASH Token", key: "ash" },
  { icon: "⚙️", label: "Platform", key: "platform" },
  { icon: "📋", label: "Audit Log", key: "audit" },
];

const overviewStats = [
  { label: "Total Users", value: "12,458", change: "+342 today", icon: "👤" },
  { label: "Total Burns", value: "89,231", change: "+1,247 today", icon: "🔥" },
  { label: "Reward Pool", value: "$142,890", change: "+$6,230 today", icon: "💰" },
  { label: "Profit Pool", value: "$142,890", change: "+$6,230 today", icon: "📈" },
  { label: "Active VIPs", value: "891", change: "+23 today", icon: "👑" },
  { label: "Total Referrals", value: "4,562", change: "+89 today", icon: "👥" },
];

const prizeConfig = [
  { tier: "Jackpot", value: 2500, poolPercent: "10%", probability: "1%", active: true },
  { tier: "Big", value: 500, poolPercent: "5%", probability: "4%", active: true },
  { tier: "Medium", value: 200, poolPercent: "2%", probability: "15%", active: true },
  { tier: "Small", value: 50, poolPercent: "1%", probability: "80%", active: true },
];

const auditLog = [
  { time: "14:32", admin: "Admin1", action: "Updated prize probability for JACKPOT", type: "Prize" },
  { time: "13:15", admin: "Admin1", action: "Approved withdrawal #4521 ($500 USDC)", type: "Wallet" },
  { time: "12:01", admin: "System", action: "Daily reward pool top-up: +$2,000", type: "Pool" },
  { time: "11:45", admin: "Admin2", action: "Banned user SuspiciousUser99", type: "User" },
  { time: "10:30", admin: "System", action: "VIP subscription renewal: 42 users", type: "VIP" },
];

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [rewardSplit, setRewardSplit] = useState(50);
  const [constantFactor, setConstantFactor] = useState(100);

  return (
    <div className={styles.adminPage}>
      {/* Sidebar */}
      <aside className={styles.adminSidebar}>
        <div className={styles.adminLogo}>
          <span className={styles.logoIcon}>🔥</span>
          <span>Ashnance Admin</span>
        </div>
        <nav className={styles.adminNav}>
          {adminNav.map((item) => (
            <button
              key={item.key}
              className={`${styles.adminNavItem} ${activeSection === item.key ? styles.activeNav : ""}`}
              onClick={() => setActiveSection(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.adminFooter}>
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.adminMain}>
        {/* Overview */}
        {activeSection === "overview" && (
          <div>
            <h1 className={styles.pageTitle}>📊 Platform Overview</h1>
            <div className={styles.statsGrid}>
              {overviewStats.map((s) => (
                <div key={s.label} className={`glass-card ${styles.statCard}`}>
                  <div className={styles.statIcon}>{s.icon}</div>
                  <div className={styles.statValue}>{s.value}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                  <div className={styles.statChange}>{s.change}</div>
                </div>
              ))}
            </div>

            {/* Quick Charts Placeholder */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)", marginTop: "var(--space-xl)" }}>
              <div className={`glass-card ${styles.chartCard}`}>
                <h3>Burns (Last 7 Days)</h3>
                <div className={styles.chartPlaceholder}>
                  {[65, 48, 72, 55, 80, 64, 90].map((h, i) => (
                    <div key={i} className={styles.bar} style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
              <div className={`glass-card ${styles.chartCard}`}>
                <h3>Revenue (Last 7 Days)</h3>
                <div className={styles.chartPlaceholder}>
                  {[50, 60, 45, 70, 55, 75, 85].map((h, i) => (
                    <div key={i} className={styles.bar} style={{ height: `${h}%`, background: "var(--success)" }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prize Management */}
        {activeSection === "prizes" && (
          <div>
            <h1 className={styles.pageTitle}>🏆 Prize Management</h1>
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Value (USDC)</th>
                    <th>Pool %</th>
                    <th>Probability</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prizeConfig.map((p) => (
                    <tr key={p.tier}>
                      <td><strong>{p.tier}</strong></td>
                      <td>${p.value}</td>
                      <td>{p.poolPercent}</td>
                      <td>{p.probability}</td>
                      <td>{p.active ? "✅" : "❌"}</td>
                      <td>
                        <button className={styles.editBtn}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Platform Config */}
        {activeSection === "platform" && (
          <div>
            <h1 className={styles.pageTitle}>⚙️ Platform Configuration</h1>
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <div className={styles.configItem}>
                <label>Reward Pool Split (%)</label>
                <div className={styles.configRow}>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={rewardSplit}
                    onChange={(e) => setRewardSplit(Number(e.target.value))}
                    className={styles.rangeInput}
                  />
                  <span className={styles.configValue}>{rewardSplit}% Reward / {100 - rewardSplit}% Profit</span>
                </div>
              </div>
              <div className={styles.configItem}>
                <label>Constant Factor (Win Probability Denominator)</label>
                <input type="number" value={constantFactor} onChange={(e) => setConstantFactor(Number(e.target.value))} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>Min Burn Amount (USDC)</label>
                <input type="number" defaultValue={4.99} step={0.01} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>Referral Commission (%)</label>
                <input type="number" defaultValue={10} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>ASH Reward Range (on Lose)</label>
                <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center" }}>
                  <input type="number" defaultValue={200} className={styles.configInput} style={{ width: 100 }} />
                  <span style={{ color: "var(--text-secondary)" }}>to</span>
                  <input type="number" defaultValue={500} className={styles.configInput} style={{ width: 100 }} />
                </div>
              </div>
              <div className={styles.configItem}>
                <label>VIP (Holy Fire) Price (USDC/month)</label>
                <input type="number" defaultValue={24.99} step={0.01} className={styles.configInput} />
              </div>
              <button className={styles.saveConfigBtn}>💾 Save Configuration</button>
            </div>
          </div>
        )}

        {/* Audit Log */}
        {activeSection === "audit" && (
          <div>
            <h1 className={styles.pageTitle}>📋 Audit Log</h1>
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((log, i) => (
                    <tr key={i}>
                      <td>{log.time}</td>
                      <td><strong>{log.admin}</strong></td>
                      <td>{log.action}</td>
                      <td><span className={styles.logType}>{log.type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Referrals */}
        {activeSection === "referrals" && (
          <div>
            <h1 className={styles.pageTitle}>👥 Referral System Controls</h1>
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <div className={styles.configItem}>
                <label>Commission Rate (%)</label>
                <input type="number" defaultValue={10} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>Reward Source</label>
                <select className={styles.configInput}>
                  <option>From Reward Pool</option>
                  <option>From Profit Pool</option>
                </select>
              </div>
              <div className={styles.configItem}>
                <label>Max Referral Earnings (USDC/day)</label>
                <input type="number" defaultValue={1000} className={styles.configInput} />
              </div>
              <button className={styles.saveConfigBtn}>💾 Save</button>
            </div>
          </div>
        )}

        {/* VIP */}
        {activeSection === "vip" && (
          <div>
            <h1 className={styles.pageTitle}>👑 VIP Management</h1>
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <div className={styles.configItem}>
                <label>Holy Fire Price (USDC/month)</label>
                <input type="number" defaultValue={24.99} step={0.01} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>Holy Fire Weight Bonus</label>
                <input type="number" defaultValue={0.50} step={0.05} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>Holy Fire ASH Bonus (%)</label>
                <input type="number" defaultValue={20} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>Total Active VIPs: <strong style={{ color: "var(--primary-container)" }}>891</strong></label>
              </div>
              <button className={styles.saveConfigBtn}>💾 Save</button>
            </div>
          </div>
        )}

        {/* ASH Token */}
        {activeSection === "ash" && (
          <div>
            <h1 className={styles.pageTitle}>🪙 ASH Token Settings</h1>
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <div className={styles.statsGrid} style={{ marginBottom: "var(--space-xl)" }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total Supply</div>
                  <div className={styles.statValue}>1,000,000,000</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Distributed</div>
                  <div className={styles.statValue}>142,500,000</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Remaining</div>
                  <div className={styles.statValue}>857,500,000</div>
                </div>
              </div>
              <div className={styles.configItem}>
                <label>ASH Reward Min (on Lose)</label>
                <input type="number" defaultValue={200} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>ASH Reward Max (on Lose)</label>
                <input type="number" defaultValue={500} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>Boost Cost (ASH)</label>
                <input type="number" defaultValue={1000} className={styles.configInput} />
              </div>
              <div className={styles.configItem}>
                <label>Boost Duration (minutes)</label>
                <input type="number" defaultValue={60} className={styles.configInput} />
              </div>
              <button className={styles.saveConfigBtn}>💾 Save</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

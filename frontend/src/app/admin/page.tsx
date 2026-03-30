"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const ADMIN_NAV = [
  { key: "overview",  icon: "📊", label: "OVERVIEW"   },
  { key: "prizes",    icon: "🏆", label: "PRIZES"     },
  { key: "pool",      icon: "💰", label: "POOL"       },
  { key: "users",     icon: "👥", label: "USERS"      },
  { key: "vip",       icon: "👑", label: "VIP"        },
  { key: "ash",       icon: "🪙", label: "ASH TOKEN"  },
  { key: "referrals", icon: "🔗", label: "REFERRALS"  },
  { key: "audit",     icon: "📋", label: "AUDIT LOG"  },
];

const MOCK_STATS = [
  { label: "TOTAL BURNS",    value: "89,231", sub: "+1,247 today",   cls: "fire" },
  { label: "REWARD POOL",    value: "$142,890", sub: "+$6,230 today", cls: "usdc" },
  { label: "PROFIT POOL",    value: "$48,220",  sub: "+$2,100 today", cls: "gold" },
  { label: "ACTIVE PLAYERS", value: "12,458",   sub: "+342 today",    cls: "fire" },
];

const MOCK_PRIZES = [
  { tier: "JACKPOT", value: 2500, poolPercent: 10, probability: 1,  active: true  },
  { tier: "BIG",     value: 500,  poolPercent: 5,  probability: 4,  active: true  },
  { tier: "MEDIUM",  value: 200,  poolPercent: 2,  probability: 15, active: true  },
  { tier: "SMALL",   value: 50,   poolPercent: 1,  probability: 80, active: true  },
];

const MOCK_USERS = [
  { username: "CryptoKing",  email: "king@x.io",    burns: 1450, status: "ACTIVE",  vip: true  },
  { username: "BlazeMaster", email: "blaze@x.io",   burns: 1890, status: "ACTIVE",  vip: true  },
  { username: "MoonBurn",    email: "moon@x.io",    burns: 870,  status: "ACTIVE",  vip: false },
  { username: "AshLord",     email: "ash@x.io",     burns: 1200, status: "ACTIVE",  vip: true  },
  { username: "SuspiciousX", email: "sus@anon.com", burns: 12,   status: "FLAGGED", vip: false },
];

const MOCK_AUDIT = [
  { time: "14:32", admin: "Admin1", action: "Updated JACKPOT prize probability",      type: "PRIZE"  },
  { time: "13:15", admin: "Admin1", action: "Approved withdrawal #4521 ($500 USDC)",  type: "WALLET" },
  { time: "12:01", admin: "System", action: "Daily reward pool top-up: +$2,000",      type: "POOL"   },
  { time: "11:45", admin: "Admin2", action: "Banned user SuspiciousUser99",           type: "USER"   },
  { time: "10:30", admin: "System", action: "VIP subscription renewal: 42 users",    type: "VIP"    },
];

interface Prize { tier: string; value: number; poolPercent: number; probability: number; active: boolean; }

export default function AdminPage() {
  const [section, setSection]         = useState("overview");
  const [stats, setStats]             = useState(MOCK_STATS);
  const [prizes, setPrizes]           = useState<Prize[]>(MOCK_PRIZES);
  const [rewardPct, setRewardPct]     = useState(50);
  const [profitPct, setProfitPct]     = useState(40);
  const [refPct, setRefPct]           = useState(10);
  const [saveMsg, setSaveMsg]         = useState("");
  const [editPrize, setEditPrize]     = useState<number | null>(null);
  const [editVals, setEditVals]       = useState<Partial<Prize>>({});

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${API}/api/admin/stats`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data?.totalBurns !== undefined) {
          setStats([
            { label: "TOTAL BURNS",    value: String(data.totalBurns),    sub: "+today", cls: "fire" },
            { label: "REWARD POOL",    value: `$${data.rewardPool}`,      sub: "+today", cls: "usdc" },
            { label: "PROFIT POOL",    value: `$${data.profitPool}`,      sub: "+today", cls: "gold" },
            { label: "ACTIVE PLAYERS", value: String(data.activePlayers), sub: "+today", cls: "fire" },
          ]);
        }
      })
      .catch(() => {});

    fetch(`${API}/api/admin/prizes`, { headers })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPrizes(data); })
      .catch(() => {});

    fetch(`${API}/api/admin/pool`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data?.rewardPercent !== undefined) setRewardPct(data.rewardPercent);
        if (data?.profitPercent !== undefined) setProfitPct(data.profitPercent);
        if (data?.referralPercent !== undefined) setRefPct(data.referralPercent);
      })
      .catch(() => {});
  }, []);

  async function handleSavePool() {
    setSaveMsg("");
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      await fetch(`${API}/api/admin/pool`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ rewardPercent: rewardPct, profitPercent: profitPct, referralPercent: refPct }),
      });
    } catch {}
    setSaveMsg("SAVED");
    setTimeout(() => setSaveMsg(""), 2500);
  }

  async function handleSavePrize(i: number) {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const updated = { ...prizes[i], ...editVals };
    try {
      await fetch(`${API}/api/admin/prizes/${prizes[i].tier.toLowerCase()}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updated),
      });
    } catch {}
    setPrizes((prev) => prev.map((p, idx) => idx === i ? updated : p));
    setEditPrize(null);
    setEditVals({});
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--deep)" }}>
      {/* Admin sidebar */}
      <aside style={{
        width: "220px",
        minHeight: "100vh",
        background: "var(--panel)",
        borderRight: "1px solid var(--border)",
        padding: "20px 0",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{
          padding: "10px 20px 24px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-display)",
          fontSize: "18px",
          letterSpacing: "3px",
          color: "var(--fire-orange)",
          lineHeight: 1.2,
        }}>
          ASHNANCE
          <span style={{
            color: "var(--fire-red)",
            fontSize: "11px",
            display: "block",
            letterSpacing: "2px",
            fontFamily: "var(--font-body)",
          }}>ADMIN PANEL</span>
        </div>
        <nav style={{ padding: "16px 0", flex: 1 }}>
          {ADMIN_NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`nav-item${section === item.key ? " active" : ""}`}
              style={{ width: "100%", background: "none", border: "none" }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px" }}>
          <Link href="/dashboard" style={{
            fontSize: "10px",
            color: "var(--text-dim)",
            letterSpacing: "1px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            ← BACK TO DASHBOARD
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>

        {/* ---- OVERVIEW ---- */}
        {section === "overview" && (
          <div>
            <div className="dash-title" style={{ marginBottom: "24px" }}>
              PLATFORM <span>OVERVIEW</span>
            </div>
            <div className="stat-grid">
              {stats.map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div className={`stat-value ${s.cls}`}>{s.value}</div>
                  <div className="stat-sub" style={{ color: "var(--usdc-green)" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Mini bar charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px" }}>
              {[
                { title: "BURNS — LAST 7 DAYS", data: [65,48,72,55,80,64,90], color: "var(--fire-orange)" },
                { title: "REVENUE — LAST 7 DAYS", data: [50,60,45,70,55,75,85], color: "var(--usdc-green)" },
              ].map((chart) => (
                <div key={chart.title} className="panel-box" style={{ marginBottom: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "2px", color: "var(--text-dim)", marginBottom: "16px" }}>
                    {chart.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "100px" }}>
                    {chart.data.map((h, i) => (
                      <div key={i} style={{
                        flex: 1,
                        height: `${h}%`,
                        background: chart.color,
                        opacity: 0.7,
                        transition: "height 0.5s",
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- PRIZES ---- */}
        {section === "prizes" && (
          <div>
            <div className="dash-title" style={{ marginBottom: "24px" }}>
              PRIZE <span>MANAGEMENT</span>
            </div>
            <div className="panel-box">
              <table className="ash-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    {["TIER","VALUE (USDC)","POOL %","PROBABILITY","ACTIVE","ACTIONS"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prizes.map((p, i) => (
                    <tr key={p.tier}>
                      <td>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", letterSpacing: "2px", color: "var(--fire-orange)" }}>
                          {p.tier}
                        </span>
                      </td>
                      <td>
                        {editPrize === i
                          ? <input type="number" defaultValue={p.value} onChange={(e) => setEditVals((v) => ({ ...v, value: Number(e.target.value) }))} style={{ width: "80px", background: "var(--black)", border: "1px solid var(--border)", color: "var(--text)", padding: "4px 8px", fontSize: "11px" }} />
                          : `$${p.value}`}
                      </td>
                      <td>
                        {editPrize === i
                          ? <input type="number" defaultValue={p.poolPercent} onChange={(e) => setEditVals((v) => ({ ...v, poolPercent: Number(e.target.value) }))} style={{ width: "60px", background: "var(--black)", border: "1px solid var(--border)", color: "var(--text)", padding: "4px 8px", fontSize: "11px" }} />
                          : `${p.poolPercent}%`}
                      </td>
                      <td>
                        {editPrize === i
                          ? <input type="number" defaultValue={p.probability} onChange={(e) => setEditVals((v) => ({ ...v, probability: Number(e.target.value) }))} style={{ width: "60px", background: "var(--black)", border: "1px solid var(--border)", color: "var(--text)", padding: "4px 8px", fontSize: "11px" }} />
                          : `${p.probability}%`}
                      </td>
                      <td>
                        <span style={{ color: p.active ? "var(--usdc-green)" : "var(--fire-red)", fontFamily: "var(--font-display)", fontSize: "14px" }}>
                          {p.active ? "YES" : "NO"}
                        </span>
                      </td>
                      <td>
                        {editPrize === i ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button className="btn-fire btn" style={{ padding: "4px 10px", fontSize: "9px" }} onClick={() => handleSavePrize(i)}>SAVE</button>
                            <button className="btn-ghost btn" style={{ padding: "4px 10px", fontSize: "9px" }} onClick={() => { setEditPrize(null); setEditVals({}); }}>CANCEL</button>
                          </div>
                        ) : (
                          <button className="btn-ghost btn" style={{ padding: "4px 12px", fontSize: "9px" }} onClick={() => { setEditPrize(i); setEditVals({}); }}>EDIT</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- POOL DISTRIBUTION ---- */}
        {section === "pool" && (
          <div>
            <div className="dash-title" style={{ marginBottom: "24px" }}>
              POOL <span>DISTRIBUTION</span>
            </div>
            <div className="panel-box" style={{ maxWidth: "560px" }}>
              {[
                { label: "REWARD %",    val: rewardPct, set: setRewardPct, color: "var(--usdc-green)" },
                { label: "PROFIT %",    val: profitPct, set: setProfitPct, color: "var(--gold)" },
                { label: "REFERRAL %",  val: refPct,    set: setRefPct,    color: "var(--fire-orange)" },
              ].map((s) => (
                <div key={s.label} className="range-control">
                  <label>
                    {s.label}
                    <span style={{ color: s.color }}>{s.val}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={s.val}
                    onChange={(e) => s.set(Number(e.target.value))}
                    style={{ accentColor: s.color }}
                  />
                </div>
              ))}

              <div style={{
                padding: "12px 16px",
                background: "var(--black)",
                border: "1px solid var(--border)",
                marginBottom: "20px",
                fontSize: "10px",
                letterSpacing: "1px",
                color: "var(--text-dim)",
              }}>
                TOTAL: <span style={{ color: rewardPct + profitPct + refPct === 100 ? "var(--usdc-green)" : "var(--fire-red)", fontFamily: "var(--font-display)", fontSize: "16px" }}>
                  {rewardPct + profitPct + refPct}%
                </span>
                {rewardPct + profitPct + refPct !== 100 && (
                  <span style={{ color: "var(--fire-red)", marginLeft: "10px" }}>MUST EQUAL 100%</span>
                )}
              </div>

              {saveMsg && (
                <div style={{ fontSize: "10px", color: "var(--usdc-green)", letterSpacing: "2px", marginBottom: "12px" }}>{saveMsg}</div>
              )}
              <button className="btn-fire btn" onClick={handleSavePool} style={{ letterSpacing: "2px" }}>
                SAVE DISTRIBUTION
              </button>
            </div>
          </div>
        )}

        {/* ---- USERS ---- */}
        {section === "users" && (
          <div>
            <div className="dash-title" style={{ marginBottom: "24px" }}>
              USER <span>MANAGEMENT</span>
            </div>
            <div className="panel-box">
              <table className="ash-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    {["USERNAME","EMAIL","BURNS","STATUS","VIP","ACTIONS"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_USERS.map((u) => (
                    <tr key={u.username}>
                      <td style={{ fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "1px" }}>{u.username}</td>
                      <td style={{ fontSize: "10px", color: "var(--text-dim)" }}>{u.email}</td>
                      <td style={{ color: "var(--fire-orange)", fontFamily: "var(--font-display)" }}>{u.burns}</td>
                      <td>
                        <span style={{
                          fontSize: "9px",
                          letterSpacing: "1px",
                          padding: "2px 8px",
                          background: u.status === "ACTIVE" ? "rgba(39,174,96,0.1)" : "rgba(204,17,0,0.1)",
                          border: `1px solid ${u.status === "ACTIVE" ? "rgba(39,174,96,0.3)" : "rgba(204,17,0,0.3)"}`,
                          color: u.status === "ACTIVE" ? "var(--usdc-green)" : "var(--fire-red)",
                        }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ color: u.vip ? "var(--gold)" : "var(--text-dim)", fontFamily: "var(--font-display)", fontSize: "14px" }}>
                        {u.vip ? "YES" : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button className="btn-ghost btn" style={{ padding: "3px 10px", fontSize: "9px" }}>VIEW</button>
                          <button
                            className="btn-ghost btn"
                            style={{ padding: "3px 10px", fontSize: "9px", borderColor: "var(--fire-red)", color: "var(--fire-red)" }}
                          >
                            BAN
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- VIP ---- */}
        {section === "vip" && (
          <div>
            <div className="dash-title" style={{ marginBottom: "24px" }}>
              VIP <span>MANAGEMENT</span>
            </div>
            <div className="panel-box" style={{ maxWidth: "560px" }}>
              <div className="stat-grid" style={{ marginBottom: "24px" }}>
                <div className="stat-card">
                  <div className="stat-label">ACTIVE VIPS</div>
                  <div className="stat-value gold">891</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">VIP REVENUE</div>
                  <div className="stat-value usdc">$22,249</div>
                </div>
              </div>
              {[
                { label: "HOLY FIRE PRICE (USDC/MONTH)", val: 24.99, step: 0.01 },
                { label: "ACTIVE ASH PRICE (USDC/MONTH)", val: 9.99, step: 0.01 },
                { label: "SPARK PRICE (USDC/MONTH)", val: 4.99, step: 0.01 },
                { label: "HOLY FIRE WEIGHT BONUS", val: 0.50, step: 0.05 },
                { label: "HOLY FIRE ASH BONUS (%)", val: 20, step: 1 },
              ].map((f) => (
                <div key={f.label} className="form-group">
                  <label>{f.label}</label>
                  <input type="number" defaultValue={f.val} step={f.step} style={{ maxWidth: "200px" }} />
                </div>
              ))}
              <button className="btn-fire btn" style={{ letterSpacing: "2px" }}>SAVE VIP CONFIG</button>
            </div>
          </div>
        )}

        {/* ---- ASH TOKEN ---- */}
        {section === "ash" && (
          <div>
            <div className="dash-title" style={{ marginBottom: "24px" }}>
              ASH <span>TOKEN</span>
            </div>
            <div className="panel-box" style={{ maxWidth: "640px" }}>
              <div className="stat-grid" style={{ marginBottom: "24px" }}>
                <div className="stat-card">
                  <div className="stat-label">TOTAL SUPPLY</div>
                  <div className="stat-value ash">1B</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">DISTRIBUTED</div>
                  <div className="stat-value ash">142.5M</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">REMAINING</div>
                  <div className="stat-value ash">857.5M</div>
                </div>
              </div>
              {[
                { label: "REWARD MIN (ON LOSE)", val: 200 },
                { label: "REWARD MAX (ON LOSE)", val: 500 },
                { label: "BOOST COST (ASH)",     val: 1000 },
                { label: "BOOST DURATION (MIN)", val: 60   },
              ].map((f) => (
                <div key={f.label} className="form-group">
                  <label>{f.label}</label>
                  <input type="number" defaultValue={f.val} style={{ maxWidth: "200px" }} />
                </div>
              ))}
              <button className="btn-fire btn" style={{ letterSpacing: "2px" }}>SAVE ASH CONFIG</button>
            </div>
          </div>
        )}

        {/* ---- REFERRALS ---- */}
        {section === "referrals" && (
          <div>
            <div className="dash-title" style={{ marginBottom: "24px" }}>
              REFERRAL <span>SYSTEM</span>
            </div>
            <div className="panel-box" style={{ maxWidth: "560px" }}>
              {[
                { label: "COMMISSION RATE (%)", val: 10, step: 1 },
                { label: "MAX DAILY EARNINGS (USDC)", val: 1000, step: 10 },
              ].map((f) => (
                <div key={f.label} className="form-group">
                  <label>{f.label}</label>
                  <input type="number" defaultValue={f.val} step={f.step} style={{ maxWidth: "200px" }} />
                </div>
              ))}
              <div className="form-group">
                <label>REWARD SOURCE</label>
                <select style={{ maxWidth: "300px" }}>
                  <option>FROM REWARD POOL</option>
                  <option>FROM PROFIT POOL</option>
                </select>
              </div>
              <button className="btn-fire btn" style={{ letterSpacing: "2px" }}>SAVE REFERRAL CONFIG</button>
            </div>
          </div>
        )}

        {/* ---- AUDIT LOG ---- */}
        {section === "audit" && (
          <div>
            <div className="dash-title" style={{ marginBottom: "24px" }}>
              AUDIT <span>LOG</span>
            </div>
            <div className="panel-box">
              <table className="ash-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    {["TIME","ADMIN","ACTION","TYPE"].map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_AUDIT.map((log, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--text-dim)", fontSize: "10px", whiteSpace: "nowrap" }}>{log.time}</td>
                      <td style={{ fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "1px", color: "var(--fire-orange)" }}>
                        {log.admin}
                      </td>
                      <td style={{ fontSize: "11px" }}>{log.action}</td>
                      <td>
                        <span style={{
                          fontSize: "9px",
                          letterSpacing: "1px",
                          padding: "2px 8px",
                          background: "rgba(255,77,0,0.08)",
                          border: "1px solid rgba(255,77,0,0.15)",
                          color: "var(--fire-orange)",
                        }}>
                          {log.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

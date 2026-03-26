"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import dashStyles from "../dashboard/dashboard.module.css";
import styles from "./burn.module.css";

type BurnState = "idle" | "burning" | "result";
type ResultType = "win" | "lose";

interface BurnResult {
  type: ResultType;
  prize?: string;
  amount: string;
  message: string;
}

const presets = [
  { amount: 4.99, label: "Standard", weight: "1.0x Weight" },
  { amount: 10, label: "Double Down", weight: "2.5x Weight" },
  { amount: 50, label: "High Roller", weight: "15x Weight" },
];

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "🔥", label: "Burn Now", href: "/burn", active: true },
  { icon: "💳", label: "Wallet", href: "/wallet" },
  { icon: "👥", label: "Referrals", href: "/referrals" },
  { icon: "🏆", label: "Leaderboard", href: "/leaderboard" },
  { icon: "📜", label: "Transactions", href: "/transactions" },
];

const burnMessages = [
  "The fire reveals your fate...",
  "Feeding the flames...",
  "The VRF oracle speaks...",
  "Igniting the blockchain...",
];

const winMessages = [
  "The flames have blessed you! 🔥",
  "Fortune favors the bold burner!",
  "The ash reveals a prize! 🏆",
];

const loseMessages = [
  "The flames consumed your USDC, but left you ASH tokens as a gift.",
  "Not a prize this time, but the fire rewards patience with ASH.",
  "Every burn makes you stronger. ASH earned for your next attempt.",
];

export default function BurnPage() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [burnState, setBurnState] = useState<BurnState>("idle");
  const [result, setResult] = useState<BurnResult | null>(null);
  const [burningMessage, setBurningMessage] = useState("");

  const currentAmount = useCustom
    ? parseFloat(customAmount) || 0
    : presets[selectedPreset].amount;

  const calculateWeight = useCallback((amount: number) => {
    if (amount <= 0) return 0;
    return Math.floor(amount / 4.99);
  }, []);

  const weight = calculateWeight(currentAmount);

  const handleBurn = () => {
    if (currentAmount < 4.99) return;

    setBurnState("burning");
    setBurningMessage(burnMessages[Math.floor(Math.random() * burnMessages.length)]);

    // Simulate VRF delay (2-4 seconds)
    const delay = 2000 + Math.random() * 2000;

    setTimeout(() => {
      // Simulate a random result
      const roll = Math.random();
      let burnResult: BurnResult;

      if (roll < 0.01) {
        burnResult = {
          type: "win",
          prize: "🏆 Jackpot",
          amount: "2,500 USDC",
          message: winMessages[Math.floor(Math.random() * winMessages.length)],
        };
      } else if (roll < 0.04) {
        burnResult = {
          type: "win",
          prize: "🔥 Big Prize",
          amount: "500 USDC",
          message: winMessages[Math.floor(Math.random() * winMessages.length)],
        };
      } else if (roll < 0.12) {
        burnResult = {
          type: "win",
          prize: "✨ Medium Prize",
          amount: "200 USDC",
          message: winMessages[Math.floor(Math.random() * winMessages.length)],
        };
      } else if (roll < 0.20) {
        burnResult = {
          type: "win",
          prize: "💫 Small Prize",
          amount: "50 USDC",
          message: winMessages[Math.floor(Math.random() * winMessages.length)],
        };
      } else {
        const ashEarned = 200 + Math.floor(Math.random() * 300);
        burnResult = {
          type: "lose",
          amount: `${ashEarned} ASH`,
          message: loseMessages[Math.floor(Math.random() * loseMessages.length)],
        };
      }

      setResult(burnResult);
      setBurnState("result");
    }, delay);
  };

  const resetBurn = () => {
    setBurnState("idle");
    setResult(null);
  };

  return (
    <div className={styles["burn-page"]}>
      {/* ====== SIDEBAR ====== */}
      <aside className={styles["burn-sidebar"]}>
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

      {/* ====== MAIN ====== */}
      <main className={styles["burn-main"]}>
        <div className={styles["burn-content"]}>
          <h1 className={styles["burn-page-title"]}>
            🔥 Burn Now
          </h1>
          <p className={styles["burn-page-subtitle"]}>
            Choose your burn amount and test your luck. Every burn is verified on-chain via VRF.
          </p>

          {/* Burn Card */}
          <div className={`glass-card ${styles["burn-card"]}`}>
            {/* Amount Selection */}
            <p className={styles["burn-section-label"]}>Select Amount</p>
            <div className={styles["amount-presets"]}>
              {presets.map((preset, i) => (
                <button
                  key={i}
                  className={`${styles["preset-btn"]} ${!useCustom && selectedPreset === i ? styles.selected : ""}`}
                  onClick={() => { setSelectedPreset(i); setUseCustom(false); }}
                >
                  <span className={styles["preset-amount"]}>${preset.amount}</span>
                  <span className={styles["preset-label"]}>{preset.label}</span>
                  <span className={styles["preset-weight"]}>{preset.weight}</span>
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className={styles["custom-amount"]}>
              <label>Custom:</label>
              <input
                type="number"
                className={styles["custom-input"]}
                placeholder="Enter amount"
                min="4.99"
                step="0.01"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setUseCustom(true); }}
                onFocus={() => setUseCustom(true)}
              />
              <span>USDC</span>
            </div>

            {/* Luck Meter */}
            <div className={styles["luck-meter-section"]}>
              <p className={styles["burn-section-label"]}>Luck Meter</p>
              <div className={styles["luck-meter-header"]}>
                <span className={styles["luck-meter-label"]}>Win Probability</span>
                <span className={styles["luck-meter-value"]}>
                  {Math.min(20, weight * 1.5).toFixed(1)}%
                </span>
              </div>
              <div className={styles["luck-meter-bar"]}>
                <div
                  className={styles["luck-meter-fill"]}
                  style={{ width: `${Math.min(100, weight * 7.5)}%` }}
                />
              </div>
              <div className={styles["luck-info"]}>
                <span>Higher amounts = better odds</span>
                <span>VRF verified ✓</span>
              </div>
            </div>

            {/* Weight Breakdown */}
            <p className={styles["burn-section-label"]}>Weight Breakdown</p>
            <div className={styles["weight-breakdown"]}>
              <div className={styles["weight-item"]}>
                <span className={styles["weight-label"]}>Base Weight</span>
                <span className={styles["weight-val"]}>{weight}</span>
              </div>
              <div className={styles["weight-item"]}>
                <span className={styles["weight-label"]}>VIP Bonus</span>
                <span className={styles["weight-val"]}>+0.0</span>
              </div>
              <div className={styles["weight-item"]}>
                <span className={styles["weight-label"]}>ASH Boost</span>
                <span className={styles["weight-val"]}>+0.0</span>
              </div>
              <div className={styles["weight-item"]}>
                <span className={styles["weight-label"]}>Streak Bonus</span>
                <span className={styles["weight-val"]}>+0.0</span>
              </div>
            </div>

            <div className={styles["weight-total"]}>
              <span className={styles["total-label"]}>Total Weight</span>
              <span className={styles["total-val"]}>{weight}.0</span>
            </div>

            {/* Burn Button */}
            <div className={styles["burn-btn-container"]}>
              <button
                className={styles["burn-mega-btn"]}
                onClick={handleBurn}
                disabled={currentAmount < 4.99}
              >
                🔥 BURN {currentAmount >= 4.99 ? `$${currentAmount.toFixed(2)}` : ""} NOW
              </button>
            </div>

            <p className={styles["burn-disclaimer"]}>
              Balance: $1,245.50 USDC • Min burn: $4.99 USDC
            </p>
          </div>
        </div>
      </main>

      {/* ====== BURNING ANIMATION OVERLAY ====== */}
      {burnState === "burning" && (
        <div className={styles["burning-overlay"]}>
          <div className={styles["burning-animation"]}>🔥</div>
          <p className={styles["burning-text"]}>{burningMessage}</p>
          <p className={styles["burning-sub"]}>
            Verifying on Solana blockchain...
          </p>
        </div>
      )}

      {/* ====== RESULT OVERLAY ====== */}
      {burnState === "result" && result && (
        <div className={styles["result-overlay"]}>
          <div className={`glass-card ${styles["result-card"]}`}>
            <div className={styles["result-emoji"]}>
              {result.type === "win" ? "🏆" : "🌫️"}
            </div>
            <h2 className={`${styles["result-title"]} ${styles[result.type]}`}>
              {result.type === "win" ? `${result.prize}` : "Better Luck Next Time"}
            </h2>
            <div className={`${styles["result-amount"]} ${result.type === "win" ? styles["win-val"] : styles["ash-val"]}`}>
              {result.type === "win" ? `+${result.amount}` : `+${result.amount}`}
            </div>
            <p className={styles["result-message"]}>{result.message}</p>
            <div className={styles["result-actions"]}>
              <button className="btn btn-primary btn-lg" onClick={resetBurn}>
                🔥 Burn Again
              </button>
              <button className="btn btn-secondary btn-lg" onClick={resetBurn}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

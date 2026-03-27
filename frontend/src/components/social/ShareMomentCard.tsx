"use client";

import { useRef } from "react";
import styles from "./share.module.css";

interface ShareMomentProps {
  username: string;
  result: "WIN" | "LOSE";
  prizeTier?: string;
  prizeAmount?: number;
  ashReward?: number;
  burnAmount: number;
  weight: number;
}

export default function ShareMomentCard({
  username,
  result,
  prizeTier,
  prizeAmount,
  ashReward,
  burnAmount,
  weight,
}: ShareMomentProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const shareText = result === "WIN"
    ? `🔥 I just won $${prizeAmount} USDC (${prizeTier} prize) on @Ashnance! Burned $${burnAmount} with ${weight.toFixed(2)} weight. The fire gods are real! 🎉 #Ashnance #BurnToWin #Solana`
    : `🔥 I burned $${burnAmount} USDC on @Ashnance and earned ${ashReward} ASH tokens! Building my fire weight! 💪 #Ashnance #BurnToWin #ASHToken`;

  const shareUrl = "https://ashnance.io";

  const shareToX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
  };

  return (
    <div className={styles.shareSection}>
      {/* Share Card (screenshot-able) */}
      <div ref={cardRef} className={`${styles.shareCard} ${result === "WIN" ? styles.winCard : styles.loseCard}`}>
        <div className={styles.cardHeader}>
          <div className={styles.brandLogo}>🔥 Ashnance</div>
          <div className={styles.cardBadge}>
            {result === "WIN" ? "🏆 WINNER" : "🪙 ASH EARNED"}
          </div>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.playerName}>@{username}</div>
          {result === "WIN" ? (
            <>
              <div className={styles.prizeAmount}>${prizeAmount}</div>
              <div className={styles.prizeLabel}>{prizeTier} Prize 🎉</div>
            </>
          ) : (
            <>
              <div className={styles.ashAmount}>+{ashReward} ASH</div>
              <div className={styles.prizeLabel}>Tokens Earned 🪙</div>
            </>
          )}
          <div className={styles.burnDetails}>
            <span>Burned: ${burnAmount}</span>
            <span>Weight: {weight.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <span>ashnance.io</span>
          <span>Burn to Win on Solana</span>
        </div>
      </div>

      {/* Share Buttons */}
      <div className={styles.shareButtons}>
        <button className={styles.shareBtn} onClick={shareToX} style={{ background: "#1DA1F2" }}>
          𝕏 Share on X
        </button>
        <button className={styles.shareBtn} onClick={shareToTelegram} style={{ background: "#0088cc" }}>
          ✈️ Telegram
        </button>
        <button className={styles.shareBtn} onClick={copyLink} style={{ background: "var(--bg-surface-lowest)", color: "var(--text-primary)", border: "1px solid var(--outline-variant)" }}>
          📋 Copy
        </button>
      </div>
    </div>
  );
}

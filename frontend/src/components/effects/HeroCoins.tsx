"use client";

import styles from "./herocoins.module.css";

interface CoinConfig {
  currency: "USDC" | "SOL";
  size: number;
  top: string;
  left?: string;
  right?: string;
  opacity: number;
  bobAnimation: string;
  bobDuration: string;
  bobDelay: string;
  showOnMobile?: boolean;
}

const COINS: CoinConfig[] = [
  {
    currency: "USDC",
    size: 80,
    top: "15%",
    left: "6%",
    opacity: 0.78,
    bobAnimation: "heroBob0",
    bobDuration: "5.8s",
    bobDelay: "0s",
    showOnMobile: false,
  },
  {
    currency: "SOL",
    size: 60,
    top: "55%",
    left: "10%",
    opacity: 0.72,
    bobAnimation: "heroBob1",
    bobDuration: "7.2s",
    bobDelay: "-1.5s",
    showOnMobile: true,
  },
  {
    currency: "USDC",
    size: 100,
    top: "20%",
    right: "5%",
    opacity: 0.8,
    bobAnimation: "heroBob2",
    bobDuration: "6.5s",
    bobDelay: "-2.8s",
    showOnMobile: false,
  },
  {
    currency: "SOL",
    size: 70,
    top: "60%",
    right: "9%",
    opacity: 0.75,
    bobAnimation: "heroBob3",
    bobDuration: "8.1s",
    bobDelay: "-0.7s",
    showOnMobile: true,
  },
  {
    currency: "USDC",
    size: 90,
    top: "42%",
    left: "3%",
    opacity: 0.77,
    bobAnimation: "heroBob4",
    bobDuration: "6.9s",
    bobDelay: "-3.2s",
    showOnMobile: false,
  },
];

function SingleHeroCoin({ coin }: { coin: CoinConfig }) {
  const isUSDC = coin.currency === "USDC";
  const symbolChar = isUSDC ? "$" : "◎";
  const symbolSize = coin.size * 0.34;
  const labelSize = coin.size * 0.12;

  const posStyle: React.CSSProperties = {
    position: "absolute",
    top: coin.top,
    opacity: coin.opacity,
    ...(coin.left ? { left: coin.left } : {}),
    ...(coin.right ? { right: coin.right } : {}),
  };

  const bobAnimStyle: React.CSSProperties = {
    animationName: coin.bobAnimation,
    animationDuration: coin.bobDuration,
    animationDelay: coin.bobDelay,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  };

  const faceClass = isUSDC
    ? `${styles.heroCoinFace} ${styles.heroCoinUsdc} ${styles.heroCoinFire}`
    : `${styles.heroCoinFace} ${styles.heroCoinSol} ${styles.heroCoinFire}`;

  return (
    <div
      className={`${styles.heroCoin}${coin.showOnMobile ? " " + styles.heroCoinMobileShow : ""}`}
      style={posStyle}
    >
      {/* Bob animation wrapper */}
      <div
        className={styles.heroCoinInner}
        style={{
          width: coin.size,
          height: coin.size,
          ...bobAnimStyle,
        }}
      >
        {/* Only front face — lighter weight than CoinBurn3D */}
        <div className={faceClass}>
          <span
            className={styles.heroCoinSymbol}
            style={{ fontSize: symbolSize }}
          >
            {symbolChar}
          </span>
          <span
            className={styles.heroCoinLabel}
            style={{ fontSize: labelSize }}
          >
            {coin.currency}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HeroCoinsScene() {
  return (
    <div className={styles.heroCoinsScene} aria-hidden="true">
      {COINS.map((coin, i) => (
        <SingleHeroCoin key={i} coin={coin} />
      ))}
    </div>
  );
}

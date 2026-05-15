"use client";

import styles from "./herocoins.module.css";

interface FireballConfig {
  currency: "USDC" | "SOL";
  size: number;
  top: string;
  left?: string;
  right?: string;
  bobAnimation: string;
  bobDuration: string;
  bobDelay: string;
  flickerDelay: string;
  showOnMobile?: boolean;
}

const FIREBALLS: FireballConfig[] = [
  { currency: "USDC", size: 90,  top: "8%",  left: "5%",   bobAnimation: "heroBob0", bobDuration: "5.8s", bobDelay: "0s",    flickerDelay: "0s",    showOnMobile: false },
  { currency: "SOL",  size: 66,  top: "60%", left: "8%",   bobAnimation: "heroBob1", bobDuration: "7.2s", bobDelay: "-1.5s", flickerDelay: "-0.8s", showOnMobile: true  },
  { currency: "USDC", size: 100, top: "10%", right: "6%",  bobAnimation: "heroBob2", bobDuration: "6.5s", bobDelay: "-2.8s", flickerDelay: "-0.3s", showOnMobile: false },
  { currency: "SOL",  size: 74,  top: "62%", right: "5%",  bobAnimation: "heroBob3", bobDuration: "8.1s", bobDelay: "-0.7s", flickerDelay: "-1.2s", showOnMobile: true  },
  { currency: "USDC", size: 78,  top: "38%", left: "2%",   bobAnimation: "heroBob4", bobDuration: "6.9s", bobDelay: "-3.2s", flickerDelay: "-0.5s", showOnMobile: false },
];

function Fireball({ ball }: { ball: FireballConfig }) {
  const isUSDC = ball.currency === "USDC";
  const labelSize  = ball.size * 0.14;
  const symbolSize = ball.size * 0.36;

  const posStyle: React.CSSProperties = {
    position: "absolute",
    top: ball.top,
    ...(ball.left  ? { left: ball.left }   : {}),
    ...(ball.right ? { right: ball.right } : {}),
  };

  return (
    <div
      className={`${styles.fireballWrap}${ball.showOnMobile ? " " + styles.mobileShow : ""}`}
      style={posStyle}
    >
      {/* Float animation */}
      <div
        className={styles.fireballFloat}
        style={{
          width: ball.size,
          height: ball.size,
          animationName: ball.bobAnimation,
          animationDuration: ball.bobDuration,
          animationDelay: ball.bobDelay,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      >
        {/* Outer corona blur ring */}
        <div
          className={`${styles.corona} ${isUSDC ? styles.coronaUsdc : styles.coronaSol}`}
          style={{ animationDelay: ball.flickerDelay }}
        />

        {/* Main fireball sphere */}
        <div
          className={`${styles.fireball} ${isUSDC ? styles.fireballUsdc : styles.fireballSol}`}
          style={{ animationDelay: ball.flickerDelay }}
        >
          {/* Inner hot-core glow */}
          <div className={styles.fireCore} />

          {/* Surface turbulence layer */}
          <div
            className={styles.fireSurface}
            style={{ animationDelay: `calc(${ball.flickerDelay} - 0.2s)` }}
          />

          {/* Currency label — visible through the fire */}
          <div className={styles.fireLabel}>
            <span className={styles.fireSymbol} style={{ fontSize: symbolSize }}>
              {isUSDC ? "$" : "◎"}
            </span>
            <span className={styles.fireCurrency} style={{ fontSize: labelSize }}>
              {ball.currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroCoinsScene() {
  return (
    <div className={styles.heroCoinsScene} aria-hidden="true">
      {FIREBALLS.map((ball, i) => (
        <Fireball key={i} ball={ball} />
      ))}
    </div>
  );
}

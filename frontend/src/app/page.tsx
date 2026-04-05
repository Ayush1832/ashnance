"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

const tickerData = [
  { name: "Burner#7492",  action: "burned 10 USDC",          win: false },
  { name: "Burner#2831",  action: "won 250 USDC!",            win: true  },
  { name: "Burner#5614",  action: "earned 300 ASH",           win: false },
  { name: "Burner#9021",  action: "burned 50 USDC",           win: false },
  { name: "Burner#3357",  action: "won 2500 USDC! 💎 JACKPOT", win: true  },
  { name: "Burner#8803",  action: "earned 450 ASH",           win: false },
  { name: "Burner#1245",  action: "won 500 USDC!",            win: true  },
  { name: "Burner#6678",  action: "burned 4.99 USDC",         win: false },
  { name: "Burner#4492",  action: "won 200 USDC!",            win: true  },
  { name: "Burner#7736",  action: "earned 500 ASH",           win: false },
];

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) { router.replace("/dashboard"); return; }
    setReady(true);
  }, [router]);

  return (
    <>
      <div className="fire-bg" />

      {/* ========== NAV ========== */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          ASH<span>NANCE</span>
        </div>
        <div className={styles.navBtns}>
          <Link href="/login" className="btn btn-ghost">Login</Link>
          <Link href="/register" className="btn btn-fire">Sign Up</Link>
        </div>
      </nav>

      {/* ========== LIVE TICKER ========== */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {[...tickerData, ...tickerData, ...tickerData].map((item, i) => (
            <span key={i} className="ticker-item">
              <span className={item.win ? "win" : "ash-col"}>{item.name}</span>
              {" "}{item.action}
              <span className="ticker-dot">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ========== HERO ========== */}
      <section className={styles.hero}>
        <p className={styles.tagline}>🔥 Keep Burning, Keep Earning 🔥</p>
        <h1 className={styles.heroTitle}>
          BURN<br />
          <span className={styles.fireWord}>TO WIN</span>
        </h1>
        <p className={styles.heroSub}>
          Burn USDC for a chance to win massive prizes — or earn ASH Token from the ashes.
          Every burn counts.
        </p>
        <div className={styles.heroCta}>
          <Link href="/register" className="btn-mega">START BURNING →</Link>
        </div>
        <p className={styles.heroMeta}>
          Powered by Solana · Secured by VRF · 1B ASH Supply
        </p>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className={styles.howItWorks}>
        <h2 className="section-title">HOW IT <span>WORKS</span></h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>01</span>
            <div className={styles.stepIcon}>💵</div>
            <h3>Deposit USDC</h3>
            <p>Fund your internal wallet with USDC via your Solana wallet or unique deposit address.</p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>02</span>
            <div className={styles.stepIcon}>🔥</div>
            <h3>Click Burn Now</h3>
            <p>Choose your amount (from 4.99 USDC). More burns = higher weight = better chances.</p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>03</span>
            <div className={styles.stepIcon}>🏆</div>
            <h3>Win Prize or ASH</h3>
            <p>VRF-powered instant result. Win USDC prizes or collect ASH tokens from every burn.</p>
          </div>
        </div>
      </section>

      {/* ========== PRIZE TABLE ========== */}
      <section className={styles.prizeSection}>
        <h2 className="section-title">PRIZE <span>TABLE</span></h2>
        <div className={styles.prizeGrid}>
          <div className={`${styles.prizeCard} clip-card`}>
            <div className={styles.prizeIcon}>💎</div>
            <div className={styles.prizeName}>JACKPOT</div>
            <div className={`${styles.prizeVal} ${styles.gold}`}>2500 USDC</div>
            <div className={styles.prizeChance}>~0.5% CHANCE</div>
          </div>
          <div className={`${styles.prizeCard} clip-card`}>
            <div className={styles.prizeIcon}>🔥</div>
            <div className={styles.prizeName}>BIG PRIZE</div>
            <div className={styles.prizeVal}>500 USDC</div>
            <div className={styles.prizeChance}>~2% CHANCE</div>
          </div>
          <div className={`${styles.prizeCard} clip-card`}>
            <div className={styles.prizeIcon}>✨</div>
            <div className={styles.prizeName}>MEDIUM</div>
            <div className={styles.prizeVal}>200 USDC</div>
            <div className={styles.prizeChance}>~5% CHANCE</div>
          </div>
          <div className={`${styles.prizeCard} clip-card`}>
            <div className={styles.prizeIcon}>⚡</div>
            <div className={styles.prizeName}>SMALL</div>
            <div className={styles.prizeVal}>50 USDC</div>
            <div className={styles.prizeChance}>~10% CHANCE</div>
          </div>
        </div>
        <p className={styles.ashNote}>
          All other burns earn{" "}
          <span style={{ color: "var(--ash-token)" }}>200–500 ASH Tokens</span>
          {" "}— never a losing burn!
        </p>
      </section>

      {/* ========== FEATURES ========== */}
      <section className={styles.features}>
        <h2 className="section-title">WHY <span>ASHNANCE</span></h2>
        <div className={styles.featuresGrid}>
          <div className={`${styles.featureCard} clip-card`}>
            <div className={styles.featureIcon}>🎲</div>
            <div>
              <h3 className={styles.featureTitle}>Verifiable Randomness (VRF)</h3>
              <p className={styles.featureDesc}>Every result generated by Switchboard VRF on Solana. Fair, transparent, tamper-proof.</p>
            </div>
          </div>
          <div className={`${styles.featureCard} clip-card`}>
            <div className={styles.featureIcon}>🪙</div>
            <div>
              <h3 className={styles.featureTitle}>ASH Token Rewards</h3>
              <p className={styles.featureDesc}>Earn 200–500 ASH tokens on every loss. Use ASH for boosts, raffles, and future utility.</p>
            </div>
          </div>
          <div className={`${styles.featureCard} clip-card`}>
            <div className={styles.featureIcon}>👥</div>
            <div>
              <h3 className={styles.featureTitle}>Referral Rewards</h3>
              <p className={styles.featureDesc}>Earn 10% of every burn your referrals make. Instant, direct USDC — no waiting.</p>
            </div>
          </div>
          <div className={`${styles.featureCard} clip-card`}>
            <div className={styles.featureIcon}>👑</div>
            <div>
              <h3 className={styles.featureTitle}>Holy Fire VIP</h3>
              <p className={styles.featureDesc}>24.99 USDC/month. +0.5 Weight Bonus, +20% ASH on losses, weekly raffles, and more.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className={styles.ctaSection}>
        <Link href="/register" className="btn-mega">JOIN NOW — IT&apos;S FREE</Link>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <div className={styles.logo}>ASH<span>NANCE</span></div>
              <p>The Burn-to-Win platform on Solana. Every burn is a chance. Keep Burning, Keep Earning.</p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.footerCol}>
                <h4>Platform</h4>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/burn">Burn Now</Link>
                <Link href="/leaderboard">Leaderboards</Link>
                <Link href="/subscribe">Holy Fire VIP</Link>
              </div>
              <div className={styles.footerCol}>
                <h4>Account</h4>
                <Link href="/register">Sign Up</Link>
                <Link href="/login">Log In</Link>
                <Link href="/referrals">Referrals</Link>
                <Link href="/settings">Settings</Link>
              </div>
              <div className={styles.footerCol}>
                <h4>Community</h4>
                <a href="#">Telegram</a>
                <a href="#">X (Twitter)</a>
                <a href="#">Discord</a>
                <a href="#">TikTok</a>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© 2026 Ashnance. All rights reserved.</span>
            <div className={styles.footerSocials}>
              <a href="#" aria-label="Telegram">✈️</a>
              <a href="#" aria-label="X">𝕏</a>
              <a href="#" aria-label="Discord">💬</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

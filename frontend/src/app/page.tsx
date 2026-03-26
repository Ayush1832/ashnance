"use client";

import styles from "./page.module.css";

const tickerData = [
  { icon: "🔥", name: "Ahmed", action: "burned", amount: "10 USDC", type: "burn" as const },
  { icon: "🏆", name: "Sarah", action: "won", amount: "250 USDC", type: "win" as const },
  { icon: "💫", name: "John", action: "earned", amount: "300 ASH", type: "ash" as const },
  { icon: "🔥", name: "Omar", action: "burned", amount: "50 USDC", type: "burn" as const },
  { icon: "🏆", name: "Fatima", action: "won", amount: "500 USDC", type: "win" as const },
  { icon: "💫", name: "Carlos", action: "earned", amount: "450 ASH", type: "ash" as const },
  { icon: "🔥", name: "Aisha", action: "burned", amount: "100 USDC", type: "burn" as const },
  { icon: "🏆", name: "Alex", action: "won", amount: "2500 USDC", type: "win" as const },
  { icon: "💫", name: "Mia", action: "earned", amount: "200 ASH", type: "ash" as const },
  { icon: "🔥", name: "Raj", action: "burned", amount: "25 USDC", type: "burn" as const },
  { icon: "🏆", name: "Luna", action: "won", amount: "50 USDC", type: "win" as const },
  { icon: "💫", name: "Wei", action: "earned", amount: "500 ASH", type: "ash" as const },
];

export default function LandingPage() {
  return (
    <>
      {/* ========== HEADER ========== */}
      <header className={styles.header}>
        <div className={styles["header-inner"]}>
          <a href="/" className={styles.logo}>
            <div className={styles["logo-icon"]}>🔥</div>
            <span>Ashnance</span>
          </a>

          <nav className={styles["nav-links"]}>
            <a href="#how-it-works" className={styles["nav-link"]}>How It Works</a>
            <a href="#prizes" className={styles["nav-link"]}>Prizes</a>
            <a href="#features" className={styles["nav-link"]}>Features</a>
          </nav>

          <div className={styles["header-actions"]}>
            <button className="btn btn-secondary btn-sm">Log In</button>
            <button className="btn btn-primary btn-sm">Sign Up</button>
          </div>
        </div>
      </header>

      {/* ========== HERO SECTION ========== */}
      <section className={styles.hero}>
        <div className={styles["hero-bg"]}></div>

        {/* Fire Particles */}
        <div className={styles.particles}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.particle}></div>
          ))}
        </div>

        <div className={styles["hero-content"]}>
          <div className={styles["hero-badge"]}>
            🔥 Built on Solana • Powered by VRF
          </div>

          <h1 className={styles["hero-title"]}>
            Keep <span className={styles.highlight}>Burning</span>,<br />
            Keep <span className={styles.highlight}>Earning</span>
          </h1>

          <p className={styles["hero-subtitle"]}>
            Burn 4.99 USDC → Win a grand prize or get ASH Token.
            Every burn is an instant, verifiable chance to win big on the Solana blockchain.
          </p>

          <div className={styles["hero-cta-group"]}>
            <button className={styles["btn-burn"]}>
              🔥 Start Burning
            </button>
            <button className="btn btn-secondary btn-lg">
              Learn More →
            </button>
          </div>

          <div className={styles["hero-stats"]}>
            <div className={styles["hero-stat"]}>
              <div className={styles["hero-stat-value"]}>$2.4M</div>
              <div className={styles["hero-stat-label"]}>Total Burned</div>
            </div>
            <div className={styles["hero-stat"]}>
              <div className={styles["hero-stat-value"]}>$890K</div>
              <div className={styles["hero-stat-label"]}>Prizes Won</div>
            </div>
            <div className={styles["hero-stat"]}>
              <div className={styles["hero-stat-value"]}>15.2K</div>
              <div className={styles["hero-stat-label"]}>Active Burners</div>
            </div>
            <div className={styles["hero-stat"]}>
              <div className={styles["hero-stat-value"]}>142M</div>
              <div className={styles["hero-stat-label"]}>ASH Distributed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== LIVE TICKER ========== */}
      <section className={styles["ticker-section"]}>
        <div className={styles["ticker-track"]}>
          {[...tickerData, ...tickerData].map((item, i) => (
            <div key={i} className={styles["ticker-item"]}>
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.name}>{item.name}</span>
              <span>{item.action}</span>
              <span
                className={
                  item.type === "win"
                    ? styles["amount-win"]
                    : item.type === "burn"
                    ? styles["amount-burn"]
                    : styles["amount-ash"]
                }
              >
                {item.amount}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className={styles["how-it-works"]}>
        <div className="container">
          <p className={styles["section-label"]}>Simple Process</p>
          <h2 className={styles["section-title"]}>How It Works</h2>
          <p className={styles["section-subtitle"]}>
            Three simple steps to start your burning journey. Every burn is instant, transparent, and recorded on the blockchain.
          </p>

          <div className={styles["steps-grid"]}>
            <div className={`glass-card ${styles["step-card"]}`}>
              <span className={styles["step-number"]}>01</span>
              <div className={styles["step-icon"]}>💳</div>
              <h3 className={styles["step-title"]}>Deposit USDC</h3>
              <p className={styles["step-desc"]}>
                Connect your Solana wallet or use your unique deposit address. Fund your account with USDC to get started.
              </p>
            </div>

            <div className={`glass-card ${styles["step-card"]}`}>
              <span className={styles["step-number"]}>02</span>
              <div className={styles["step-icon"]}>🔥</div>
              <h3 className={styles["step-title"]}>Click Burn Now</h3>
              <p className={styles["step-desc"]}>
                Choose your amount (4.99 / 10 / 50 USDC or custom). Higher burns = higher chances with the Weight system.
              </p>
            </div>

            <div className={`glass-card ${styles["step-card"]}`}>
              <span className={styles["step-number"]}>03</span>
              <div className={styles["step-icon"]}>🏆</div>
              <h3 className={styles["step-title"]}>Win or Earn ASH</h3>
              <p className={styles["step-desc"]}>
                Win instant USDC prizes up to 2,500 USDC or earn ASH tokens. Either way, you always get something back.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PRIZES ========== */}
      <section id="prizes" className={styles.prizes}>
        <div className="container">
          <p className={styles["section-label"]}>Win Big</p>
          <h2 className={styles["section-title"]}>Prize Table</h2>
          <p className={styles["section-subtitle"]}>
            Every burn is a chance to hit one of these prize tiers. Prizes are funded from the Reward Pool and verified on-chain.
          </p>

          <div className={styles["prizes-grid"]}>
            <div className={`glass-card ${styles["prize-card"]} ${styles.jackpot}`}>
              <div className={styles["prize-emoji"]}>👑</div>
              <div className={styles["prize-name"]}>Jackpot</div>
              <div className={`${styles["prize-value"]} ${styles.gold}`}>2,500 USDC</div>
              <div className={styles["prize-chance"]}>1% of wins</div>
            </div>

            <div className={`glass-card ${styles["prize-card"]}`}>
              <div className={styles["prize-emoji"]}>🔥</div>
              <div className={styles["prize-name"]}>Big Prize</div>
              <div className={`${styles["prize-value"]} ${styles.fire}`}>500 USDC</div>
              <div className={styles["prize-chance"]}>4% of wins</div>
            </div>

            <div className={`glass-card ${styles["prize-card"]}`}>
              <div className={styles["prize-emoji"]}>✨</div>
              <div className={styles["prize-name"]}>Medium Prize</div>
              <div className={`${styles["prize-value"]} ${styles.fire}`}>200 USDC</div>
              <div className={styles["prize-chance"]}>15% of wins</div>
            </div>

            <div className={`glass-card ${styles["prize-card"]}`}>
              <div className={styles["prize-emoji"]}>💫</div>
              <div className={styles["prize-name"]}>Small Prize</div>
              <div className={`${styles["prize-value"]} ${styles.fire}`}>50 USDC</div>
              <div className={styles["prize-chance"]}>80% of wins</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className={styles.features}>
        <div className="container">
          <p className={styles["section-label"]}>Platform Features</p>
          <h2 className={styles["section-title"]}>Why Ashnance?</h2>
          <p className={styles["section-subtitle"]}>
            A next-generation gamified crypto platform built for transparency, excitement, and real rewards.
          </p>

          <div className={styles["features-grid"]}>
            <div className={`glass-card ${styles["feature-card"]}`}>
              <div className={`${styles["feature-icon"]} ${styles.fire}`}>🎲</div>
              <div>
                <h3 className={styles["feature-title"]}>Verifiable Random Function</h3>
                <p className={styles["feature-desc"]}>
                  Every result is generated using Switchboard VRF on Solana. Fair, transparent, and tamper-proof.
                </p>
              </div>
            </div>

            <div className={`glass-card ${styles["feature-card"]}`}>
              <div className={`${styles["feature-icon"]} ${styles.gold}`}>🪙</div>
              <div>
                <h3 className={styles["feature-title"]}>ASH Token Rewards</h3>
                <p className={styles["feature-desc"]}>
                  Even when you don&apos;t win, you earn 200–500 ASH tokens. Build your balance for boosts, raffles, and trading.
                </p>
              </div>
            </div>

            <div className={`glass-card ${styles["feature-card"]}`}>
              <div className={`${styles["feature-icon"]} ${styles.green}`}>👥</div>
              <div>
                <h3 className={styles["feature-title"]}>Referral Rewards</h3>
                <p className={styles["feature-desc"]}>
                  Earn 10% of every burn your referrals make. Instant, direct USDC rewards straight to your balance.
                </p>
              </div>
            </div>

            <div className={`glass-card ${styles["feature-card"]}`}>
              <div className={`${styles["feature-icon"]} ${styles.purple}`}>🔥</div>
              <div>
                <h3 className={styles["feature-title"]}>Holy Fire VIP</h3>
                <p className={styles["feature-desc"]}>
                  Subscribe for 24.99 USDC/month. Get +0.5 Weight Bonus, +20% ASH on losses, exclusive weekly raffles, and more.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className={styles["cta-section"]}>
        <div className={`container ${styles["cta-content"]}`}>
          <h2 className={styles["cta-title"]}>
            Ready to <span className="text-gradient-fire">Ignite Your Fortune</span>?
          </h2>
          <p className={styles["cta-desc"]}>
            Join thousands of burners on the Solana blockchain. Your next burn could be the one that changes everything.
          </p>
          <button className={styles["btn-burn"]}>
            🔥 Start Burning Now
          </button>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles["footer-inner"]}>
            <div className={styles["footer-brand"]}>
              <div className={styles.logo}>
                <div className={styles["logo-icon"]}>🔥</div>
                <span>Ashnance</span>
              </div>
              <p>
                The ultimate Burn to Win platform on Solana. Burn USDC, win prizes, earn ASH tokens. Keep Burning, Keep Earning.
              </p>
            </div>

            <div className={styles["footer-links"]}>
              <div className={styles["footer-col"]}>
                <h4>Platform</h4>
                <a href="#">Dashboard</a>
                <a href="#">Burn Now</a>
                <a href="#">Leaderboards</a>
                <a href="#">Holy Fire VIP</a>
              </div>
              <div className={styles["footer-col"]}>
                <h4>Resources</h4>
                <a href="#">Documentation</a>
                <a href="#">Tokenomics</a>
                <a href="#">Roadmap</a>
                <a href="#">FAQ</a>
              </div>
              <div className={styles["footer-col"]}>
                <h4>Community</h4>
                <a href="#">Telegram</a>
                <a href="#">X (Twitter)</a>
                <a href="#">Discord</a>
                <a href="#">TikTok</a>
              </div>
            </div>
          </div>

          <div className={styles["footer-bottom"]}>
            <span>© 2026 Ashnance. All rights reserved.</span>
            <div className={styles["footer-socials"]}>
              <a href="#" aria-label="Telegram">✈️</a>
              <a href="#" aria-label="X / Twitter">𝕏</a>
              <a href="#" aria-label="Discord">💬</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

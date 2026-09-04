"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LandingNav } from "@/components/ashnance/LandingNav";
import { Footer } from "@/components/landing/Footer";
import { GlassCard, SectionHeader } from "@/components/ashnance/primitives";
import { Flame, ArrowRight } from "lucide-react";

const SECTIONS = [
  { id: "abstract", title: "Abstract" },
  { id: "problem", title: "The Problem" },
  { id: "global-pool", title: "Global Pool Mechanics" },
  { id: "ash-token", title: "The ASH Token" },
  { id: "vip", title: "Holy Fire VIP" },
  { id: "creator-pools", title: "Creator Prize Pools" },
  { id: "battle-system", title: "The Battle System" },
  { id: "economics", title: "Platform Economics" },
  { id: "security", title: "Security & Trust" },
  { id: "roadmap", title: "Roadmap" },
  { id: "disclaimer", title: "Disclaimer" },
];

export default function WhitepaperPage() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="relative overflow-x-clip">
      <LandingNav />

      <div className="mx-auto max-w-6xl px-5 pb-24 pt-32 md:pt-40">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <Flame className="size-3.5 text-fire" />
            Whitepaper &middot; v1.0
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
            The Ashnance Protocol
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            A competitive, transparent, burn-to-win economy built on Solana. This document
            describes how the Global Pool, the ASH reward token, Holy Fire VIP, and Creator
            Prize Pools work together as one system.
          </p>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-1">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Contents
              </div>
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active === s.id
                      ? "bg-fire/10 font-medium text-fire"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.title}
                </a>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 space-y-16">
            <Section id="abstract" title="Abstract">
              <p>
                Ashnance is a competitive USDC burn-to-win platform on Solana. Users deposit
                USDC and burn it into a shared prize pool, permanently converting spend into
                <strong className="text-foreground"> weight</strong> &mdash; a leaderboard
                score. When the pool fills to its target, the participant holding the #1
                position wins the entire pool. Every burn also mints{" "}
                <strong className="text-foreground">ASH</strong>, a utility token that boosts
                future burns, unlocks VIP tiers, and can be staked.
              </p>
              <p>
                Beyond the single platform-wide Global Pool, verified creators can launch their
                own branded prize pools where followers compete using an ASH-funded strategic
                layer called the Battle System &mdash; attacking, shielding, and countering to
                fight for leaderboard position in real time.
              </p>
            </Section>

            <Section id="problem" title="The Problem">
              <p>
                Most &ldquo;burn&rdquo; and lottery-style crypto products are opaque: odds are
                unverifiable, payouts are delayed, and there is no meaningful skill or strategy
                involved. Meanwhile, creators and influencers who want to run engagement
                campaigns with their communities have no primitive that lets them own a prize
                pool, earn revenue from it, and give their audience an active, competitive
                experience rather than a passive raffle.
              </p>
              <p>Ashnance addresses both gaps with two purpose-built systems:</p>
              <ul>
                <li>
                  A single, platform-wide <strong className="text-foreground">Global Pool</strong>{" "}
                  with transparent, on-chain-settled payouts and a live leaderboard.
                </li>
                <li>
                  Self-contained <strong className="text-foreground">Creator Prize Pools</strong>{" "}
                  with a strategic weight-battle layer, so competition &mdash; not luck &mdash;
                  decides the outcome.
                </li>
              </ul>
            </Section>

            <Section id="global-pool" title="Global Pool Mechanics">
              <p>
                The Global Pool runs in <strong className="text-foreground">rounds</strong>.
                Each round has a target prize pool value; once the pool reaches that target,
                the round settles and pays out to the participant holding the #1 weight
                position.
              </p>
              <ol>
                <li>User deposits USDC to their Ashnance wallet address (Solana, USDC mint).</li>
                <li>
                  User burns USDC into the active round. Each burn splits, by default,
                  40% into the round&rsquo;s prize pool, 40% into platform revenue, and 20%
                  into a dedicated referral budget &mdash; all three splits are configurable
                  platform parameters.
                </li>
                <li>
                  The burned amount converts into <strong className="text-foreground">weight</strong>{" "}
                  on the round leaderboard, not a 1:1 mapping of dollars burned: weight scales
                  with the USDC amount, with additive bonuses for active Holy Fire VIP status,
                  active referrals (capped at 40% of total weight), and an active ASH boost.
                  Total weight is capped, with diminishing (square-root) returns above the cap,
                  so a single large burn can&rsquo;t linearly dominate the leaderboard.
                </li>
                <li>
                  Each burn also mints ASH, scaled by the amount burned and a platform-wide
                  emission multiplier that halves at fixed emission milestones &mdash; so ASH
                  issuance becomes scarcer as more of it is emitted over time.
                </li>
                <li>
                  When the prize pool reaches its target, the round settles: an anti-snipe rule
                  requires the leading participant to have held #1 for a minimum hold time
                  first, and an anti-domination rule skips a participant who also won the
                  immediately preceding round in favor of the next-highest participant. The
                  winner receives the round&rsquo;s current pool value, capped at 70% of the
                  platform&rsquo;s total reward-pool balance as a safety limit.
                </li>
                <li>
                  After settlement, the winner&rsquo;s weight resets to zero and every other
                  participant&rsquo;s weight decays by 10%, carrying a portion of standing into
                  the next round rather than wiping the board entirely. A new round then opens.
                </li>
              </ol>
              <p>
                All burns, round transitions, and payouts are recorded and visible on the
                public leaderboard and live burn feed in real time via WebSocket events.
              </p>
            </Section>

            <Section id="ash-token" title="The ASH Token">
              <p>
                ASH is Ashnance&rsquo;s in-platform utility token, earned automatically on every
                burn. It is not a speculative asset traded on an open market &mdash; it is a
                utility layer that makes the platform more rewarding to engage with over time.
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Boosting</strong> &mdash; ASH can be spent
                  to activate a temporary weight bonus applied to burns for one hour.
                </li>
                <li>
                  <strong className="text-foreground">Staking</strong> &mdash; ASH will be
                  lockable into a staking pool for a fixed term at a fixed APY, rewarding
                  long-term holders over short-term spenders. Arriving in Phase 2.
                </li>
                <li>
                  <strong className="text-foreground">Battle actions</strong> &mdash; in Creator
                  Prize Pools, ASH funds attack, shield, counter, boost, and recovery actions
                  (see the Battle System below).
                </li>
              </ul>
            </Section>

            <Section id="vip" title="Holy Fire VIP">
              <p>
                Holy Fire is Ashnance&rsquo;s VIP membership, purchased with USDC on a 30-day
                subscription. While active, it applies a flat weight bonus to every burn, a 20%
                bonus on ASH earned per burn, and raffle entry. VIP status is account-level and
                applies across both the Global Pool and any Creator Prize Pool the user
                participates in.
              </p>
            </Section>

            <Section id="creator-pools" title="Creator Prize Pools">
              <p>
                Creator Prize Pools are a fully isolated second core feature. Verified creators
                launch their own branded pool; their followers contribute USDC into that pool
                only; the creator earns a configurable revenue percentage automatically on
                every contribution.
              </p>
              <p>
                Each pool is a self-contained campaign with its own lifecycle &mdash;{" "}
                <span className="font-mono text-sm text-fire">
                  DRAFT &rarr; ACTIVE &rlarr; PAUSED &rarr; ENDED &rarr; ARCHIVED
                </span>{" "}
                &mdash; and can be frozen by an admin if needed. New pools go live automatically
                once a creator is verified; no per-pool approval is required.
              </p>
              <p>
                Every contribution to a pool is split three ways in a single transaction:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Prize allocation</strong> &mdash; added to
                  the pool and to the contributor&rsquo;s weight.
                </li>
                <li>
                  <strong className="text-foreground">Creator revenue</strong> &mdash; paid to
                  the creator&rsquo;s wallet, withdrawable on request.
                </li>
                <li>
                  <strong className="text-foreground">Platform fee</strong> &mdash; routed to
                  Ashnance&rsquo;s treasury.
                </li>
              </ul>
              <p>
                When a pool ends, its full current value is paid out to the top participants by
                weight, proportional to their share &mdash; logged on-chain as a settlement
                transaction. Creators may also configure multiple winners per pool.
              </p>
            </Section>

            <Section id="battle-system" title="The Battle System">
              <p>
                Creator Prize Pools introduce a strategic layer not present in the Global Pool:
                weight is not just earned from contributions, it can be fought over mid-round
                using ASH the participant already holds.
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Attack</strong> &mdash; spend ASH to
                  reduce a rival&rsquo;s weight. Damage scales with the square root of ASH
                  spent and is capped at 5% of the defender&rsquo;s current weight per hit.
                </li>
                <li>
                  <strong className="text-foreground">Shield</strong> &mdash; absorbs 50% of
                  incoming attack damage for one hour.
                </li>
                <li>
                  <strong className="text-foreground">Counter</strong> &mdash; within five
                  minutes of being attacked, reflect 50% of the damage back on the attacker
                  while healing half of it.
                </li>
                <li>
                  <strong className="text-foreground">Boost</strong> &mdash; spend ASH for a
                  direct weight increase, limited to once per hour.
                </li>
                <li>
                  <strong className="text-foreground">Recovery</strong> &mdash; restore 50% of
                  weight lost since the last recovery, with diminishing returns on repeated use.
                </li>
              </ul>
              <p>
                Repeated attacks against the same target within 24 hours have their effect
                halved each time, floored at 10% of the base effect &mdash; discouraging
                farming a single weaker opponent. Every action is written as an immutable,
                publicly auditable event, and rate limits (a cooldown between any two actions,
                plus a longer boost-specific cooldown) keep the system fair under load.
              </p>
              <p>
                Battle actions never touch the Global Pool&rsquo;s reward math &mdash; they are
                an isolated, additive use for ASH that only applies inside Creator Prize Pools.
              </p>
            </Section>

            <Section id="economics" title="Platform Economics">
              <p>
                Ashnance&rsquo;s revenue comes from a platform-fee cut on every contribution:
                by default 40% of each Global Pool burn, and a configurable percentage of each
                Creator Prize Pool contribution. Platform-fee proceeds route into a shared
                treasury pool with a dual-approval owner withdrawal process, so no single party
                can unilaterally move treasury funds.
              </p>
              <p>
                Creator Prize Pools are economically additive: creator revenue is paid directly
                to creators from their own pool&rsquo;s contributions, and does not draw from
                or affect the Global Pool&rsquo;s reward pool in any way.
              </p>
            </Section>

            <Section id="security" title="Security & Trust">
              <ul>
                <li>
                  All USDC transfers settle on Solana; deposit and withdrawal addresses are
                  unique per user and verifiable on-chain.
                </li>
                <li>
                  Withdrawals follow a reserve-before-send pattern and are never auto-retried
                  against an unconfirmed transaction, preventing double-sends.
                </li>
                <li>
                  Owner-level treasury withdrawals require dual approval from two separate
                  wallets.
                </li>
                <li>
                  Every burn, contribution, battle action, and payout is logged as an immutable
                  record and reflected on public, real-time leaderboards and feeds.
                </li>
                <li>
                  Global Pool and Creator Prize Pool systems are fully isolated at the data
                  model and service level, so an issue in one cannot cascade into the other.
                </li>
              </ul>
            </Section>

            <Section id="roadmap" title="Roadmap">
              <p>
                Ashnance ships iteratively. Recent milestones include the Creator Prize Pools
                system and its weight-based Battle System. Ongoing priorities are deepening VIP
                utility, expanding staking options, and growing creator tooling &mdash;
                analytics, richer withdrawal flows, and additional battle actions &mdash;
                based on real usage.
              </p>
            </Section>

            <Section id="disclaimer" title="Disclaimer">
              <p className="text-sm text-muted-foreground">
                This document is for informational purposes only and does not constitute
                financial advice or an offer to sell securities. USDC burns are final and
                non-refundable. Participation involves risk, including the risk of losing the
                full amount burned. ASH is a utility token for use within the Ashnance platform
                and is not designed as an investment vehicle. Nothing in this document
                guarantees any return, prize, or outcome. Always review current terms before
                participating.
              </p>
            </Section>

            <div className="flex flex-col items-center gap-4 border-t border-border pt-12 text-center sm:flex-row sm:justify-between sm:text-left">
              <p className="text-sm text-muted-foreground">
                Ready to see it in action?
              </p>
              <Link
                href="/register"
                className="group inline-flex items-center gap-1.5 rounded-full bg-fire px-5 py-2.5 text-sm font-semibold text-background transition-shadow duration-300 hover:glow-fire"
              >
                Start burning
                <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <SectionHeader title={title} />
      <GlassCard className="space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </GlassCard>
    </section>
  );
}

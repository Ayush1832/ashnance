# Ashnance — Complete System Mechanics

> Everything you need to understand: how money flows in, how pools work, how rounds work,
> how the winner is decided, and how the platform generates profit.
>
> Last updated: April 2026 — round-based system with 11 balance requirements.

---

## 1. Big Picture — The Flow in One Paragraph

A user deposits real USDC on-chain into their personal deposit address. The platform
detects it and credits their in-app wallet. They spend that USDC to "burn" (play). Each
burn splits 50/50 into two pools. The reward-pool share is added to the current **round's
prize pool**. Every burn also gives the user **weight** (their round leaderboard rank)
and **ASH tokens** as a reward. When the round's prize pool hits its target amount, the
user who has accumulated the most weight **during that round** wins the entire pool.
The other 50% sits in the Profit Pool for the owners to withdraw via two-signature process.

---

## 2. Deposits — How Money Gets In

```
User Solana Wallet
        │
        │  sends USDC on-chain
        ▼
User's Deposit Address  ◄── unique per user, generated at account creation
        │
        │  DepositMonitorService polls on-chain every 15 seconds
        ▼
WalletService.processDeposit()
        │
        │  credits usdcBalance in DB
        │  logs a DEPOSIT transaction
        ▼
BlockchainService.sweepDepositToMaster()
        │
        │  moves USDC from deposit address → Master Wallet
        ▼
Master Wallet  ◄── single hot wallet that pays all prizes
```

**Key points:**

- Each user gets a unique deposit address so the system knows whose payment it is.
- After crediting, the USDC is immediately swept to the master wallet. User balances are
  tracked in the database; the master wallet holds all the actual USDC.
- Duplicate detection is built in — the same `txHash` cannot be processed twice.
- **Alternative:** Users can also provide a tx hash manually via the deposit modal on the
  wallet page (`POST /api/wallet/deposit`).

---

## 3. The Two Pools — Where Every Burn Dollar Goes

When a user burns $10, the system immediately splits it:

```
$10 USDC burned
├── $5.00 → Reward Pool   (50%, configurable via reward_pool_split)
│           └── also tracked as this round's currentPool
└── $5.00 → Profit Pool   (50%, configurable via profit_pool_split)
```

These ratios are set in `PlatformConfig` by the owner. They must always add up to 1.0.

### Reward Pool

- Funds all round prize payouts to winners.
- Also funds referral commissions (deducted from the reward pool share).
- Prize payout is capped by the **prize safety limit** (see §5 — Balance Requirements).

### Profit Pool

- Pure platform profit — no automatic payouts from here.
- Owners can withdraw it at any time via the two-signature process (see §11).

---

## 4. The Burn — How Burns Work

### Step 1: Calculate Weight

Weight determines your round leaderboard ranking. More weight = higher rank = closer to winning.

```
baseWeight    = burnAmount ÷ base_unit (4.99)
              = $10 ÷ $4.99 ≈ 2.00

vipBonus      = +0.50 if Holy Fire VIP is active
boostBonus    = +0.50 if your 1-hour ASH boost is currently active

rawReferralBonus  = +0.20 per every 5 active referrals you made
referralCapLimit  = (referralCapPct ÷ (1 - referralCapPct)) × (baseWeight + vipBonus + boostBonus)
referralBonus     = min(rawReferralBonus, referralCapLimit)  ← capped at 40% of total (req #4)

rawTotalWeight = baseWeight + vipBonus + referralBonus + boostBonus

finalWeight = rawTotalWeight              if rawTotalWeight ≤ weightCap (300)
            = weightCap + √(rawTotalWeight - weightCap)  otherwise (req #3 — diminishing returns)
```

**Note:** `base_unit` is always **$4.99** (the weight reference unit, never changes).
`min_burn_amount` is **$5.00** (the minimum you can burn per the round-based entry fee).

**Example:** Burn $10, Holy Fire VIP active, 5 referrals, boost active:
```
nonReferralWeight = 2.00 + 0.50 + 0.50 = 3.00
referralCapLimit  = (0.40 / 0.60) × 3.00 = 2.00
rawReferralBonus  = 0.20  (well below cap)
referralBonus     = 0.20
rawTotalWeight    = 3.00 + 0.20 = 3.20  (well below 300 cap)
finalWeight       = 3.20
```

### Step 2: Update Cumulative Weight

```
user.wallet.cumulativeWeight += finalWeight
```

The cumulative weight is **persistent across rounds** — it carries history from all past
burns but is partially reset after each round (see §5 — Balance Requirements, req #1 and #2).

The **round leaderboard** is based on the sum of `burn.finalWeight` for all burns within
the current round. Each new round starts a fresh competition.

### Step 3: ASH Reward (Always Earned)

Every burn earns ASH tokens — there is no per-burn random win/lose:

```
ashReward = floor(burnAmount × ashRewardPercent ÷ ashTokenPrice)
          = floor($5.00 × 1.0 ÷ $0.01) = 500 ASH   (burning $5)
          = floor($10   × 1.0 ÷ $0.01) = 1,000 ASH (burning $10)
```

**Holy Fire VIP bonus:** +20% extra ASH on every burn.

### Step 4: Round Pool Contribution

The reward pool share from this burn (50% of burnAmount) is added to the active round's
`currentPool`. If `currentPool >= prizePoolTarget`, the round ends immediately.

---

## 5. The Round — Competitive Prize Mechanic

### How Rounds Work

```
Owner starts a new round with a target (e.g. $500) and optional time limit (e.g. 24h)
        │
        │  Round is ACTIVE — users burn to:
        │    1. Add to the prize pool (reward split)
        │    2. Accumulate per-round weight (leaderboard rank)
        │    3. Earn ASH tokens
        ▼
Prize pool grows with every burn
        │
        │  Round ends when:
        │    (a) currentPool >= prizePoolTarget  (pool target hit), OR
        │    (b) endsAt timestamp passes         (time limit expired — auto-checked every 60s)
        ▼
RoundService.endRound() fires
        │
        │  Winner = user ranked #1 by per-round weight (see below for eligibility rules)
        ▼
Winner receives the prize amount in USDC
Round status = COMPLETED
```

### Balance Requirements (all active in production)

#### req #1 — Soft Reset
After each round, ALL non-winners' `cumulativeWeight` is multiplied by 0.90. Long-term
advantage is reduced without wiping the history. Implemented via raw SQL inside the
endRound transaction.

#### req #2 — Winner Reset
The winner's `cumulativeWeight` is set to 0. They start the next round with no advantage.

#### req #3 — Weight Cap (300) with Diminishing Returns
`finalWeight = cap + √(rawWeight − cap)` above 300. Prevents extreme weight concentration.
Config key: `weight_cap` (default 300).

#### req #4 — Referral Weight Limit (40%)
Referral bonus cannot exceed 40% of total weight. Formula:
`maxReferralBonus = (0.40 / 0.60) × nonReferralWeight`.
Config key: `referral_weight_cap_pct` (default 0.40).

#### req #5 — Anti-Domination Cooldown
A user who won the last round cannot win the current round. If they're ranked #1 at
end-of-round, rank #2 wins instead. If no rank #2 exists, an error is thrown.

#### req #6 — Round Time Limit
Round auto-ends when `endsAt` passes (checked every 60s by the background scheduler).
Force-end mode skips anti-snipe. Config key: `round_time_limit_hours` (default 24).
Owner can set per-round time limit when creating the round.

#### req #7 — Prize Safety Limit (70%)
Prize paid = `min(currentPool, rewardPoolBalance × 0.70)`. Prevents the platform from
paying out more than it can safely afford. Config key: `prize_safety_pct` (default 0.70).

#### req #8 — Anti-Snipe Protection
Rank #1 must hold their position for at least 10 seconds before the round can be ended.
Tracked per-round: `rank1HolderId` and `rank1SinceAt` are updated on every burn.
Force-end (time limit, owner) skips this check. Config key: `anti_snipe_seconds` (default 10).

#### req #9 — Live Leaderboard
Top 10 by per-round weight, each entry includes `distanceToFirst` (weight gap to rank #1).
User's own rank and weight are returned even if they are outside the top 10.

#### req #10 — Round Progress Bar
Real-time progress bar displayed on the leaderboard page showing round completion %. The
bar fills as `currentPool / prizePoolTarget` and shows a % overlay.

#### req #11 — Admin Balance Config Panel
Owner panel includes a "BALANCE RULES" section to configure all 5 balance parameters
(`weight_cap`, `referral_weight_cap_pct`, `prize_safety_pct`, `round_time_limit_hours`,
`anti_snipe_seconds`) live without code changes.

### Admin Round Controls

Owners can:

- `POST /api/owner/round` — create a new round (set `prizePoolTarget`, `timeLimitHours`)
- `POST /api/owner/round/:id/end` — manually force-end a round (pays #1 on leaderboard)
  - Set `{ "force": true }` in body to skip anti-snipe check
- `POST /api/owner/round/:id/cancel` — cancel without paying (emergency only)
- `GET /api/owner/rounds` — list all rounds (active + history)

### Public Endpoints

| Endpoint                        | Purpose                                             |
| ------------------------------- | --------------------------------------------------- |
| `GET /api/round/current`        | Active round status + caller's rank (auth required) |
| `GET /api/round/current/public` | Same but no auth (for public progress bar)          |
| `GET /api/round/leaderboard`    | Top 10 by weight for active round + user rank       |
| `GET /api/round/history`        | Last 10 completed/cancelled rounds                  |

---

## 6. ASH Token — Earned on Every Burn

Every burn earns ASH regardless of outcome — it is the base reward for participation.

### How ASH Amount is Calculated

```
ashReward = floor(burnAmount × ashRewardPercent ÷ ashTokenPrice)
          = floor($5.00 × 1.0 ÷ $0.01) = 500 ASH   (burning $5)
          = floor($10   × 1.0 ÷ $0.01) = 1,000 ASH (burning $10)
          = floor($25   × 1.0 ÷ $0.01) = 2,500 ASH (burning $25)
```

**Default values:**

- `ashRewardPercent = 1.0` — 100% of burn value returned as ASH
- `ashTokenPrice = $0.01` per ASH (hardcoded)

**Holy Fire VIP bonus:** +20% extra ASH on every burn.

ASH is **not** currently tradeable on-chain — it is an in-app reward and utility token.

---

## 7. ASH Boost — 1-Hour Weight Bonus

The boost is **time-based** — you pay once and all burns within the next hour get the bonus.

- **How to activate:** Click "ACTIVATE BOOST" on the burn page
- **Cost:** 1,000 ASH (deducted immediately from your wallet)
- **Effect:** +0.50 added to `finalWeight` on every burn for the next **60 minutes**
- **Endpoint:** `POST /api/burn/boost`
- **Status check:** `GET /api/burn/boost-status` → `{ active, secondsLeft }`
- **Stacking:** Activating again while a boost is active extends the timer by another hour

```
Example: Boost active with 30 mins left + activate again = 90 mins remaining
```

---

## 8. ASH Staking — Earning More ASH Passively

After earning ASH from burns you can lock it in a staking pool to earn more:

| Pool         | APY | Lock Period | Min Stake |
| ------------ | --- | ----------- | --------- |
| EMBER POOL   | 8%  | 7 days      | 100 ASH   |
| FLAME POOL   | 15% | 30 days     | 500 ASH   |
| INFERNO POOL | 30% | 90 days     | 1,000 ASH |

**How rewards accrue:**

```
dailyRate     = APY ÷ 365
pendingReward = stakedAmount × dailyRate × elapsedDays
```

You can claim rewards at any time while staked. You can only unstake after the lock period
ends. Rewards are issued from the platform's ASH supply (not from the reward pool).

---

## 9. Referral System — Earning from Others' Burns

When you refer a friend and they burn:

```
referralReward = burnAmount × referralCommission (default 10%)
```

If your friend burns $10, you instantly receive **$1.00 USDC** in your wallet.
This is deducted from the reward pool.

**Referral weight bonus:** For every 5 active referrals you have:

```
rawReferralBonus += 0.20 per 5 referrals
(capped at 40% of total weight — req #4)
```

---

## 10. VIP Subscription — Holy Fire

There is one subscription plan: **HOLY FIRE** at **$24.99 USDC/month**.

| Benefit      | Detail                              |
| ------------ | ----------------------------------- |
| Weight bonus | +0.50 on every burn                 |
| ASH bonus    | +20% extra ASH tokens on every burn |
| Raffle entry | Weekly exclusive raffle             |
| VIP badge    | Special marker on profile           |

- Paid from your in-app USDC balance at subscription time.
- Active for 30 days.
- Backend tier value: `"HOLY_FIRE"` (uppercase).

---

## 11. Owner Withdrawals — How Profits Come Out

The profit pool can only be withdrawn via a two-signature process:

```
Owner 1 initiates withdrawal request
        │
        │  Creates a PENDING request in DB
        │  Amount = full current profit pool balance
        │  Owner 1 gets 60%, Owner 2 gets 40%
        ▼
Owner 2 approves (must be different from Owner 1)
        │
        │  Transfer 1: 60% sent to Owner 1 wallet on-chain
        │  Transfer 2: 40% sent to Owner 2 wallet on-chain
        ▼
Status = EXECUTED, profit pool balance set to 0
```

**Safety mechanisms:**

- Same owner cannot initiate and approve — prevents solo theft.
- Only one pending request at a time.
- Full audit trail: `txHash1`, `txHash2`, `initiatorEmail`, `approverEmail`, timestamps.

---

## 12. Solvency Check

The admin panel can run a solvency check at any time:

```
onChainUSDC  = actual USDC balance of master wallet (on-chain)
liabilities  = userBalances + rewardPool + profitPool

surplus = onChainUSDC - liabilities
ratio   = onChainUSDC ÷ liabilities  (must be ≥ 1.0 to be solvent)
```

---

## 13. Complete Money Flow Diagram

```
USER DEPOSITS $100 USDC on-chain
        │
        ▼
In-app wallet: $100 USDC
        │
USER BURNS $10 USDC  (minimum $5.00)
        │
        ├── $5 → Reward Pool / Round Prize Pool
        │         ├── grows until target is reached
        │         └── pays 10% referral commissions
        └── $5 → Profit Pool (owner revenue)
        │
        ▼
WEIGHT ACCUMULATED  (per-round burn finalWeight)
        │
        ├── ALL burners → ASH reward (100 ASH per $1 burned, +20% with Holy Fire)
        │
        └── ROUND TARGET REACHED → #1 on leaderboard wins the prize pool
                        │
                        │  Anti-snipe: held rank #1 for ≥10s?
                        │  Anti-domination: didn't win the previous round?
                        │  Prize safety: min(pool, rewardBalance × 70%)?
                        ▼
                  Winner receives USDC prize
                  Soft reset: all non-winner cumulativeWeights × 0.90
                  Winner reset: winner cumulativeWeight → 0
                  New round starts (owner-initiated)

OWNERS WITHDRAW (requires 2-of-2 signature)
        │
        └── Profit Pool → Owner 1 (60%) + Owner 2 (40%) on-chain
```

---

## 14. Default Configuration Reference

All values below are defaults and can be changed by the owner in the admin/owner panel.

| Parameter                  | Default   | Meaning                                                |
| -------------------------- | --------- | ------------------------------------------------------ |
| `min_burn_amount`          | **$5.00** | Smallest allowed burn (entry fee)                      |
| `base_unit`                | $4.99     | Weight reference unit (weight = burn ÷ base_unit)      |
| `constant_factor`          | 100       | Legacy — unused in round-based system                  |
| `reward_pool_split`        | 0.50      | % of each burn into reward/round pool                  |
| `profit_pool_split`        | 0.50      | % of each burn into profit pool                        |
| `prize_pool_target`        | $500      | Round ends when pool reaches this amount               |
| `ash_reward_percent`       | 1.0       | 100% of burn value returned as ASH                     |
| `boost_cost_ash`           | 1,000     | ASH required to activate 1-hour boost                  |
| `boost_duration_ms`        | 3,600,000 | Boost duration: 1 hour in milliseconds                 |
| `referral_commission`      | 0.10      | 10% of each burn goes to referrer                      |
| `vip_holy_fire_bonus`      | 0.50      | Weight bonus for Holy Fire VIP subscribers             |
| `weight_cap`               | 300       | Max base weight; diminishing returns above this *(req #3)* |
| `referral_weight_cap_pct`  | 0.40      | Max referral contribution as fraction of total *(req #4)* |
| `prize_safety_pct`         | 0.70      | Prize ≤ this % of reward pool balance *(req #7)*       |
| `round_time_limit_hours`   | 24        | Default time limit for new rounds *(req #6)*           |
| `anti_snipe_seconds`       | 10        | Min seconds rank #1 must hold before round can end *(req #8)* |
| ASH token price            | $0.01     | Used for ASH reward calculation (hardcoded)            |

---

## 15. Blockchain — Solana Devnet

The platform currently operates on **Solana devnet**.

| Variable            | Devnet Value                                       | Mainnet Value                                      |
| ------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `SOLANA_RPC_URL`    | `https://api.devnet.solana.com`                    | `https://api.mainnet-beta.solana.com`              |
| `USDC_MINT`         | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`   | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`   |
| `NEXT_PUBLIC_USDC_MINT` | same as above                               | same as above                                      |

To get devnet USDC for testing, the master wallet can self-airdrop via the devnet faucet.
Run `requestDevnetAirdrop()` from `blockchainService.ts` or use `solana airdrop 2` on devnet.

---

## 16. VPS Deployment — Schema Sync

After pulling the latest code on the VPS, run:

```bash
cd backend
npx prisma db push
npx prisma generate
npm run build
npm start
```

The current schema includes these columns added since the initial launch:

- `wallets.cumulativeWeight` — persistent weight field
- `burns.roundId` — links each burn to its round
- `burns.finalWeight` — final weight after all bonuses and caps
- `rounds.timeLimitHours` — optional time limit in hours
- `rounds.endsAt` — deadline timestamp for auto-end
- `rounds.rank1HolderId` — anti-snipe: current rank #1 user
- `rounds.rank1SinceAt` — anti-snipe: when rank #1 was achieved
- `users.lastWonRoundId` — anti-domination: ID of the last round won

---

_Generated from live codebase — burnService.ts, roundService.ts, ownerService.ts,
stakingService.ts, vipService.ts, depositMonitorService.ts — April 2026_

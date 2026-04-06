# Ashnance — Complete System Mechanics

> Everything you need to understand: how money flows in, how pools work, how winners and
> losers are decided, and how the platform generates profit.
>
> Last updated: reflects live codebase as of April 2026.

---

## 1. Big Picture — The Flow in One Paragraph

A user deposits real USDC on-chain into their personal deposit address. The platform
detects it and credits their in-app wallet. They spend that USDC to "burn" (play). Each
burn splits 50/50 into two pools. A weighted random draw decides if they win USDC from the
Reward Pool or lose and earn ASH tokens instead. ASH can be activated as a 1-hour boost,
staked for passive yield, or held speculatively. The other 50% sits in the Profit Pool for
the owners to withdraw. Two owners must co-sign every withdrawal.

---

## 2. Deposits — How Money Gets In

```
User Solana Wallet
        │
        │  sends USDC on-chain
        ▼
User's Deposit Address  ◄── unique per user, generated at account creation
        │
        │  DepositMonitorService polls on-chain (every few seconds)
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

---

## 3. The Two Pools — Where Every Burn Dollar Goes

When a user burns $10, the system immediately splits it:

```
$10 USDC burned
├── $5.00 → Reward Pool   (50%, configurable via reward_pool_split)
└── $5.00 → Profit Pool   (50%, configurable via profit_pool_split)
```

These ratios are set in `PlatformConfig` by the owner. They must always add up to 1.0.

### Reward Pool
- Funds all prize payouts to winners.
- Also funds referral commissions (deducted from the reward pool share).
- A single win can never exceed 50% of the current pool balance (hard cap).
- If the pool is too thin to pay even the SMALL prize after applying the cap, the win
  falls back to an ASH reward instead.

### Profit Pool
- Pure platform profit — no automatic payouts from here.
- Owners can withdraw it at any time via the two-signature process (see Section 10).
- Tracks: `balance` (current), `totalDeposited` (lifetime in), `totalWithdrawn` (lifetime out).

---

## 4. The Burn — Win/Lose Mechanic

### Step 1: Calculate Weight

Weight determines your probability of winning. More weight = higher chance.

```
baseWeight    = burnAmount ÷ base_unit (4.99)
              = $10 ÷ $4.99 ≈ 2.00

vipBonus      = +0.50 if Holy Fire VIP is active
referralBonus = +0.20 per every 5 active referrals you made
boostBonus    = +0.50 if your 1-hour ASH boost is currently active

finalWeight   = baseWeight + vipBonus + referralBonus + boostBonus
```

**Note:** `base_unit` is always **$4.99** (the weight reference unit, never changes).
`min_burn_amount` is **$1.00** (the minimum you can burn, separate from the weight unit).

**Example:** Burn $10, Holy Fire VIP active, 5 referrals, boost active:
`finalWeight = 2.00 + 0.50 + 0.20 + 0.50 = 3.20`

### Step 2: Calculate Win Probability

```
effectiveChance = finalWeight ÷ (finalWeight + constantFactor)
```

`constantFactor` defaults to **100** (owner-configurable).

```
Example: 3.20 ÷ (3.20 + 100) = 3.10% chance of winning
```

Burning $1 with no bonuses: `0.20 ÷ (0.20 + 100) = 0.20% win chance`
Burning $4.99 with no bonuses: `1.0 ÷ (1.0 + 100) = 0.99% win chance`

### Step 3: VRF Random Draw

```typescript
randomNumber = simulateVRF(userId + timestamp)  // 0.0 to 1.0
isWinner     = randomNumber <= effectiveChance
```

`simulateVRF` uses a deterministic SHA-256 hash of the user ID + timestamp, normalized to
`[0, 1]`. In production this will be replaced with Switchboard VRF (verifiable randomness
on Solana so no one can manipulate it).

### Step 4: Prize Tier (Winners Only)

A second random roll selects the prize tier:

```
Roll ≤ 0.01 (1%)   → JACKPOT   $2,500
Roll ≤ 0.05 (5%)   → BIG       $500
Roll ≤ 0.20 (20%)  → MEDIUM    $200
Roll > 0.20 (74%)  → SMALL     $50
```

### Step 5: Pool Fallback (Downgrade if Needed)

The 50% hard cap is applied: `maxPayout = floor(poolBalance × 0.5)`

The system tries to pay the selected prize. If the pool can't cover it, it **downgrades
to the next tier** (not cancels):

```
JACKPOT can't be paid → try BIG
BIG can't be paid     → try MEDIUM
MEDIUM can't be paid  → try SMALL
SMALL can't be paid   → winner gets ASH instead (pool too thin)
```

Prize amount is also capped at 50% of pool. So if SMALL is $50 but the pool only has
$60 (50% cap = $30), the player wins $30 labeled "SMALL".

The prize is credited to the user's USDC wallet immediately and deducted from the reward pool.

---

## 5. ASH Token — The Loser's Reward

When you lose (or when the pool is too thin to pay any prize), you earn ASH tokens.

### How ASH Amount is Calculated

```
ashReward = floor(burnAmount × ashRewardPercent ÷ ashTokenPrice)
          = floor($1.00 × 1.0 ÷ $0.01) = 100 ASH   (burning $1)
          = floor($4.99 × 1.0 ÷ $0.01) = 499 ASH   (burning $4.99)
          = floor($10   × 1.0 ÷ $0.01) = 1,000 ASH (burning $10)
```

**Default values:**
- `ashRewardPercent = 1.0` — 100% of burn value returned as ASH
- `ashTokenPrice = $0.01` per ASH (hardcoded)

**Holy Fire VIP bonus:** +20% extra ASH on every loss.
```
499 ASH × 1.20 = 598 ASH  (burning $4.99 with Holy Fire)
```

ASH is **not** currently tradeable on-chain — it is an in-app reward and utility token.

---

## 6. ASH Boost — 1-Hour Weight Bonus

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

The frontend shows a live countdown: "⚡ BOOST ACTIVE — 43m 12s REMAINING"

When the timer hits zero the boost expires automatically — no action needed.

---

## 7. ASH Staking — Earning More ASH Passively

After earning ASH from burns you can lock it in a staking pool to earn more:

| Pool         | APY  | Lock Period | Min Stake |
|-------------|------|------------|-----------|
| EMBER POOL  | 8%   | 7 days     | 100 ASH   |
| FLAME POOL  | 15%  | 30 days    | 500 ASH   |
| INFERNO POOL| 30%  | 90 days    | 1,000 ASH |

**How rewards accrue:**
```
dailyRate     = APY ÷ 365
pendingReward = stakedAmount × dailyRate × elapsedDays
```

You can claim rewards at any time while staked. You can only unstake after the lock period
ends. Rewards are issued from the platform's ASH supply (not from the reward pool).

---

## 8. Referral System — Earning from Others' Burns

When you refer a friend and they burn:

```
referralReward = burnAmount × referralCommission (default 10%)
```

If your friend burns $10, you instantly receive **$1.00 USDC** in your wallet.
This is deducted from the reward pool.

**Referral weight bonus:** For every 5 active referrals you have:
```
referralBonus += 0.20 per 5 referrals
```

So 10 active referrals → +0.40 weight on every burn you do.

---

## 9. VIP Subscription — Holy Fire

There is one subscription plan: **HOLY FIRE** at **$24.99 USDC/month**.

| Benefit | Detail |
|--------|--------|
| Weight bonus | +0.50 on every burn |
| ASH bonus | +20% extra ASH tokens on every loss |
| Raffle entry | Weekly exclusive raffle |
| VIP badge | Special marker on profile |

- Paid from your in-app USDC balance at subscription time.
- Active for 30 days, auto-renews if you have enough balance.
- If renewal fails (low balance), VIP expires and the weight bonus is removed.

---

## 10. Owner Withdrawals — How Profits Come Out

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
- If Transfer 1 succeeds but Transfer 2 fails, status becomes `PARTIAL` and is logged
  as a critical error requiring manual resolution — Owner 1's payment is never lost.
- Full audit trail: `txHash1`, `txHash2`, `initiatorEmail`, `approverEmail`, timestamps.

---

## 11. Solvency Check — Is the Platform Solvent?

The admin panel can run a solvency check at any time:

```
onChainUSDC  = actual USDC balance of master wallet (on-chain)
liabilities  = userBalances + rewardPool + profitPool

surplus = onChainUSDC - liabilities
ratio   = onChainUSDC ÷ liabilities  (must be ≥ 1.0 to be solvent)
```

If `ratio < 1.0`, the platform owes more than it has. This should never happen under
normal operation because every deposit is immediately swept to the master wallet and
pool splits are applied atomically.

---

## 12. Complete Money Flow Diagram

```
USER DEPOSITS $100 USDC on-chain
        │
        ▼
In-app wallet: $100 USDC
        │
USER BURNS $10 USDC  (minimum $1.00)
        │
        ├── $5 → Reward Pool
        │         ├── pays prizes to winners (with tier fallback)
        │         └── pays 10% referral commissions
        └── $5 → Profit Pool (owner revenue)
        │
        ▼
RANDOM DRAW (weight-based probability)
        │
        ├── WIN  → Prize tier selected (JACKPOT/BIG/MEDIUM/SMALL)
        │           → Downgraded if pool can't cover
        │           → User gets $50–$2,500 USDC
        │
        └── LOSE → ASH reward (100 ASH per $1 burned, +20% with Holy Fire)
                        │
                        ▼
                  ASH can be used for:
                  ├── BOOST:   pay 1,000 ASH → +0.50 weight for 1 HOUR
                  └── STAKING: lock ASH → earn 8–30% APY → more ASH

OWNERS WITHDRAW (requires 2-of-2 signature)
        │
        └── Profit Pool → Owner 1 (60%) + Owner 2 (40%) on-chain
```

---

## 13. Default Configuration Reference

All values below are defaults and can be changed by the owner in the admin panel.

| Parameter             | Default    | Meaning                                          |
|----------------------|------------|--------------------------------------------------|
| `min_burn_amount`     | **$1.00**  | Smallest allowed burn                            |
| `base_unit`           | $4.99      | Weight reference unit (Weight = burn ÷ base_unit)|
| `constant_factor`     | 100        | Controls house edge (higher = harder to win)     |
| `reward_pool_split`   | 0.50       | % of each burn into reward pool                  |
| `profit_pool_split`   | 0.50       | % of each burn into profit pool                  |
| `jackpot_prob`        | 0.01       | 1% chance of JACKPOT among winning rolls         |
| `jackpot_amount`      | $2,500     | JACKPOT prize                                    |
| `big_prob`            | 0.05       | 5% cumulative chance of BIG                      |
| `big_amount`          | $500       | BIG prize                                        |
| `medium_prob`         | 0.20       | 20% cumulative chance of MEDIUM                  |
| `medium_amount`       | $200       | MEDIUM prize                                     |
| `small_amount`        | $50        | SMALL prize (74% of winning rolls)               |
| `ash_reward_percent`  | 1.0        | 100% of burn value returned as ASH on loss       |
| `boost_cost_ash`      | 1,000      | ASH required to activate 1-hour boost            |
| `boost_duration_ms`   | 3,600,000  | Boost duration: 1 hour in milliseconds           |
| `referral_commission` | 0.10       | 10% of each burn goes to referrer                |
| `vip_holy_fire_bonus` | 0.50       | Weight bonus for Holy Fire VIP subscribers       |
| ASH token price       | $0.01      | Used for ASH reward calculation (hardcoded)      |

---

## 14. VPS Migration Note

After the April 2026 update, run this on the VPS to apply the DB schema change:

```bash
cd /path/to/ashnance/backend
npx prisma db push
```

This adds the `boostExpiresAt` column to the `wallets` table (needed for the 1-hour boost timer).

---

*Generated from live codebase — burnService.ts, ownerService.ts, stakingService.ts,
vipService.ts, depositMonitorService.ts*

# Ashnance — Complete System Mechanics

> Everything you need to understand: how money flows in, how pools work, how winners and
> losers are decided, and how the platform generates profit.

---

## 1. Big Picture — The Flow in One Paragraph

A user deposits real USDC on-chain into their personal deposit address. The platform
detects it and credits their in-app wallet. They spend that USDC to "burn" (play). Each
burn splits 50/50 into two pools. A weighted random draw decides if they win USDC from the
Reward Pool or lose and earn ASH tokens instead. ASH can be spent to boost future odds,
staked for more ASH, or held speculatively. The other 50% sits in the Profit Pool for the
owners to withdraw. Two owners must co-sign every withdrawal.

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
- Has a solvency guard: if the pool drops below `$49.90` (10× minimum burn), no wins are
  paid out — losers instead get ASH. This prevents the pool from being drained to zero.
- A single win can never exceed 50% of the current pool balance (hard cap).

### Profit Pool
- Pure platform profit — no automatic payouts from here.
- Owners can withdraw it at any time via the two-signature process (see Section 9).
- Tracks: `balance` (current), `totalDeposited` (lifetime in), `totalWithdrawn` (lifetime out).

---

## 4. The Burn — Win/Lose Mechanic

### Step 1: Calculate Weight

Weight determines your probability of winning. More weight = higher chance.

```
baseWeight    = burnAmount ÷ minBurnAmount
              = $10 ÷ $4.99 ≈ 2.00

vipBonus      = 0.10 (SPARK) | 0.25 (ACTIVE_ASH) | 0.50 (HOLY_FIRE)
referralBonus = +0.20 per every 5 active referrals you made
boostBonus    = +0.50 if you paid 1,000 ASH for a boost

finalWeight   = baseWeight + vipBonus + referralBonus + boostBonus
```

**Example:** Burn $10, HOLY_FIRE VIP, 5 referrals, boost ON:
`finalWeight = 2.00 + 0.50 + 0.20 + 0.50 = 3.20`

### Step 2: Calculate Win Probability

```
effectiveChance = finalWeight ÷ (finalWeight + constantFactor)
```

`constantFactor` defaults to **100** (owner-configurable).

```
Example: 3.20 ÷ (3.20 + 100) = 3.10% chance of winning
```

The higher your burn, VIP tier, referrals, and boost — the higher your chance. But the
constant factor of 100 keeps the house edge stable across all burn sizes.

### Step 3: VRF Random Draw

```typescript
randomNumber = simulateVRF(userId + timestamp)  // 0.0 to 1.0
isWinner     = randomNumber <= effectiveChance
```

`simulateVRF` uses a deterministic SHA-256 hash of the user ID + timestamp, normalized to
`[0, 1]`. In production this will be replaced with Switchboard VRF (verifiable randomness
on Solana so no one can manipulate it).

### Step 4: Prize Tier (Winners Only)

If `isWinner = true` AND the reward pool has enough:

```
A second random roll selects the prize tier:

Roll ≤ 0.01 (1%)   → JACKPOT   $2,500
Roll ≤ 0.05 (5%)   → BIG       $500
Roll ≤ 0.20 (20%)  → MEDIUM    $200
Roll > 0.20 (74%)  → SMALL     $50
```

Then the hard cap is applied:
```
actualPrize = min(selectedPrize, 50% of current reward pool)
```

The prize is credited to the user's USDC wallet immediately and deducted from the reward
pool.

---

## 5. ASH Token — The Loser's Reward

When you lose (or when the pool is too thin to pay a win), you earn ASH tokens instead.

### How ASH Amount is Calculated

```
ashReward = floor(burnAmount × ashRewardPercent ÷ ashTokenPrice)
          = floor($4.99 × 1.0 ÷ $0.01)
          = 499 ASH
```

**Default values:**
- `ashRewardPercent = 1.0` (100% of burn value is converted to ASH)
- `ashTokenPrice = $0.01` per ASH

**HOLY_FIRE VIP bonus:** +20% extra ASH on every loss.
```
499 ASH × 1.20 = 598 ASH
```

### ASH Token Price

ASH is priced at **$0.01 USD** in the system. This is used purely for:
1. Calculating how many ASH to give on a burn loss.
2. Determining the cost of a boost (1,000 ASH = $10 worth).

ASH is **not** currently tradeable on-chain — it is an in-app reward token.

---

## 6. ASH Boost — Spending ASH for Better Odds

Before any burn you can toggle "ASH Boost ON":
- **Cost:** 1,000 ASH (deducted from your wallet at burn time)
- **Effect:** +0.50 added to your finalWeight
- **Probability impact:** At base weight 1.0, no boost → 0.99% win chance; with boost
  (weight 1.50) → 1.48% win chance — about 49% more likely to win.

```typescript
// The system checks your balance before allowing the burn
if (ashBalance < 1000) → burn is blocked, "Insufficient ASH" warning shown
```

If boost is active and you have enough ASH:
1. ASH is deducted from `wallet.ashBalance`
2. The `+0.50` bonus is added to finalWeight
3. Normal win/lose roll happens

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
dailyRate    = APY ÷ 365
pendingReward = stakedAmount × dailyRate × elapsedDays
```

You can claim rewards at any time while staked. You can only unstake after the lock period
ends. Rewards come from the platform's ASH supply (minted/issued by the platform, not
from the reward pool).

---

## 8. Referral System — Earning from Others' Burns

When you refer a friend and they burn:

```
referralReward = burnAmount × referralCommission (default 10%)
```

If your friend burns $10, you instantly receive **$1.00 USDC** in your wallet.
This is deducted from the reward pool.

**Referral bonus on weight:** For every 5 active referrals you have:
```
referralBonus += 0.20 per 5 referrals
```

So if you have 10 friends burning actively, your weight gets +0.40 on every burn.

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
- Full audit trail in `OwnerWithdrawalRequest` table with `txHash1`, `txHash2`,
  `initiatorEmail`, `approverEmail`, timestamps.

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
USER BURNS $10 USDC
        │
        ├── $5 → Reward Pool
        │         ├── pays prizes to winners
        │         └── pays 10% referral commissions
        └── $5 → Profit Pool (owner revenue)
        │
        ▼
RANDOM DRAW (based on weight/probability)
        │
        ├── WIN  → user gets $50–$2,500 USDC from Reward Pool
        └── LOSE → user gets 499–598 ASH tokens (at $0.01 each = ~$5 value)
                        │
                        ▼
                  ASH can be used for:
                  ├── ASH BOOST: spend 1,000 ASH → +0.50 weight on next burn
                  └── STAKING:   lock ASH → earn 8–30% APY → more ASH

OWNERS WITHDRAW
        │
        └── Profit Pool → Owner 1 (60%) + Owner 2 (40%) via 2-of-2 signature
```

---

## 13. Default Configuration Reference

All values below are defaults and can be changed by the owner in the admin panel.

| Parameter             | Default  | Meaning                                    |
|----------------------|----------|---------------------------------------------|
| `min_burn_amount`     | $4.99    | Smallest allowed burn                      |
| `constant_factor`     | 100      | Controls house edge (higher = harder to win)|
| `reward_pool_split`   | 0.50     | % of each burn into reward pool             |
| `profit_pool_split`   | 0.50     | % of each burn into profit pool             |
| `jackpot_prob`        | 0.01     | 1% chance of JACKPOT when winning           |
| `jackpot_amount`      | $2,500   | JACKPOT prize                               |
| `big_prob`            | 0.05     | 5% chance of BIG when winning               |
| `big_amount`          | $500     | BIG prize                                   |
| `medium_prob`         | 0.20     | 20% chance of MEDIUM when winning           |
| `medium_amount`       | $200     | MEDIUM prize                                |
| `small_amount`        | $50      | SMALL prize (74% of wins)                   |
| `ash_reward_percent`  | 1.0      | 100% of burn value given back as ASH        |
| `boost_cost_ash`      | 1,000    | ASH required to activate boost             |
| `referral_commission` | 0.10     | 10% of burn goes to referrer                |
| `vip_holy_fire_bonus` | 0.50     | Weight bonus for HOLY FIRE VIP              |
| ASH price             | $0.01    | Used for ASH reward calculation (hardcoded) |

---

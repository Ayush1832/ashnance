# Ashnance — Feature Specification & Section Mapping

## Purpose
This document maps **every section** from the project doc to specific code components. Reference this before making any change to ensure accuracy.

---

## Section → Code Mapping

| Section | Frontend Pages/Components | Backend Services | Smart Contract |
|---------|--------------------------|-----------------|----------------|
| **1. Landing Page** | `app/(landing)/page.tsx`, `LiveTicker`, Hero | — | — |
| **2. Registration/Login** | `app/(auth)/*`, `OTPInput`, `WalletConnect` | `authService`, `otpService` | Wallet creation |
| **3. Deposit/Withdraw** | `app/wallet/*`, `DepositModal`, `WithdrawModal` | `walletService`, `txService` | USDC transfers |
| **4. Burn Now** | `app/burn/*`, `BurnButton`, `AmountSelector` | `burnService` | Burn execution |
| **5. Reward Distribution** | (Backend only) | `poolService`, `rewardService` | Pool split logic |
| **6. Winner Selection** | `BurnResult` component | `vrfService`, `prizeService` | VRF + prize check |
| **7. Weight Logic** | `LuckMeter` component | `weightService` | Weight calc |
| **8. Prize Table** | `PrizeTable` (admin) | `prizeConfigService` | On-chain table |
| **9. Admin Prize Control** | `app/admin/prizes/*` | `adminPrizeService` | Update on-chain |
| **10. Referral** | `app/referral/*`, `ReferralLink` | `referralService` | Reward transfer |
| **11. VIP (Holy Fire)** | `app/subscribe/*`, `VIPBadge` | `subscriptionService` | VIP registry |
| **12. ASH Token** | Balance display, `BoostButton` | `ashTokenService` | SPL token ops |
| **13. Visual/Audio** | `FireExplosion`, `AshFall`, AI voice | — | — |
| **14. Social Layer** | `Leaderboard`, `ShareMoment`, `LiveTicker` | `socialService` | — |
| **15. Admin Panel** | `app/admin/*` (all pages) | `adminService` | Config updates |
| **16. User Settings** | `app/settings/*` | `settingsService` | — |
| **17. Transaction History** | `app/wallet/history/*` | `transactionService` | TX queries |
| **18. AI Assistant** | `AshBot`, `AshBotIcon` | `aiEngine` | — |
| **19. Staking** | `app/staking/*` (future) | `stakingService` | Staking contract |
| **20. User Journey** | (Integration of all above) | — | — |
| **21. Roadmap/Tokenomics** | Landing page section | — | Token mint |

---

## Critical Formulas & Constants

### Weight Calculation (Sections 4, 7, 8)
```
BaseUnit = 4.99 USDC
AmountWeight = BurnAmount / BaseUnit

VIP Bonuses:
  Spark      = +0.10 Weight
  Active Ash = +0.25 Weight
  Holy Fire  = +0.50 Weight

Referral Bonus:
  Every 5 active referrals = +0.20 Weight

Boost (ASH):
  1000 ASH burned = +0.50 Weight for 1 hour

FinalWeight = AmountWeight + VIP_Bonus + Referral_Bonus + Boost_Bonus
```

### Win/Lose Determination (Sections 6, 7)
```
ConstantFactor = 100  (configurable by admin)
EffectiveChance = FinalWeight / (FinalWeight + ConstantFactor)
RandomNumber = VRF(0, 1)

IF RandomNumber <= EffectiveChance → WIN
ELSE → LOSE (receive ASH)
```

### Prize Tier Selection (Section 8)
```
ON WIN:
  RandomPrize = VRF(0, 1)
  
  Jackpot (2500 USDC)  → RandomPrize <= 0.01  (1%)
  Big     (500 USDC)   → RandomPrize <= 0.05  (4%)
  Medium  (200 USDC)   → RandomPrize <= 0.20  (15%)
  Small   (50 USDC)    → RandomPrize <= 1.00  (80%)

  Prize values are % of Reward Pool (dynamic):
    Jackpot = 10% of Reward Pool
    Big     = 5%  of Reward Pool
    Medium  = 2%  of Reward Pool
    Small   = 1%  of Reward Pool
```

### Reward Distribution (Section 5)
```
Per Burn:
  X% → Reward Pool (default 50%)
  Y% → Profit Pool (default 50%)
  (Admin configurable)

Reward Pool covers:
  - Prizes
  - Referral rewards
  
Profit Pool = untouched project profit
```

### Referral Rewards (Section 10)
```
ON each referred user's Burn:
  Referral Reward = 10% of burn amount
  Deducted FROM Reward Pool (not Profit Pool)
  
  Example: Burn 4.99 → Reward Pool gets 2.50
  → 10% of 4.99 = 0.49 USDC → sent to referrer
  → 2.01 USDC → remains for prizes
```

### ASH Token Distribution (Section 12)
```
ON LOSE:
  Base reward = 200–500 ASH (random)
  VIP Bonus = +20% extra ASH if Holy Fire subscriber

Total Supply = 1,000,000,000 ASH (1B)
Distribution stops when 1B is depleted
```

### VIP Subscription (Section 11)
```
Price = 24.99 USDC/month
Benefits:
  - VIP Badge
  - +0.5 Weight Bonus (every burn)
  - +20% ASH on loss
  - Weekly raffle entry
  - Priority AI hints
  - Beta access
```

---

## Admin-Configurable Values

| Parameter | Default | Location |
|-----------|---------|----------|
| Reward/Profit split | 50/50 | Admin Panel → Distribution |
| Prize table (tiers, values, probabilities) | See above | Admin Panel → Prizes |
| Daily prize cap | None (unlimited) | Admin Panel → Prizes |
| Max winners per day | None (unlimited) | Admin Panel → Prizes |
| Referral commission | 10% | Admin Panel → Referrals |
| Referral reward type | USDC | Admin Panel → Referrals |
| Holy Fire price | 24.99 USDC | Admin Panel → Subscriptions |
| Holy Fire weight bonus | +0.5 | Admin Panel → Subscriptions |
| ASH loss reward range | 200–500 | Admin Panel → ASH |
| Boost cost | 1000 ASH | Admin Panel → ASH |
| Boost duration | 1 hour | Admin Panel → ASH |
| ConstantFactor | 100 | Admin Panel → Game |

---

## Security Requirements Checklist

- [ ] All withdrawals require 2FA (Google Authenticator or OTP)
- [ ] 3 failed withdrawal attempts → account freeze
- [ ] Admin login requires 2FA
- [ ] All operations logged with TX hash on blockchain
- [ ] VRF for verifiable randomness (no server-side manipulation)
- [ ] Rate limiting on all API endpoints
- [ ] Input validation (Zod) on all user inputs
- [ ] CORS restricted to platform domain
- [ ] JWT with refresh token rotation
- [ ] Whitelisted withdrawal addresses

# Ashnance — System Architecture

> Current as of April 2026. Round-based competitive system — no Anchor/smart contracts.

---

## 1. System Overview

Ashnance is a **"Burn to Win"** gamified platform on Solana where users burn USDC to accumulate
weight in a competitive round. The user ranked #1 when the round prize pool reaches its target wins
the entire pool. No on-chain smart contracts are used for game logic — all mechanics run off-chain
in the Express backend, using Solana only for USDC deposits and prize payouts.

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Next.js Frontend  │ ──REST──▶   Express Backend API     │
│   (port 3000)       │ ──WS───▶   (port 4000)             │
└─────────────────────┘         └────────────┬─────────────┘
                                              │
                          ┌───────────────────┼──────────────────┐
                          ▼                   ▼                  ▼
                   ┌────────────┐    ┌──────────────┐   ┌──────────────┐
                   │ PostgreSQL │    │  Socket.IO   │   │ Solana RPC   │
                   │ + Prisma   │    │  (Real-time) │   │ (devnet/main)│
                   └────────────┘    └──────────────┘   └──────────────┘
```

---

## 2. Tech Stack (Actual)

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 15 + TypeScript | App Router, all pages are client components |
| **Styling** | Vanilla CSS + CSS Variables | Fire/dark theme, no CSS framework |
| **State** | React useState/useEffect | No Zustand — per-page local state |
| **Backend** | Node.js + Express + TypeScript | REST API + Socket.IO |
| **Database** | PostgreSQL + Prisma ORM | Type-safe queries, `db push` for schema sync |
| **Blockchain** | Solana Web3.js + SPL Token | Deposit monitoring, prize payout, sweep |
| **Auth** | JWT + OAuth2 (Google) + Wallet signatures | Refresh token rotation |
| **2FA** | Speakeasy (TOTP) | Google Authenticator compatible |
| **Real-time** | Socket.IO | Live burn events, round updates |
| **Email** | Nodemailer + Gmail SMTP | OTP delivery |

**Not used (planned but not built):** Anchor, Switchboard VRF, Zustand, Three.js, GSAP, AI engine.

---

## 3. Directory Structure (Actual)

```
ashnance/
├── frontend/                     # Next.js 15 Application
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── (auth)/           # Login + Register
│   │   │   ├── dashboard/        # User dashboard
│   │   │   ├── burn/             # Burn Now interface
│   │   │   ├── wallet/           # Deposit / Withdraw
│   │   │   ├── referrals/        # Referral program
│   │   │   ├── leaderboard/      # Round leaderboard + progress bar
│   │   │   ├── subscribe/        # Holy Fire VIP subscription
│   │   │   ├── staking/          # ASH staking pools
│   │   │   ├── transactions/     # Transaction history
│   │   │   ├── settings/         # Profile, 2FA, addresses
│   │   │   ├── admin/            # Admin panel (role-gated)
│   │   │   ├── owner/            # Owner panel (email-gated)
│   │   │   ├── owner-login/      # Owner login page
│   │   │   ├── auth/callback/    # OAuth callback handler
│   │   │   └── connect-wallet/   # Wallet connect page
│   │   └── lib/
│   │       └── api.ts            # Centralized API client (all endpoints)
│   ├── public/                   # Static assets (logo, images)
│   └── .env.local.example        # Required env vars template
│
├── backend/                      # Express API Server
│   ├── src/
│   │   ├── server.ts             # App entry point, middleware, routes
│   │   ├── config.ts             # All config from env vars
│   │   ├── routes/
│   │   │   ├── authRoutes.ts     # /api/auth/*
│   │   │   ├── burnRoutes.ts     # /api/burn/*
│   │   │   ├── walletRoutes.ts   # /api/wallet/*
│   │   │   ├── roundRoutes.ts    # /api/round/*
│   │   │   ├── ownerRoutes.ts    # /api/owner/* (requireOwner middleware)
│   │   │   ├── adminRoutes.ts    # /api/admin/* (requireAdmin middleware)
│   │   │   ├── stakingRoutes.ts  # /api/staking/*
│   │   │   ├── vipRoutes.ts      # /api/vip/*
│   │   │   └── miscRoutes.ts     # /api/leaderboard/*, /api/2fa/*
│   │   ├── services/
│   │   │   ├── burnService.ts      # Core burn logic + weight calculation
│   │   │   ├── roundService.ts     # Round lifecycle + all balance requirements
│   │   │   ├── ownerService.ts     # Owner panel, profit pool, config
│   │   │   ├── blockchainService.ts # Solana deposit addresses + USDC transfers
│   │   │   ├── depositMonitorService.ts # On-chain deposit polling
│   │   │   ├── walletService.ts    # Deposit/withdraw/balance
│   │   │   ├── authService.ts      # Login/register/OTP/OAuth/wallet-auth
│   │   │   ├── stakingService.ts   # ASH staking pools
│   │   │   ├── vipService.ts       # Holy Fire subscription
│   │   │   ├── leaderboardService.ts # Winners/burners/referrers/ASH
│   │   │   └── twoFAService.ts     # TOTP 2FA
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT authenticate middleware
│   │   │   ├── ownerAuth.ts      # Owner email check middleware
│   │   │   └── errorHandler.ts   # Global error handler
│   │   ├── websocket/
│   │   │   └── socketHandler.ts  # Socket.IO event handlers
│   │   └── utils/
│   │       ├── prisma.ts         # Prisma client singleton
│   │       └── errors.ts         # Custom error classes
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (source of truth)
│   └── .env.example              # Required env vars template
│
├── docs/                         # Technical documentation
├── ASHNANCE_SYSTEM_EXPLAINED.md  # Complete system mechanics reference
├── TESTING_GUIDE.md              # Tester setup and test flows
└── CLAUDE.md                     # AI assistant instructions
```

---

## 4. Database Schema (Key Tables)

```
users
  id, email, username, passwordHash, avatarUrl, country
  isVip, vipTier, vipExpiresAt
  referralCode, referredById
  twoFaEnabled, twoFaSecret
  privacyMode, role (USER/ADMIN)
  googleId, walletPublicKey
  lastWonRoundId  ← anti-domination cooldown (req #5)

wallets
  id, userId
  usdcBalance, ashBalance
  depositAddress          ← unique Solana address per user
  cumulativeWeight        ← persistent across rounds (soft-reset after each round)
  boostExpiresAt          ← ASH boost timer

burns
  id, userId, roundId
  amountUsdc, weight, finalWeight   ← finalWeight includes all bonuses + caps
  ashReward, isWinner
  vrfSeed, createdAt

rounds
  id, roundNumber, status (ACTIVE/COMPLETED/CANCELLED)
  prizePoolTarget, currentPool
  timeLimitHours, endsAt      ← req #6: time limit
  rank1HolderId, rank1SinceAt ← req #8: anti-snipe tracking
  winnerId, prizeAmount
  startedAt, endedAt

transactions
  id, userId, type (BURN/WIN/DEPOSIT/WITHDRAWAL/REFERRAL_REWARD/VIP_PURCHASE/ASH_BOOST)
  amount, currency (USDC/ASH), status, description, txHash

platform_config
  key, value, updatedAt
  Keys: min_burn_amount, base_unit, reward_pool_split, profit_pool_split,
        prize_pool_target, ash_reward_percent, boost_cost_ash, boost_duration_ms,
        referral_commission, vip_holy_fire_bonus, weight_cap, referral_weight_cap_pct,
        prize_safety_pct, round_time_limit_hours, anti_snipe_seconds

reward_pool
  id, totalBalance, totalPaidOut

profit_pool
  id, balance, totalDeposited, totalWithdrawn

staking_pools, staking_positions  ← ASH staking system
referrals                          ← referrer/referee links + earnings
owner_withdrawal_requests          ← 2-of-2 profit withdrawal process
```

---

## 5. Core Flow: Burn Operation

```
User clicks BURN ($10 USDC)
        │
POST /api/burn { amount: 10 }
        │
BurnService.executeBurn()
        │
        ├── Load burnConfig from PlatformConfig table
        ├── Load user + wallet (check balance ≥ $10)
        │
        ├── WEIGHT CALCULATION
        │     baseWeight = 10 / 4.99 = 2.00
        │     + vipBonus (0.50 if Holy Fire active)
        │     + boostBonus (0.50 if boost active)
        │     + referralBonus (capped at 40% of total — req #4)
        │     → apply weight cap 300 + √(excess) formula (req #3)
        │     = finalWeight
        │
        ├── ASH REWARD = floor(amount × ashRewardPct ÷ ashPrice)
        │
        ├── DB TRANSACTION
        │     - wallet.usdcBalance -= 10
        │     - wallet.ashBalance += ashReward
        │     - wallet.cumulativeWeight += finalWeight
        │     - rewardPool.totalBalance += 5  (50%)
        │     - profitPool.balance += 5       (50%)
        │     - round.currentPool += 5        (if active round)
        │     - create burn record
        │     - create BURN transaction
        │     - pay referral commission (if referred)
        │
        ├── CHECK ROUND POOL (outside tx to avoid nesting)
        │     if round.currentPool >= prizePoolTarget → RoundService.endRound()
        │
        └── UPDATE ANTI-SNIPE (req #8)
              get new rank #1 from round leaderboard
              if rank #1 changed → update round.rank1HolderId + rank1SinceAt
```

---

## 6. Core Flow: Round End

```
RoundService.endRound(roundId, force?)
        │
        ├── Check round is ACTIVE
        ├── Load burnConfig
        ├── getFullRanking(roundId) — sum burns per user for this round
        │
        ├── req #8 — Anti-snipe (skip if force=true)
        │     if rank1SinceAt held < anti_snipe_seconds → throw error
        │
        ├── req #5 — Anti-domination
        │     if winner won round N-1 → use rank #2 instead
        │
        ├── req #7 — Prize safety
        │     prizeAmount = min(currentPool, rewardPoolBalance × 0.70)
        │
        └── DB TRANSACTION
              - round.status = COMPLETED
              - wallet(winner).usdcBalance += prizeAmount
              - rewardPool.totalBalance -= prizeAmount
              - create WIN transaction
              - req #2: wallet(winner).cumulativeWeight = 0
              - req #1: UPDATE wallets SET cumulativeWeight = cumulativeWeight × 0.90
                        WHERE userId != winner.userId
              - req #5: user(winner).lastWonRoundId = roundId
```

---

## 7. Blockchain Integration (Solana Devnet)

No smart contracts. Solana is used only for:

| Operation | Service | How |
|-----------|---------|-----|
| Deposit address derivation | `blockchainService.generateDepositAddress` | HD derivation from MASTER_KEYPAIR_SECRET |
| Deposit detection | `depositMonitorService` | Polls SPL token accounts every 15s |
| Sweep deposits to master | `blockchainService.sweepDepositToMaster` | SPL transfer → master wallet |
| Prize payout | `blockchainService.sendUsdcTransfer` | SPL transfer from master wallet |
| Withdrawal | `blockchainService.sendUsdcTransfer` | SPL transfer to user address |
| On-chain balance | `blockchainService.getUsdcBalance` | RPC `getTokenAccountsByOwner` |

**USDC Mint:**
- Devnet: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

---

## 8. Authentication

| Method | Flow |
|--------|------|
| Email + Password | Register with email/username/password → login → JWT |
| Email + OTP | `POST /auth/send-otp` → verify 6-digit code → JWT |
| Google OAuth | `/auth/google` → OAuth callback → JWT |
| Phantom Wallet | Sign message off-chain → `POST /auth/wallet` → JWT |
| Wallet Link | Link Phantom to existing account → `POST /auth/link-wallet` |

All sessions use **JWT access tokens (15min)** + **refresh tokens (7 days)**.
Token rotation: 401 → auto-refresh → retry.

---

## 9. Security

| Concern | Solution |
|---------|----------|
| Authentication | JWT + refresh token rotation |
| 2FA | TOTP (Speakeasy) — mandatory for withdrawals |
| Withdrawal | Requires 2FA + whitelisted Solana address |
| Owner access | Email-gated (`OWNER_EMAILS` env var) + `requireOwner` middleware |
| Admin access | Role-based (`requireAdmin` middleware, role stored in DB) |
| Rate limiting | 100 req/15min global; 10 req/15min on auth endpoints |
| CORS | Strict allow-list from `FRONTEND_URL` env var |
| Credentials | `.env` files gitignored; master keypair stored as env var only |

---

## 10. Real-Time Events (Socket.IO)

Events emitted from `socketHandler.ts` and consumed by frontend pages:

| Event | Payload | Used by |
|-------|---------|---------|
| `burn:new` | `{ username, amount, weight, roundProgress }` | Burn page ticker |
| `round:update` | `{ currentPool, targetPool, progressPercent }` | Leaderboard progress bar |
| `round:ended` | `{ winner, prizeAmount, roundNumber }` | Dashboard, leaderboard |
| `deposit:confirmed` | `{ amount, userId }` | Wallet page notification |

---

## 11. Background Jobs

Defined in `server.ts` using `setInterval`:

| Job | Interval | Purpose |
|-----|----------|---------|
| `RoundService.autoEndExpiredRounds` | 60s | End rounds whose `endsAt` has passed (req #6) |
| `startAllDepositMonitors` | on startup | Polls on-chain every 15s per deposit address |

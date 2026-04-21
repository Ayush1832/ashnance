# Ashnance — Complete Project Overview

> **For testers and contributors.** This document covers every feature, mechanic, API endpoint, business rule, and edge case in the live codebase.

---

## Table of Contents

1. [What Is Ashnance?](#1-what-is-ashnance)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Authentication System](#4-authentication-system)
5. [Wallet & Balance System](#5-wallet--balance-system)
6. [Burn Mechanic (Core Game)](#6-burn-mechanic-core-game)
7. [Round System](#7-round-system)
8. [VIP Subscription](#8-vip-subscription)
9. [Referral System](#9-referral-system)
10. [Staking System](#10-staking-system)
11. [2FA (Two-Factor Authentication)](#11-2fa-two-factor-authentication)
12. [Leaderboards](#12-leaderboards)
13. [WebSocket Events](#13-websocket-events)
14. [Admin Panel](#14-admin-panel)
15. [Owner Panel](#15-owner-panel)
16. [Blockchain Integration](#16-blockchain-integration)
17. [All API Endpoints](#17-all-api-endpoints)
18. [Error Codes & HTTP Status](#18-error-codes--http-status)
19. [Environment Variables](#19-environment-variables)
20. [Game Constants & Config](#20-game-constants--config)
21. [Critical Edge Cases](#21-critical-edge-cases)

---

## 1. What Is Ashnance?

Ashnance is a **competitive burn-to-earn platform** built on Solana. Users burn USDC (a stablecoin) to accumulate "weight" — a competitive score. Each burn round ends when the prize pool hits its target (default $500 USDC) or the time limit expires. The user with the **highest cumulative weight** when the round ends wins the entire prize pool.

### How A Round Works (Summary)
1. Owner creates a round with a target prize pool (e.g. $500)
2. Users deposit USDC and burn it — each burn adds to the prize pool and gives the user weight
3. Every burn's pool contribution: **50% → reward pool** (for prizes), **50% → profit pool** (owner revenue)
4. The user at **rank #1** (highest weight) when pool hits target wins
5. Winner is paid from the reward pool on-chain (Solana USDC transfer)
6. After the round: winner's weight resets to 0, everyone else's weight decays by 10%
7. New round begins

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, CSS Modules |
| Backend | Express.js, TypeScript, Node.js |
| Database | PostgreSQL via Prisma ORM |
| Blockchain | Solana (devnet), SPL Token (USDC) |
| Real-time | Socket.IO |
| Auth | JWT (access 15min / refresh 7 days), bcrypt, TOTP (2FA) |
| Email | Nodemailer (SMTP/SendGrid) |
| Cache/Queue | Redis |
| Hosting | VPS (backend) + Vercel (frontend) |
| Process Manager | PM2 |
| Reverse Proxy | Nginx + Let's Encrypt SSL |

---

## 3. Architecture

```
Browser (Vercel)
    │
    ├── HTTPS → api.ashnance.com → Nginx → :4000 (Express)
    │                                          │
    │                                    ├── PostgreSQL
    │                                    ├── Redis
    │                                    └── Solana RPC (devnet)
    │
    └── WebSocket (Socket.IO) → same Express server
```

### Key Directories
```
ashnance/
├── backend/
│   ├── src/
│   │   ├── config.ts              — all env vars + game defaults
│   │   ├── server.ts              — Express app, startup, PM2 entry
│   │   ├── routes/                — HTTP route handlers
│   │   ├── services/              — business logic
│   │   ├── middleware/            — auth, error handling
│   │   └── websocket/             — Socket.IO setup + broadcasts
│   └── prisma/schema.prisma       — full DB schema
└── frontend/
    └── src/app/                   — Next.js pages (one folder per route)
        ├── burn/                  — main game UI
        ├── wallet/                — deposit/withdraw
        ├── dashboard/             — overview
        ├── owner/                 — owner panel
        ├── admin/                 — admin panel
        └── ...
```

---

## 4. Authentication System

### 4.1 Registration

**Endpoint:** `POST /api/auth/register`

Three ways to register:
1. **Email + Password** — standard username/password account
2. **Email + OTP** — passwordless (request OTP first, verify, then register)
3. **Wallet (Phantom/Solflare)** — via `POST /api/auth/wallet` (signs a message client-side)
4. **Google OAuth** — via `/api/auth/google` redirect flow

**On registration:**
- Wallet auto-created with `usdcBalance=0`, `ashBalance=0`
- Unique deposit address auto-generated (Solana HD derivation)
- Deposit monitoring started for that address
- Unique 12-char hex `referralCode` auto-generated
- If `referralCode` provided in body, links to referrer

**Validation rules:**
- Email must be unique
- Username must be unique
- Password minimum 8 characters (if provided)
- Invalid referral codes silently ignored (no error)

### 4.2 Login

**Password login:** `POST /api/auth/login` — `{ email, password }`

**OTP login:**
1. `POST /api/auth/send-otp` — `{ email }` → sends 6-digit code, valid 10 min
2. `POST /api/auth/verify-otp` — `{ email, otp }` → marks OTP verified
3. `POST /api/auth/login` — `{ email, otp }` → issues tokens

**Account lockout:** 3 failed password attempts → locked for 30 minutes. Error includes `lockedUntil` timestamp.

**Wallet login:** `POST /api/auth/wallet` — signs message `"Sign in to Ashnance\ntimestamp:1234567890"`, verifies signature on server with nacl. Timestamp must be within 5 minutes (replay protection). Creates new user if address not found.

**Google OAuth:**
1. Redirect to `GET /api/auth/google`
2. Google redirects back to `/api/auth/google/callback`
3. Server issues tokens, redirects to `/auth/callback?accessToken=...&refreshToken=...`

### 4.3 Tokens

| Token | Lifetime | Storage |
|-------|---------|---------|
| Access Token (JWT) | 15 minutes | localStorage |
| Refresh Token (JWT) | 7 days | localStorage + DB |

**Token refresh:** `POST /api/auth/refresh` — `{ refreshToken }` → issues new pair, revokes old refresh token immediately (rotation).

**Frontend auto-refresh:** The API client checks if the access token expires within 30 seconds before every request and refreshes proactively. Fallback reactive refresh on 401.

**Logout:** `POST /api/auth/logout` — `{ refreshToken }` — revokes refresh token in DB.

### 4.4 Link Wallet (Post-Login)

`POST /api/auth/link-wallet` — Authenticated users can link a Solana wallet to their existing email account. Same signature verification. One address cannot be linked to two accounts.

---

## 5. Wallet & Balance System

### 5.1 Balances

Every user has one wallet with:
- `usdcBalance` — spendable USDC for burns and VIP
- `ashBalance` — ASH tokens earned from burns, used for boosts and staking
- `cumulativeWeight` — persistent weight across rounds (decays after each round)
- `depositAddress` — unique Solana address for auto-detected deposits

### 5.2 Deposits

**Method 1 — Direct send (recommended):**
1. User opens deposit modal → selects amount → approves in Phantom/Solflare
2. Frontend builds USDC SPL token transfer transaction to **master wallet**
3. Transaction signed and sent to Solana
4. Frontend submits txHash to `POST /api/wallet/deposit`
5. Backend verifies on-chain: confirms USDC went to master wallet, gets amount
6. Balance credited in DB (idempotent — same txHash processed only once)

**Method 2 — Send to deposit address (auto):**
- Each user has a unique deposit address (HD derived from master keypair + userId)
- Backend polls every 15 seconds for new USDC transfers
- Detected transfers are credited and swept to master wallet automatically
- Sweep failure is non-fatal (logged, doesn't block credit)

**Minimum deposit:** 1 USDC

**Supported wallets:** Phantom, Backpack, Solflare, OKX Wallet, Coinbase Wallet

### 5.3 Withdrawals

`POST /api/wallet/withdraw` — `{ amount, address, twoFaCode }`

**Requirements (all must pass):**
1. 2FA must be enabled on account
2. 2FA code must be valid
3. `address` must be in user's whitelist and verified
4. `usdcBalance >= amount`
5. Minimum withdrawal: 10 USDC

**Flow:**
1. Verify 2FA code
2. Check whitelist
3. Check balance
4. Execute on-chain USDC transfer **first** (before touching DB)
5. If on-chain fails → return error, balance unchanged
6. If on-chain succeeds → decrement balance, create transaction record

**Failed 2FA attempts:** 3 failures → 30 min account lock (same counter as password failures).

**Critical failure:** If on-chain succeeds but DB update fails — user receives USDC but balance not decremented. Backend logs `[CRITICAL]` with txHash. Support must reconcile manually.

### 5.4 Whitelist Addresses

Withdrawals require the destination address to be whitelisted.

- `GET /api/wallet/whitelist` — list addresses
- `POST /api/wallet/whitelist` — `{ address, label? }` — add address (auto-verified on devnet)
- `DELETE /api/wallet/whitelist/:id` — remove address

**On mainnet:** auto-verification should be replaced with a manual approval cooldown period.

### 5.5 Transaction History

`GET /api/wallet/transactions?type=BURN&page=1&limit=20`

**Transaction types:** `DEPOSIT`, `WITHDRAWAL`, `BURN`, `WIN`, `REFERRAL_REWARD`, `VIP_PURCHASE`, `ASH_BOOST`

**Statuses:** `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`

---

## 6. Burn Mechanic (Core Game)

### 6.1 Executing a Burn

`POST /api/burn` — `{ amount: number }` (minimum 5 USDC)

**What happens on burn:**
1. Validates balance and minimum amount
2. Calculates weight (see formula below)
3. Calculates ASH reward
4. Deducts USDC from user balance
5. Splits burn amount → 50% reward pool, 50% profit pool
6. Credits ASH reward to user
7. Pays 10% referral commission to referrer (if any) from reward pool
8. Updates `cumulativeWeight` on wallet
9. Updates round pool, checks if round should end
10. Broadcasts WebSocket events
11. Returns full burn result including round state

### 6.2 Weight Formula

```
baseWeight = amount / baseUnit   (baseUnit = 4.99)

vipBonus   = +0.50  (if Holy Fire VIP active)
boostBonus = +0.50  (if ASH boost active)

referralBonus (raw) = floor(activeReferrals / 5) × 0.20
maxReferralBonus    = (0.40 / 0.60) × (baseWeight + vipBonus + boostBonus)
referralBonus       = min(rawReferralBonus, maxReferralBonus)   ← Req #4 cap

rawTotalWeight = baseWeight + vipBonus + boostBonus + referralBonus

finalWeight:
  if rawTotalWeight <= 300: finalWeight = rawTotalWeight
  if rawTotalWeight >  300: finalWeight = 300 + sqrt(rawTotalWeight - 300)   ← Req #3 cap
```

**Examples:**
| Burn | VIP | Referrals | Boost | Raw Weight | Final Weight |
|------|-----|-----------|-------|------------|--------------|
| $5   | No  | 0         | No    | 1.002      | 1.002        |
| $5   | Yes | 0         | No    | 1.502      | 1.502        |
| $5   | No  | 5         | No    | 1.202      | 1.202        |
| $10  | Yes | 5         | Yes   | 3.510      | 3.510        |
| $1500| No  | 0         | No    | 300.6      | 300.775      |

### 6.3 ASH Reward Formula

```
ASH_PRICE = $0.01

ashReward (base) = floor(amountUsdc × ash_reward_percent / ASH_PRICE)
                   (ash_reward_percent default = 1.0)

if Holy Fire VIP active:
  ashReward = floor(ashReward × 1.20)   ← +20% bonus
```

### 6.4 Pool Splits

Every burn distributes USDC across three destinations:
```
Reward Pool += amount × 0.50
Profit Pool += amount × 0.50

If referrer exists and is active:
  Referral Commission = amount × 0.10
  Referrer.usdcBalance += commission
  Reward Pool -= commission   (commission comes out of reward pool share)
```

### 6.5 ASH Boost

`POST /api/burn/boost` — activates a 1-hour +0.50 weight bonus (costs 1000 ASH)

- If boost already active, **stacks** (extends by 1 hour from current expiry)
- Boost is time-based, no on/off toggle — just expires
- `GET /api/burn/boost-status` — `{ active, boostExpiresAt, secondsLeft }`

---

## 7. Round System

### 7.1 Round Lifecycle

```
[Created by Owner] → ACTIVE → [Pool hits target OR time expires] → COMPLETED
                            → [Owner cancels] → CANCELLED
```

Only **one ACTIVE round** at a time. New round must be created by owner after previous ends.

### 7.2 Creating a Round

`POST /api/owner/round` — `{ prizePoolTarget?: number, timeLimitHours?: number }`

Defaults (from config):
- `prizePoolTarget`: 500 USDC
- `timeLimitHours`: 24 hours

### 7.3 During a Round

Every burn updates the round's `currentPool`. When `currentPool >= prizePoolTarget`, the round automatically triggers `endRound()`.

Time limit: background job checks every 60 seconds for rounds where `endsAt <= now` and force-ends them.

### 7.4 Round Leaderboard

`GET /api/round/current` — returns:
- Round state (id, number, status, pool progress)
- Top 10 leaderboard with weight, rank, distance-to-first
- Your own rank, weight, and distance to #1
- `progressPercent` = currentPool / prizePoolTarget × 100

Leaderboard is based on **weight accumulated in the current round only** (not cumulativeWeight from before the round).

### 7.5 Winner Selection & Prize Payment

When a round ends:

**Step 1 — Anti-snipe check (Req #8):**
The rank #1 holder must have held the top position for at least `antiSnipeSeconds` (default 10 seconds). If they just took rank #1, the round cannot end yet (unless `force=true`).

**Step 2 — Anti-domination check (Req #5):**
If rank #1 won the **previous** round, they are ineligible. Rank #2 wins instead. Prevents the same user winning back-to-back rounds.

**Step 3 — Prize safety check (Req #7):**
`prizeAmount = min(round.currentPool, rewardPoolBalance × 0.70)`
Prize cannot exceed 70% of the reward pool balance (solvency protection).

**Step 4 — Payout (atomic transaction):**
1. Round status → COMPLETED
2. Winner credited `prizeAmount` USDC
3. Reward pool decremented
4. WIN transaction created for winner
5. `winner.cumulativeWeight = 0` (Req #2 — winner reset)
6. `allOtherUsers.cumulativeWeight × 0.90` (Req #1 — soft reset, 10% decay)
7. `lastWonRoundId` set on winner (for anti-domination tracking)
8. WebSocket `round:ended` broadcast

### 7.6 Force Ending

`POST /api/owner/round/:id/end` — `{ force: true }` skips anti-snipe check. Used by time-limit auto-expiry and manual override.

### 7.7 Cancellation

`POST /api/owner/round/:id/cancel` — marks round CANCELLED, no prize paid. Pool remains in reward pool for next round.

---

## 8. VIP Subscription

### 8.1 Holy Fire Tier

Only one tier: **HOLY_FIRE** at **$24.99 USDC / 30 days**

| Benefit | Detail |
|---------|--------|
| Weight Bonus | +0.50 on every burn |
| ASH Bonus | +20% extra ASH on every burn |
| VIP Badge | Shown on profile |
| Raffle Entry | Weekly raffle (not yet active) |

### 8.2 Subscription Flow

`POST /api/vip/subscribe` — `{ tier: "HOLY_FIRE" }`

1. Checks balance >= $24.99
2. Deducts $24.99 from `usdcBalance`
3. Credits $24.99 to **profit pool** (owner revenue)
4. Sets `isVip=true`, `vipTier="HOLY_FIRE"`, `vipExpiresAt = now + 30 days`
5. Creates `VIP_PURCHASE` transaction record

**Cannot subscribe if already active.** Error includes expiry time.

### 8.3 Auto-Renewal

On each burn, if VIP is expired, bonuses are not applied. Auto-renewal is supported (can re-subscribe after expiry). No automatic charge — user must manually re-subscribe.

### 8.4 Cancellation

`POST /api/vip/cancel` — immediately sets `isVip=false`. No refund. Bonuses stop on next burn.

---

## 9. Referral System

### 9.1 How It Works

Every user gets a unique `referralCode`. Share it at registration: `POST /api/auth/register` — `{ referralCode: "abc123" }`.

On registration with a valid code:
- `Referral` record created linking referrer ↔ referee
- `referredById` set on new user

### 9.2 Referral Commission

Every time a referred user burns:
- **10% of burn amount** credited to referrer's `usdcBalance`
- `REFERRAL_REWARD` transaction created for referrer
- Commission deducted from reward pool's share
- Referral `totalBurns++`, `totalEarned += commission`

Commission only paid if:
- Referral record exists
- `isActive = true`
- Referrer's wallet exists

### 9.3 Weight Bonus from Referrals

Burner (not referrer) gets weight bonus for their referrals:
- `+0.20 weight per 5 active referrals`
- **Hard cap (Req #4):** Referral bonus ≤ 40% of (baseWeight + vipBonus + boostBonus)
- If you have 25 referrals and burn $5 with no VIP: raw bonus = 1.00, but capped to ~0.67

---

## 10. Staking System

### 10.1 Pools (seeded at startup)

| Pool | APY | Lock | Min Stake |
|------|-----|------|-----------|
| EMBER POOL | 8% | 7 days | 100 ASH |
| FLAME POOL | 15% | 30 days | 500 ASH |
| INFERNO POOL | 30% | 90 days | 1000 ASH |

### 10.2 Staking Flow

1. `POST /api/staking/stake` — `{ poolId, amount }` — deducts ASH from wallet, creates position
2. Rewards accrue continuously: `pendingRewards = elapsed × (APY/100/365) × stakedAmount`
3. `POST /api/staking/claim/:positionId` — claim rewards without unstaking (min 0.01 ASH)
4. `POST /api/staking/unstake/:positionId` — returns principal + final rewards, position WITHDRAWN

**Lock enforcement:** Cannot unstake before `lockedUntil`. Error includes days remaining.

**Staking is ASH-only.** USDC cannot be staked. Rewards are paid in ASH.

**Note:** Rewards are simulated (from existing ASH supply). No real yield source is connected yet — treat as a feature framework.

---

## 11. 2FA (Two-Factor Authentication)

### 11.1 Setup

1. `POST /api/2fa/generate` — returns `{ secret, otpauthUrl }` — scan QR with authenticator app
2. `POST /api/2fa/enable` — `{ token }` — provide code from app to confirm setup
3. Done — 2FA is now required for withdrawals

### 11.2 Disable

`POST /api/2fa/disable` — `{ token }` — requires valid authenticator code to disable.

### 11.3 Where 2FA Is Required

- **Withdrawals** — must provide valid 2FA code in request body
- 3 failed codes → 30 min account lock (same counter as password failures)

**Important:** If you lose your authenticator app, there is no recovery flow. Contact support.

---

## 12. Leaderboards

All leaderboard routes are public (no auth required).

| Route | Ranks By | Fields |
|-------|---------|--------|
| `GET /api/leaderboard/winners` | Total USDC won | username, totalWon, winCount |
| `GET /api/leaderboard/burners` | Total burns | username, totalBurned, burnCount |
| `GET /api/leaderboard/referrers` | Total USDC earned from referrals | username, totalEarned, referralCount |
| `GET /api/leaderboard/ash` | ASH token balance | username, ashBalance |

**Privacy mode:** Users with `privacyMode=true` appear as "Anonymous" but stats are counted.

Returns top 20 in each category.

---

## 13. WebSocket Events

Connect to `wss://api.ashnance.com` via Socket.IO.

### 13.1 Join Rooms

Send these events after connecting:

| Event | Room Joined | Purpose |
|-------|------------|---------|
| `join:ticker` | `ticker` | All burns & round ends |
| `join:round` | `round` | Round progress updates |
| `join:leaderboard` | `leaderboard` | Rank change triggers |
| `join:user` with `{ userId }` | `user:<userId>` | Personal events (deposits, referrals) |

### 13.2 Events Emitted by Server

#### `burn:new` → room `ticker`
```json
{
  "user": "username",
  "amount": 10.00,
  "ashReward": 1000,
  "weight": 2.002,
  "timestamp": "2026-04-21T12:00:00.000Z"
}
```

#### `round:progress` → room `round`
```json
{
  "currentPool": 245.50,
  "targetPool": 500.00,
  "progressPercent": 49.1,
  "timestamp": "2026-04-21T12:00:00.000Z"
}
```

#### `round:ended` → rooms `ticker`, `round`, `leaderboard`
```json
{
  "roundNumber": 3,
  "winner": "BurnerKing",
  "prize": 315.25,
  "timestamp": "2026-04-21T12:00:00.000Z"
}
```

#### `deposit:confirmed` → room `user:<userId>`
```json
{ "amount": 50.00 }
```

#### `leaderboard:update` → room `leaderboard`
No payload — signal to clients to re-fetch leaderboard.

---

## 14. Admin Panel

Access: role must be `ADMIN`. Login with an admin account and go to `/admin`.

| Route | Description |
|-------|-------------|
| `GET /api/admin/stats` | Platform overview: users, burns, VIPs, pool balances |
| `GET /api/admin/users?page=1` | Paginated user list |
| `PUT /api/admin/users/:id/role` | `{ role: "USER"\|"ADMIN" }` — change user role |
| `GET /api/admin/config` | All platform config keys and values |
| `PUT /api/admin/config/:key` | `{ value }` — update any config key |
| `GET /api/admin/prizes` | Prize configuration entries |
| `PUT /api/admin/prizes/:tier` | Update prize config |
| `GET /api/admin/pool` | Reward pool balance and payout total |

---

## 15. Owner Panel

Access: email must be in `OWNER_EMAILS` environment variable. Login at `/owner-login` (Google OAuth) then go to `/owner`.

### 15.1 Sections

**Stats** — same as admin stats plus profit pool breakdown

**Solvency Check** — compares on-chain master wallet USDC vs total platform liabilities:
- Liabilities = sum(all user balances) + reward pool + profit pool
- `solvent = true` if on-chain USDC ≥ liabilities
- `ratio` = on-chain / liabilities (1.0 = exact, >1 = surplus)

**Profit Pool** — shows accumulated owner revenue. Revenue comes from:
- 50% of every burn (profit pool split)
- $24.99 VIP subscription fees

**Owner Withdrawal (Two-Signature Process):**
1. Owner 1 calls `POST /api/owner/withdrawal/initiate` — creates PENDING request
2. Owner 2 calls `POST /api/owner/withdrawal/approve/:id` — executes on-chain transfers
3. Funds split: 60% to `OWNER_1_WALLET`, 40% to `OWNER_2_WALLET`
4. Same owner cannot both initiate AND approve
5. Only one PENDING request at a time

**Partial Failure:** If Owner 1 is paid but Owner 2 transfer fails, status becomes `PARTIAL`. Owner 2 must be paid manually. txHash1 is recorded for reference.

**Burn Config** — live-edit all game parameters (weight cap, prize safety %, round time limit, etc.)

**Round Management** — create, end, force-end, cancel rounds.

**Devnet Airdrop** (non-production only) — airdrops 2 SOL to master wallet for transaction fees.

---

## 16. Blockchain Integration

### 16.1 Network

| Setting | Value |
|---------|-------|
| Network | Solana Devnet (testing) |
| USDC Mint (devnet) | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` |
| USDC Mint (mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| RPC | `https://api.devnet.solana.com` (default) |

On devnet, use **devnet USDC only**. You can get devnet USDC from Solana devnet faucets.

### 16.2 Master Wallet

The platform has one master wallet that:
- Receives all user deposits
- Pays all prizes to winners
- Pays all user withdrawals
- Pays profit pool withdrawals to owners

**Master wallet needs SOL for transaction fees.** On devnet, use the "Airdrop 2 SOL" button in the owner solvency panel.

### 16.3 Deposit Address System

Each user gets a unique deposit address (derived deterministically from master keypair + userId). The backend monitors these addresses every 15 seconds. Any USDC found is:
1. Credited to the user's DB balance
2. Swept to the master wallet

This is secondary to the direct-deposit flow (user sends to master wallet directly).

### 16.4 On-Chain Verification

Deposits are verified by fetching the transaction from Solana and confirming:
- Transaction is confirmed (not just processed)
- Token type is USDC mint
- Destination is master wallet
- Amount matches

---

## 17. All API Endpoints

### Auth (`/api/auth/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/send-otp` | No | Send OTP to email |
| POST | `/verify-otp` | No | Verify OTP code |
| POST | `/register` | No | Register account |
| POST | `/login` | No | Login with password or OTP |
| POST | `/refresh` | No | Refresh access token |
| POST | `/logout` | Yes | Revoke refresh token |
| GET | `/profile` | Yes | Get user profile |
| PUT | `/profile` | Yes | Update profile |
| PUT | `/password` | Yes | Change password |
| POST | `/wallet` | No | Login via Solana wallet signature |
| POST | `/link-wallet` | Yes | Link wallet to existing account |
| GET | `/google` | No | Start Google OAuth |
| GET | `/google/callback` | No | Google OAuth callback |

### Wallet (`/api/wallet/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | Get wallet balances + deposit address |
| GET | `/platform-info` | No | Master wallet address + USDC mint |
| POST | `/deposit` | Yes | Verify + credit a USDC deposit by txHash |
| POST | `/withdraw` | Yes | Withdraw USDC (requires 2FA + whitelist) |
| GET | `/transactions` | Yes | Transaction history (filterable, paginated) |
| GET | `/whitelist` | Yes | List whitelisted withdrawal addresses |
| POST | `/whitelist` | Yes | Add whitelist address |
| DELETE | `/whitelist/:id` | Yes | Remove whitelist address |
| GET | `/onchain/:address` | No | Get on-chain USDC balance |

### Burn (`/api/burn/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Execute a burn |
| GET | `/history` | Yes | Burn history (paginated) |
| GET | `/stats` | Yes | Personal burn stats |
| POST | `/boost` | Yes | Activate ASH boost (costs 1000 ASH) |
| GET | `/boost-status` | Yes | Current boost status |

### Round (`/api/round/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/current` | Yes | Active round + leaderboard + user rank |
| GET | `/current/public` | No | Public round progress |
| GET | `/leaderboard` | Yes | Full leaderboard with distances |
| GET | `/history` | No | Past rounds |

### VIP (`/api/vip/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/status` | Yes | Current VIP status |
| POST | `/subscribe` | Yes | Subscribe `{ tier: "HOLY_FIRE" }` |
| POST | `/cancel` | Yes | Cancel subscription |

### Staking (`/api/staking/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pools` | No | Available staking pools |
| GET | `/positions` | Yes | User's staking positions |
| GET | `/summary` | Yes | Staking summary totals |
| POST | `/stake` | Yes | Stake ASH `{ poolId, amount }` |
| POST | `/claim/:id` | Yes | Claim accrued rewards |
| POST | `/unstake/:id` | Yes | Unstake (must be unlocked) |

### Leaderboard (`/api/leaderboard/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/winners` | No | Top 20 by USDC won |
| GET | `/burners` | No | Top 20 by burn count |
| GET | `/referrers` | No | Top 20 by referral earnings |
| GET | `/ash` | No | Top 20 by ASH balance |

### 2FA (`/api/2fa/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/generate` | Yes | Generate TOTP secret |
| POST | `/enable` | Yes | Enable 2FA `{ token }` |
| POST | `/disable` | Yes | Disable 2FA `{ token }` |

### Admin (`/api/admin/`) — requires ADMIN role

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | Admin | Platform stats |
| GET | `/users` | Admin | User list (paginated) |
| PUT | `/users/:id/role` | Admin | Change user role |
| GET | `/config` | Admin | All config entries |
| PUT | `/config/:key` | Admin | Update config value |
| GET | `/prizes` | Admin | Prize configs |
| PUT | `/prizes/:tier` | Admin | Update prize config |
| GET | `/pool` | Admin | Reward pool info |

### Owner (`/api/owner/`) — requires owner email

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Owner | Verify ownership |
| GET | `/stats` | Owner | Full platform stats |
| GET | `/profit-pool` | Owner | Profit pool + withdrawals |
| GET | `/solvency` | Owner | On-chain vs liabilities |
| GET | `/withdrawal/pending` | Owner | Pending withdrawal request |
| POST | `/withdrawal/initiate` | Owner | Start withdrawal (Owner 1) |
| POST | `/withdrawal/approve/:id` | Owner | Approve + execute (Owner 2) |
| POST | `/withdrawal/cancel/:id` | Owner | Cancel pending request |
| GET | `/burn-config` | Owner | All game config values |
| PUT | `/burn-config` | Owner | Update game config |
| GET | `/rounds` | Owner | Active + history |
| POST | `/round` | Owner | Create new round |
| POST | `/round/:id/end` | Owner | End round (optional force) |
| POST | `/round/:id/cancel` | Owner | Cancel round |
| POST | `/devnet-airdrop` | Owner | Airdrop 2 SOL (devnet only) |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Server health check |

---

## 18. Error Codes & HTTP Status

| HTTP Code | Error Type | When |
|-----------|-----------|------|
| 200 | Success | Normal response |
| 201 | Created | Register, first deposit |
| 400 | BadRequestError | Validation failure, business rule violation |
| 401 | UnauthorizedError | Missing/invalid/expired token, wrong password |
| 403 | ForbiddenError | Insufficient role (admin/owner) |
| 404 | NotFoundError | User, round, position not found |
| 409 | ConflictError | Duplicate email, duplicate username, wallet already linked |
| 423 | AccountLockedError | 3 failed login/2FA attempts |
| 429 | TooManyRequestsError | Rate limiting |
| 500 | Internal | Unexpected server error |

All errors follow the shape: `{ success: false, error: "message" }`

---

## 19. Environment Variables

### Backend (`backend/.env`)

```bash
# Server
PORT=4000
NODE_ENV=development  # or "production"

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/ashnance"

# JWT (use strong random secrets in production)
JWT_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Solana
SOLANA_RPC_URL="https://api.devnet.solana.com"
SOLANA_PRIVATE_KEY="[1,2,3,...64 numbers]"   # master keypair JSON array

# USDC Mint (auto-selected by NODE_ENV if omitted)
USDC_MINT="Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"  # devnet

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your@email.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="your@email.com"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# URLs
FRONTEND_URL="https://ashnance.com"  # comma-separated for multiple origins
BACKEND_URL="https://api.ashnance.com"

# Redis
REDIS_URL="redis://localhost:6379"

# Owner
OWNER_EMAILS="owner1@email.com,owner2@email.com"
OWNER_1_WALLET="SolanaAddressHere"
OWNER_2_WALLET="SolanaAddressHere"
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL="https://api.ashnance.com"
NEXT_PUBLIC_SOLANA_RPC="https://api.devnet.solana.com"
NEXT_PUBLIC_USDC_MINT="Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
```

---

## 20. Game Constants & Config

These are stored in the `PlatformConfig` DB table and can be edited live via the Owner panel. Defaults shown:

| Key | Default | Description |
|-----|---------|-------------|
| `ash_reward_percent` | 1.0 | Multiplier for ASH reward per USDC burned |
| `constant_factor` | 100 | Legacy (unused in current formula) |
| `reward_pool_split` | 0.5 | Fraction of burn going to reward pool |
| `profit_pool_split` | 0.5 | Fraction of burn going to profit pool |
| `referral_commission` | 0.1 | 10% commission on referee burns |
| `min_burn_amount` | 5.0 | Minimum USDC per burn |
| `base_unit` | 4.99 | Weight divisor (weight = amount / base_unit) |
| `boost_cost_ash` | 1000 | ASH cost for 1-hour weight boost |
| `boost_duration_ms` | 3600000 | Boost duration (1 hour in ms) |
| `vip_holy_fire_bonus` | 0.50 | Weight bonus for Holy Fire VIP |
| `prize_pool_target` | 500 | USDC pool target to end a round |
| `weight_cap` | 300 | Max weight before diminishing returns |
| `referral_weight_cap_pct` | 0.40 | Max referral bonus as fraction of non-referral weight |
| `prize_safety_pct` | 0.70 | Max prize as fraction of reward pool balance |
| `round_time_limit_hours` | 24 | Default round time limit in hours |
| `anti_snipe_seconds` | 10 | How long rank #1 must hold before winning |

**Note:** `reward_pool_split + profit_pool_split` must always equal 1.0. The owner panel validates this.

---

## 21. Critical Edge Cases

### Race Condition: Two Burns Hit Pool Target Simultaneously
Both execute successfully. The first one to call `endRound()` wins. The second finds the round already COMPLETED and silently skips the end trigger. Winner is selected exactly once.

### Partial Owner Withdrawal
If Owner 1 receives USDC but Owner 2 transfer fails, status becomes `PARTIAL`. Owner 1's portion is deducted from the profit pool. Owner 2 must be paid manually to the address in `OWNER_2_WALLET`. The pending request shows the txHash for Owner 1's transfer.

### DB Failure After On-Chain Withdrawal
User receives USDC on-chain but their in-app balance isn't decremented. A `[CRITICAL]` log entry is created with userId, amount, txHash, and address. Manual reconciliation required. User is given the txHash for support.

### Account Lockout Recovery
Locks expire after 30 minutes (time-based). No manual unlock. After lock expires, failed attempt counter resets on next successful login.

### Token Expiry on Page Refresh
Access tokens last 15 minutes. The API client proactively refreshes tokens expiring within 30 seconds. If the user is away for >7 days, the refresh token expires and they must log in again.

### VIP Expiry Mid-Burn
VIP check happens at burn time. If VIP expired between burns, next burn gets no VIP bonus. No auto-renewal charges.

### No Active Round
Burns can still be executed. Pool splits still happen. Weight is tracked. No round context returned. The `roundId` in the burn result will be `null`.

### Referral Code Used at Registration But Referrer Deleted
No error. Referral commission is silently skipped for future burns. The referral record remains in DB.

### Insufficient Reward Pool for Prize
Prize limited to 70% of reward pool (Req #7). If pool is low, prize amount is reduced. This can happen if referral commissions drain the pool faster than burns fill it.

### Staking Unstake Before Lock Expires
Returns error with exact days remaining and unlock date. No penalty mechanism — just blocked until unlock time.

### Anti-Domination: No Rank #2
If rank #1 is ineligible (won last round) and there is no rank #2 (only one burner), the round cannot end normally. Owner must cancel the round or force-end (which will use rank #1 anyway with `force=true`).

---

*Document generated from live codebase — April 2026*

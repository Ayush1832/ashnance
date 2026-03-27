# Ashnance — Complete Build Walkthrough

## Build Status ✅
- **Frontend**: `next build` — Exit code 0 (12 routes)
- **Backend**: `npx tsc --noEmit` — 0 errors (30 endpoints)

---

## Frontend — 12 Routes

| Route | Key Features |
|-------|-------------|
| `/` | Hero, Live Ticker, How It Works, Prizes, Features, CTA, Footer |
| `/login` | Email+OTP, Google/X/Telegram OAuth, Phantom/Solflare/Backpack wallets |
| `/register` | Username, Email, Referral Code, OTP |
| `/dashboard` | Sidebar, USDC/ASH Balances, Stats Grid, Transactions, Live Ticker |
| `/burn` | Amount Presets, Luck Meter, Weight Breakdown, Animation, Result |
| `/wallet` | Deposit Address, Wallet Connect, Withdraw+2FA, Transaction History |
| `/leaderboard` | 4 Tabs (Winners/Burners/Referrals/ASH), Podium, Rankings |
| `/referrals` | Stats, Shareable Link, Social Shares, Activity Table |
| `/settings` | Profile, Security (2FA QR), Notifications (toggles), Addresses (whitelist) |
| `/subscribe` | 3 Tiers (Spark/Active Ash/Holy Fire), Benefits grid, Subscribe CTA |
| `/admin` | 7 Sections: Overview, Prizes, Referrals, VIP, ASH, Platform Config, Audit |
| `/transactions` | Filterable (7 types), Searchable, Color-coded badges, Status indicators |

---

## Backend — 30 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account + wallet |
| POST | `/api/auth/login` | ❌ | Email+password, lockout on 3 fails |
| POST | `/api/auth/refresh` | ❌ | Refresh JWT (7-day rotation) |
| POST | `/api/auth/logout` | ✅ | Revoke refresh token |
| GET | `/api/auth/profile` | ✅ | User + wallet + stats |
| POST | `/api/burn` | ✅ | Execute burn (core gameplay) |
| GET | `/api/burn/history` | ✅ | Paginated burn history |
| GET | `/api/burn/stats` | ✅ | Win rate, totals, biggest win |
| GET | `/api/wallet` | ✅ | Get USDC + ASH balances |
| POST | `/api/wallet/deposit` | ✅ | Process deposit (dupe-check) |
| POST | `/api/wallet/withdraw` | ✅ | Withdraw (2FA + whitelist) |
| GET | `/api/wallet/transactions` | ✅ | Filterable TX history |
| GET | `/api/leaderboard/winners` | ❌ | Top winners by prize |
| GET | `/api/leaderboard/burners` | ❌ | Top burners by count |
| GET | `/api/leaderboard/referrers` | ❌ | Top referrers by earnings |
| GET | `/api/leaderboard/ash` | ❌ | Top ASH holders |
| POST | `/api/2fa/generate` | ✅ | Generate TOTP secret |
| POST | `/api/2fa/enable` | ✅ | Verify + enable 2FA |
| POST | `/api/2fa/disable` | ✅ | Verify + disable 2FA |
| GET | `/api/vip/status` | ✅ | VIP subscription status |
| POST | `/api/vip/subscribe` | ✅ | Subscribe to tier |
| POST | `/api/vip/cancel` | ✅ | Cancel subscription |
| GET | `/api/admin/stats` | 🔒 | Platform overview stats |
| GET | `/api/admin/prizes` | 🔒 | Prize configurations |
| PUT | `/api/admin/prizes/:tier` | 🔒 | Update prize config |
| GET | `/api/admin/config` | 🔒 | Platform settings |
| PUT | `/api/admin/config/:key` | 🔒 | Update platform config |
| GET | `/api/admin/users` | 🔒 | User list (paginated) |
| PUT | `/api/admin/users/:id/role` | 🔒 | Update user role |
| GET | `/api/admin/pool` | 🔒 | Reward pool balance |

🔒 = Requires admin role

---

## Components Built

| Component | Location | Description |
|-----------|----------|-------------|
| FireExplosion | `components/effects/BurnEffects.tsx` | Canvas: 120 sparks, 30 golden shards, expanding rings, screen shake |
| AshFall | `components/effects/BurnEffects.tsx` | Canvas: 80 ash particles with wobble, 20 embers, dark vignette |
| AshBot | `components/ai/AshBot.tsx` | Floating chatbot: keyword responses, quick actions, slide-up window |
| ShareMomentCard | `components/social/ShareMomentCard.tsx` | Screenshot-able card with X/Telegram share |
| API Client | `lib/api.ts` | Auto JWT refresh, auth/burn/wallet/leaderboard/2FA/VIP/admin methods |

## Backend Services

| Service | Key Features |
|---------|-------------|
| `authService` | Register, login, refresh, logout, profile, lockout |
| `burnService` | Weight calc, VRF, dynamic prize from pool %, referral reward, ASH |
| `walletService` | Deposit (dupe-check), withdraw (2FA + whitelist), transactions |
| `leaderboardService` | 4 rankings with privacy mode |
| `twoFAService` | TOTP generate, enable, disable, verify |
| `vipService` | Subscribe (USDC deduction), cancel, status, auto-renewal |
| `adminAuth` | Role-based middleware (UserRole enum) |

---

## What's Remaining

| Category | Items |
|----------|-------|
| **External APIs** | OAuth (Google/X), Solana wallet adapter, Switchboard VRF |
| **Smart Contracts** | Anchor programs for on-chain burn, VIP registry |
| **Audio** | Sound effect files for win/lose |
| **Deployment** | PostgreSQL setup, SSL, domain, monitoring |

# Ashnance — Full Build Walkthrough

## Build Status ✅
- **Frontend**: `next build` — Exit code 0 (12 routes)
- **Backend**: `npx tsc --noEmit` — 0 errors (19 endpoints)

---

## Frontend — 12 Routes

| Route | Page | Key Features |
|-------|------|-------------|
| `/` | Landing | Hero, Live Ticker, How It Works, Prizes, Features, CTA, Footer |
| `/login` | Login | Email+OTP, Google/X/Telegram OAuth, Phantom/Solflare/Backpack wallets |
| `/register` | Register | Username, Email, Referral Code, OTP |
| `/dashboard` | Dashboard | Sidebar, USDC/ASH Balances, Stats Grid, Transactions, Live Ticker |
| `/burn` | Burn Now | Amount Presets, Luck Meter, Weight Breakdown, Animation, Result |
| `/wallet` | Wallet | Deposit Address, Wallet Connect, Withdraw+2FA, Transaction History |
| `/leaderboard` | Leaderboard | 4 Tabs (Winners/Burners/Referrals/ASH), Podium, Rankings |
| `/referrals` | Referrals | Stats, Shareable Link, Social Shares, Activity Table |
| `/settings` | Settings | Profile, Security (2FA QR), Notifications (toggles), Addresses (whitelist) |
| `/subscribe` | VIP | 3 Tiers (Spark/Active Ash/Holy Fire), Benefits grid, Subscribe CTA |
| `/admin` | Admin Panel | 7 Sections: Overview, Prizes, Referrals, VIP, ASH, Platform Config, Audit |
| `/transactions` | Transactions | Filterable (7 types), Searchable, Color-coded badges, Status indicators |

---

## Backend Architecture

```
backend/
├── prisma/schema.prisma         — 10 models, 7 enums
├── prisma/seed.ts               — Prize configs + platform constants + reward pool
├── src/
│   ├── server.ts                — Express 5 + Socket.IO entry (4 route groups)
│   ├── config.ts                — Centralized env + game constants
│   ├── middleware/
│   │   ├── auth.ts              — JWT auth + account lockout
│   │   └── errorHandler.ts      — Global error handler + 404
│   ├── services/
│   │   ├── authService.ts       — Register/Login/Refresh/Logout/Profile
│   │   ├── burnService.ts       — Weight calc, VRF, prize selection, pool split, referral
│   │   ├── walletService.ts     — Deposit (dupe-check), Withdraw (2FA + whitelist)
│   │   ├── leaderboardService.ts— 4 rankings with privacy mode
│   │   └── twoFAService.ts      — TOTP generate, enable, disable, verify
│   ├── routes/
│   │   ├── authRoutes.ts        — 5 endpoints
│   │   ├── burnRoutes.ts        — 3 endpoints
│   │   ├── walletRoutes.ts      — 4 endpoints
│   │   └── miscRoutes.ts        — 7 endpoints (leaderboard + 2FA)
│   ├── websocket/socketHandler.ts— Live ticker, notifications, leaderboard updates
│   └── utils/
│       ├── prisma.ts, errors.ts, validators.ts
└── .env.example
```

### 19 API Endpoints

| Method | Endpoint | Auth | Service |
|--------|----------|------|---------|
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
| POST | `/api/wallet/withdraw` | ✅ | Withdraw (requires 2FA + whitelist) |
| GET | `/api/wallet/transactions` | ✅ | Filterable TX history |
| GET | `/api/leaderboard/winners` | ❌ | Top winners by prize |
| GET | `/api/leaderboard/burners` | ❌ | Top burners by count |
| GET | `/api/leaderboard/referrers` | ❌ | Top referrers by earnings |
| GET | `/api/leaderboard/ash` | ❌ | Top ASH holders |
| POST | `/api/2fa/generate` | ✅ | Generate TOTP secret + QR |
| POST | `/api/2fa/enable` | ✅ | Verify code + enable 2FA |
| POST | `/api/2fa/disable` | ✅ | Verify code + disable 2FA |

### Frontend API Client
[api.ts](file:///c:/Users/LENOVO/Desktop/ashnance/frontend/src/lib/api.ts) — Centralized client with auto JWT refresh, `api.auth.*`, `api.burn.*`, `api.wallet.*`, `api.leaderboard.*`, `api.twoFA.*`.

---

## What's Remaining

| Category | Items | Effort |
|----------|-------|--------|
| **PostgreSQL** | Set credentials in `.env`, run `prisma db push`, `npm run db:seed` | 5 min |
| **Real Integrations** | OAuth (Google/X), Solana wallet connect, Switchboard VRF | Medium |
| **Smart Contracts** | On-chain burn recording, VIP registry (Anchor) | Large |
| **Visual Effects** | 3D explosion (Three.js), ash particles, screen shake | Medium |
| **AI Chatbot** | AshBot popup, dynamic messages, TTS | Medium |
| **Admin Auth** | Role-based access for admin panel | Small |
| **Production** | Deployment, SSL, domain, monitoring | Medium |

## Docs in `ashnance/docs/`
All reference documents synced for cross-AI access.

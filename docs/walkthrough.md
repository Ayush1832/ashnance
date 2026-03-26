# Ashnance — Full Build Walkthrough

## Frontend (Sprints 1-3) ✅

### 8 Routes Built
| Route | Status | Key Features |
|-------|--------|-------------|
| `/` | ✅ | Hero, Ticker, How It Works, Prizes, Features, CTA, Footer |
| `/login` | ✅ | Email+OTP, Google/X/Telegram OAuth, Phantom/Solflare/Backpack |
| `/register` | ✅ | Username, Email, Referral Code, OTP |
| `/dashboard` | ✅ | Sidebar, USDC/ASH Balances, Stats Grid, Transactions, Live Ticker |
| `/burn` | ✅ | Amount Presets, Luck Meter, Weight Breakdown, Animation, Result |
| `/wallet` | ✅ | Deposit Address, Wallet Connect, Withdraw+2FA, Transaction History |
| `/leaderboard` | ✅ | 4 Tabs (Winners/Burners/Referrals/ASH), Podium, Rankings |
| `/referrals` | ✅ | Stats, Shareable Link, Social Shares, Activity Table |

### Screenshots
````carousel
![Login Page](C:\Users\LENOVO\.gemini\antigravity\brain\82a49905-b0be-4138-9713-5348769f58a0\login_page_1774504248012.png)
<!-- slide -->
![Dashboard](C:\Users\LENOVO\.gemini\antigravity\brain\82a49905-b0be-4138-9713-5348769f58a0\dashboard_bottom_1774504265256.png)
<!-- slide -->
![Burn Now](C:\Users\LENOVO\.gemini\antigravity\brain\82a49905-b0be-4138-9713-5348769f58a0\burn_initial_state_1774504477590.png)
<!-- slide -->
![Burn Result](C:\Users\LENOVO\.gemini\antigravity\brain\82a49905-b0be-4138-9713-5348769f58a0\burn_final_result_1774504511258.png)
````

---

## Backend ✅

### Architecture
```
backend/
├── prisma/schema.prisma      — 10 models, 7 enums
├── src/
│   ├── server.ts              — Express 5 + Socket.IO entry
│   ├── config.ts              — Centralized env + game constants
│   ├── middleware/
│   │   ├── auth.ts            — JWT auth + account lockout
│   │   └── errorHandler.ts    — Global error + 404
│   ├── services/
│   │   ├── authService.ts     — Register/Login/Refresh/Logout/Profile
│   │   ├── burnService.ts     — Weight calc, VRF, prize selection, referral
│   │   └── walletService.ts   — Deposit, Withdraw+2FA, TX history
│   ├── routes/
│   │   ├── authRoutes.ts      — POST register/login/refresh/logout, GET profile
│   │   ├── burnRoutes.ts      — POST burn, GET history/stats
│   │   └── walletRoutes.ts    — GET balance, POST deposit/withdraw, GET transactions
│   ├── websocket/
│   │   └── socketHandler.ts   — Live ticker, notifications, leaderboard updates
│   └── utils/
│       ├── prisma.ts          — Singleton client
│       ├── errors.ts          — 8 custom error classes
│       └── validators.ts      — Zod schemas (auth, burn, wallet, profile, admin)
└── prisma/seed.ts             — Prize configs + platform configs + reward pool
```

### Database Models (Prisma)
User, Wallet, Burn, Transaction, Referral, WhitelistedAddress, RefreshToken, PrizeConfig, PlatformConfig, RewardPool

### API Endpoints
| Method | Route | Auth | Description |
|--------|-------|------|------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Email+password login |
| POST | `/api/auth/refresh` | ❌ | Refresh JWT |
| POST | `/api/auth/logout` | ✅ | Revoke refresh token |
| GET | `/api/auth/profile` | ✅ | Get user profile + wallet |
| POST | `/api/burn` | ✅ | Execute burn (core gameplay) |
| GET | `/api/burn/history` | ✅ | Paginated burn history |
| GET | `/api/burn/stats` | ✅ | Win rate, total burns, biggest win |
| GET | `/api/wallet` | ✅ | Get balances |
| POST | `/api/wallet/deposit` | ✅ | Process deposit |
| POST | `/api/wallet/withdraw` | ✅ | Withdraw (requires 2FA) |
| GET | `/api/wallet/transactions` | ✅ | Filterable TX history |

### Build Status
- `npx tsc --noEmit` passes (0 errors)
- 218 npm packages installed
- Prisma client generated

---

## Artifacts Saved to `docs/`
All reference documents copied to `ashnance/docs/` for other AI models:
- `task.md` — Master task tracker
- `architecture.md` — System architecture
- `implementation_plan.md` — Sprint plan
- `feature_spec.md` — Business logic & formulas
- `design_guidelines.md` — Ignition Forge design system
- `walkthrough.md` — This document

## Next Steps
- Set up PostgreSQL and run `prisma db push`
- Connect frontend to backend API
- Solana smart contracts (Anchor)
- VIP subscription, ASH token, Admin panel

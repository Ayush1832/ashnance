# Ashnance — Project Guide for Claude

Competitive USDC burn-to-win platform on Solana. Users burn USDC, climb a leaderboard,
the #1 weight holder wins the pool when it fills.

## Tech Stack

**Backend** (`/backend`)
- Node.js + Express 5 + TypeScript (strict)
- Prisma 6 + PostgreSQL
- Socket.IO for real-time events
- JWT auth (access 15min + refresh 7d)
- Solana web3.js for on-chain USDC + ASH transfers
- pm2 for process management on VPS

**Frontend** (`/frontend`)
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (zero-config) + shadcn/ui (only `sonner` kept)
- Socket.IO client for live updates
- Custom design system in `src/components/ashnance/`
- Deployed on Vercel

**Infra**
- Backend: VPS at api.ashnance.com (pm2 → port 4000 → nginx → letsencrypt)
- Frontend: Vercel at www.ashnance.com (canonical) / ashnance.com (redirects)
- DB: Postgres on the same VPS (port 5433)
- Solana RPC: Helius (or fallback to public devnet)

## File Conventions

### Frontend
- Pages: `frontend/src/app/{route}/page.tsx` — all `"use client"`, all wrapped in `<AppShell>`
- Auth pages: `frontend/src/app/(auth)/{login,register}/page.tsx` — wrapped in `<AuthShell>`
- Components:
  - `components/ashnance/` — domain components (AppShell, AuthShell, primitives, LiveBurnFeed, etc)
  - `components/ui/sonner.tsx` — the only shadcn primitive kept
  - `components/effects/` — visual effects (CoinBurn3D)
- Hooks: `frontend/src/hooks/{useAuth,useToasts}.ts`
- Libs: `frontend/src/lib/{apiClient,userStore,socketClient,solana,wallets,format,types,utils,mock}.ts`

### Backend
- Routes: `backend/src/routes/{auth,burn,wallet,round,vip,staking,referrals,admin,owner,misc}Routes.ts`
- Services: `backend/src/services/*Service.ts`
- Middleware: `backend/src/middleware/{auth,adminAuth,ownerAuth,errorHandler}.ts`

## Design System (Ashnance)

Colors (CSS variables in `globals.css`):
- `--fire` / `text-fire` / `bg-fire` — primary orange (#FF4500-ish via oklch)
- `--ash` — gray for ASH token amounts
- `--gold` — yellow for VIP / winners
- `--background` — near-black
- `--muted` / `--muted-foreground` — sidebar/cards
- `--success`, `--warning`, `--danger`, `--border`

USDC color uses a custom oklch: `text-[oklch(0.7_0.13_245)]` (blue).

Always use the shared primitives in `components/ashnance/primitives.tsx`:
- `<GlassCard ring?>` — glass-morphism card with optional fire ring
- `<FireButton size="sm|md|lg|xl" type?>` — primary CTA
- `<GhostButton size>` — secondary CTA
- `<StatTile label value sub? accent>` — stat display
- `<RankBadge rank>` — leaderboard ranks (1-3 get medal emojis)
- `<FireProgress value max label?>` — progress bar
- `<SectionHeader eyebrow title sub>` — page header
- `<StatusBadge status>` — transaction status pills

Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (numbers/addresses) — loaded via Google Fonts in `globals.css`.

## State & Data Flow

- **User profile**: `userStore` (module-level reactive) — subscribe via `useAuth()`
- **API**: all calls go through `lib/apiClient.ts` (NOT the old `lib/api.ts` — that's deleted)
- **mapProfile()**: ALWAYS use when setting userStore from a backend response — it normalises field names (`isVip` → `vip`, `privacyMode` → `privacy`, etc.)
- **Real-time**: `lib/socketClient.ts` — events: `burn:new`, `round:progress`, `leaderboard:update`, `round:ended`, `deposit:confirmed`, `referral:earned`
- **Auth tokens**: `localStorage.accessToken` (15min JWT) + `refreshToken` (7d). apiClient auto-refreshes when needed.

## Anti-patterns — DON'T

- Don't use inline styles unless value is dynamic (`style={{ width: pct + '%' }}` is fine, `style={{ color: 'red' }}` is not)
- Don't create new shadcn components — use the ashnance primitives or write minimal Tailwind
- Don't import from `@/lib/api` (deleted) — use `@/lib/apiClient`
- Don't import from `@/components/ui/*` (all deleted except sonner)
- Don't directly mutate userStore with raw backend data — pipe through `mapProfile()`
- Don't add new mock data in `lib/mock.ts` — only pure calculation helpers belong there
- Don't `console.log` in production code paths (network/db spam) — only in tests/dev tools
- Don't add try/catch with empty body just to swallow errors — handle or rethrow
- Don't use `any` unless interfacing with untyped 3rd party APIs

## Conventions

- All pages must work on mobile-first (smallest breakpoint), then layer in `sm:` / `md:` / `lg:`
- All money values: use `fmtUsd(n)` / `fmtNum(n, digits)` from `lib/format.ts`
- All dates: use `timeAgo()` / `countdown()` from `lib/format.ts`
- Solana addresses: display truncated with `truncate(addr, 4|6)` from `lib/solana.ts`
- Toasts via `sonner` — `toast.success("...")` / `toast.error("...")` — never `alert()`

## Backend ↔ Frontend Contract

Backend returns standardized: `{ success: boolean, data?: any, error?: string }`.
The apiClient unwraps this and returns just `{ success, data }`.

Profile shape (from `GET /api/auth/profile`):
- Backend sends: `{ id, email, username, role, isOwner, isVip, vipTier, vipExpiresAt, privacyMode, twoFaEnabled, recoveryCodesRemaining, solanaAddress, referralCode, createdAt, wallet: { usdcBalance, ashBalance, depositAddress, ashBoostExpiresAt } }`
- Frontend `User` type is flatter — `mapProfile()` does the conversion.

Socket payloads:
- `burn:new`: `{ user, amount, ashReward, weight, timestamp }` — NOTE: field is `user` not `username`
- `round:progress`: `{ currentPool, targetPool, progressPercent, timestamp }`
- `leaderboard:update`: empty payload — re-fetch round to get updated leaderboard
- `round:ended`: `{ roundNumber, winner, prize, timestamp }`
- `deposit:confirmed`: `{ amount }` — user-specific room
- `referral:earned`: `{ amount, from }` — user-specific room

## Workflow

- TypeScript strict mode is enabled on both sides — `npx tsc --noEmit` must pass before commit
- Backend build: `prisma generate && tsc` (the generate step is critical — TransactionType enum lives there)
- Frontend build: `next build` (currently has `ignoreBuildErrors: true` to avoid OOM on low-mem builds)
- Tests: backend has Jest tests in `src/__tests__/` and `src/tests/` — keep passing
- Don't run `npm run build` in frontend during dev — user's laptop hangs. Ask first.

## Production Environment

Required env vars (validated at startup in `backend/src/config.ts`):
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (min 32 chars, not the dev defaults)
- `DATABASE_URL`, `FRONTEND_URL`, `BACKEND_URL`
- `MASTER_KEYPAIR_SECRET` — Solana Ed25519 keypair as JSON array
- `OWNER_1_WALLET`, `OWNER_2_WALLET` — for profit pool 60/40 split
- `OWNER_EMAILS` — comma-separated, controls owner panel access

Optional but warned:
- `SMTP_USER`, `SMTP_PASS` — for OTP login, withdrawal alerts, critical owner alerts
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `SOLANA_RPC_URL` — defaults to `api.devnet.solana.com` (rate-limited)
- `USDC_MINT` — defaults to devnet test mint

## Commands

```bash
# Frontend dev
cd frontend && npm run dev

# Backend dev
cd backend && npm run dev

# DB migrations
cd backend && npx prisma migrate dev --name <description>

# Type check
cd backend && npx prisma generate && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Production deploy (auto-triggered by GitHub Actions on push to main)
git push origin main
```

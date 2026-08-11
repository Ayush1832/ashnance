# Ashnance — Project Guide for Claude

Competitive USDC burn-to-win platform on Solana. Users burn USDC, climb a leaderboard,
the #1 weight holder wins the pool when it fills.

## MCP usage — proactively use these tools, don't wait to be asked

The user installed Playwright, Chrome DevTools, and shadcn MCPs deliberately. Default to using them whenever the task fits, even if the prompt doesn't mention them. The user's prompts will often be terse ("fix this", "build that") — interpret the intent and reach for the right tool.

### Playwright MCP — use AUTOMATICALLY when:
- Building or changing any UI component / page / layout → verify it renders by navigating + screenshotting at 1440×900 desktop AND 375×667 mobile before claiming done
- User reports something "looks broken", "doesn't work", "blank", "weird on mobile" → reproduce in browser before guessing
- User mentions a specific URL, route, or visible behavior → navigate there and observe
- Debugging an interaction (click, submit, redirect) → drive the browser through it
- After any change touching `app/**/*.tsx`, `components/**/*.tsx`, `globals.css`, primitives

Workflow: start `npm run dev` in background (only if not already running), navigate, wait for content, screenshot, check `browser_console_messages` for errors, check `browser_network_requests` for failed API calls. Examine the screenshots you take — don't just collect them.

### Chrome DevTools MCP — use AUTOMATICALLY when:
- Investigating a network / API issue ("the request isn't going through", "401 errors", "CORS")
- Debugging a runtime error the user can see in console
- Checking why something on a deployed (live) URL is misbehaving — DevTools MCP works against any URL, not just localhost
- Performance complaints ("slow", "laggy") → record performance trace

### shadcn MCP — use AUTOMATICALLY when:
- User asks for a component type (dialog, dropdown, command palette, calendar, etc) and we don't have one
- Before writing custom UI primitives from scratch, check if shadcn has a registry component that fits
- Match the existing project style — our only shadcn primitive is `sonner`; adding new ones is fine but they need to be skinned with Ashnance design tokens (fire/ash/gold) not the default shadcn neutrals

### When NOT to use these tools
- Pure backend changes (services, routes, schema) with no UI surface — Playwright adds nothing
- Reading code to answer a question — Read/Grep are faster
- Tiny one-line fixes where the change is self-evidently correct

### What "don't wait to be asked" means in practice
- User says "the dashboard is broken" → navigate to /dashboard, screenshot, look at console — don't ask "should I check it in browser?"
- User says "add a settings dropdown" → check shadcn for a dropdown-menu first, don't reinvent it
- User says "deploy is failing" → use Chrome DevTools to inspect the live error, don't only read logs

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

## Creator Prize Pools (implemented)

A second, fully isolated core feature: verified creators/influencers launch their own branded
prize pools; their followers contribute USDC into that pool only; the creator earns a
configurable revenue % automatically on every contribution; one (or more) winner is decided by
a **Weight** system per pool — same philosophy as the Global Pool, but evolved into a strategic
**Battle System**. Global Pool code (`Round`, `Burn`, `Wallet.cumulativeWeight`, `RewardPool`)
is a tightly-coupled singleton (one ACTIVE round platform-wide) and is NOT touched or reused —
Creator Pools are entirely separate models, services, and routes so the two systems never
interfere with each other. All schema changes were applied additively (`prisma db push`,
diff-checked before every apply — this project doesn't use `prisma migrate`, schema sync has
always been push-based) and re-verified end-to-end against production with a throwaway test
account, then cleaned up.

### Isolation strategy
- No shared `Round`/`Burn` rows. Creator Pools are their own Prisma models (`Creator`,
  `CreatorPool`, `CreatorPoolContribution`, `CreatorPoolParticipant`, `CreatorPoolWinner`,
  `CreatorWallet`, `CreatorWithdrawalRequest`, `CreatorFollower`, `BattleEvent`).
- Each `CreatorPool` is one self-contained campaign instance (like a `Round`) with its own
  lifecycle: `DRAFT → ACTIVE ⇄ PAUSED → ENDED → ARCHIVED` (+ `FROZEN` for admin intervention).
  "Duplicate previous pool" clones config into a fresh `DRAFT`/`ACTIVE`, it does not reopen the
  old one. `endPool` (creator- or effectively admin-triggered via freeze/unfreeze) pays out the
  full `currentPoolValue` to the top `numberOfWinners` participants by weight, proportional to
  their weight share, in one transaction — logged as `POOL_PRIZE` transactions.
- Platform-fee cut of every contribution routes into the **existing** `ProfitPool` table —
  reuses the owner dual-approval withdrawal tooling (`ownerService.ts`,
  `OwnerWithdrawalRequest`) instead of building a second payout pipeline. Creator revenue cut
  goes to `CreatorWallet.usdcBalance`; creators request withdrawals
  (`CreatorWithdrawalRequest`, own status machine `PENDING → PROCESSING → COMPLETED/FAILED`,
  or `REJECTED`) which an admin approves — execution reuses
  `BlockchainService.sendUsdcTransfer` with the same reserve-before-send, never-auto-refund-an-
  unconfirmed-tx safety pattern as `WalletService.processWithdrawal`.
- New pools are **auto-live** once a creator is verified (no per-pool admin approval) — admin
  verifies the creator once via `/api/admin/creator/:id/verify` (which also flips any pending
  `DRAFT` pools to `ACTIVE`), then that creator can be frozen/unfrozen after the fact via
  `requireAdmin`.
- Public pages live at `/pool/[creatorSlug]/[poolSlug]` (not `/@handle` — collides with existing
  root routes like `/dashboard`, `/wallet`).
- Creator referral links (`Creator.referralCode`) associate a visiting user with a creator via
  `CreatorFollower` (`joinedVia: "direct" | "referral"`) — a separate graph from the platform-wide
  `User.referralCode` used by the Global Pool's referral system; the two never interact.

### Weight & Battle System (core gameplay difference from Global Pool)
- `CreatorPoolParticipant.weight` starts from contributions (`weight += prizeAllocation` per
  contribution), but is **mutable mid-round** through ASH-funded strategic actions — the
  "Battle System," implemented in `battleService.ts`.
- Action types (`BattleActionType` enum): `ATTACK`, `SHIELD`, `COUNTER`, `BOOST`, `RECOVERY` —
  every action consumes ASH from the actor's existing `Wallet.ashBalance` (no new currency).
  Fixed ASH costs (`ATTACK` 10–200 variable, `SHIELD` 8, `COUNTER` 12, `BOOST` 15, `RECOVERY`
  10) live as constants at the top of `battleService.ts`.
- Every action writes an immutable `BattleEvent` row (actor, target?, type, ashSpent,
  weightDelta, resultMeta json) — full audit trail, exposed read-only via
  `GET /api/battle/:poolId/log`.
- Fairness constraints, enforced server-side in `battleService.ts`:
  - `calculateAttackEffect()` is the single pure function for attack math — raw loss is capped
    at 5% of the defender's current weight (`MAX_ATTACK_PCT_OF_DEFENDER_WEIGHT`), scales with
    `sqrt(ashSpent)` (diminishing returns on overspending, same shape as `BurnService`'s weight
    cap), and repeat-targeting the same defender within 24h halves the effect each time
    (floored at 10%).
  - `SHIELD` absorbs 50% of realized incoming attack damage for 1h; a shielded target's
    realized loss is always ≤ the raw attack roll.
  - `COUNTER` (5 min window after being attacked) reflects 50% of the last attack's damage back
    onto the attacker and heals the defender 50% of it — reads the actual last `BattleEvent`
    for magnitude, not an estimate.
  - `RECOVERY` restores 50% of `weightLostSinceRecovery` (an accumulator that only decreases as
    it's spent, never a full reset, so repeated recovery has diminishing value).
  - Rate limits: a 30s cooldown between *any* two actions by the same actor in a pool
    (`lastActionAt`), plus a separate 1h cooldown just for `BOOST` (`lastBoostAt`), plus an
    IP-level `express-rate-limit` backstop (20/min) on the route itself.
- This is additive utility for ASH — it does not touch `BurnService`'s ASH emission/reward math
  for the Global Pool.

### Backend surface
- Routes: `creatorRoutes.ts` (`/api/creator/*` — profile, pool CRUD/lifecycle/end,
  withdrawals, referral stats, pool analytics), `publicPoolRoutes.ts` (`/api/pools/*` — public
  pool page, contribute, follow-via-referral), `battleRoutes.ts` (`/api/battle/*` — perform
  action, read battle log), `adminCreatorRoutes.ts` (`/api/admin/creator/*` — verify/unverify,
  freeze/unfreeze pools, approve/reject withdrawals, contribution audit feed).
- Middleware: `creatorAuth.ts` exports `requireCreator` (auth + must own a `Creator` row,
  attaches `req.creator`) and `assertPoolOwnership` — a distinct tier from
  `requireAdmin`/`requireOwner`, not a reuse of either.
- Services: `creatorService`, `creatorPoolService` (CRUD/lifecycle/`endPool` payout),
  `creatorContributionService` (transactional split: prize / creator revenue / platform fee,
  mirrors `BurnService`'s split pattern but pool-scoped), `creatorAnalyticsService` (pool
  stats — deliberately has **no** conversion-rate field since there's no page-visit tracking to
  compute one from; everything else is real, not fabricated), `creatorReferralService`,
  `creatorWithdrawalService`, `battleService` (kept isolated so gameplay tuning doesn't risk
  the money-moving services).
- Socket events (additive to the closed `EventName` union in `socketClient.ts`): scoped to a
  `pool:{poolId}` room, joined via `socket.joinPool(id)`/`leavePool(id)` —
  `creatorPool:contribution`, `creatorPool:progress`, `creatorPool:battle`,
  `creatorPool:started`, `creatorPool:ended`, `creatorPool:winner`. Never reuses the Global
  Pool's `round`/`ticker`/`leaderboard` rooms or event names.

### Frontend surface
- `frontend/src/app/creator/dashboard/page.tsx` — profile claim, pool CRUD/lifecycle
  (pause/resume/archive/duplicate/end), inline per-pool analytics toggle, withdrawal
  request panel, referral link + stats panel.
- `frontend/src/app/pool/[creatorSlug]/[poolSlug]/page.tsx` — public campaign page:
  contribution form, live leaderboard (by weight), Battle System action panel (attack target
  picker + 5 action buttons), live battle log, winner history. Captures `?ref=` into a
  creator-follow call on first load for a signed-in visitor.
- `frontend/src/app/admin/page.tsx` — new "Creator Pools" tab: verify/unverify creators,
  approve/reject pending withdrawals.
- No new primitives were needed — battle/analytics/withdrawal UI reuses
  `components/ashnance/primitives.tsx` (`GlassCard`, `GhostButton`, `StatusBadge`, etc.).

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

# Ashnance — Implementation Status

> This document records what has been built. Updated April 2026.

---

## What Was Built

### Phase 1 — Core Backend + Auth
- ✅ Express + TypeScript server setup with CORS, rate-limiting, error handling
- ✅ PostgreSQL + Prisma schema (users, wallets, burns, transactions, rounds, referrals, staking)
- ✅ JWT auth with refresh token rotation
- ✅ Email/password registration and login
- ✅ Email OTP login (6-digit code via Gmail SMTP)
- ✅ Google OAuth (email link-back for existing accounts)
- ✅ Phantom wallet authentication (off-chain signature verification)
- ✅ Link Phantom to existing email account
- ✅ 2FA (TOTP via Speakeasy, Google Authenticator compatible)

### Phase 2 — Wallets + Blockchain
- ✅ Unique Solana deposit addresses per user (deterministic HD derivation)
- ✅ Deposit monitor: polls on-chain every 15s, credits USDC, sweeps to master wallet
- ✅ Manual deposit: user provides tx hash → verified and credited
- ✅ Withdrawal: deducts from in-app balance, sends USDC on-chain from master wallet
- ✅ Withdrawal security: requires 2FA + whitelisted Solana address
- ✅ Whitelist management: add/remove withdrawal addresses with 24h cooldown
- ✅ On-chain balance query endpoint for any Solana address
- ✅ Transaction history with type filtering and pagination
- ✅ Operating on **Solana devnet**; USDC mint configured via env var

### Phase 3 — Burn System + Round Competition
- ✅ Burn execution: USDC deduction → pool split → weight → ASH reward
- ✅ Round system: ACTIVE → COMPLETED/CANCELLED lifecycle
- ✅ Per-round prize pool: 50% of each burn added to active round's pool
- ✅ Round ends automatically when pool target is reached
- ✅ Round auto-ends by time limit (background scheduler every 60s)
- ✅ ASH boost: 1-hour weight bonus activated with 1,000 ASH
- ✅ Burn history and stats endpoints

### Phase 4 — 11 Balance Requirements
- ✅ req #1: Soft reset — non-winner wallets × 0.90 after each round
- ✅ req #2: Winner reset — winner's cumulativeWeight → 0
- ✅ req #3: Weight cap — max 300, diminishing returns via √ formula
- ✅ req #4: Referral limit — referral bonus ≤ 40% of total weight
- ✅ req #5: Anti-domination — winner of round N cannot win round N+1
- ✅ req #6: Time limit — configurable hours, auto-ends with force mode
- ✅ req #7: Prize safety — prize ≤ 70% of reward pool balance
- ✅ req #8: Anti-snipe — rank #1 must hold for ≥10s before round ends
- ✅ req #9: Live leaderboard — top 10 + user rank outside top 10 + distanceToFirst
- ✅ req #10: Progress bar — real-time % fill on leaderboard page
- ✅ req #11: Admin config — all 5 parameters editable in owner panel

### Phase 5 — Referral + VIP + Staking
- ✅ Referral system: 10% commission per referee burn, credited instantly
- ✅ Referral weight bonus: +0.20 per 5 active referrals (capped at 40%)
- ✅ Holy Fire VIP: $24.99/mo from USDC balance, +0.50 weight, +20% ASH
- ✅ ASH staking: 3 pools (EMBER 8%, FLAME 15%, INFERNO 30%), lock periods, claim rewards

### Phase 6 — Frontend
- ✅ Landing page with live ticker, hero, "how it works"
- ✅ Login page: email/password, OTP, Google OAuth, Phantom wallet
- ✅ Register page: email/username/password/referral code
- ✅ Dashboard: balances, round status, recent transactions, on-chain balance
- ✅ Burn page: amount selector, boost panel, round progress, recent burns
- ✅ Wallet page: deposit (Phantom), withdraw, balance, deposit address copy
- ✅ Leaderboard page: round progress bar, top 10, distance-to-#1, user rank
- ✅ Referrals page: referral link, share buttons, stats, top referrers
- ✅ Subscribe page: Holy Fire VIP card + subscribe button
- ✅ Staking page: pool list, stake/claim/unstake, active positions
- ✅ Transactions page: full history with type filter and search
- ✅ Settings page: profile, security (2FA, password), connected wallets, whitelist
- ✅ Admin panel: stats, prize config, pool, users, config management
- ✅ Owner panel: profit pool, withdrawals, burn config, balance rules, round management
- ✅ Owner login page: separate login for owner email

### Phase 7 — Owner Profit System
- ✅ Profit pool accumulates 50% of every burn
- ✅ Two-signature withdrawal: Owner 1 initiates, Owner 2 approves
- ✅ On-chain payout: Owner 1 gets 60%, Owner 2 gets 40%
- ✅ Solvency check: on-chain USDC vs DB liabilities

---

## What Was Not Built (Planned but Descoped)

| Feature | Reason |
|---------|--------|
| Anchor smart contracts | Full off-chain system is faster to build and test |
| Switchboard VRF | No per-burn random outcome in round-based system |
| Three.js / GSAP fire effects | CSS animations used instead |
| AI assistant (AshBot) | Deferred |
| Voice announcements (TTS) | Deferred |
| Social share cards | Deferred |
| X/Twitter/Facebook OAuth | Only Google OAuth implemented |
| Prize tiers (Jackpot/Big/Medium/Small) | Replaced by round winner-takes-all |
| AI/Gemini integration | Not needed for current system |

---

## Database: How to Apply Schema

Using `prisma db push` (not `migrate dev`) because the dev environment does not have
permission to create the shadow database required by `migrate dev`.

```bash
cd backend
npx prisma db push      # sync schema to DB
npx prisma generate     # regenerate Prisma client
```

On VPS after each pull, run the same commands before restarting the server.

---

## Known Technical Decisions

| Decision | Reason |
|----------|--------|
| No Anchor/smart contracts | Game logic is off-chain; Solana used only for USDC I/O |
| `cumulativeWeight` in wallets table | Persistent meta-game stat; reset each round via raw SQL |
| Round leaderboard from `burn.finalWeight` sum | Per-round competition; each round starts fresh |
| `$executeRaw` for soft reset | Prisma `updateMany` doesn't support multiply — raw SQL required |
| `setInterval` instead of cron library | Simpler; 60s round checker doesn't need precise scheduling |
| Master keypair as env var | No HSM available on devnet; rotate before mainnet |
| `db push` not `migrate` | Shadow DB permission error on local PostgreSQL setup |

# Ashnance — Feature Specification

> Current as of April 2026. Reflects what is **actually built and running** in the codebase.
> No per-burn win/lose system. No prize tiers. No smart contracts.

---

## Section → Code Mapping

| Feature | Frontend Page | Backend Service/Route | Status |
|---------|---------------|----------------------|--------|
| Landing page | `app/page.tsx` | — | ✅ Built |
| Registration | `app/(auth)/register/page.tsx` | `authService`, `POST /auth/register` | ✅ Built |
| Login (email/pass) | `app/(auth)/login/page.tsx` | `authService`, `POST /auth/login` | ✅ Built |
| Login (OTP) | `app/(auth)/login/page.tsx` | `authService`, `POST /auth/send-otp`, `/auth/verify-otp` | ✅ Built |
| Login (Google OAuth) | `app/auth/callback/page.tsx` | `authService`, `/auth/google` | ✅ Built |
| Wallet connect | `app/connect-wallet/page.tsx` | `authService`, `POST /auth/wallet` | ✅ Built |
| Dashboard | `app/dashboard/page.tsx` | `auth/profile`, `wallet`, `round/current` | ✅ Built |
| Burn Now | `app/burn/page.tsx` | `burnService`, `POST /burn` | ✅ Built |
| ASH Boost | `app/burn/page.tsx` (boost panel) | `burnService`, `POST /burn/boost` | ✅ Built |
| Wallet deposit | `app/wallet/page.tsx` | `walletService`, `POST /wallet/deposit` | ✅ Built |
| Wallet withdraw | `app/wallet/page.tsx` | `walletService`, `POST /wallet/withdraw` | ✅ Built |
| Whitelist addresses | `app/settings/page.tsx` (Addresses tab) | `walletService`, `/wallet/whitelist` | ✅ Built |
| Referral program | `app/referrals/page.tsx` | `referralService`, `leaderboardService` | ✅ Built |
| VIP subscription | `app/subscribe/page.tsx` | `vipService`, `POST /vip/subscribe` | ✅ Built |
| Transaction history | `app/transactions/page.tsx` | `walletService`, `GET /wallet/transactions` | ✅ Built |
| Round leaderboard | `app/leaderboard/page.tsx` | `roundService`, `GET /round/leaderboard` | ✅ Built |
| Round progress bar | `app/leaderboard/page.tsx` | `roundService`, `GET /round/current` | ✅ Built |
| ASH Staking | `app/staking/page.tsx` | `stakingService`, `/staking/*` | ✅ Built |
| 2FA setup | `app/settings/page.tsx` (Security tab) | `twoFAService`, `/2fa/*` | ✅ Built |
| Profile settings | `app/settings/page.tsx` (Profile tab) | `authService`, `PUT /auth/profile` | ✅ Built |
| Admin panel | `app/admin/page.tsx` | `adminService`, `/admin/*` | ✅ Built |
| Owner panel | `app/owner/page.tsx` | `ownerService`, `/owner/*` | ✅ Built |
| Owner login | `app/owner-login/page.tsx` | email-gated via `requireOwner` | ✅ Built |

**Not built (planned in original spec):** Anchor smart contracts, Switchboard VRF, Three.js 3D fire effects, AI assistant, voice announcements, social share cards, prize tier table.

---

## Weight Calculation (Current Implementation)

```
baseWeight = burnAmount ÷ base_unit (4.99)

vipBonus = +0.50 if user is Holy Fire VIP and subscription is active

boostBonus = +0.50 if wallet.boostExpiresAt > now (1-hour ASH boost)

rawReferralBonus = floor(activeReferrals / 5) × 0.20

── Referral Cap (req #4) ──
referralCapPct = referral_weight_cap_pct (default 0.40)
nonReferralWeight = baseWeight + vipBonus + boostBonus
maxReferralBonus = (referralCapPct / (1 - referralCapPct)) × nonReferralWeight
referralBonus = min(rawReferralBonus, maxReferralBonus)

rawTotalWeight = baseWeight + vipBonus + referralBonus + boostBonus

── Weight Cap (req #3) ──
weightCap = weight_cap (default 300)
finalWeight = rawTotalWeight                              (if ≤ weightCap)
            = weightCap + √(rawTotalWeight − weightCap)  (if > weightCap)
```

Code: `backend/src/services/burnService.ts` — `BurnService.executeBurn()`

---

## Round Mechanics (Current Implementation)

There is **no per-burn win/lose random outcome**. Burns always:
1. Deduct USDC from wallet
2. Increment the round's prize pool (50% of burn)
3. Add finalWeight to user's per-round rank
4. Award ASH tokens to the burner

The **winner is determined once**, when the round ends:
- Winner = ranked #1 by total `burn.finalWeight` accumulated within the round
- Subject to anti-snipe, anti-domination, and prize safety checks (see below)

### Balance Rules (All Active)

| Rule | Config Key | Default | Code |
|------|-----------|---------|------|
| req #1 Soft reset | — | 0.90× | `roundService.endRound` → `$executeRaw` |
| req #2 Winner reset | — | 0 | `roundService.endRound` → `wallet.update` |
| req #3 Weight cap | `weight_cap` | 300 | `burnService.executeBurn` |
| req #4 Referral limit | `referral_weight_cap_pct` | 0.40 | `burnService.executeBurn` |
| req #5 Anti-domination | — | skip #1 if won prev round | `roundService.endRound` |
| req #6 Time limit | `round_time_limit_hours` | 24h | `roundService.autoEndExpiredRounds` |
| req #7 Prize safety | `prize_safety_pct` | 0.70 | `roundService.endRound` |
| req #8 Anti-snipe | `anti_snipe_seconds` | 10s | `roundService.endRound` |
| req #9 Live leaderboard | — | top 10 + user rank | `roundService.getRoundLeaderboard` |
| req #10 Progress bar | — | % overlay | `leaderboard/page.tsx` |
| req #11 Admin config | — | owner panel | `ownerRoutes.ts` + `owner/page.tsx` |

---

## API Routes Reference

### Auth — `/api/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create account (email/username/password/referralCode) |
| POST | `/login` | Login with email + password |
| POST | `/send-otp` | Send 6-digit OTP to email |
| POST | `/verify-otp` | Verify OTP → returns JWT |
| GET | `/profile` | Get current user profile |
| PUT | `/profile` | Update username, avatarUrl, privacyMode, country |
| PUT | `/password` | Change password |
| POST | `/logout` | Invalidate refresh token |
| POST | `/wallet` | Login/register via Phantom wallet signature |
| POST | `/link-wallet` | Link Phantom to existing account |
| GET | `/google` | Start Google OAuth flow |
| GET | `/google/callback` | OAuth callback → redirect to frontend |

### Burn — `/api/burn`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Execute burn: deducts USDC, adds weight, awards ASH |
| GET | `/history` | Burn history (paginated) |
| GET | `/stats` | Burn stats (total burns, total burned, weight) |
| POST | `/boost` | Activate 1-hour ASH boost (costs 1,000 ASH) |
| GET | `/boost-status` | Current boost status + secondsLeft |

### Wallet — `/api/wallet`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | In-app wallet balances + deposit address |
| POST | `/deposit` | Verify tx hash + credit USDC |
| POST | `/withdraw` | Withdraw USDC (requires 2FA + whitelisted address) |
| GET | `/transactions` | Transaction history (paginated, filterable by type) |
| GET | `/platform-info` | Platform USDC address |
| GET | `/onchain/:address` | On-chain USDC balance for any address |
| GET | `/whitelist` | List whitelisted withdrawal addresses |
| POST | `/whitelist` | Add withdrawal address |
| DELETE | `/whitelist/:id` | Remove withdrawal address |

### Round — `/api/round`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/current` | Active round + caller's rank (auth required) |
| GET | `/current/public` | Active round status (no auth) |
| GET | `/leaderboard` | Top 10 + user rank/weight/distanceToFirst |
| GET | `/history` | Last 10 completed rounds |

### Owner — `/api/owner` (requires OWNER_EMAIL)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Verify owner access |
| GET | `/stats` | Platform-wide stats |
| GET | `/profit-pool` | Profit pool balance + withdrawal history |
| GET | `/withdrawal/pending` | Current pending withdrawal |
| POST | `/withdrawal/initiate` | Start 2-of-2 withdrawal |
| POST | `/withdrawal/approve/:id` | Approve pending withdrawal |
| POST | `/withdrawal/cancel/:id` | Cancel pending withdrawal |
| GET | `/burn-config` | All PlatformConfig values |
| PUT | `/burn-config` | Update config values (body: `{ key: value }`) |
| GET | `/solvency` | On-chain vs liabilities solvency report |
| GET | `/rounds` | All rounds (active + history) |
| POST | `/round` | Create new round (`prizePoolTarget`, `timeLimitHours`) |
| POST | `/round/:id/end` | Force-end round (`{ "force": true }` to skip anti-snipe) |
| POST | `/round/:id/cancel` | Cancel round without paying |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leaderboard/winners` | Top 10 round winners all-time |
| GET | `/api/leaderboard/burners` | Top 10 by total USDC burned |
| GET | `/api/leaderboard/referrers` | Top 10 by referral earnings |
| GET | `/api/leaderboard/ash` | Top 10 ASH holders |
| POST | `/api/2fa/generate` | Generate TOTP secret + QR |
| POST | `/api/2fa/enable` | Confirm and enable 2FA |
| POST | `/api/2fa/disable` | Disable 2FA |
| GET | `/api/vip/status` | Current VIP subscription status |
| POST | `/api/vip/subscribe` | Subscribe to Holy Fire ($24.99, tier: `"HOLY_FIRE"`) |
| GET | `/api/staking/pools` | Available staking pools |
| GET | `/api/staking/positions` | User's staking positions |
| POST | `/api/staking/stake` | Stake ASH into a pool |
| POST | `/api/staking/claim/:id` | Claim pending rewards |
| POST | `/api/staking/unstake/:id` | Unstake (after lock period) |
| GET | `/api/health` | Server health check |

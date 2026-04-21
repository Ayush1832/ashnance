# Ashnance — Complete Test Cases

> **For testers.** Covers every feature, flow, edge case, and validation in the platform. Each test case specifies: what to test, how to execute it, and what the expected result is.

---

## Table of Contents

1. [Authentication Tests](#1-authentication-tests)
2. [Wallet & Deposit Tests](#2-wallet--deposit-tests)
3. [Withdrawal Tests](#3-withdrawal-tests)
4. [Burn Mechanic Tests](#4-burn-mechanic-tests)
5. [Weight Formula Tests](#5-weight-formula-tests)
6. [ASH Reward Tests](#6-ash-reward-tests)
7. [Round System Tests](#7-round-system-tests)
8. [Anti-Snipe & Anti-Domination Tests](#8-anti-snipe--anti-domination-tests)
9. [Prize Safety Tests](#9-prize-safety-tests)
10. [VIP Subscription Tests](#10-vip-subscription-tests)
11. [Referral System Tests](#11-referral-system-tests)
12. [Staking Tests](#12-staking-tests)
13. [2FA Tests](#13-2fa-tests)
14. [Leaderboard Tests](#14-leaderboard-tests)
15. [WebSocket Tests](#15-websocket-tests)
16. [Admin Panel Tests](#16-admin-panel-tests)
17. [Owner Panel Tests](#17-owner-panel-tests)
18. [Blockchain Integration Tests](#18-blockchain-integration-tests)
19. [Token & Session Tests](#19-token--session-tests)
20. [Error Handling & Edge Cases](#20-error-handling--edge-cases)
21. [Security Tests](#21-security-tests)

---

## 1. Authentication Tests

### TC-AUTH-001 — Register with email and password

**Steps:**
1. Send `POST /api/auth/register` with `{ email, username, password: "testpass123" }`

**Expected:**
- `201 Created`
- Response contains `accessToken` and `refreshToken`
- User record created in DB
- Wallet created with `usdcBalance=0`, `ashBalance=0`
- Unique deposit address generated
- Unique 12-char hex `referralCode` in response

---

### TC-AUTH-002 — Register with OTP (passwordless)

**Steps:**
1. Send `POST /api/auth/send-otp` with `{ email }`
2. Get the OTP from the email inbox (or DB for devnet)
3. Send `POST /api/auth/verify-otp` with `{ email, otp }`
4. Send `POST /api/auth/register` with `{ email, username }` (no password)

**Expected:**
- OTP email received within 30 seconds
- Registration succeeds after OTP verified
- Tokens issued in register response

---

### TC-AUTH-003 — Register with duplicate email

**Steps:**
1. Register user with `email@test.com`
2. Register again with same `email@test.com`

**Expected:**
- Second request returns `409 Conflict`
- Error message: email already taken

---

### TC-AUTH-004 — Register with duplicate username

**Steps:**
1. Register user with `username = "testuser"`
2. Register another user with same username

**Expected:**
- `409 Conflict`

---

### TC-AUTH-005 — Register with weak password

**Steps:**
1. Send `POST /api/auth/register` with `password: "short"`

**Expected:**
- `400 Bad Request`
- Validation error about minimum password length (8 chars)

---

### TC-AUTH-006 — Login with correct credentials

**Steps:**
1. Send `POST /api/auth/login` with `{ email, password }`

**Expected:**
- `200 OK`
- `data.accessToken` — JWT, expires in 15 minutes
- `data.refreshToken` — JWT, expires in 7 days

---

### TC-AUTH-007 — Login with wrong password

**Steps:**
1. Send `POST /api/auth/login` with correct email, wrong password

**Expected:**
- `401 Unauthorized`
- Error: "Invalid credentials"
- Failed attempt counter increments

---

### TC-AUTH-008 — Account lockout after 3 failed logins

**Steps:**
1. Attempt login with wrong password 3 times in a row

**Expected:**
- 3rd attempt returns `423 Account Locked`
- Response includes `lockedUntil` timestamp (30 minutes from now)
- 4th attempt before lockout expires also returns `423`

---

### TC-AUTH-009 — Account lockout recovery

**Steps:**
1. Lock account (3 wrong passwords)
2. Wait 30 minutes (or manually update `lockedUntil` in DB for test)
3. Login with correct password

**Expected:**
- Login succeeds after lock expires
- `failedAttempts` counter resets to 0

---

### TC-AUTH-010 — OTP login flow

**Steps:**
1. Register account without password
2. `POST /api/auth/send-otp` with `{ email }`
3. `POST /api/auth/verify-otp` with `{ email, otp }`
4. `POST /api/auth/login` with `{ email, otp }`

**Expected:**
- Login succeeds, tokens issued

---

### TC-AUTH-011 — OTP expiry

**Steps:**
1. Request OTP
2. Wait 11 minutes (OTP valid for 10 min)
3. Submit expired OTP

**Expected:**
- `400 Bad Request` — OTP expired

---

### TC-AUTH-012 — OTP reuse prevention

**Steps:**
1. Request OTP
2. Verify OTP once (success)
3. Verify same OTP again

**Expected:**
- Second verification returns error (OTP already used or cleared)

---

### TC-AUTH-013 — Token refresh

**Steps:**
1. Login and get tokens
2. Send `POST /api/auth/refresh` with `{ refreshToken }`

**Expected:**
- `200 OK`
- New `accessToken` and new `refreshToken`
- Old refresh token is revoked (using it again should fail)

---

### TC-AUTH-014 — Refresh token rotation (reuse prevention)

**Steps:**
1. Login and get refresh token RT1
2. Refresh → get RT2 (RT1 revoked)
3. Try to refresh with RT1 again

**Expected:**
- `401 Unauthorized` — refresh token already used/revoked

---

### TC-AUTH-015 — Logout

**Steps:**
1. Login and store refresh token
2. `POST /api/auth/logout` with `{ refreshToken }`
3. Try to refresh with the same refresh token

**Expected:**
- Logout returns `200 OK`
- Subsequent refresh attempt returns `401`

---

### TC-AUTH-016 — Wallet login (Phantom)

**Steps:**
1. Connect Phantom wallet in browser
2. Sign message `"Sign in to Ashnance\ntimestamp:<unix_ms>"`
3. `POST /api/auth/wallet` with `{ publicKey, signature, message }`

**Expected:**
- If first time: new account created + tokens
- If returning: existing account found + tokens

---

### TC-AUTH-017 — Wallet login with old timestamp (replay protection)

**Steps:**
1. Sign message with timestamp older than 5 minutes
2. `POST /api/auth/wallet` with stale message

**Expected:**
- `401 Unauthorized` — timestamp too old

---

### TC-AUTH-018 — Link wallet to existing email account

**Steps:**
1. Login with email/password account
2. `POST /api/auth/link-wallet` with valid wallet signature

**Expected:**
- Wallet address linked to account
- Can now login via either wallet or email

---

### TC-AUTH-019 — Link wallet that is already linked to another account

**Steps:**
1. Register User A and link WalletX
2. Login as User B and try to link WalletX

**Expected:**
- `409 Conflict` — wallet already linked to another account

---

### TC-AUTH-020 — Profile CRUD

**Steps:**
1. `GET /api/auth/profile` — get current profile
2. `PUT /api/auth/profile` with `{ username: "newname", privacyMode: true }`
3. `GET /api/auth/profile` again

**Expected:**
- Profile updated; changes reflected in GET

---

### TC-AUTH-021 — Change password

**Steps:**
1. `PUT /api/auth/password` with `{ currentPassword, newPassword }`
2. Try logging in with old password
3. Try logging in with new password

**Expected:**
- Old password rejected after change
- New password accepted

---

### TC-AUTH-022 — Google OAuth flow

**Steps:**
1. Navigate to `GET /api/auth/google`
2. Complete Google authentication
3. Check redirect to `/auth/callback?accessToken=...&refreshToken=...`

**Expected:**
- Frontend receives tokens via URL params
- Account created or linked based on email

---

---

## 2. Wallet & Deposit Tests

### TC-WALLET-001 — Get wallet balances

**Steps:**
1. Login and send `GET /api/wallet`

**Expected:**
- Response includes `usdcBalance`, `ashBalance`, `depositAddress`, `cumulativeWeight`
- All balances are numbers ≥ 0

---

### TC-WALLET-002 — Direct deposit via Phantom

**Steps:**
1. Get master wallet address from `GET /api/wallet/platform-info`
2. In Phantom: send 10 devnet USDC to the master wallet
3. Get the transaction signature
4. `POST /api/wallet/deposit` with `{ txHash: "<signature>" }`

**Expected:**
- Backend fetches and verifies the on-chain transaction
- `usdcBalance` increases by 10
- `DEPOSIT` transaction record created with status `COMPLETED`

---

### TC-WALLET-003 — Deposit with fake/invalid txHash

**Steps:**
1. `POST /api/wallet/deposit` with `{ txHash: "fakehash123" }`

**Expected:**
- `400 Bad Request` — transaction not found on-chain

---

### TC-WALLET-004 — Duplicate deposit (same txHash)

**Steps:**
1. Make a real deposit and submit the txHash
2. Submit the same txHash again

**Expected:**
- Second submission returns `400 Bad Request` or `409 Conflict`
- Balance not double-credited (idempotent)

---

### TC-WALLET-005 — Deposit via auto-detect (deposit address)

**Steps:**
1. Get user's unique `depositAddress` from `GET /api/wallet`
2. Send devnet USDC directly to that address (not master wallet)
3. Wait up to 30 seconds for the polling cycle to pick it up

**Expected:**
- `deposit:confirmed` WebSocket event received on `user:<userId>` room
- `usdcBalance` increased by deposited amount
- USDC automatically swept from deposit address to master wallet

---

### TC-WALLET-006 — Minimum deposit enforcement

**Steps:**
1. Send 0.5 devnet USDC to master wallet
2. Submit txHash

**Expected:**
- `400 Bad Request` — deposit below minimum (1 USDC)

---

### TC-WALLET-007 — Transaction history

**Steps:**
1. Make a deposit
2. `GET /api/wallet/transactions?type=DEPOSIT&page=1&limit=10`

**Expected:**
- Lists deposit transactions in reverse chronological order
- Each item has: `type`, `amount`, `status`, `createdAt`, `txHash`

---

### TC-WALLET-008 — Platform info endpoint (unauthenticated)

**Steps:**
1. `GET /api/wallet/platform-info` (no auth header)

**Expected:**
- Returns `masterWallet` address and `usdcMint` address
- No authentication required

---

### TC-WALLET-009 — On-chain balance check

**Steps:**
1. `GET /api/wallet/onchain/<wallet_address>`

**Expected:**
- Returns current USDC balance of that Solana address
- Works for any address, no auth required

---

---

## 3. Withdrawal Tests

### TC-WITH-001 — Setup: enable 2FA and add whitelist address

**Prerequisites before withdrawal tests:**
1. `POST /api/2fa/generate` → get secret and scan QR in authenticator app
2. `POST /api/2fa/enable` with valid TOTP code
3. `POST /api/wallet/whitelist` with `{ address: "<your_solana_addr>", label: "Test" }`

---

### TC-WITH-002 — Successful withdrawal

**Steps:**
1. Ensure balance ≥ 10 USDC
2. `POST /api/wallet/withdraw` with `{ amount: 10, address: "<whitelisted_addr>", twoFaCode: "<valid_code>" }`

**Expected:**
- `200 OK`
- `usdcBalance` decremented by 10
- `WITHDRAWAL` transaction created with status `COMPLETED`
- USDC arrives at `address` on-chain (verify with explorer or `GET /api/wallet/onchain/<addr>`)

---

### TC-WITH-003 — Withdraw without 2FA enabled

**Steps:**
1. Use an account with 2FA disabled
2. Attempt withdrawal

**Expected:**
- `400 Bad Request` — 2FA must be enabled for withdrawals

---

### TC-WITH-004 — Withdraw with wrong 2FA code

**Steps:**
1. Submit withdrawal with `twoFaCode: "000000"`

**Expected:**
- `401 Unauthorized` — invalid 2FA code

---

### TC-WITH-005 — 2FA lockout after 3 failed withdrawal attempts

**Steps:**
1. Submit 3 withdrawals in a row with wrong 2FA codes

**Expected:**
- 3rd attempt returns `423 Account Locked`
- Account locked for 30 minutes

---

### TC-WITH-006 — Withdraw to non-whitelisted address

**Steps:**
1. `POST /api/wallet/withdraw` with an address not in whitelist

**Expected:**
- `400 Bad Request` — address not whitelisted

---

### TC-WITH-007 — Withdraw more than balance

**Steps:**
1. Attempt withdrawal of amount > usdcBalance

**Expected:**
- `400 Bad Request` — insufficient balance

---

### TC-WITH-008 — Withdraw below minimum (10 USDC)

**Steps:**
1. Attempt to withdraw 5 USDC

**Expected:**
- `400 Bad Request` — minimum withdrawal is 10 USDC

---

### TC-WITH-009 — Whitelist management

**Steps:**
1. `POST /api/wallet/whitelist` with `{ address, label }`
2. `GET /api/wallet/whitelist` — confirm it appears
3. `DELETE /api/wallet/whitelist/<id>` — remove it
4. `GET /api/wallet/whitelist` — confirm it's gone

**Expected:**
- CRUD operations work correctly
- Deleted address can no longer be used for withdrawal

---

### TC-WITH-010 — Cannot add duplicate whitelist address

**Steps:**
1. Add address A to whitelist
2. Try to add the same address A again

**Expected:**
- `409 Conflict` or address silently deduped

---

---

## 4. Burn Mechanic Tests

### TC-BURN-001 — Successful burn

**Steps:**
1. Deposit 50 USDC
2. `POST /api/burn` with `{ amount: 10 }`

**Expected:**
- `200 OK`
- `usdcBalance` decremented by 10
- `ashBalance` increased by ASH reward
- `cumulativeWeight` increased
- `BURN` transaction created with status `COMPLETED`
- Response includes: `weight`, `ashReward`, `poolShare`, `profitShare`, `roundState`

---

### TC-BURN-002 — Burn below minimum

**Steps:**
1. `POST /api/burn` with `{ amount: 3 }` (minimum is 5)

**Expected:**
- `400 Bad Request` — amount below minimum

---

### TC-BURN-003 — Burn with insufficient balance

**Steps:**
1. Ensure balance = 2 USDC
2. `POST /api/burn` with `{ amount: 5 }`

**Expected:**
- `400 Bad Request` — insufficient balance

---

### TC-BURN-004 — Pool split verification

**Steps:**
1. Note reward pool balance before burn (from `GET /api/admin/pool`)
2. Burn 10 USDC
3. Check reward pool after

**Expected:**
- Reward pool increased by 5 (50%)
- Profit pool increased by 5 (50%)
- Total = 10 USDC

---

### TC-BURN-005 — Burn with no active round

**Steps:**
1. Owner cancels active round
2. Burn 10 USDC

**Expected:**
- Burn succeeds
- Response includes `roundId: null`
- Weight and ASH rewards still credited

---

### TC-BURN-006 — Burn history and stats

**Steps:**
1. Execute 3 burns of different amounts
2. `GET /api/burn/history?page=1&limit=10`
3. `GET /api/burn/stats`

**Expected:**
- History lists all burns in reverse chronological order
- Stats show `totalBurned`, `burnCount`, `totalAshEarned`, `totalWeight`

---

### TC-BURN-007 — ASH boost activation

**Steps:**
1. Ensure ashBalance ≥ 1000
2. `POST /api/burn/boost`
3. `GET /api/burn/boost-status`

**Expected:**
- Boost activated, `active: true`, `secondsLeft ≈ 3600`
- `ashBalance` decremented by 1000

---

### TC-BURN-008 — ASH boost stacking

**Steps:**
1. Activate boost (expires in 1 hour)
2. Activate boost again

**Expected:**
- Boost extended to 2 hours from original expiry (stacks additively)
- Another 1000 ASH deducted

---

### TC-BURN-009 — ASH boost insufficient funds

**Steps:**
1. Ensure ashBalance < 1000
2. `POST /api/burn/boost`

**Expected:**
- `400 Bad Request` — insufficient ASH balance

---

### TC-BURN-010 — Boost applies weight bonus

**Steps:**
1. Note weight per burn without boost
2. Activate boost
3. Burn same amount with boost active
4. Compare weight

**Expected:**
- Boost burn weight = normal burn weight + 0.50

---

---

## 5. Weight Formula Tests

### TC-WEIGHT-001 — Base weight calculation

**Setup:** No VIP, no referrals, no boost

| Burn Amount | Expected Weight (approx) |
|-------------|--------------------------|
| $5.00 | 1.002 |
| $10.00 | 2.004 |
| $24.99 | 5.008 |
| $49.98 | 10.016 |

**Formula:** `weight = amount / 4.99`

---

### TC-WEIGHT-002 — VIP weight bonus

**Setup:** Holy Fire VIP active, no referrals, no boost

| Burn | Base Weight | VIP Bonus | Expected Total |
|------|-------------|-----------|----------------|
| $5.00 | 1.002 | +0.50 | 1.502 |
| $10.00 | 2.004 | +0.50 | 2.504 |

---

### TC-WEIGHT-003 — Boost weight bonus

**Setup:** Boost active, no VIP, no referrals

| Burn | Base Weight | Boost Bonus | Expected Total |
|------|-------------|-------------|----------------|
| $5.00 | 1.002 | +0.50 | 1.502 |

---

### TC-WEIGHT-004 — VIP + boost stacking

**Setup:** Both VIP and boost active

| Burn | Base | VIP | Boost | Expected |
|------|------|-----|-------|----------|
| $5.00 | 1.002 | +0.50 | +0.50 | 2.002 |
| $10.00 | 2.004 | +0.50 | +0.50 | 3.004 |

---

### TC-WEIGHT-005 — Referral bonus

**Setup:** No VIP, no boost, user has 5 active referrals

| Burn | Base | Referral Bonus (5 refs) | Expected |
|------|------|--------------------------|----------|
| $5.00 | 1.002 | +0.20 | 1.202 |

Formula: `floor(5 / 5) × 0.20 = 0.20`

---

### TC-WEIGHT-006 — Referral bonus cap enforcement (Req #4)

**Setup:** User has 25 referrals, no VIP, no boost

- Base weight for $5 burn = 1.002
- Raw referral bonus = `floor(25/5) × 0.20 = 1.00`
- Max referral bonus = `(0.40 / 0.60) × 1.002 = 0.668`
- Expected referral bonus = 0.668 (capped)
- Expected total weight = 1.002 + 0.668 = 1.670

**Steps:**
1. Register 25 accounts using your referral code
2. Burn $5

**Expected:**
- Weight ≈ 1.670 (not 2.002 if uncapped)

---

### TC-WEIGHT-007 — Diminishing returns above 300 (Req #3)

**Setup:** Large burn that would exceed weight 300

- Burn amount = ~$1495 (base weight ≈ 299.6)
- Burn amount = ~$1500 (base weight ≈ 300.6)

**Expected:**
- Below 300: weight increases linearly
- Above 300: `finalWeight = 300 + sqrt(rawWeight - 300)`
- For raw weight 300.6: finalWeight = 300 + sqrt(0.6) = 300.775

---

### TC-WEIGHT-008 — Weight decays after round ends (Req #1)

**Setup:** User with `cumulativeWeight = 100`, not the winner

**Steps:**
1. End a round (user is not winner)
2. Check user's `cumulativeWeight`

**Expected:**
- `cumulativeWeight = 90` (10% decay: 100 × 0.90)

---

### TC-WEIGHT-009 — Winner weight resets to 0 (Req #2)

**Setup:** User wins a round

**Steps:**
1. User wins round
2. Check user's `cumulativeWeight`

**Expected:**
- `cumulativeWeight = 0` (full reset)

---

---

## 6. ASH Reward Tests

### TC-ASH-001 — Base ASH reward

**Formula:** `ashReward = floor(amount × 1.0 / 0.01) = floor(amount × 100)`

| Burn | Expected ASH |
|------|-------------|
| $5.00 | 500 |
| $10.00 | 1000 |
| $24.99 | 2499 |

---

### TC-ASH-002 — VIP ASH bonus (+20%)

**Setup:** Holy Fire VIP active

| Burn | Base ASH | VIP Bonus (+20%) | Total ASH |
|------|----------|------------------|-----------|
| $5.00 | 500 | 100 | 600 |
| $10.00 | 1000 | 200 | 1200 |

**Formula:** `ashReward = floor(floor(amount × 100) × 1.20)`

---

### TC-ASH-003 — ASH balance persists across rounds

**Steps:**
1. Burn to earn 500 ASH
2. Round ends (user is not winner)
3. Check `ashBalance`

**Expected:**
- ASH balance unchanged (no decay, no reset) — weight decays but ASH does not

---

### TC-ASH-004 — ASH used for boost

**Steps:**
1. Earn 1000 ASH via burns
2. Activate boost
3. Check `ashBalance`

**Expected:**
- `ashBalance` decremented by 1000

---

### TC-ASH-005 — ASH staking deduction

**Steps:**
1. Earn 500 ASH
2. Stake 500 in EMBER POOL

**Expected:**
- `ashBalance` decremented by 500
- Staking position created

---

---

## 7. Round System Tests

### TC-ROUND-001 — Create a round

**Steps:**
1. Login as owner
2. `POST /api/owner/round` with `{ prizePoolTarget: 100, timeLimitHours: 1 }`

**Expected:**
- Round created with `status: ACTIVE`
- `prizePoolTarget = 100`
- `endsAt` is ~1 hour from now
- `currentPool = 0`

---

### TC-ROUND-002 — Cannot create two active rounds

**Steps:**
1. Create a round (status ACTIVE)
2. Try to create another round

**Expected:**
- `400 Bad Request` — only one active round at a time

---

### TC-ROUND-003 — Round progress tracking

**Steps:**
1. Create round with target 100 USDC
2. `GET /api/round/current` before any burns
3. Burn 10 USDC
4. `GET /api/round/current` after burn

**Expected:**
- Before: `currentPool = 0`, `progressPercent = 0`
- After: `currentPool = 5`, `progressPercent = 5` (50% of burn goes to pool)

---

### TC-ROUND-004 — Round auto-ends when pool hits target

**Steps:**
1. Create round with `prizePoolTarget: 20`
2. Deposit 50 USDC
3. Burn 40 USDC (contributes 20 to pool = target reached)

**Expected:**
- Round status becomes `COMPLETED`
- Winner determined and prize paid
- `round:ended` WebSocket event emitted

---

### TC-ROUND-005 — Round time limit expiry

**Steps:**
1. Create round with `timeLimitHours: 0.017` (~1 minute)
2. Wait 90 seconds
3. `GET /api/round/current`

**Expected:**
- Round status = `COMPLETED` (or no active round)
- Time-based expiry triggered by background job

---

### TC-ROUND-006 — Round leaderboard

**Steps:**
1. Active round exists
2. Multiple users have burned
3. `GET /api/round/leaderboard`

**Expected:**
- Top 10 entries sorted by weight descending
- Each entry: `rank`, `username`, `weight`, `distanceToFirst`
- Your own rank shown separately with `distanceToFirst`

---

### TC-ROUND-007 — Round history

**Steps:**
1. Complete a round
2. `GET /api/round/history`

**Expected:**
- Completed rounds listed in reverse order
- Each round shows: `roundNumber`, `winner`, `prizeAmount`, `totalBurned`, `endedAt`

---

### TC-ROUND-008 — Cancel a round

**Steps:**
1. Create a round
2. `POST /api/owner/round/:id/cancel`
3. Try to burn

**Expected:**
- Round status = `CANCELLED`
- Pool not paid out
- Burns still execute but return `roundId: null` after cancellation

---

### TC-ROUND-009 — Force-end a round

**Steps:**
1. Create a round
2. `POST /api/owner/round/:id/end` with `{ force: true }`

**Expected:**
- Round ends immediately regardless of anti-snipe timer
- Winner determined and prize paid

---

---

## 8. Anti-Snipe & Anti-Domination Tests

### TC-SNIPE-001 — Anti-snipe blocks premature end (Req #8)

**Setup:** Round with pool target nearly full

**Steps:**
1. User A is rank #1 with 0 seconds holding time
2. Trigger pool to hit target exactly
3. Try `POST /api/owner/round/:id/end`

**Expected:**
- Round does NOT end
- Error: rank #1 holder hasn't held for 10 seconds

---

### TC-SNIPE-002 — Anti-snipe allows end after 10 seconds

**Steps:**
1. User A holds rank #1 for 10+ seconds
2. Pool hits target
3. Round ends automatically

**Expected:**
- Round ends, User A wins
- No anti-snipe block

---

### TC-SNIPE-003 — Anti-snipe bypass with force

**Steps:**
1. User just took rank #1 (0 seconds hold)
2. `POST /api/owner/round/:id/end` with `{ force: true }`

**Expected:**
- Round ends immediately (force bypasses 10-second check)

---

### TC-ANTI-001 — Anti-domination blocks back-to-back win (Req #5)

**Setup:** User A won the previous round

**Steps:**
1. User A is rank #1 in current round
2. Round ends normally

**Expected:**
- User A is NOT selected as winner
- Winner is rank #2 player instead
- `round:ended` event shows rank #2 user as winner

---

### TC-ANTI-002 — Anti-domination with no rank #2

**Setup:** Only one user has burned in the round, and they won last round

**Steps:**
1. Round ends with only User A (last winner) on leaderboard

**Expected:**
- Round cannot end normally (no eligible winner)
- Owner must force-end or cancel

---

### TC-ANTI-003 — Anti-domination resets after one round

**Setup:** User A won round N and was blocked from winning round N+1

**Steps:**
1. User A wins round N
2. Round N+1 ends — User B wins instead
3. User A is rank #1 in round N+2
4. Round N+2 ends

**Expected:**
- User A IS eligible to win round N+2 (only immediate back-to-back blocked)

---

---

## 9. Prize Safety Tests

### TC-PRIZE-001 — Prize capped at 70% of reward pool (Req #7)

**Setup:** Reward pool has only 50 USDC, round target was 100 USDC

**Steps:**
1. Round ends with `currentPool = 100`
2. Check prize paid to winner

**Expected:**
- Prize = `min(100, 50 × 0.70) = 35 USDC` (not 50 or 100)
- Winner receives 35 USDC

---

### TC-PRIZE-002 — Prize equals full pool when reward pool is healthy

**Setup:** Reward pool = 1000 USDC, round target = 100 USDC

**Steps:**
1. Round ends with `currentPool = 100`

**Expected:**
- Prize = 50 USDC (50% of burns went to reward pool; `min(100, 1000 × 0.70) = 100` but actual pool contribution is 50 for $100 burned)
- Winner receives the reward pool contribution amount

---

### TC-PRIZE-003 — Solvency check after prize payout

**Steps:**
1. `GET /api/owner/solvency` before round end
2. Round ends, prize paid
3. `GET /api/owner/solvency` after

**Expected:**
- `solvent: true` if master wallet has enough USDC
- `ratio` decreases proportionally to prize paid

---

---

## 10. VIP Subscription Tests

### TC-VIP-001 — Subscribe to Holy Fire

**Steps:**
1. Deposit 30 USDC
2. `POST /api/vip/subscribe` with `{ tier: "HOLY_FIRE" }`
3. `GET /api/vip/status`

**Expected:**
- `usdcBalance` decremented by 24.99
- `isVip: true`, `vipTier: "HOLY_FIRE"`
- `vipExpiresAt` = approximately 30 days from now
- Profit pool incremented by 24.99
- `VIP_PURCHASE` transaction created

---

### TC-VIP-002 — Subscribe without sufficient balance

**Steps:**
1. Ensure balance < 24.99 USDC
2. `POST /api/vip/subscribe`

**Expected:**
- `400 Bad Request` — insufficient balance

---

### TC-VIP-003 — Subscribe while already subscribed

**Steps:**
1. Subscribe successfully
2. Try to subscribe again before expiry

**Expected:**
- `400 Bad Request` — already subscribed
- Response includes `vipExpiresAt`

---

### TC-VIP-004 — VIP weight bonus applies on burn

**Steps:**
1. Subscribe to VIP
2. Burn $5 (check weight in response)
3. Cancel VIP
4. Burn $5 again

**Expected:**
- VIP burn weight = non-VIP weight + 0.50

---

### TC-VIP-005 — VIP ASH bonus applies on burn

**Steps:**
1. Subscribe to VIP
2. Burn $10 — check `ashReward` in response

**Expected:**
- `ashReward` = floor(1000 × 1.20) = 1200 (vs 1000 without VIP)

---

### TC-VIP-006 — Cancel VIP

**Steps:**
1. Subscribe to VIP
2. `POST /api/vip/cancel`
3. `GET /api/vip/status`

**Expected:**
- `isVip: false`
- Next burn gets no VIP bonus
- No refund issued

---

### TC-VIP-007 — VIP expiry mid-subscription

**Setup:** Manually set `vipExpiresAt` to 1 minute ago in DB

**Steps:**
1. VIP is expired
2. Burn $5

**Expected:**
- No VIP weight bonus (+0.50 not added)
- No VIP ASH bonus
- `isVip` would show `false` on status endpoint

---

---

## 11. Referral System Tests

### TC-REF-001 — Register with referral code

**Steps:**
1. Get User A's `referralCode`
2. Register User B with `{ referralCode: userA.referralCode }`
3. Check User A's referrals

**Expected:**
- `Referral` record created linking A → B
- User B's profile shows `referredById = userA.id`

---

### TC-REF-002 — Referral commission on burn

**Steps:**
1. User B (referred by A) burns 10 USDC
2. Check User A's `usdcBalance` and transactions

**Expected:**
- User A receives 1 USDC (10% of 10)
- `REFERRAL_REWARD` transaction in User A's history
- Reward pool contribution = 5 - 1 = 4 USDC (commission comes from reward pool share)

---

### TC-REF-003 — Multiple referrals — commission on each burn

**Steps:**
1. User A refers Users B, C, D
2. Each burns 10 USDC

**Expected:**
- User A receives 1 USDC per burn
- 3 separate `REFERRAL_REWARD` transactions
- Total earned = 3 USDC

---

### TC-REF-004 — Invalid referral code silently ignored

**Steps:**
1. `POST /api/auth/register` with `{ referralCode: "invalidxxx" }`

**Expected:**
- Registration succeeds with no error
- No referral record created (silently ignored)

---

### TC-REF-005 — Referral weight bonus: 5 active referrals

**Steps:**
1. Register 5 users with User A's referral code
2. User A burns $5

**Expected:**
- Referral bonus = 0.20 weight added to burn result

---

### TC-REF-006 — Referral weight bonus: 10 active referrals

**Steps:**
1. Register 10 users with User A's referral code
2. User A burns $5

**Expected:**
- Raw referral bonus = floor(10/5) × 0.20 = 0.40
- If 0.40 ≤ cap → full bonus applied
- For $5 burn (base=1.002): cap = (0.40/0.60) × 1.002 = 0.668 → bonus of 0.40 is below cap, so full 0.40 applied

---

### TC-REF-007 — Referral cap enforced with many referrals

**Steps:**
1. Register 25 users with User A's referral code (no VIP, no boost)
2. User A burns $5

**Expected:**
- Raw bonus = 1.00, cap = 0.668
- Actual bonus = 0.668 (capped)
- Weight = 1.002 + 0.668 = 1.670 (not 2.002)

---

---

## 12. Staking Tests

### TC-STAKE-001 — List staking pools

**Steps:**
1. `GET /api/staking/pools`

**Expected:**
- Three pools returned: EMBER (8% APY, 7d lock, min 100 ASH), FLAME (15%, 30d, 500 ASH), INFERNO (30%, 90d, 1000 ASH)

---

### TC-STAKE-002 — Stake ASH in EMBER POOL

**Steps:**
1. Earn 200 ASH via burns
2. `POST /api/staking/stake` with `{ poolId: "<ember_id>", amount: 100 }`
3. `GET /api/staking/positions`

**Expected:**
- `ashBalance` decremented by 100
- Position created: `status: ACTIVE`, `stakedAmount: 100`, `lockedUntil` = now + 7 days
- Pending rewards = 0 initially

---

### TC-STAKE-003 — Stake below minimum

**Steps:**
1. `POST /api/staking/stake` with amount below pool minimum (e.g. 50 in EMBER POOL)

**Expected:**
- `400 Bad Request` — minimum stake is 100 ASH

---

### TC-STAKE-004 — Stake with insufficient ASH

**Steps:**
1. Ensure `ashBalance = 50`
2. Stake 100

**Expected:**
- `400 Bad Request` — insufficient ASH balance

---

### TC-STAKE-005 — Rewards accrue over time

**Steps:**
1. Stake 100 ASH in EMBER POOL (8% APY)
2. Wait 1 hour (or manually advance time in test)
3. `GET /api/staking/positions`

**Expected:**
- `pendingRewards > 0`
- Approximate: `100 × 0.08 / 365 / 24 ≈ 0.000913 ASH` per hour

---

### TC-STAKE-006 — Claim rewards without unstaking

**Steps:**
1. Stake and wait for rewards to accrue
2. `POST /api/staking/claim/<positionId>`
3. Check `ashBalance` and position `pendingRewards`

**Expected:**
- `ashBalance` increased by claimed amount
- Position still active
- `pendingRewards` reset to 0

---

### TC-STAKE-007 — Cannot claim below minimum (0.01 ASH)

**Steps:**
1. Stake and immediately try to claim (near-zero rewards)

**Expected:**
- `400 Bad Request` — minimum claimable is 0.01 ASH

---

### TC-STAKE-008 — Cannot unstake before lock expires

**Steps:**
1. Stake in EMBER POOL (7-day lock)
2. Immediately try to unstake

**Expected:**
- `400 Bad Request` — includes `lockedUntil` date and days remaining

---

### TC-STAKE-009 — Unstake after lock expires

**Steps:**
1. Stake in EMBER POOL
2. Manually set `lockedUntil` to past in DB (or wait 7 days)
3. `POST /api/staking/unstake/<positionId>`

**Expected:**
- Position status = `WITHDRAWN`
- `ashBalance` += stakedAmount + totalRewards
- Cannot unstake again (position closed)

---

### TC-STAKE-010 — Summary totals

**Steps:**
1. Stake in multiple pools
2. `GET /api/staking/summary`

**Expected:**
- `totalStaked`: sum of all active position amounts
- `totalPendingRewards`: sum of all pending rewards
- `positionCount`: number of active positions

---

---

## 13. 2FA Tests

### TC-2FA-001 — Generate 2FA secret

**Steps:**
1. `POST /api/2fa/generate`

**Expected:**
- Returns `{ secret, otpauthUrl }`
- `otpauthUrl` can be used to generate a QR code
- Secret NOT yet saved to account (only saved on enable)

---

### TC-2FA-002 — Enable 2FA

**Steps:**
1. Generate secret
2. Scan QR in authenticator app (Google Authenticator, Authy, etc.)
3. `POST /api/2fa/enable` with `{ token: "<6-digit-code>" }`

**Expected:**
- `200 OK`
- Account now has 2FA enabled
- `GET /api/auth/profile` shows `twoFaEnabled: true`

---

### TC-2FA-003 — Enable 2FA with wrong code

**Steps:**
1. Generate secret
2. `POST /api/2fa/enable` with `{ token: "000000" }`

**Expected:**
- `401 Unauthorized` — invalid token

---

### TC-2FA-004 — Disable 2FA

**Steps:**
1. 2FA is enabled
2. `POST /api/2fa/disable` with valid code from authenticator app

**Expected:**
- 2FA disabled
- `twoFaEnabled: false` in profile

---

### TC-2FA-005 — Withdrawal requires 2FA

**Steps:**
1. 2FA enabled
2. Submit withdrawal with wrong code

**Expected:**
- `401 Unauthorized`

---

### TC-2FA-006 — 3 failed 2FA codes → account lock

**Steps:**
1. Submit 3 withdrawal requests with invalid 2FA codes

**Expected:**
- After 3rd failure: `423 Account Locked` for 30 minutes

---

---

## 14. Leaderboard Tests

### TC-LEAD-001 — Winners leaderboard

**Steps:**
1. `GET /api/leaderboard/winners`

**Expected:**
- Up to 20 entries, sorted by `totalWon` descending
- Each entry: `rank`, `username`, `totalWon`, `winCount`
- No auth required

---

### TC-LEAD-002 — Burners leaderboard

**Steps:**
1. `GET /api/leaderboard/burners`

**Expected:**
- Sorted by `totalBurned` (USDC) descending

---

### TC-LEAD-003 — Referrers leaderboard

**Steps:**
1. `GET /api/leaderboard/referrers`

**Expected:**
- Sorted by `totalEarned` from referral commissions descending

---

### TC-LEAD-004 — ASH leaderboard

**Steps:**
1. `GET /api/leaderboard/ash`

**Expected:**
- Sorted by `ashBalance` descending

---

### TC-LEAD-005 — Privacy mode anonymizes user

**Steps:**
1. Set `privacyMode: true` on a user who is in top 20
2. `GET /api/leaderboard/winners`

**Expected:**
- User appears as "Anonymous" instead of their username
- Stats (totalWon, etc.) still counted

---

---

## 15. WebSocket Tests

### TC-WS-001 — Connect and join rooms

**Steps:**
1. Connect Socket.IO client to `wss://api.ashnance.com`
2. Emit `join:ticker`
3. Emit `join:round`
4. Emit `join:leaderboard`
5. Emit `join:user` with `{ userId: "<your_id>" }`

**Expected:**
- Connection established
- No errors on join events

---

### TC-WS-002 — `burn:new` event fires on burn

**Steps:**
1. Join `ticker` room
2. Another user (or same user) executes a burn

**Expected:**
- `burn:new` event received with `{ user, amount, ashReward, weight, timestamp }`

---

### TC-WS-003 — `round:progress` event fires on burn

**Steps:**
1. Join `round` room
2. Execute a burn

**Expected:**
- `round:progress` event received with `{ currentPool, targetPool, progressPercent, timestamp }`

---

### TC-WS-004 — `round:ended` event fires on round end

**Steps:**
1. Join all rooms
2. Owner force-ends a round

**Expected:**
- `round:ended` event received in `ticker`, `round`, and `leaderboard` rooms
- Payload: `{ roundNumber, winner, prize, timestamp }`

---

### TC-WS-005 — `deposit:confirmed` event fires on deposit

**Steps:**
1. Join `user:<your_id>` room
2. Deposit USDC via deposit address auto-detection

**Expected:**
- `deposit:confirmed` event received with `{ amount }`
- Balance updated in UI

---

### TC-WS-006 — `leaderboard:update` fires after rank change

**Steps:**
1. Join `leaderboard` room
2. Execute a burn that changes the leaderboard ranking

**Expected:**
- `leaderboard:update` event received (no payload)
- Frontend should re-fetch leaderboard on this event

---

---

## 16. Admin Panel Tests

### TC-ADMIN-001 — Access admin as non-admin user

**Steps:**
1. Login as regular user
2. `GET /api/admin/stats`

**Expected:**
- `403 Forbidden`

---

### TC-ADMIN-002 — Promote user to admin

**Steps:**
1. Login as admin
2. `PUT /api/admin/users/<userId>/role` with `{ role: "ADMIN" }`

**Expected:**
- User role updated
- That user can now access admin endpoints

---

### TC-ADMIN-003 — Platform stats

**Steps:**
1. Login as admin
2. `GET /api/admin/stats`

**Expected:**
- Returns: `totalUsers`, `totalBurned`, `totalVips`, `rewardPoolBalance`, `profitPoolBalance`, etc.

---

### TC-ADMIN-004 — Update platform config

**Steps:**
1. `GET /api/admin/config` — note current `min_burn_amount` value
2. `PUT /api/admin/config/min_burn_amount` with `{ value: "10" }`
3. Try to burn 5 USDC

**Expected:**
- Config updated
- Burns below 10 now rejected (config change is live)

---

### TC-ADMIN-005 — Paginated user list

**Steps:**
1. `GET /api/admin/users?page=1`
2. `GET /api/admin/users?page=2`

**Expected:**
- Paginated user list with profile data
- Different records on each page

---

---

## 17. Owner Panel Tests

### TC-OWNER-001 — Access owner as non-owner

**Steps:**
1. Login as regular user or admin
2. `GET /api/owner/stats`

**Expected:**
- `403 Forbidden`

---

### TC-OWNER-002 — Solvency check

**Steps:**
1. Login as owner
2. `GET /api/owner/solvency`

**Expected:**
- Returns `{ onChainBalance, totalLiabilities, solvent, ratio }`
- `totalLiabilities = sum(all user balances) + rewardPool + profitPool`

---

### TC-OWNER-003 — Initiate withdrawal

**Steps:**
1. Login as Owner 1 (first email in OWNER_EMAILS)
2. `POST /api/owner/withdrawal/initiate`

**Expected:**
- Withdrawal request created with `status: PENDING`
- `requestedBy` = Owner 1's ID

---

### TC-OWNER-004 — Cannot initiate two pending withdrawals

**Steps:**
1. Initiate a withdrawal (pending)
2. Try to initiate another

**Expected:**
- `400 Bad Request` — pending withdrawal already exists

---

### TC-OWNER-005 — Same owner cannot approve own withdrawal

**Steps:**
1. Owner 1 initiates withdrawal
2. Owner 1 tries to approve the same withdrawal

**Expected:**
- `403 Forbidden` — same owner cannot initiate AND approve

---

### TC-OWNER-006 — Owner 2 approves withdrawal

**Steps:**
1. Owner 1 initiates
2. Owner 2 approves: `POST /api/owner/withdrawal/approve/<id>`

**Expected:**
- On-chain transfers executed: 60% to OWNER_1_WALLET, 40% to OWNER_2_WALLET
- Profit pool decremented to 0 (or by withdrawn amount)
- Withdrawal status = `COMPLETED`

---

### TC-OWNER-007 — Devnet airdrop button

**Steps:**
1. Login as owner
2. Click "Airdrop 2 SOL" / `POST /api/owner/devnet-airdrop`

**Expected:**
- 2 SOL arrives in master wallet's SOL balance
- Response includes Solana transaction signature

---

### TC-OWNER-008 — Live burn config update

**Steps:**
1. `PUT /api/owner/burn-config` with `{ prize_pool_target: 50 }`
2. Create a new round (default target should be 50)

**Expected:**
- Config persisted in DB
- New round uses updated target

---

---

## 18. Blockchain Integration Tests

### TC-BC-001 — Master wallet SOL balance

**Steps:**
1. Owner panel: check solvency section
2. Verify master wallet has SOL for transaction fees

**Expected:**
- SOL balance > 0 (needed for USDC transfers)
- If 0, use devnet airdrop button

---

### TC-BC-002 — USDC deposit verification on devnet

**Steps:**
1. Get a devnet USDC faucet (search "Solana devnet USDC faucet")
2. Send devnet USDC to master wallet
3. Verify deposit credited

**Expected:**
- Transaction verifiable on [explorer.solana.com?cluster=devnet](https://explorer.solana.com?cluster=devnet)
- Balance credited in-app within a few seconds

---

### TC-BC-003 — Withdrawal executes on-chain

**Steps:**
1. Complete a withdrawal
2. Note the `txHash` in transaction history
3. Verify on Solana devnet explorer

**Expected:**
- Transaction visible on explorer
- USDC balance changed at destination address

---

### TC-BC-004 — Prize payout executes on-chain

**Steps:**
1. Win a round
2. Note the `txHash` in WIN transaction
3. Verify on Solana explorer

**Expected:**
- Transaction visible on explorer
- Winner's Solana wallet received USDC

---

---

## 19. Token & Session Tests

### TC-TOKEN-001 — Proactive token refresh

**Steps:**
1. Login
2. Wait for access token to be near expiry (check localStorage JWT `exp` field)
3. Make any API call

**Expected:**
- No 401 error — token refreshed proactively
- Seamless user experience

---

### TC-TOKEN-002 — Expired refresh token forces re-login

**Steps:**
1. Login and get tokens
2. Manually set refresh token `exp` to past (or wait 7 days)
3. Make any authenticated request

**Expected:**
- `401 Unauthorized` after failed refresh
- User must log in again

---

### TC-TOKEN-003 — Access protected endpoint without token

**Steps:**
1. `GET /api/wallet` with no `Authorization` header

**Expected:**
- `401 Unauthorized`

---

### TC-TOKEN-004 — Access protected endpoint with malformed token

**Steps:**
1. `GET /api/wallet` with `Authorization: Bearer invalidtoken`

**Expected:**
- `401 Unauthorized`

---

---

## 20. Error Handling & Edge Cases

### TC-EDGE-001 — Burn when no active round

**Steps:**
1. Ensure no active round exists
2. Burn 5 USDC

**Expected:**
- Burn succeeds
- `roundState` in response is null
- Weight and ASH credited normally
- Pool splits executed (reward pool and profit pool still credited)

---

### TC-EDGE-002 — Race condition: two burns hit pool target simultaneously

This is difficult to test manually. To simulate:
1. Use concurrent API calls with `Promise.all` or Apache Bench
2. Two burns sent at the same time when pool is 1 USDC short of target

**Expected:**
- Round ends exactly once
- One winner selected
- Prize paid once
- No double-end

---

### TC-EDGE-003 — Referrer deleted after referee burns

**Steps:**
1. User A refers User B
2. Delete User A from DB
3. User B burns

**Expected:**
- Burn succeeds
- Commission skipped silently (no error)

---

### TC-EDGE-004 — Insufficient reward pool for prize

**Setup:** Drain reward pool to 10 USDC, then end a round with 50 USDC pool target

**Expected:**
- Prize = `min(50, 10 × 0.70) = 7` USDC
- Winner receives 7 USDC (not 25 or 50)

---

### TC-EDGE-005 — ASH boost status with no active boost

**Steps:**
1. `GET /api/burn/boost-status` with no active boost

**Expected:**
- `{ active: false, boostExpiresAt: null, secondsLeft: 0 }`

---

### TC-EDGE-006 — Withdraw full balance

**Steps:**
1. Balance = 20 USDC exactly
2. Withdraw 20 USDC

**Expected:**
- Balance = 0 after withdrawal
- No "insufficient funds" error

---

### TC-EDGE-007 — Burn entire balance

**Steps:**
1. Balance = 10 USDC
2. Burn 10 USDC

**Expected:**
- Burn succeeds
- Balance = 0

---

### TC-EDGE-008 — Cancel VIP with no active subscription

**Steps:**
1. `POST /api/vip/cancel` with no active VIP

**Expected:**
- `400 Bad Request` — no active subscription to cancel

---

### TC-EDGE-009 — Anti-domination: no rank #2 scenario

**Setup:** Only one user has burned in the round, and they won last round

**Steps:**
1. Round ends

**Expected:**
- Round cannot be auto-ended
- Owner must force-end or cancel

---

### TC-EDGE-010 — Staking claim with position owned by different user

**Steps:**
1. User A has position P1
2. User B sends `POST /api/staking/claim/P1`

**Expected:**
- `404 Not Found` — position not found (scoped to authenticated user)

---

---

## 21. Security Tests

### TC-SEC-001 — SQL injection in API params

**Steps:**
1. `GET /api/wallet/transactions?type=BURN'; DROP TABLE users; --`
2. `GET /api/leaderboard/winners` (general check)

**Expected:**
- No DB error, no data leak
- Prisma ORM parameterizes all queries — injection should be impossible

---

### TC-SEC-002 — Access another user's wallet data

**Steps:**
1. Login as User A
2. `GET /api/wallet` — note your data
3. Try to access `/api/wallet?userId=<user_b_id>` or similar

**Expected:**
- Wallet endpoint is scoped to authenticated user only
- Cannot view another user's balance

---

### TC-SEC-003 — Unsigned transaction replay

**Steps:**
1. Capture a valid deposit txHash
2. Try submitting it from a different account

**Expected:**
- `400 Bad Request` — txHash already processed (idempotent check)
- Even if txHash is new but points to someone else's transaction: the verification checks that the USDC destination is the master wallet and associates with the authenticated user

---

### TC-SEC-004 — Tamper with JWT payload

**Steps:**
1. Get valid access token
2. Decode the JWT, change `role: "USER"` to `role: "ADMIN"` in payload
3. Re-encode (without correct signature)
4. Send to admin endpoint

**Expected:**
- `401 Unauthorized` — JWT signature verification fails

---

### TC-SEC-005 — CORS — requests from unauthorized origin

**Steps:**
1. Send API request from a different origin than allowed

**Expected:**
- CORS policy blocks the request
- Only origins in `FRONTEND_URL` env var are allowed

---

### TC-SEC-006 — Rate limiting

**Steps:**
1. Send rapid successive requests to any endpoint (e.g., 100+ requests in 1 minute)

**Expected:**
- `429 Too Many Requests` after threshold exceeded

---

### TC-SEC-007 — Admin endpoint without admin role

**Steps:**
1. Login as regular user
2. `GET /api/admin/stats`

**Expected:**
- `403 Forbidden`

---

### TC-SEC-008 — Owner endpoint without owner email

**Steps:**
1. Login as any non-owner user
2. `GET /api/owner/stats`

**Expected:**
- `403 Forbidden`

---

### TC-SEC-009 — Wallet signature replay

**Steps:**
1. Sign a valid wallet auth message with timestamp T
2. Wait 6 minutes
3. Use the same message + signature to login again

**Expected:**
- `401 Unauthorized` — timestamp older than 5 minutes

---

### TC-SEC-010 — Withdraw without whitelist bypass

**Steps:**
1. Try to pass an address that is not in the whitelist (even a valid Solana address)
2. `POST /api/wallet/withdraw` with `{ address: "<non-whitelisted>", ... }`

**Expected:**
- `400 Bad Request` — address must be whitelisted

---

---

## Test Environment Setup Checklist

Before running tests, ensure:

- [ ] Backend is running on VPS: `pm2 status` shows `ashnance-backend` online
- [ ] PostgreSQL is running and migrated: `npx prisma migrate deploy`
- [ ] Redis is running: `redis-cli ping` returns PONG
- [ ] Master wallet has devnet SOL: use owner airdrop button or `solana airdrop 2`
- [ ] Master wallet has devnet USDC: use devnet USDC faucet
- [ ] At least one owner email configured in `OWNER_EMAILS` env var
- [ ] Google OAuth configured if testing OAuth flow
- [ ] SMTP configured if testing OTP email flow
- [ ] Frontend env `NEXT_PUBLIC_API_URL` points to the correct backend

---

## Priority Test Order for First-Time Testers

Run these first to validate the core flow works end-to-end:

1. **TC-AUTH-001** — Register
2. **TC-AUTH-006** — Login
3. **TC-WALLET-001** — Get balances
4. **TC-WALLET-002** — Deposit (needs devnet USDC)
5. **TC-BURN-001** — Burn
6. **TC-ROUND-001** — Create round (as owner)
7. **TC-ROUND-004** — Round auto-ends on target
8. **TC-VIP-001** — Subscribe to VIP
9. **TC-WITH-001** through **TC-WITH-002** — Setup 2FA and withdraw
10. **TC-STAKE-002** — Stake ASH
11. **TC-WS-002** — Verify WebSocket events fire

---

*Test cases reflect the live codebase — April 2026*

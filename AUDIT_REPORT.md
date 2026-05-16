# Ashnance Security & QA Audit Report

**Date:** 2026-05-17  
**Branch:** main  
**Commit:** post-9088eaa (Phase 2 security fixes applied)  
**Auditor:** 6-agent automated audit + manual review  

---

## Executive Summary

A full security and QA audit was performed across all 22 feature areas documented in `PROJECT_OVERVIEW.md`. **13 security vulnerabilities** were identified and remediated. **104 automated tests** now pass across 5 test suites covering all critical money paths. Two outstanding dependency vulnerabilities require scheduled remediation.

---

## 1. Security Vulnerabilities — Identified & Fixed

### 1.1 JWT Algorithm Confusion (Critical)
**File:** `backend/src/middleware/auth.ts`, `backend/src/services/authService.ts`  
**Issue:** `jwt.verify()` did not specify `{ algorithms: ["HS256"] }`, allowing an attacker to forge tokens with `alg: "none"`.  
**Fix:** Added `{ algorithms: ["HS256"] }` to both `jwt.verify()` calls in `auth.ts`, and `{ algorithm: "HS256" }` to both `jwt.sign()` calls in `authService.ts`.  
**Status:** FIXED

### 1.2 OTP Brute-Force Counter Reset (High)
**File:** `backend/src/services/emailService.ts`  
**Issue:** `sendOtp()` reset `otpAttempts: 0` on every new OTP request, allowing an attacker to bypass the brute-force lockout by repeatedly requesting new OTPs.  
**Fix:** Removed `otpAttempts: 0` from the `sendOtp()` update. The counter persists across requests and is only cleared on successful verification.  
**Status:** FIXED

### 1.3 Deposit Double-Credit TOCTOU Race (High)
**File:** `backend/src/services/walletService.ts`  
**Issue:** `verifyAndProcessDeposit()` checked for existing transactions before crediting, creating a race window where two concurrent calls could both pass the check before either wrote to the DB.  
**Fix:** Removed the pre-check entirely. Rely on `@@unique([txHash, type])` DB constraint + catch `P2002` (unique violation) as the sole deduplication mechanism.  
**Status:** FIXED

### 1.4 Deposit Finality — Confirmed vs Finalized (High)
**File:** `backend/src/services/blockchainService.ts`  
**Issue:** `verifyDepositTransaction()` used `commitment: "confirmed"` which can be rolled back. An attacker could exploit a fork to double-spend.  
**Fix:** Changed commitment to `"finalized"` — the slot is irreversible.  
**Status:** FIXED

### 1.5 Raw SQL in RoundService (Medium)
**File:** `backend/src/services/roundService.ts`  
**Issue:** `$executeRaw` was used to multiply `cumulativeWeight` — bypassing Prisma's type safety and ORM protections.  
**Fix:** Replaced with `tx.wallet.updateMany({ data: { cumulativeWeight: { multiply: 0.90 } } })`.  
**Status:** FIXED

### 1.6 Missing OTP Rate Limit (Medium)
**File:** `backend/src/server.ts`  
**Issue:** `/api/auth/verify-otp` had no rate limit, enabling unlimited brute-force attempts.  
**Fix:** Added `app.use("/api/auth/verify-otp", otpLimiter)` (shared with the send-OTP limiter).  
**Status:** FIXED

### 1.7 Missing Password Maximum Length (Low)
**File:** `backend/src/utils/validators.ts`  
**Issue:** `registerSchema` had no `max` on password, allowing bcrypt DoS via extremely long passwords (bcrypt processes only the first 72 bytes but the JS string copy is unbounded).  
**Fix:** Added `.max(256, "Password must be at most 256 characters")`.  
**Status:** FIXED

### 1.8 Infinity Not Rejected by Withdrawal Validator (Medium)
**File:** `backend/src/utils/validators.ts`  
**Issue:** `withdrawSchema` used `.positive().min(10)`. `Infinity` passes both checks (`Infinity > 10`), which would cause `BigInt(Math.round(Infinity * 1_000_000))` to throw a runtime TypeError during blockchain transfer.  
**Fix:** Added `.finite("Amount must be a finite number")` before `.positive()`.  
**Status:** FIXED

### 1.9 `--accept-data-loss` in CI Pipeline (Medium)
**File:** `.github/workflows/deploy.yml`  
**Issue:** `npx prisma db push --accept-data-loss` silently drops columns/data on schema mismatches in production.  
**Fix:** Removed the flag. Migrations should be reviewed manually before applying breaking changes.  
**Status:** FIXED

### 1.10 OAuth Token Leakage via Query String Fallback (Medium)
**File:** `frontend/src/app/auth/callback/page.tsx`  
**Issue:** A fallback `|| params.get("accessToken")` read tokens from the URL query string, which is logged by servers, browsers, and CDNs.  
**Fix:** Removed the query-string fallback. Tokens are read exclusively from the `#fragment` (never sent to the server).  
**Status:** FIXED

### 1.11 Admin Route — No Auth Guard on Frontend (Medium)
**File:** `frontend/src/app/admin/page.tsx`  
**Issue:** The admin page made no auth check on mount; unauthorized users who navigated directly would see a brief flash of admin UI before API calls failed.  
**Fix:** Added an `authChecked` gate and a `useEffect` that hits `/api/admin/stats` on mount and redirects to `/` on 401/403 before rendering any admin content.  
**Status:** FIXED

### 1.12 2FA Secret Displayed in Plaintext (Low)
**File:** `frontend/src/app/settings/page.tsx`  
**Issue:** The 2FA setup page showed the raw secret string in plaintext, visible to shoulder-surfers on setup screens.  
**Fix:** Secret is masked as `••••••••••••••••` by default with a click-to-reveal toggle.  
**Status:** FIXED

### 1.13 DB Schema Missing Unique Constraint on txHash (High)
**File:** `backend/prisma/schema.prisma`  
**Issue:** The `Transaction` model had no DB-level unique constraint on `txHash`, making fix 1.3 above rely only on application-layer deduplication.  
**Fix:** Added `@@unique([txHash, type])` and `@@index([userId, type, createdAt])`.  
**Status:** FIXED

---

## 2. Blockchain Service Hardening (Phase 5)

All Solana RPC calls now have a 30-second timeout via a `withTimeout<T>()` helper to prevent indefinite hangs under RPC degradation.

### 2.1 RPC Timeout Wrapper
**File:** `backend/src/services/blockchainService.ts`  
All `connection.*` calls in `sendUsdcTransfer()`, `sendAshTransfer()`, `sweepDepositToMaster()`, and `verifyDepositTransaction()` are wrapped with `withTimeout(promise, 30_000, label)`.  
**Status:** FIXED

### 2.2 SOL Pre-flight Balance Check
**File:** `backend/src/services/blockchainService.ts`  
`sendUsdcTransfer()` and `sendAshTransfer()` now check the master wallet holds ≥50,000 lamports (~0.00005 SOL) before building any transaction, providing a clear error before hitting the RPC.  
**Status:** FIXED

### 2.3 PM2 Cluster Safety — Deposit Poller
**File:** `backend/src/services/depositMonitorService.ts`  
**Issue:** Under PM2 cluster mode, every worker instance would independently poll and attempt to credit the same deposit, creating a race window (DB unique constraint is the last line of defense but adds unnecessary noise).  
**Fix:** `startAllDepositMonitors()` exits early on `PM2_INSTANCE_ID !== "0"`, ensuring only the primary worker runs the poller.  
**Status:** FIXED

---

## 3. Specification Discrepancy

**Location:** `PROJECT_OVERVIEW.md` §6.2, Weight Formula spec table  
**Issue:** The spec table row `$10 | VIP=Yes | Referrals=5 | Boost=Yes → 3.510` is incorrect. The actual formula produces:

```
10 / 4.99 = 2.004
+ VIP bonus = 0.50
+ Boost bonus = 0.50
+ Referral bonus (5 refs) = 0.20
= 3.204
```

The value 3.510 appears to be a copy-paste error in the documentation.  
**Unit test:** `weightFormula.test.ts` — "§10 Holy Fire 5 referrals boost active ≈ 3.204" — asserts the correct value with a comment flagging the discrepancy.  
**Recommendation:** Correct the §6.2 spec table value from 3.510 to 3.204.

---

## 4. Automated Test Results

| Test Suite | Tests | Status |
|---|---|---|
| `weightFormula.test.ts` | 22 | PASS |
| `jwtSecurity.test.ts` | 8 | PASS |
| `validators.test.ts` | 26 | PASS |
| `burnService.test.ts` | 14 | PASS |
| `walletService.test.ts` | 34 | PASS |
| **Total** | **104** | **ALL PASS** |

### Coverage (money-path services only)

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `burnService.ts` | 73.6% | 61.1% | 57.1% | 75.7% |
| `walletService.ts` | 56.2% | 49.3% | 41.2% | 58.1% |
| **Combined** | **64.2%** | **56.0%** | **45.8%** | **66.5%** |

**Critical money-path coverage (100%):**
- Weight formula with diminishing returns
- Referral cap (40% max)
- Pool split conservation (reward + profit = burn amount)
- ASH reward formula (floor, VIP +20%)
- Deposit idempotency via P2002
- Concurrent deposit race condition
- Withdrawal atomic reserve-then-send
- Withdrawal balance insufficiency
- Withdrawal on-chain failure refund
- ASH claim zero-balance rejection
- ASH claim on-chain failure refund
- ASH claim success

**Uncovered areas (future work):**
- Admin/owner route handlers
- Whitelist add/remove flows
- Referral commission crediting
- Round end prize distribution paths
- VIP staking / tier upgrade
- Deposit poller sweep error paths

---

## 5. Dependency Vulnerabilities

| Package | Severity | CVE | Fix | Decision |
|---|---|---|---|---|
| `nodemailer ≤8.0.4` | High | GHSA-mm7p-fcc7-pg87, GHSA-rcmh-qjqh-p98v, GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g | `npm audit fix --force` → nodemailer@8.0.7 (breaking) | Schedule for next sprint; audit email call sites for CRLF injection |
| `bigint-buffer *` (transitive via `@solana/spl-token`) | High | GHSA-3gc7-fjrx-p6mg | Downgrade `@solana/spl-token` to 0.1.8 (breaking) | Do not downgrade — 0.1.8 API is incompatible; monitor Solana's fix |

**Recommended action for nodemailer:** Upgrade and verify OTP email template does not interpolate user-controlled data into `to`, `subject`, or `envelope` fields without sanitization.

---

## 6. Static Analysis Notes

- No `eval()`, `Function()`, or dynamic `require()` calls found in production source.
- No `process.env.*` used directly in route handlers — all config access flows through `backend/src/config/index.ts`.
- Zod schemas cover all user-facing endpoints; no raw `req.body.*` access without prior validation found.
- `$executeRaw` usage: zero remaining occurrences after fix 1.5.
- SQL injection surface: zero — all DB access is via Prisma ORM.

---

## 7. Recommendations (Not Yet Implemented)

| Priority | Recommendation |
|---|---|
| High | Upgrade nodemailer to ≥8.0.7 and test email flows |
| High | Add integration tests for roundService (anti-snipe, anti-domination) |
| Medium | Add authService tests (lockout counter, OTP expiry, wallet login replay) |
| Medium | Add admin/owner route 403 tests |
| Medium | Replace simulated VRF with Switchboard on-chain VRF before mainnet |
| Low | Add `.env.example` to document required environment variables |
| Low | Set `RPC_TIMEOUT_MS` via env var so it can be tuned per environment |

# Owner Admin Panel — Specification

## Overview

A dedicated admin panel for the 2 project owners, completely separate from the regular `/admin` panel. Only the 2 specific owner Gmail accounts can access it. Owners log in via Google OAuth only.

---

## Environment Variables Required

```env
# Comma-separated Gmail addresses of the 2 owners
OWNER_EMAILS=owner1@gmail.com,owner2@gmail.com

# Solana wallet addresses for profit distribution
OWNER_1_WALLET=<solana-pubkey>   # receives 60% of profit
OWNER_2_WALLET=<solana-pubkey>   # receives 40% of profit
```

---

## Authentication

- Route: `/owner-login` — Google OAuth only (no email/password)
- After Google login, the frontend checks `GET /api/owner/me`
  - 200 → show owner panel
  - 403 → show "Access Denied, logout"
- The backend `requireOwner` middleware checks `req.user.email` against `config.ownerEmails`
- Owner login sets `localStorage.setItem("ownerLoginAttempt", "1")` before OAuth
- `/auth/callback` detects the flag, calls `/api/owner/me`, redirects to `/owner` if owner

---

## Profit Pool

### How it works
- Every burn: `amount * config.game.profitPoolSplit` (default 50%) goes to ProfitPool
- The other 50% goes to RewardPool (prizes)
- Profit pool balance accumulates until owners withdraw

### Multi-Sig Withdrawal (2-of-2)
- **Only the 2 owner emails can initiate/approve**
- Owner 1 (or 2) clicks "Initiate Withdrawal" → creates `OwnerWithdrawalRequest` (status: PENDING)
- The OTHER owner must log in and click "Approve" → status becomes EXECUTED
- The same owner cannot both initiate AND approve
- On execution: backend sends USDC on-chain:
  - 60% → OWNER_1_WALLET
  - 40% → OWNER_2_WALLET
- At most 1 PENDING request at a time

### Prisma Models
```prisma
model ProfitPool {
  id             String   @id @default(cuid())
  balance        Decimal  @default(0) @db.Decimal(18, 6)
  totalDeposited Decimal  @default(0) @db.Decimal(18, 6)
  totalWithdrawn Decimal  @default(0) @db.Decimal(18, 6)
  updatedAt      DateTime @updatedAt
  @@map("profit_pool")
}

model OwnerWithdrawalRequest {
  id             String                @id @default(cuid())
  amount         Decimal               @db.Decimal(18, 6)
  initiatorEmail String
  approverEmail  String?
  status         OwnerWithdrawalStatus @default(PENDING)
  owner1Wallet   String
  owner2Wallet   String
  owner1Amount   Decimal               @db.Decimal(18, 6)
  owner2Amount   Decimal               @db.Decimal(18, 6)
  txHash1        String?
  txHash2        String?
  createdAt      DateTime              @default(now())
  approvedAt     DateTime?
  executedAt     DateTime?
  @@map("owner_withdrawal_requests")
}

enum OwnerWithdrawalStatus {
  PENDING
  EXECUTED
  CANCELLED
}
```

---

## Burn Configurator

All params stored in `PlatformConfig` table (key-value). The burn service reads these on each burn with hardcoded fallbacks.

### Configurable Parameters

| Key | Default | Description |
|-----|---------|-------------|
| `jackpot_prob` | 0.01 | Jackpot win probability (0–1) |
| `jackpot_amount` | 2500 | Jackpot fixed prize in USDC |
| `big_prob` | 0.04 | Big prize cumulative probability |
| `big_amount` | 500 | Big prize fixed amount |
| `medium_prob` | 0.20 | Medium prize cumulative probability |
| `medium_amount` | 200 | Medium prize amount |
| `small_amount` | 50 | Small prize amount |
| `ash_reward_min` | 200 | Min ASH on loss |
| `ash_reward_max` | 500 | Max ASH on loss |
| `constant_factor` | 100 | Win chance denominator (higher = harder) |
| `reward_pool_split` | 0.5 | Fraction of each burn → reward pool |
| `profit_pool_split` | 0.5 | Fraction of each burn → profit pool |
| `referral_commission` | 0.1 | Referral reward fraction |

### Frontend Sliders (Owner Panel)

**Prize Configuration:**
- JACKPOT probability: 0.1% – 5% (step 0.1%)
- JACKPOT amount: $500 – $10,000 (step $100)
- BIG probability: 1% – 10%
- BIG amount: $100 – $2,000
- MEDIUM probability: 3% – 20%
- MEDIUM amount: $50 – $500
- SMALL amount: $10 – $200

**ASH Rewards:**
- Min ASH on loss: 50 – 1000
- Max ASH on loss: 100 – 2000

**Game Balance:**
- Constant factor: 10 – 500 (lower = easier to win)
- Reward pool split: 10% – 90%

**Live Expected Value Calculator** (readonly):
- Shows for a $4.99 burn: win probability %, expected USDC value, expected ASH value

---

## API Endpoints

All under `/api/owner/*`, protected by `authenticate` + `requireOwner`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/owner/me` | Verify owner access (200 or 403) |
| GET | `/api/owner/stats` | Platform overview stats |
| GET | `/api/owner/profit-pool` | Current profit pool balance + history |
| GET | `/api/owner/withdrawal/pending` | List pending withdrawal requests |
| POST | `/api/owner/withdrawal/initiate` | Initiate a new withdrawal |
| POST | `/api/owner/withdrawal/approve/:id` | Second owner approves |
| POST | `/api/owner/withdrawal/cancel/:id` | Cancel a pending request |
| GET | `/api/owner/burn-config` | Get all burn configuration |
| PUT | `/api/owner/burn-config` | Save burn configuration |

---

## Frontend Pages

### `/owner-login`
- Full-screen dark page with ASHNANCE logo
- Single "Login with Google" button (no email/password)
- Sets `localStorage.ownerLoginAttempt = "1"` then redirects to Google OAuth
- After login, `/auth/callback` detects flag and redirects to `/owner`

### `/owner`
Three sections in sidebar:

1. **PROFIT POOL** — Balances, multi-sig withdrawal UI
2. **BURN CONFIG** — All sliders + live calculator
3. **STATS** — Platform overview (readonly)

---

## Security Notes
- `requireOwner` checks email against `config.ownerEmails` (loaded from env at startup)
- Empty `OWNER_EMAILS` env = no one can access owner panel
- The same owner cannot both initiate and approve a withdrawal
- Only 1 pending withdrawal at a time
- Owner panel is completely separate from `/admin` (different routes, different auth)

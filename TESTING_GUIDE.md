# Ashnance — Tester's Guide

> Pre-testing setup and step-by-step test flows for the Ashnance platform.
> Network: **Solana Devnet** | USDC: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`

---

## Prerequisites

### 1. Backend `.env` (copy from `backend/.env.example`)

All required values are already set in `backend/.env` for local devnet testing.
Make sure these are present:

```
DATABASE_URL=postgresql://...
MASTER_KEYPAIR_SECRET=[...]   # 64-number JSON array
USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
OWNER_EMAILS=mherky91@gmail.com
SMTP_USER=ashnanceburn@gmail.com
SMTP_PASS=<app password>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 2. Frontend `.env.local` (copy from `frontend/.env.local.example`)

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

### 3. Database

```bash
cd backend
npx prisma db push
npx prisma generate
```

### 4. Start Servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open `http://localhost:3000`.

### 5. Phantom Wallet (for deposits)

- Install [Phantom](https://phantom.app) browser extension
- Switch to **devnet** in Settings → Developer Settings
- Get devnet SOL: `solana airdrop 2 <your-address> --url devnet`
- Get devnet USDC: https://spl-token-faucet.com or use the SPL faucet

---

## Test Flows

### Flow 1 — Registration & Login

**Email + OTP:**
1. Go to `/register` — fill email, username
2. Check email for 6-digit OTP
3. Enter OTP → account created, redirected to dashboard

**Google OAuth:**
1. Click "Continue with Google" on login page
2. Select Google account → should redirect to dashboard

**Phantom Wallet:**
1. Click "Connect Wallet" → approve in Phantom
2. Sign message → creates or logs into wallet-linked account

---

### Flow 2 — Deposit USDC

1. Go to `/wallet`
2. Copy your **Deposit Address** (shown in wallet section)
3. Click **Deposit** button → Phantom wallet opens
4. Approve USDC transfer to your deposit address
5. Wait ~15–30 seconds for `DepositMonitorService` to detect the transaction
6. Your in-app USDC balance should increase

**Alternative:** Use the tx hash manual deposit:
- Send USDC to your deposit address from Phantom
- Paste the transaction hash in the deposit modal

---

### Flow 3 — Create a Round (Owner)

1. Log in with `mherky91@gmail.com` (the OWNER_EMAIL)
2. Go to `/owner`
3. In "ACTIVE ROUND" panel:
   - Set Prize Pool Target (e.g. `$10` for fast testing)
   - Set Time Limit: `0.1` hours (= 6 minutes) for auto-expiry testing
4. Click **CREATE ROUND**
5. Round should appear as ACTIVE

---

### Flow 4 — Burn USDC

1. Log in as a regular user with USDC balance
2. Go to `/burn`
3. Enter amount (min $5.00) and click **BURN NOW**
4. Confirm the burn result shows:
   - ASH reward received
   - Weight updated
   - Round progress bar increases
   - Leaderboard rank shown

---

### Flow 5 — Leaderboard

1. Go to `/leaderboard`
2. Verify:
   - Round progress bar shows correct % (filled based on currentPool / target)
   - Top 10 users listed with weight and distance-to-#1
   - Your rank shown at bottom even if outside top 10

---

### Flow 6 — Round Ends (Pool Target Hit)

1. Create round with small target (e.g. $10)
2. Burn enough USDC so pool reaches target
3. Round should auto-end, winner credited, round status = COMPLETED
4. Check winner's wallet balance increased

**Balance rules verified during this flow:**
- Anti-snipe: round won't end if #1 just changed (10s wait)
- Anti-domination: if winner won last round, #2 wins instead
- Prize safety: prize ≤ 70% of reward pool balance

---

### Flow 7 — Round Auto-Expires (Time Limit)

1. Create round with `timeLimitHours = 0.1` (6 minutes)
2. Wait 6+ minutes (background checker runs every 60s)
3. Round auto-ends, pays winner at rank #1 (force mode, skips anti-snipe)

---

### Flow 8 — Soft Reset / Weight System

After a round ends:
1. Check non-winner wallets: `cumulativeWeight` should be × 0.90
2. Check winner wallet: `cumulativeWeight` should be 0

---

### Flow 9 — VIP Subscription

1. Go to `/subscribe`
2. Click **SUBSCRIBE TO HOLY FIRE** ($24.99 USDC deducted from balance)
3. Verify:
   - VIP badge appears
   - Sidebar shows VIP tier
   - Next burn: +0.50 weight bonus, +20% ASH

---

### Flow 10 — Withdrawal

1. Go to `/settings` → **Addresses** tab
2. Add a whitelisted Solana address
3. Go to `/wallet` → **Withdraw**
4. Enter amount, address (must be whitelisted), 2FA code
5. Withdrawal processed on-chain from master wallet

---

### Flow 11 — Owner Panel

Navigate to `/owner` and test:

- [ ] View live stats (total burns, pool balances)
- [ ] View solvency report
- [ ] Edit BALANCE RULES config (weight cap, referral cap, prize safety, time limit, anti-snipe)
- [ ] Create a round with custom target + time limit
- [ ] Force-end an active round
- [ ] Cancel a round
- [ ] Initiate profit withdrawal (requires second owner to approve)

---

## Known Limits (Devnet)

- USDC on devnet has no real value
- Deposits depend on on-chain polling — allow 30–60 seconds
- For very fast testing, use the manual tx hash deposit
- Phantom devnet USDC requires the SPL faucet (not the Phantom UI faucet)

---

## API Health Check

```bash
curl http://localhost:4000/api/health
```

Expected:
```json
{ "success": true, "service": "Ashnance API", "uptime": ... }
```

---

## Useful Endpoints for Manual Testing

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/health` | Server status |
| POST | `/api/auth/login` | Login → get access token |
| GET | `/api/round/current` | Active round + your rank |
| GET | `/api/round/leaderboard` | Top 10 leaderboard |
| POST | `/api/burn` | Execute a burn |
| GET | `/api/wallet` | Your wallet balance |
| GET | `/api/owner/me` | Verify owner access |
| POST | `/api/owner/round` | Create round |

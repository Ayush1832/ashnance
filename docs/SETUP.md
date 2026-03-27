# Ashnance — Full Setup Requirements

## 1. Prerequisites (Install These First)

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20+ | Runtime for backend and frontend |
| **npm** | 10+ | Package manager |
| **PostgreSQL** | 15+ | Primary database |
| **Git** | Latest | Version control |

Optional but recommended:
- **Redis** — for production WebSocket pub/sub and OTP caching (currently uses in-memory store)
- **Docker + Docker Compose** — easiest way to run PostgreSQL + Redis locally

---

## 2. Repository Structure

```
ashnance/
├── backend/          # Express.js API server (port 4000)
│   ├── prisma/       # Database schema + migrations
│   ├── src/          # TypeScript source
│   └── .env          # Backend environment variables
└── frontend/         # Next.js 16 app (port 3000)
    └── src/          # TypeScript source
```

---

## 3. Backend Setup

### 3a. Install Dependencies
```bash
cd backend
npm install
```

### 3b. Configure Environment Variables
Copy `.env.example` to `.env` and fill in all values:
```bash
cp .env.example .env
```

**Required variables:**
```env
# Database — required
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ashnance?schema=public"

# JWT — change these in production!
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"

# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Optional but needed for full functionality:**
```env
# Email — OTPs will only log to console without this
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password   # Gmail: use App Password (16 chars)

# Solana — needed for real blockchain integration
SOLANA_RPC_URL=https://api.devnet.solana.com   # or mainnet
SOLANA_PRIVATE_KEY=                             # base58 or JSON array of master keypair

# OAuth — for Google login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 3c. Set Up Database
```bash
# Create database in PostgreSQL
psql -U postgres -c "CREATE DATABASE ashnance;"

# Push schema (development)
npm run db:push

# Or run migrations (production)
npm run db:migrate

# Seed initial data (prize configs, platform configs, reward pool)
npm run db:seed
```

### 3d. Run Backend
```bash
# Development (auto-reload)
npm run dev

# Production build
npm run build && npm start
```

Backend will start at `http://localhost:4000`

---

## 4. Frontend Setup

### 4a. Install Dependencies
```bash
cd frontend
npm install
```

### 4b. Configure Environment
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4c. Run Frontend
```bash
# Development
npm run dev

# Production build
npm run build && npm start
```

Frontend will start at `http://localhost:3000`

---

## 5. Required External Services

### 5a. Email / OTP (Priority: HIGH)
Without email, OTPs are only printed to the backend console (works for dev).

**Option A — Gmail (easiest for dev):**
1. Enable 2-Step Verification on your Google account
2. Go to Google Account → Security → App Passwords
3. Create app password for "Mail"
4. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_USER=your@gmail.com`, `SMTP_PASS=<16-char-app-password>`

**Option B — SendGrid (recommended for production):**
1. Create account at sendgrid.com
2. Get API key from Settings → API Keys
3. Set `SMTP_HOST=smtp.sendgrid.net`, `SMTP_USER=apikey`, `SMTP_PASS=<your-api-key>`

### 5b. Solana Wallet Integration (Priority: HIGH for blockchain)
For real USDC deposits/withdrawals:

1. **Get a Solana keypair** (master keypair for generating deposit addresses):
   ```bash
   # Install Solana CLI
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

   # Generate new keypair
   solana-keygen new --outfile master-keypair.json

   # Get private key as base58
   solana-keygen export --outfile - < master-keypair.json
   ```
   Set `SOLANA_PRIVATE_KEY` in `.env`

2. **Fund the master wallet** with SOL for transaction fees (devnet: `solana airdrop 2`)

3. **Switchboard VRF** (for production randomness):
   - Register at [switchboard.xyz](https://switchboard.xyz)
   - Create a VRF account on Solana
   - Update `burnService.ts` to call the VRF oracle

### 5c. Smart Contracts (Priority: LOW for MVP, HIGH for production)
Not yet implemented. For full on-chain version:

1. Install Anchor framework: `npm install -g @project-serum/anchor-cli`
2. Write Anchor programs for:
   - Burn engine (records burns on-chain, calls VRF)
   - ASH SPL token program
   - Reward pool management
   - VIP registry
3. Deploy to Solana devnet first, then mainnet

### 5d. OAuth / Social Login (Priority: MEDIUM)
For Google login:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

For X (Twitter) login:
- Apply for X Developer account at [developer.x.com](https://developer.x.com)

For Telegram login:
- Create a bot via @BotFather
- Use the Telegram Login Widget

### 5e. Phantom Wallet (Priority: HIGH for Web3 UX)
- No API key needed — Phantom injects `window.phantom.solana` into the browser
- Users install [phantom.app](https://phantom.app) browser extension
- Works automatically once installed

---

## 6. Database Seed (First Run)

After `npm run db:push`, run the seed script to populate initial data:
```bash
cd backend
npm run db:seed
```

This creates:
- Prize configurations (Jackpot/Big/Medium/Small)
- Platform config defaults
- Initial reward pool record

---

## 7. Production Deployment Checklist

### Infrastructure
- [ ] PostgreSQL database (managed: Railway, Supabase, Neon, or AWS RDS)
- [ ] Node.js hosting (Railway, Render, Fly.io, or VPS)
- [ ] Next.js hosting (Vercel is easiest)
- [ ] Domain name + SSL certificate
- [ ] Redis (optional but recommended for WebSocket scaling)

### Security
- [ ] Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to long random strings
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS everywhere
- [ ] Set `FRONTEND_URL` to your actual domain (CORS)
- [ ] Review rate limits in `server.ts`
- [ ] Enable 2FA for admin accounts
- [ ] Set up withdrawal whitelist

### Before Launch
- [ ] Run `prisma migrate deploy` (not `db:push`) for production migrations
- [ ] Test all burn flows end-to-end
- [ ] Verify reward pool has adequate USDC before going live
- [ ] Set up monitoring (UptimeRobot, Sentry, etc.)
- [ ] Test email delivery
- [ ] Perform security audit

---

## 8. Quick Start (Dev Mode)

```bash
# Terminal 1 — Database (if using Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ashnance postgres:15

# Terminal 2 — Backend
cd backend && npm install && cp .env.example .env
# Edit .env to set DATABASE_URL
npm run db:push && npm run db:seed
npm run dev

# Terminal 3 — Frontend
cd frontend && npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

Open `http://localhost:3000` — OTPs will appear in backend terminal (Terminal 2).

---

## 9. What's Already Working (No External Setup Needed)

| Feature | Status |
|---------|--------|
| User registration (OTP via console) | ✅ Works out of box |
| User login (password or OTP) | ✅ Works out of box |
| JWT authentication | ✅ Works out of box |
| Burn mechanic (VRF simulated) | ✅ Works out of box |
| Wallet balances (internal) | ✅ Works out of box |
| Referral system | ✅ Works out of box |
| VIP subscription (USDC balance deduction) | ✅ Works out of box |
| Admin panel | ✅ Works out of box |
| Leaderboards | ✅ Works out of box |
| 2FA (TOTP) | ✅ Works out of box |
| Email OTPs | ⚠️ Logs to console without SMTP |
| Real USDC deposits | ❌ Requires Solana setup |
| Real USDC withdrawals | ❌ Requires Solana setup |
| Phantom wallet connect | ⚠️ Requires Phantom extension installed |
| VRF on-chain | ❌ Requires Switchboard setup |
| Smart contracts | ❌ Requires Anchor development |
| OAuth login | ❌ Requires API keys |

# Ashnance Project — Master Task Tracker

## Phase 0: Documentation & Planning
- [x] Read and understand full project document (21 sections)
- [x] Create detailed architecture document
- [x] Create implementation plan with phased approach
- [x] Create tech stack decision document (feature_spec.md + design_guidelines.md)
- [x] Design UI screens with Stitch MCP (Landing Page + Dashboard)
- [x] Get user approval on plan

## Phase 1: Project Setup & Foundation
- [x] Initialize Next.js 15 frontend
- [x] Initialize Node.js/Express backend
- [x] Configure Prisma schema (10 models, 7 enums)
- [x] Set up project directory structure
- [x] Set up design system (Ignition Forge - 80+ CSS tokens)
- [x] Create base layout components (Navbar, Sidebar, Footer)
- [x] Set up Zod validators, JWT auth, WebSocket (Socket.IO)
- [x] Create frontend API client (`lib/api.ts`)

## Phase 2: Landing Page (Section 1)
- [x] Hero section with fire/ash animations
- [x] "Start Burning" CTA button
- [x] How It Works (3 steps)
- [x] Live Ticker component
- [x] Registration/Login buttons
- [x] Prize Table section
- [x] Features section + CTA section + Footer

## Phase 3: Authentication (Section 2)
- [x] Email + OTP registration flow (frontend)
- [x] OAuth integration UI (Google, X, Telegram)
- [x] Web3 wallet connection UI (Phantom, Solflare, Backpack)
- [x] Auth service (register/login/refresh/logout) (backend)
- [x] Account lockout after 3 failed attempts (backend)
- [ ] Real OAuth provider integration
- [ ] Real Solana wallet connection

## Phase 4: Dashboard & Wallet (Sections 3, 16, 17)
- [x] Dashboard layout (sidebar, balance cards, stats grid, transactions, live ticker)
- [x] Wallet page (deposit/withdraw/history tabs)
- [x] Deposit flow (address copy, wallet connect grid)
- [x] Withdraw flow with 2FA warning
- [x] Wallet service (deposit/withdraw/transactions) (backend)
- [x] Transactions page (filterable, searchable)
- [x] User Settings page (Profile/Security/Notifications/Addresses)

## Phase 5: Core Gameplay — Burn Now (Section 4)
- [x] Burn Now interface (amount selection: $4.99/$10/$50 + custom)
- [x] Luck Meter visualization (animated bar)
- [x] Weight breakdown display (Base/VIP/ASH Boost/Streak)
- [x] Burn service — full gameplay loop (backend)
- [x] Weight calculation (Base + VIP + Referral + Boost)
- [x] Win/Lose determination (EffectiveChance formula)
- [x] Prize tier selection (Jackpot 1%, Big 4%, Medium 15%, Small 80%)
- [x] Win/Lose result display (overlay with animated result)
- [ ] Switchboard VRF on-chain integration (uses Math.random for now)
- [ ] Visual effects (3D explosion for win, falling ash for lose)
- [ ] AI voice integration

## Phase 6: Backend Logic (Sections 5–9) 
- [x] Reward Pool and Profit Pool split logic (in burnService)
- [x] Winner selection with Weight calculation (in burnService)
- [x] Prize Table (Jackpot/Big/Medium/Small) (in burnService + DB seed)
- [x] Referral 10% reward from Reward Pool (in burnService)
- [x] ASH token reward on loss 200-500 + VIP bonus (in burnService)
- [ ] Dynamic prize from % of Reward Pool (currently fixed values)
- [ ] Smart contract integration for on-chain recording

## Phase 7: Referral System (Section 10)
- [x] Unique referral link + code generation (frontend)
- [x] Share buttons (X, Telegram, WhatsApp)
- [x] Referral tracking panel (stats + activity table)
- [x] 10% instant reward from Reward Pool (backend — in burnService)
- [ ] Referral notifications (WebSocket — events defined)

## Phase 8: VIP — Holy Fire Subscription (Section 11)
- [x] Subscription page (3 tiers: Spark/Active Ash/Holy Fire with benefits)
- [x] Weight bonus activation (+0.10/+0.25/+0.50) (in burnService)
- [x] Extra ASH on loss (+20% for Holy Fire) (in burnService)
- [ ] Payment deduction from USDC balance (backend route needed)
- [ ] On-chain VIP Registry
- [ ] Auto-renewal logic

## Phase 9: ASH Token Features (Sections 12, 19)
- [x] ASH earning on loss (in burnService)
- [x] ASH Balance display (dashboard + wallet)
- [x] Boost system logic (1000 ASH = +0.5 Weight) (in burnService)
- [ ] ASH withdrawal to external wallet
- [ ] Staking tab (future phase)

## Phase 10: Social Layer (Section 14)
- [x] Live Ticker (landing page + dashboard)
- [x] Leaderboards (Top Winners, Burners, Referral Kings, ASH Holders)
- [x] Leaderboard service (4 rankings with privacy mode) (backend)
- [ ] Share Moment card generation
- [ ] Social sharing (X, TikTok, Telegram)

## Phase 11: AI Assistant (Section 18)
- [ ] AshBot icon and chat popup
- [ ] Dynamic messages based on events
- [ ] TTS integration

## Phase 12: Admin Panel (Section 15)
- [x] Admin dashboard (6 stat cards + bar charts)
- [x] Prize Management (table with edit)
- [x] Referral System controls
- [x] Holy Fire management
- [x] ASH Token settings (supply stats + config)
- [x] Platform Configuration (split slider, all game params)
- [x] Audit log
- [ ] Admin auth (role-based access)

## Phase 13: Visual & Audio Effects (Section 13)
- [ ] Win effects (3D explosion, golden shards)
- [ ] Lose effects (falling ash, fading fire)
- [ ] Sound effects and AI voice clips

## Phase 14: Polish & Launch Prep
- [ ] Full responsive testing
- [ ] SEO optimization
- [ ] Performance optimization
- [ ] Security audit (2FA flows, withdrawal protection)
- [ ] Deploy to staging

# Ashnance Project — Master Task Tracker

## Phase 0: Documentation & Planning
- [x] Read and understand full project document (21 sections)
- [x] Create detailed architecture document
- [x] Create implementation plan with phased approach
- [x] Create tech stack decision document (feature_spec.md + design_guidelines.md)
- [x] Design UI screens with Stitch MCP (Landing Page + Dashboard)
- [x] Get user approval on plan

## Phase 1: Project Setup & Foundation
- [x] Initialize project (Next.js 15 + TypeScript)
- [x] Initialize Node.js/Express backend
- [x] Configure Prisma schema (10 models)
- [x] Set up project directory structure
- [x] Set up design system (Ignition Forge - colors, typography, themes in globals.css)
- [x] Create base layout components (Navbar, Sidebar, Footer)
- [x] Set up Zod validators, JWT auth, WebSocket (Socket.IO)

## Phase 2: Landing Page (Section 1)
- [x] Hero section with fire/ash animations
- [x] "Start Burning" CTA button
- [x] How It Works (3 steps)
- [x] Live Ticker component
- [x] Registration/Login buttons
- [x] Prize Table section
- [x] Features section
- [x] CTA section
- [x] Footer
- [x] Responsive design

## Phase 3: Authentication (Section 2)
- [x] Email + OTP registration flow (frontend)
- [x] OAuth integration UI (Google, X, Telegram)
- [x] Web3 wallet connection UI (Phantom, Solflare, Backpack)
- [ ] Internal wallet creation on registration (backend)
- [ ] Unique deposit address generation (backend)

## Phase 4: Dashboard & Wallet (Sections 3, 16, 17)
- [x] Dashboard layout (sidebar, balance cards, stats grid)
- [x] Quick actions (Deposit, Withdraw, Burn Now)
- [x] Recent transactions list
- [x] Mini live ticker
- [ ] Deposit flow (Connect Wallet + Deposit Address) (backend)
- [ ] Withdraw flow with 2FA (backend)
- [ ] Transaction History (filterable, searchable)
- [ ] User Settings page

## Phase 5: Core Gameplay — Burn Now (Section 4)
- [x] Burn Now interface (amount selection: $4.99/$10/$50 + custom)
- [x] Luck Meter visualization (animated bar)
- [x] Weight breakdown display (Base/VIP/ASH Boost/Streak)
- [ ] Balance check & deduction logic (backend)
- [ ] VRF integration for random number (backend)
- [x] Win/Lose result display (overlay with animated result)
- [ ] Visual effects (3D explosion for win, falling ash for lose)
- [ ] AI voice integration

## Phase 6: Backend Logic (Sections 5–9)
- [ ] Reward Pool and Profit Pool split logic
- [ ] Winner selection with Weight calculation
- [ ] Prize Table (Jackpot/Big/Medium/Small)
- [ ] Dynamic prize distribution based on Reward Pool
- [ ] Fallback rules when pool is low
- [ ] Smart contract integration for on-chain recording

## Phase 7: Referral System (Section 10)
- [x] Unique referral link generation (frontend)
- [x] Share buttons (X, Telegram, WhatsApp)
- [x] Referral tracking panel (stats + activity table)
- [ ] 10% instant reward from Reward Pool (backend)
- [ ] Referral notifications (backend)

## Phase 8: VIP — Holy Fire Subscription (Section 11)
- [ ] Subscription page (price, benefits)
- [ ] Payment deduction from USDC balance
- [ ] On-chain VIP Registry
- [ ] VIP Badge on profile
- [ ] Weight bonus (+0.5) activation
- [ ] Extra ASH on loss (+20%)
- [ ] Auto-renewal logic

## Phase 9: ASH Token Features (Sections 12, 19)
- [ ] ASH earning on loss
- [ ] ASH Balance display with stats
- [ ] Boost system (1000 ASH = +0.5 Weight for 1hr)
- [ ] ASH withdrawal
- [ ] Staking tab (future phase)

## Phase 10: Social Layer (Section 14)
- [x] Live Ticker (landing page + dashboard mini ticker)
- [ ] Share Moment card generation
- [ ] Social sharing (X, TikTok, Telegram)
- [x] Leaderboards (Top Winners, Most Burns, Referral Kings, ASH Holders)

## Phase 11: AI Assistant (Section 18)
- [ ] AshBot icon and chat popup
- [ ] Dynamic messages based on events
- [ ] Personalized messages based on player data
- [ ] TTS integration

## Phase 12: Admin Panel (Section 15)
- [ ] Admin dashboard (overview stats)
- [ ] Prize Management (table, probabilities, limits)
- [ ] Referral System controls
- [ ] Holy Fire management
- [ ] ASH Token settings
- [ ] Visual/Audio effects settings
- [ ] Reports & analytics
- [ ] Audit log

## Phase 13: Visual & Audio Effects (Section 13)
- [ ] Win effects (3D explosion, golden shards)
- [ ] Lose effects (falling ash, fading fire)
- [ ] Dynamic random messages
- [ ] Sound effects and AI voice clips
- [ ] Special effects for VIP/Boost/Referral

## Phase 14: Polish & Launch Prep
- [ ] Full responsive testing
- [ ] SEO optimization
- [ ] Performance optimization
- [ ] Security audit (2FA flows, withdrawal protection)
- [ ] Deploy to staging
- [ ] User acceptance testing

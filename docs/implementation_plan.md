# Ashnance — Implementation Plan

## Overview

Build the **Ashnance "Burn to Win"** platform — a Solana-based gamified application where users burn USDC for a chance to win prizes or earn ASH tokens. The frontend will be designed using **Stitch MCP** for modern, premium UI designs before implementing in code.

> [!IMPORTANT]
> This is a large-scale project. We will build in **sprints**, starting with the frontend (landing page + dashboard) and progressively adding features. Each sprint will follow: **Design (Stitch) → Implement → Verify**.

---

## User Review Required

> [!CAUTION]
> **Backend & Smart Contracts**: This plan focuses on the **frontend first**. The Solana smart contracts and full backend will be designed and implemented in later phases. For now, we'll use mock data and simulated logic to build a fully functional frontend prototype.

> [!IMPORTANT]
> **Key Design Decisions:**
> 1. **Framework**: Next.js 15 with App Router + TypeScript for the frontend
> 2. **Styling**: Vanilla CSS with CSS custom properties (design tokens)
> 3. **Animations**: CSS animations + GSAP + Three.js for 3D fire effects
> 4. **State Management**: Zustand for global state
> 5. **Design Tool**: Stitch MCP for UI design before coding
> 6. **Mock Backend**: JSON-based mock data for initial frontend development

---

## Proposed Changes

### Sprint 1: Project Setup + Landing Page Design

#### [NEW] Project Initialization
- Initialize Next.js 15 project with TypeScript in `c:\Users\LENOVO\Desktop\ashnance`
- Configure `package.json` with required dependencies
- Set up `tsconfig.json`, `next.config.js`

#### [NEW] Design System ([styles/globals.css](file:///c:/Users/LENOVO/Desktop/ashnance/frontend/app/globals.css))
- CSS custom properties for colors (dark theme, fire/ash palette)
- Typography tokens (Inter font family)
- Spacing, border-radius, shadow tokens
- Animation keyframes (fire-glow, ash-fall, explosion)

#### [NEW] Layout Components
- `components/layout/Navbar.tsx` — Top navigation bar
- `components/layout/Sidebar.tsx` — Dashboard sidebar
- `components/layout/Footer.tsx` — Footer with links
- `app/layout.tsx` — Root layout with dark theme

#### [NEW] Landing Page ([app/(landing)/page.tsx](file:///c:/Users/LENOVO/Desktop/ashnance/frontend/app/(landing)/page.tsx))
- Hero section: "Burn to Win ASH Token" + "Start Burning" CTA
- Live Ticker component (mock data initially)
- How It Works (3 steps with fire-themed icons)
- Registration/Login CTA buttons
- Fire/ash visual effects background

**Stitch MCP Usage:**
1. Create a Stitch project for Ashnance
2. Generate landing page screen design
3. Generate dashboard screen design
4. Apply fire/dark theme design system
5. Use designs as reference for implementation

---

### Sprint 2: Authentication + Dashboard

#### [NEW] Auth Pages
- `app/(auth)/login/page.tsx` — Login page (Email+OTP, OAuth, Web3)
- `app/(auth)/register/page.tsx` — Registration with same options
- `components/auth/OTPInput.tsx` — 6-digit OTP code input
- `components/auth/WalletConnect.tsx` — Solana wallet connect button

#### [NEW] Dashboard
- `app/dashboard/page.tsx` — Main dashboard
- `components/dashboard/BalanceCard.tsx` — USDC + ASH balances
- `components/dashboard/BurnStats.tsx` — User burn statistics
- `components/dashboard/QuickActions.tsx` — Deposit, Withdraw, Burn buttons
- `components/dashboard/LiveTicker.tsx` — Real-time events feed

---

### Sprint 3: Core Gameplay — Burn Now

#### [NEW] Burn Interface
- `app/burn/page.tsx` — Burn Now main page
- `components/burn/BurnButton.tsx` — Animated burn button
- `components/burn/AmountSelector.tsx` — 4.99/10/50/Custom buttons
- `components/burn/LuckMeter.tsx` — Probability visualization
- `components/burn/BurnResult.tsx` — Win/Lose result display

#### [NEW] Visual Effects
- `components/effects/FireExplosion.tsx` — 3D explosion for wins
- `components/effects/AshFall.tsx` — Falling ash for losses
- `components/effects/ScreenShake.tsx` — Screen shake on big wins

---

### Sprint 4: Backend Logic (Simulated)

#### [NEW] Mock Services
- `lib/mock/burnService.ts` — Simulated burn logic with weight calculation
- `lib/mock/prizeService.ts` — Prize table + VRF simulation
- `lib/mock/poolService.ts` — Reward Pool + Profit Pool management
- `lib/mock/userData.ts` — Mock user data and balances

#### [NEW] State Management
- `store/userStore.ts` — User state (balances, burns, VIP)
- `store/gameStore.ts` — Burn state, results, effects
- `store/tickerStore.ts` — Live ticker events

---

### Sprint 5: Referral + VIP Systems

#### [NEW] Referral System
- `app/referral/page.tsx` — Referral dashboard
- `components/referral/ReferralLink.tsx` — Copyable link + share buttons
- `components/referral/ReferralStats.tsx` — Friends joined, earnings
- `lib/mock/referralService.ts` — Referral tracking logic

#### [NEW] VIP (Holy Fire) Subscription
- `app/subscribe/page.tsx` — VIP subscription page
- `components/vip/SubscriptionCard.tsx` — Price, benefits list
- `components/vip/VIPBadge.tsx` — Profile badge component

---

### Sprint 6: Social Layer + AI Assistant

#### [NEW] Social Features
- `app/leaderboard/page.tsx` — Leaderboard page
- `components/social/Leaderboard.tsx` — Top Winners/Burns/Referrals
- `components/social/ShareMoment.tsx` — Share card for X/TikTok
- `components/social/LiveTicker.tsx` — Enhanced live ticker

#### [NEW] AI Assistant
- `components/ai/AshBot.tsx` — Chat popup component
- `components/ai/AshBotIcon.tsx` — Floating icon
- `lib/ai/messageEngine.ts` — Dynamic message selection

---

### Sprint 7: Admin Panel

#### [NEW] Admin Interface
- `app/admin/page.tsx` — Admin dashboard overview
- `app/admin/prizes/page.tsx` — Prize management
- `app/admin/referrals/page.tsx` — Referral controls
- `app/admin/subscriptions/page.tsx` — Holy Fire management
- `app/admin/reports/page.tsx` — Analytics and reports
- `app/admin/settings/page.tsx` — Platform settings

---

### Sprint 8: Polish + Launch Prep

#### [MODIFY] All pages
- Responsive design audit
- SEO meta tags on all pages
- Performance optimization (lazy loading, code splitting)
- Accessibility (ARIA labels, keyboard nav)
- Final visual polish and animation tuning

---

## Verification Plan

### Automated Tests
- Run `npm run build` after each sprint to verify no build errors
- Run `npm run lint` to check for code quality issues
- Run `npx tsc --noEmit` for TypeScript type checking

### Browser Testing (After Each Sprint)
- Open the dev server at `http://localhost:3000`
- Navigate through all created pages
- Verify responsive layout at mobile (375px), tablet (768px), and desktop (1440px)
- Test all interactive elements (buttons, forms, animations)
- Take screenshots for verification

### Manual Testing (User)
- Review Stitch MCP designs before implementation begins
- Test the landing page hero section and CTA flow
- Verify fire/ash visual effects look premium and smooth
- Test dark theme consistency across all pages
- Confirm the overall "wow factor" of the design

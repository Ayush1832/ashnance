# Ashnance — System Architecture Document

## 1. System Overview

Ashnance is a **"Burn to Win"** gamified platform on Solana where users burn USDC for a chance to win prizes or earn ASH tokens. The platform consists of:

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js)"]
        LP[Landing Page]
        AUTH[Auth Pages]
        DASH[Dashboard]
        BURN[Burn Interface]
        ADMIN[Admin Panel]
    end
    
    subgraph Backend["Backend (Node.js + Express)"]
        API[REST API]
        WS[WebSocket Server]
        AIE[AI Engine]
        CRON[Cron Jobs]
    end
    
    subgraph Blockchain["Solana Blockchain"]
        SC[Smart Contracts - Anchor]
        VRF[VRF Oracle]
    end
    
    subgraph Storage["Data Layer"]
        DB[(PostgreSQL)]
        REDIS[(Redis Cache)]
    end
    
    Frontend --> API
    Frontend --> WS
    API --> DB
    API --> SC
    WS --> REDIS
    SC --> VRF
    CRON --> DB
    CRON --> SC
```

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 + TypeScript | SSR for SEO, App Router, fast builds |
| **Styling** | Vanilla CSS + CSS Variables | Full control, no framework lock-in |
| **Animations** | Three.js + GSAP + Lottie | 3D fire effects, smooth transitions |
| **State** | Zustand | Lightweight, simple global state |
| **Backend** | Node.js + Express + TypeScript | Fast API, great Solana SDK support |
| **Database** | PostgreSQL + Prisma ORM | Relational data, type-safe queries |
| **Cache** | Redis | Real-time ticker, session management |
| **Blockchain** | Solana + Anchor Framework | Fast, cheap transactions |
| **VRF** | Switchboard VRF | Verifiable randomness on Solana |
| **Auth** | JWT + OAuth2 + Solana Wallet Adapter | Web2 + Web3 auth |
| **2FA** | Speakeasy (TOTP) | Google Authenticator compatible |
| **AI** | OpenAI / Gemini API | Dynamic messages, personalization |
| **TTS** | Web Speech API / ElevenLabs | AI voice for burn results |
| **Real-time** | Socket.IO | Live ticker, notifications |
| **Email** | Nodemailer + SendGrid | OTP delivery |

## 3. Directory Structure

```
ashnance/
├── frontend/                    # Next.js Application
│   ├── app/                     # App Router pages
│   │   ├── (landing)/           # Landing page (public)
│   │   ├── (auth)/              # Login/Register pages
│   │   ├── dashboard/           # User dashboard
│   │   ├── burn/                # Burn Now interface
│   │   ├── wallet/              # Deposit/Withdraw
│   │   ├── referral/            # Referral page
│   │   ├── leaderboard/         # Leaderboards
│   │   ├── settings/            # User settings
│   │   ├── admin/               # Admin panel
│   │   └── api/                 # API routes (if using Next.js API)
│   ├── components/              # Reusable UI components
│   │   ├── common/              # Buttons, Cards, Modals
│   │   ├── layout/              # Navbar, Sidebar, Footer
│   │   ├── effects/             # Fire, Ash, Explosion animations
│   │   ├── dashboard/           # Dashboard-specific components
│   │   ├── burn/                # Burn-specific components
│   │   └── admin/               # Admin-specific components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities, constants, helpers
│   ├── store/                   # Zustand stores
│   ├── styles/                  # Global CSS, design tokens
│   └── public/                  # Static assets
│
├── backend/                     # Express API Server
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── services/            # Business logic
│   │   ├── models/              # Prisma schema + DB models
│   │   ├── middleware/          # Auth, validation, rate-limiting
│   │   ├── routes/              # Express route definitions
│   │   ├── utils/               # Helpers, constants
│   │   ├── websocket/           # Socket.IO handlers
│   │   ├── cron/                # Scheduled tasks
│   │   └── ai/                  # AI message engine
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   └── package.json
│
├── contracts/                   # Solana Smart Contracts (Anchor)
│   ├── programs/
│   │   ├── burn-engine/         # Burn + VRF + Prize logic
│   │   ├── reward-pool/         # Pool management
│   │   ├── ash-token/           # ASH SPL Token program
│   │   └── staking/             # Staking contract
│   └── tests/
│
└── docs/                        # Project documentation
```

## 4. Database Schema (Key Tables)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email
        string username
        string avatar_url
        string country
        boolean is_vip
        datetime vip_expires_at
        string deposit_address
        string referral_code
        uuid referred_by FK
        boolean two_fa_enabled
        string two_fa_secret
        boolean privacy_mode
        datetime created_at
    }
    
    WALLETS {
        uuid id PK
        uuid user_id FK
        decimal usdc_balance
        decimal ash_balance
        string solana_address
    }
    
    BURNS {
        uuid id PK
        uuid user_id FK
        decimal amount_usdc
        decimal weight
        boolean is_winner
        string prize_tier
        decimal prize_amount
        int ash_reward
        string tx_hash
        string vrf_seed
        datetime created_at
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        string type
        decimal amount
        string currency
        string status
        string tx_hash
        datetime created_at
    }
    
    REFERRALS {
        uuid id PK
        uuid referrer_id FK
        uuid referee_id FK
        decimal total_earned
        datetime created_at
    }
    
    PRIZE_CONFIG {
        uuid id PK
        string tier
        decimal value
        decimal probability
        boolean is_active
    }
    
    PLATFORM_CONFIG {
        uuid id PK
        string key
        string value
        datetime updated_at
    }
    
    USERS ||--o{ WALLETS : has
    USERS ||--o{ BURNS : performs
    USERS ||--o{ TRANSACTIONS : has
    USERS ||--o{ REFERRALS : makes
```

## 5. Core Flow: Burn Operation

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as Database
    participant SC as Smart Contract
    participant VRF as VRF Oracle
    participant WS as WebSocket

    U->>FE: Click "Burn Now" (amount)
    FE->>API: POST /api/burn {amount}
    API->>DB: Check user balance
    
    alt Insufficient Balance
        API-->>FE: Error: Insufficient balance
        FE-->>U: Show deposit prompt
    else Sufficient Balance
        API->>DB: Deduct USDC from wallet
        API->>SC: Submit burn transaction
        SC->>VRF: Request random number
        VRF-->>SC: Return VRF result
        SC->>SC: Calculate Weight + EffectiveChance
        
        alt Win
            SC->>SC: Determine prize tier
            SC->>SC: Deduct from Reward Pool
            SC-->>API: Result: Win + prize details
            API->>DB: Credit USDC prize to wallet
            API->>DB: Log transaction
            API->>WS: Broadcast win event
            API-->>FE: {result: "win", prize: 200, tier: "medium"}
            FE-->>U: 🔥 Explosion + "You won 200 USDC!"
        else Lose
            SC-->>API: Result: Lose
            API->>DB: Credit ASH tokens
            API->>DB: Log transaction
            API->>WS: Broadcast burn event
            API-->>FE: {result: "lose", ash: 300}
            FE-->>U: 🌫️ Falling ash + "You got 300 ASH"
        end
    end
```

## 6. Security Architecture

| Concern | Solution |
|---------|----------|
| Authentication | JWT with refresh tokens + OAuth2 + Wallet signatures |
| 2FA | TOTP (Google Authenticator) mandatory for withdrawals |
| Account lockout | 3 failed attempts → temporary freeze |
| Withdrawal | Requires 2FA + whitelisted addresses |
| Admin access | 2FA mandatory + role-based access |
| VRF | Switchboard on-chain verification — tamper-proof |
| Rate limiting | Express rate-limiter on all endpoints |
| Data validation | Zod schemas for all inputs |
| CORS | Strict origin policy |

## 7. Real-Time Events (WebSocket)

Events broadcast via Socket.IO:

| Event | Payload | Consumers |
|-------|---------|-----------|
| `burn:new` | `{user, amount, result}` | Live Ticker |
| `win:new` | `{user, prize, tier}` | Live Ticker, Leaderboard |
| `deposit:confirmed` | `{user, amount}` | Dashboard |
| `referral:earned` | `{referrer, amount}` | Notifications |
| `leaderboard:update` | `{rankings}` | Leaderboard page |

## 8. Frontend Design Principles

- **Theme**: Dark mode primary with fire/ash-themed accents
- **Colors**: Deep blacks, fiery oranges/reds, golden highlights, ash grays
- **Typography**: Modern sans-serif (Inter or Outfit from Google Fonts)
- **Animations**: GPU-accelerated CSS + Three.js for 3D fire effects
- **Responsive**: Mobile-first, supports all screen sizes
- **Accessibility**: ARIA labels, keyboard navigation, contrast ratios

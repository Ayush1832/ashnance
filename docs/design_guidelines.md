# Ashnance — Design Guidelines

## Brand Identity
- **Name**: Ashnance — Burn to Win ASH Token
- **Tagline**: "Keep Burning, Keep Earning"
- **Theme**: Fire, Ash, Flames — dark, premium, exciting
- **Mood**: Thrilling like a game, trustworthy like a financial platform

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0a0a0f` | Main background (deep black) |
| `--bg-secondary` | `#111118` | Card backgrounds |
| `--bg-tertiary` | `#1a1a24` | Elevated surfaces |
| `--accent-fire` | `#ff6b2c` | Primary fire orange |
| `--accent-ember` | `#ff4500` | Intense fire red-orange |
| `--accent-gold` | `#ffd700` | Golden highlights (wins) |
| `--accent-ash` | `#8b8b8b` | Ash gray (losses) |
| `--text-primary` | `#ffffff` | Primary text |
| `--text-secondary` | `#a0a0b0` | Secondary/muted text |
| `--success` | `#00d68f` | Positive actions |
| `--warning` | `#ffaa00` | Warnings |
| `--danger` | `#ff3d71` | Errors/destructive |
| `--gradient-fire` | `linear-gradient(135deg, #ff6b2c, #ff4500, #ffd700)` | Fire gradient |
| `--gradient-ash` | `linear-gradient(135deg, #2a2a3a, #1a1a24)` | Ash gradient |
| `--glow-fire` | `0 0 20px rgba(255, 107, 44, 0.4)` | Fire glow effect |

## Typography

| Token | Value |
|-------|-------|
| `--font-primary` | `'Inter', sans-serif` |
| `--font-display` | `'Outfit', sans-serif` |
| `--fs-hero` | `clamp(2.5rem, 5vw, 4.5rem)` |
| `--fs-h1` | `2.25rem` |
| `--fs-h2` | `1.75rem` |
| `--fs-h3` | `1.25rem` |
| `--fs-body` | `1rem` |
| `--fs-small` | `0.875rem` |
| `--fs-caption` | `0.75rem` |

## Animation Specifications

| Effect | Duration | Easing | When |
|--------|----------|--------|------|
| Fire glow pulse | 2s infinite | ease-in-out | Burn button idle |
| Burn button press | 0.6s | cubic-bezier | Click Burn Now |
| Win explosion | 1.5s | ease-out | Prize won |
| Ash falling | 2s | linear | Prize lost |
| Screen shake | 0.5s | ease-out | Jackpot won |
| Ticker slide | 0.3s | ease | New ticker event |
| Card hover | 0.2s | ease | Card interactions |
| Page transition | 0.3s | ease-in-out | Navigation |

## Page Requirements

### Landing Page
- Full-viewport hero with particle fire background
- Glowing "Start Burning" CTA button
- Animated 3-step "How It Works" section
- Auto-scrolling Live Ticker
- Dark, immersive, premium feel

### Dashboard
- Sidebar navigation with fire-themed icons
- Balance cards with glowing borders
- Quick action buttons (Deposit, Withdraw, Burn)
- Live Ticker widget
- Stats panel (Total Burns, Win Rate, ASH earned)

### Burn Now
- Central large Burn button with fire glow animation
- Amount selector (4.99 / 10 / 50 / Custom)
- Luck Meter (visual probability bar)
- Result overlay (full-screen for wins, subtle for losses) 

### Admin Panel
- Clean data-dense design
- Charts and graphs for analytics
- Form controls for prize/config management
- Dark theme consistent with main platform

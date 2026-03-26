# ASHNANCE PROJECT — Full Documentation
**Platform:** Burn to Win ASH Token  
**Official Tagline:** "Keep Burning, Keep Earning"  
**Tagline Placement:** Landing Page, Dashboard header, and all promotional materials.  
**Blockchain:** Solana  
**Currency Used:** USDC (deposits, prizes, referrals) + ASH Token (reward token)

---

## TABLE OF CONTENTS

1. [Main Landing Page (Before Registration)](#section-1-main-landing-page-before-registration)
2. [Registration and Login (Onboarding)](#section-2-registration-and-login-onboarding)
3. [Deposit and Withdraw](#section-3-deposit-and-withdraw)
4. [Core Gameplay — Burn Now](#section-4-core-gameplay--burn-now)
5. [Reward and Profit Distribution](#section-5-reward-and-profit-distribution)
6. [Winner Selection Logic](#section-6-winner-selection-logic)
7. [Weight Logic](#section-7-weight-logic)
8. [Weight and Prize Table Logic](#section-8-weight-and-prize-table-logic)
9. [Admin Prize Control Workflow](#section-9-admin-prize-control-workflow)
10. [Referral System Workflow](#section-10-referral-system-workflow)
11. [VIP Subscription (Holy Fire)](#section-11-vip-subscription-holy-fire)
12. [ASH Token Lifecycle](#section-12-ash-token-lifecycle)
13. [Visual and Audio Effects](#section-13-visual-and-audio-effects)
14. [Social Layer Workflow](#section-14-social-layer-workflow)
15. [Admin Panel Workflow](#section-15-admin-panel-workflow)
16. [User Settings Workflow](#section-16-user-settings-workflow)
17. [Transaction History Workflow](#section-17-transaction-history-workflow)
18. [AI Assistant Workflow](#section-18-ai-assistant-workflow)
19. [Staking and Post-1B Supply](#section-19-staking-and-post-1b-supply)
20. [User Journey — Full Workflow](#section-20-user-journey--full-workflow)
21. [Roadmap and Tokenomics](#section-21-roadmap-and-tokenomics)

---

## SECTION 1: Main Landing Page (Before Registration)

### Goal
Present the project to the user and convince them to register quickly.

### Components of the Main Landing Page
- Project logo and platform name: **Burn to Win ASH Token**
- Main CTA button: **"Start Burning"** — takes the user to the registration or login page
- Hero Section quick pitch: "Burn 4.99 USDC → Win a grand prize or get ASH Token"
- Visual effect: explosion, fire, ash animation
- Live Ticker (runs automatically from blockchain or API):
  - "Ahmed just burned 10 USD"
  - "Sarah won 250 USDC"
  - "John earned 300 ASH"
- How It Works (3 simple steps):
  1. Deposit USDC
  2. Click Burn Now
  3. Win a prize or get ASH
- Registration and Login buttons

### Workflow — Landing Page
1. The user enters the website
2. They see the "Start Burning" button and a quick introduction
3. Options appear:
   - Sign Up → New registration
   - Login → Existing account login
   - Connect Wallet (optional from the beginning)
4. If the user clicks Start Burning without registration → they will be asked to complete registration first
5. Live Ticker runs automatically from blockchain or API

### Result
The main landing page is very simple and visually dynamic. The main goal is to attract the user and motivate them to register quickly.

---

## SECTION 2: Registration and Login (Onboarding)

### Goal
Enable the user to create an account or log in quickly with the flexibility of both Web2 and Web3.

### Registration and Login Interface

**Option 1 — Web2**
- Email + OTP (temporary code via email)
- Quick sign up with Gmail, X, Facebook, or Telegram

**Option 2 — Web3**
- Connect Wallet: Phantom, Solflare, Backpack
- Link the wallet to create a blockchain-based account directly

**Additional Option**
- "Join Telegram Community" button to join the official group (optional)

**On First Login**
- An internal wallet is automatically created for the user
- This wallet is linked to a unique deposit address on the Solana network

### Workflow — Registration and Login

**Email + OTP:**
1. The user enters their email
2. They receive a 6-digit code via email
3. They input the code → account is activated

**Google / Apple / Telegram:**
- One-click registration via OAuth

**Connect Wallet (Web3):**
1. The user links their Solana wallet
2. Signs a message (Signature) to prove ownership

**On Successful Registration:**
- An internal account is created
- A unique deposit address on Solana is generated for the user
- The Dashboard (post-registration interface) opens

### First Login Experience
Dashboard displays:
- USDC Balance = 0.00
- ASH Balance = 0
- Deposit button and Withdraw button
- Main button: Burn Now (greyed out until deposit is made)

Sidebar includes:
- Referral Link (copy your link)
- Upgrade to VIP button
- Join Telegram button
- Live Ticker showing the latest burning and winning activities

### Result
- The user can log in easily through Web2 or Web3
- On first login, they get a ready-to-use internal wallet
- They have a unique deposit address to receive USDC from anywhere

---

## SECTION 3: Deposit and Withdraw

### Wallet Screen Interface
- Balances: USDC Balance, ASH Balance
- Main Buttons: Deposit, Withdraw
- Transaction History: every deposit, withdrawal, burn, and reward

### Workflow — Deposit
1. The user clicks Deposit
2. Options appear:
   - **Connect Wallet:** the user links their wallet (e.g., Phantom) and sends USDC to their internal wallet
   - **Deposit Address:** a unique Solana address is generated for them
3. The user copies the address and sends USDC from any platform or wallet
4. The smart contract verifies that the transfer is received
5. The USDC Balance in the internal wallet is updated
6. Notification: "Deposit Successful — Your balance has been updated"

### Workflow — Withdraw
1. The user clicks Withdraw
2. They choose: USDC or ASH
3. They enter the required amount
4. They add the external Solana wallet address
5. The system requests 2FA Authentication:
   - If Google Authenticator is enabled → the user must enter the code
   - If not → an OTP is sent to the email or phone
6. On successful verification:
   - The smart contract deducts the amount from the internal wallet
   - The funds are sent to the specified withdrawal address
   - Instant notification: "Withdrawal Request Completed"
   - The transaction appears in Transaction History as a successful operation

### Security
- All withdrawal operations require **mandatory 2FA**
- 2FA can be enabled or disabled from account settings
- Any failed withdrawal attempt triggers a notification
- After 3 failed attempts, the account is temporarily frozen

### Result
- The user can deposit easily through Connect Wallet or a unique deposit address
- Withdrawals are highly secure with mandatory 2FA
- All transactions are clearly visible in the account history

---

## SECTION 4: Core Gameplay — Burn Now

### Burn Screen Interface
- Main button: **Burn Now**
- Amount selection field: the user writes or selects the amount to burn (minimum 1 USDC)
- Shortcut buttons: 4.99 / 10 / 50 / Custom
- Luck Meter: shows the probability of winning depending on the amount and bonus
  - Example: Burn 4.99 = 1x chance, Burn 10 = 2x chance
- Instant panel: USDC Balance, ASH Balance, User's Burn count statistics

### Workflow — Burn Now
1. The user clicks Burn Now
2. The system checks balance:
   - If insufficient → Notification: "Insufficient Balance — Please Deposit"
   - If sufficient → continues
3. The required amount is deducted from the USDC Balance
4. The burn operation is recorded on the blockchain
5. The system calculates Weight:

```
Weight = (Amount / 4.99) + Bonus
```

Bonus sources:
- Referrals
- VIP Subscriptions
- Using Boosts with ASH Token

6. The smart contract generates a random number (VRF — Verifiable Random Function)
7. The number is compared with the Weight and Reward Pool table:

**If result = Win:**
- Prize is deducted from Reward Pool
- The amount is instantly credited to the user's USDC Balance
- Visual effects: 3D explosion + screen shake
- AI voice: "Congratulations! You won 1000 USDC!"

**If result = Lose:**
- ASH Tokens (200–500) are distributed
- Added to the internal ASH Balance
- Visual effects: falling ash
- AI voice: "Not this time... but you earned 250 ASH!"

8. The result is recorded in Transaction History:
   - Burn → Win (Prize)
   - Burn → Lose (ASH)
9. Appears instantly in the Live Ticker:
   - "Ahmed burned 10 USD"
   - If win: "Ahmed won 200 USDC!"

### Practical Example
- User burns 10 USDC
- Weight = (10 / 4.99) ≈ 2x chance
- System runs VRF → result: Lose
- User receives 300 ASH
- Balance: USDC -10, ASH +300

### Result
- Every Burn operation = instant attempt to win
- Either USDC prize (from Reward Pool) or ASH Token
- Visual and audio effects create an addictive, fun, and transparent experience

---

## SECTION 5: Reward and Profit Distribution

### System Components
- **Reward Pool** — the vault dedicated for prizes and referrals
- **Profit Pool** — the net profit of the project
- **Admin Controls** — from the dashboard, the admin can set distribution ratios and prize values

### Workflow — Distribution Per Burn
1. A player burns (example: 4.99 USDC)
2. The system splits the amount instantly:
   - X% → Reward Pool (example: 50%)
   - Y% → Profit Pool (example: 50%)
3. Reward Pool is used to cover: Prizes and Referral Rewards
4. Profit Pool remains untouched as net profit for the project

### Workflow — Prize Calculation
- Each Burn generates a VRF Random Number
- The number is compared with the Prize Table:
  - Jackpot (2500 USDC) → 1% chance
  - Medium Prize (200–500 USDC) → 5% chance
  - Small Prize (50–100 USDC) → 10% chance
- If the condition is met → the prize is deducted from the Reward Pool and sent instantly to the player
- If not met → the player is compensated with ASH Tokens (200–500)

### Workflow — Referral Rewards
- If the Burn is made through a referral:
  - 10% of the burn value is deducted directly from the Reward Pool
  - It is instantly transferred to the referrer as USDC
  - Instant notification: "You earned 0.49 USDC from your referral's burn"
- Profit Pool remains fixed

### Workflow — Admin Control
From the admin dashboard, the manager can set:
- Distribution ratio (e.g., 50/50 or 60/40)
- Number of daily winners
- Value of each prize
- Maximum daily prize cap

The system ensures that the available amount in the Reward Pool is never exceeded.

### Practical Example
- 1000 Burns × 4.99 USDC = 4990 USDC
- 50% → Reward Pool = 2495 USDC
- 50% → Profit Pool = 2495 USDC

From the 2495 USDC (Reward Pool):
- 1 × 1000 USDC (Jackpot)
- 5 × 200 USDC (Medium)
- 20 × 50 USDC (Small)
- Referrals (~300 USDC)
- Remaining stays as reserve for next rounds

### Result
- Every Burn = either a prize or ASH
- Prizes are funded only from the Reward Pool
- Project profit is always preserved in the Profit Pool
- Referral Rewards never affect project profit — they are part of the Reward Pool allocation

---

## SECTION 6: Winner Selection Logic

### Goal
- Every Burn operation determines its result instantly (win or lose)
- The result is transparent and fair through blockchain VRF
- Ensures a fixed number of prizes and sustainability of the Reward Pool

### Workflow — Winner Selection
1. The player clicks Burn Now and selects the amount
2. The smart contract receives the operation
3. The system calculates:

```
Weight = (Amount / 4.99) + Bonuses
```

Bonuses can come from:
- VIP Subscriptions
- Referrals
- Boosts (using ASH)

4. The smart contract generates a random number (VRF Random Number)
5. The system compares the number with the Prize Table stored on-chain

### Prize Table — Example
| Prize | Value | Chance |
|-------|-------|--------|
| Jackpot | 2500 USDC | 0.5% |
| Big Prize | 500 USDC | 2% |
| Medium Prize | 200 USDC | 5% |
| Small Prize | 50 USDC | 10% |
| Otherwise | ASH Tokens | — |

### Workflow — Instant Resolution

**If Win:**
- The prize value is deducted from the Reward Pool
- It is sent instantly to the player (USDC)
- Notification and effects: 3D explosion + AI congratulation

**If Lose:**
- 200–500 ASH Tokens are distributed
- Visual effects: falling ash + AI message "You got ASH"

### Workflow — Fairness and Limits
The system ensures through the Admin Panel:
- Maximum number of daily prizes
- Maximum total prize value (never exceeding the Reward Pool)

If the Reward Pool is close to empty:
- The system automatically reduces the winning probability
- Or pauses big prizes until a new refill occurs

### Practical Example
- Player burns 10 USDC
- Weight = (10 / 4.99) ≈ 2
- VRF generates number = 0.03
- Prize Table thresholds: Jackpot ≤ 0.005, Big ≤ 0.02, Medium ≤ 0.07
- Result = Medium Prize (200 USDC) → deducted from Reward Pool and credited instantly
- Notification: "You won 200 USDC!"

### Result
- Every Burn = instant resolution
- The winner is determined immediately
- No waiting for rounds or manual draws
- Prizes are probability-based and restricted by the Reward Pool budget

---

## SECTION 7: Weight Logic

### Goal
Give every player a fair chance, but the more they burn or the more advantages they have (VIP, Referrals, Boosts) the higher their chances. The logic is simple, transparent, and scalable.

### Workflow — Weight Calculation
When a Burn operation is executed:

**Step 1: Normalize Amount**
```
BaseUnit = 4.99 USDC
AmountWeight = Amount / BaseUnit
```

Examples:
- 4.99 USDC = Weight 1
- 10 USDC = Weight 2
- 50 USDC = Weight 10

**Step 2: Apply Bonuses**

VIP Bonuses:
- Spark = +0.1 Weight
- Active Ash = +0.25 Weight
- Holy Fire = +0.5 Weight

Referral Bonuses:
- Every 5 active referrals = +0.2 Weight

Boost (using ASH):
- 1000 ASH = +0.5 Weight for 1 hour

**Final Formula:**
```
FinalWeight = AmountWeight + VIP Bonus + Referral Bonus + Boost Bonus
```

### Workflow — Applying Weight to Winning
1. The contract generates a VRF Random number between 0 and 1
2. It calculates:

```
EffectiveChance = Weight / (Weight + ConstantFactor)
```

- ConstantFactor = a fixed number to maintain balance (example: 100)
- If Random ≤ EffectiveChance → Win
- If Random > EffectiveChance → Lose (receive ASH)

### Practical Example

| Player | Burn Amount | VIP Bonus | FinalWeight | EffectiveChance |
|--------|------------|-----------|-------------|-----------------|
| A | 4.99 USDC | None | 1.0 | 1/(1+100) ≈ 0.9% |
| B | 50 USDC | Active Ash +0.25 | 10.25 | 10.25/(10.25+100) ≈ 9.3% |
| C | 100 USDC | Boost +0.5 | 20.5 | 20.5/(20.5+100) ≈ 17% |

### Result
- Weight combines burn amount and bonuses
- The higher the amount or interaction, the higher the chance of winning
- There is always an element of luck because ConstantFactor maintains randomness

---

## SECTION 8: Weight and Prize Table Logic

### Goal
Every Burn determines: did the user win or not? If won, which prize exactly (Jackpot, Medium, Small)? The system must be fair, dynamic, and aligned with the Reward Pool.

### Workflow — Prize Selection

**Step 1: Calculate FinalWeight**
```
FinalWeight = AmountWeight + VIP Bonus + Referral Bonus + Boost Bonus
```

**Step 2: Determine Win or Lose**
```
EffectiveChance = FinalWeight / (FinalWeight + ConstantFactor)
RandomNumber = VRF(0, 1)
```
- If Random ≤ EffectiveChance → Win
- If not → Lose (user receives ASH)

**Step 3: Determine Prize Type (if Win)**
The prize is selected from the Prize Table stored on-chain:

| Prize | Value | Share of Win Cases |
|-------|-------|--------------------|
| Jackpot | 2500 USDC | 1% |
| Big Prize | 500 USDC | 4% |
| Medium Prize | 200 USDC | 15% |
| Small Prize | 50 USDC | 80% |

```
RandomPrize = VRF(0, 1)
RandomPrize is compared with the table to determine the prize
```

**Step 4: Check Reward Pool**
- If the Reward Pool has enough balance for the prize → it is sent instantly
- If not enough → the prize is automatically downgraded to the next available one (Fallback)

### Practical Example
- Player burns 10 USDC
- FinalWeight = 2.0
- EffectiveChance = 2 / (2+100) = 1.96%
- VRF number = 0.012 → Win

Prize determination:
- RandomPrize = 0.73
- Prize Table thresholds: Jackpot ≤ 0.01, Big ≤ 0.05, Medium ≤ 0.20, Small ≤ 1.0
- Result = Small Prize (50 USDC) → deducted from Reward Pool and sent instantly

### Dynamic Prize Distribution (Updated Policy)
> **IMPORTANT:** All references to number of burns or persons as limits or fixed conditions are no longer valid.

- Prize distribution (Jackpot, Big, Medium, Small) is allocated **dynamically based on the total funds available in the Reward Pool**, not on static counts or pre-set numbers of prizes
- This ensures sustainability and fairness, as the system automatically adjusts to the Reward Pool balance in real-time
- Configurable percentage examples:
  - Jackpot = 10% of Reward Pool
  - Big = 5% of Reward Pool
  - Medium = 2% of Reward Pool
  - Small = 1% of Reward Pool

### Result
- Weight determines whether the player wins at all
- If the player wins → the exact prize type is selected from the Prize Table
- The system is smart and never grants a prize larger than the Reward Pool capacity
- The outcome is always instant and transparent

---

## SECTION 9: Admin Prize Control Workflow

### Goal
- Enable the administration to have full control over prizes: their number, value, and distribution across periods
- Ensure that prizes never exceed the Reward Pool balance
- Allow dynamic adjustments to prize tables (weekly, daily, monthly)

### Admin Panel UI — Prize Control

**Set Distribution Ratios:**
- X% → Reward Pool
- Y% → Profit Pool

**Set Prize Table:**
- Jackpot: value + probability
- Big Prize: value + probability
- Medium Prize: value + probability
- Small Prize: value + probability

**Set Daily Limits:**
- Maximum number of winners per day
- Maximum value of prizes per day

**Set Scheduling:**
- Daily / Weekly / Custom

**Fallback Rules:**
- If Reward Pool is insufficient → any prize is downgraded to the next available level

### Workflow — Admin Prize Control
1. The admin defines: number of prizes, values, probability percentages, daily or weekly limits
2. The Prize Table is published on-chain for full transparency
3. On each Burn:
   - The system reads the current Prize Table
   - Determines the probability of winning
   - Deducts the prize from the Reward Pool if the player wins
4. If the Reward Pool is close to empty:
   - The system automatically reduces winning probabilities
   - Or downgrades prizes to the lowest available level
5. At the end of each cycle (day/week):
   - Counters are reset
   - Remaining Reward Pool balance is carried over to the next cycle

### Practical Example
Admin sets:
- Jackpot = 2500 USDC (1% of win cases)
- Big = 500 USDC (5%)
- Medium = 200 USDC (15%)
- Small = 50 USDC (79%)
- Daily prize cap = 10,000 USDC

Current day:
- 2000 Burns × 4.99 ≈ 10,000 USDC
- Reward Pool = 5000 USDC

System distributes:
- 1 Jackpot winner (2500 USDC)
- 3 Big winners (1500 USDC total)
- 5 Medium winners (1000 USDC total)
- Total = 5000 USDC (entire daily Reward Pool consumed)
- Remaining Burns → converted only into ASH (no USDC prizes)

### Result
- The administration has full control over the number of winners and the value of prizes
- The system automatically stops prizes when the Reward Pool is depleted or the daily cap is exceeded
- All prizes are transparent on-chain — players know that the game is fair

---

## SECTION 10: Referral System Workflow

### Goal
- Motivate users to bring their friends
- Each referral is tied to an actual Burn operation (growth linked to revenue)
- Rewards are instant and direct

### User Referral UI
- Unique referral link for each user
- Copy link button + share button for X, Telegram, WhatsApp
- Panel displays:
  - Number of friends joined
  - Total rewards from referrals (USDC)
  - Referral status: Pending / Active

### Workflow — Referral Process
1. User A copies their unique referral link
2. Friend B registers through the link (Web2 or Web3)
3. The system links account B to referrer A
4. The first time B performs a Burn:
   - The system splits the amount: X% → Reward Pool, Y% → Profit Pool
   - From Reward Pool only: **10% of the burn amount** is instantly transferred to referrer A as USDC
   - The rest of Reward Pool remains for covering prizes
5. Notification to referrer A: "You earned 0.49 USDC from your referral's burn!"
6. Notification to user B: "You're now linked with Ahmed — your referrer"

### Workflow — Multiple Burns
- Every time B burns → A receives 10% of the burn value (from Reward Pool)
- No cap on the number of referrals or the number of burns
- Reward is always instant (added directly to the referrer's balance)

### Security and Control
Admin Panel can set:
- Reward percentage (default: 10%)
- Reward type (USDC or ASH)
- Daily or monthly reward caps
- Every operation is on-chain → no manipulation possible

### Practical Example
- B burns 4.99 USDC
- Reward Pool = 2.50 USDC (50%), Profit Pool = 2.49 USDC (50%)
- From Reward Pool: 0.49 USDC → A (Referrer), 2.01 USDC → remains for prizes
- Result: A receives the reward instantly, platform loses no profit (Profit Pool remains fixed)

### Result
- Referrals are part of the Reward Pool
- Rewards are instant and direct
- Growth is directly tied to burns → every new user = new revenue

---

## SECTION 11: VIP Subscription (Holy Fire)

### Goal
- Add a stable revenue stream for the platform
- Provide subscribers with exclusive perks that increase excitement and retention
- Keep the system simple with only one subscription plan

### Holy Fire Subscription Details
- **Price:** 24.99 USDC per month
- **Benefits:**
  - VIP Badge on profile (special marker)
  - +0.5 Weight Bonus on every Burn
  - Automatic entry into exclusive weekly raffles
  - Extra ASH reward when losing (+20% above normal)
  - Special notifications from AI Assistant (hints, close opportunities)
  - Priority access to beta features

### Workflow — Holy Fire Subscription
1. The user clicks "Upgrade to Holy Fire"
2. A subscription details screen opens (price, list of benefits, "Subscribe Now" button)
3. On confirmation:
   - The amount is deducted from the internal USDC Balance
   - The contract registers the user in the VIP Registry on-chain
   - Expiration date is set to 30 days
   - Perks are activated instantly:
     - Badge on profile
     - +0.5 Weight Bonus on every Burn
     - User added to the weekly raffle list
     - AI Assistant adjusts its interactions (treats the user as VIP)
4. Subscription Renewal:
   - The system attempts to deduct 24.99 USDC at the end of the period
   - If balance is insufficient → Notification: "Renew your Holy Fire to keep VIP benefits"
   - If not renewed → perks expire automatically

### Workflow — Admin Controls
From the admin panel, the manager can adjust:
- Subscription price
- Weight Bonus value
- Type of exclusive weekly prizes
- Percentage increase of ASH when losing

### Practical Example
- Ahmed is subscribed to Holy Fire
- He burns 10 USDC
- Base Weight = (10 / 4.99) ≈ 2
- +0.5 from Holy Fire → Final Weight = 2.5
- His winning chance is higher than a regular player
- If he loses → he gets 360 ASH instead of 300 (20% bonus)

### Result
- One clear subscription plan (Holy Fire)
- Adds stable income to the project
- Gives the user a true VIP experience with tangible perks
- Simple and easy to understand (no distraction with multiple plans)

---

## SECTION 12: ASH Token Lifecycle

### Goal
Explain the lifecycle of the ASH Token from distribution to becoming a scarce tradable asset after the 1B supply cap. Show how it rewards players, how it is used, and how it evolves into a core part of the platform.

### Workflow — ASH Earning
- The player clicks Burn Now
- If they lose:
  - They receive 200–500 ASH depending on the burned amount
  - Balance is added instantly to the internal wallet (ASH Balance)
- If they win a USDC prize:
  - They do not receive ASH in that operation (the prize compensates them)
- When subscribed to Holy Fire:
  - They receive +20% additional ASH on every loss

### Workflow — ASH Storage
ASH Balance is displayed in the Dashboard with:
- Current Balance
- Earned Today / Total Earned
- Usage History (where it was spent)

The user can keep it in the internal wallet or withdraw externally.

### Workflow — ASH Usage (Inside the Platform)
- **Boost Weight:** Burn 1000 ASH → +0.5 Weight Bonus for 1 hour
- **Exclusive Raffles:** Entry into raffles only for ASH holders
- **Discounts:** 5–10% discount on burn cost if partially paid with ASH
- **VIP Access (future):** Some perks or exclusive experiences unlocked only with ASH

### Workflow — ASH Withdraw (External)
1. The user clicks Withdraw ASH
2. Specifies the amount
3. Adds their external Solana wallet address
4. The system requests 2FA (Google Authenticator or OTP)
5. On successful verification:
   - The smart contract deducts the amount from the internal wallet
   - Sends it to the user's Solana wallet
   - Transaction History shows: "Withdraw 1000 ASH → Wallet XXXX"

### Workflow — Post-1B Supply
Once the entire 1B ASH is distributed:
- The system stops granting ASH for losing attempts
- All losses = only losses (or replaced with alternative rewards such as Bonus Tickets)

ASH becomes scarce:
- Fully tradable on DEX/CEX
- Value rises over time due to limited supply and increasing demand

Staking System begins:
- Users stake ASH for returns (USDC or ASH)
- Increases token utility after distribution ends

Platform transformation:
- From burn + reward system → into a Burn Community Platform built on ASH trading, additional games, and AI features

### Practical Example
- Mohammed burns 4.99 USDC → loses → receives 250 ASH
- After one week he collects 5000 ASH
- Uses 1000 ASH → Boost (+0.5 Weight for one hour)
- Withdraws 2000 ASH to his external wallet and sells them on a DEX
- After supply depletion, ASH value rises → Mohammed benefits as an early holder

### Result
- ASH = reward token and utility currency during the distribution phase
- Later transforms into a scarce currency and investment asset after supply depletion
- The platform benefits from acting as a "Gamified Pre-Sale" of the token

---

## SECTION 13: Visual and Audio Effects

### Goal
- Every Burn operation generates a unique visual, audio, and text experience
- Win = explosion, fire, excitement
- Lose = ash, fading fire, motivational messages
- Always include a message of "something is born from fire and ash" so that even losing is not disappointing

### Types of Effects

**Win (Prize):**
- 3D fiery explosion fills the screen
- Golden shards or flames flying everywhere
- AI Voice: "Incredible! You just forged a rare prize from the flames!"
- Text: "Congratulations! You won 500 USDC"

**Lose (ASH Reward):**
- Fire slowly extinguishes
- Ash falling realistically
- AI Voice: "Not the jackpot... but from the ashes, something rare is always born"
- Dynamic random text:
  - "The fire fades, but you gained 250 ASH"
  - "No treasure this time, but the ashes gifted you 300 ASH"
  - "Your burn didn't spark a prize, but ashes created 200 ASH for you"

**Special Rewards (Boost / Referral / VIP):**
- Unique visual effect (fiery wings, golden spark)
- AI Voice: "Your Holy Fire gives you extra power!"

### Workflow — Effects Execution
1. The player clicks Burn Now
2. The system determines the result (Win / Lose / Bonus)
3. The Effects Engine (Frontend):
   - Selects the appropriate animation
   - Adds the sound effect (explosion, burn, AI voice)
   - Generates a dynamic message from a prepared set
4. The message is displayed on-screen as a short pop-up
5. The result is recorded in the Transaction History

### Suggested Dynamic Messages

**On Win:**
- "The flames crowned you with glory! +1000 USDC"
- "Explosion of fortune! You won 200 USDC"
- "Your burn unleashed a rare treasure — Jackpot!"

**On Loss:**
- "No prize this time, but ashes gave you 300 ASH"
- "The fire tested you... from the ashes you received 250 ASH"
- "Smoke clears, leaving you with 400 ASH"
- "Even in loss, ashes always create something rare — 200 ASH for you"

### Result
- Winning and losing are always enjoyable (no purely disappointing moment)
- Messages change every time → maintaining the element of surprise
- Effects and messages create a unique identity for the platform (Ash, Fire, Flames)

---

## SECTION 14: Social Layer Workflow

### Goal
- Build a live community inside and outside the game
- Every Burn or win is visible to the world → creating competition and excitement
- Encourage players to share their moments on social networks (X, TikTok, Telegram)

### Social Interaction Elements

**Live Ticker:**
- Appears at the bottom or top of the screen
- Displays the latest events in real-time:
  - "Ahmed burned 10 USDC"
  - "Sarah won 200 USDC"
  - "Omar gained 300 ASH"
- Disappears after a few seconds and continues updating

**Share Moment (Share Button):**
- After every Burn (especially when winning): a button appears "Share your moment on X/TikTok"
- On click:
  - A short image/video card is generated (explosion or ash effect)
  - Automatic text: "I just burned on #BurnToWin and won 200 USDC!"
  - Or: "Burned 10 USDC, got 400 ASH. Ashes always create something rare"
- Sharing rewards the player with 500 ASH Bonus

**Leaderboards:**
- Top Winners (most prizes won)
- Most Burns (highest number of Burns)
- Referral Kings (most referrals)
- Displayed with fiery crowns + flying ash effects

### Workflow — Live Ticker
1. Every Burn is recorded on the smart contract
2. The API system captures the data and sends it to the frontend
3. The frontend displays it as ticker animations (auto-scrolling)
4. Messages appear and disappear within 2–3 seconds

### Workflow — Share Moment
1. The player wins or loses; a Share button appears
2. On click: the system generates a visual card (Image/GIF) with player name (or anonymous), prize or ASH earned, fire/ash effects
3. Automatic text is added with hashtags (#BurnToWin #Crypto #Web3)
4. Opens the share link (X/TikTok/Telegram)
5. After posting: system rewards player with 500 ASH, notification appears: "You earned 500 ASH for sharing your moment!"

### Workflow — Leaderboards
1. Every Burn, win, or referral is logged into the database
2. The system updates the boards regularly (real-time or every 5 minutes)
3. The frontend displays names, profile images, rewards or badges for top ranks
4. Leaderboards reset daily or weekly

### Practical Example
- Ahmed burns 20 USDC → loses → earns 400 ASH
- Ticker: "Ahmed burned 20 USDC and gained 400 ASH"
- Share button appears → he shares on X → receives 500 ASH bonus
- Leaderboard updates → he climbs higher in Most Burns

### Result
- The platform becomes a live stage (every action visible to all)
- Players get rewards even for social sharing
- Leaderboards increase competition and keep the community constantly excited

---

## SECTION 15: Admin Panel Workflow

### Goal
- Full management of all platform elements from one place
- Dynamic adjustment of prizes, referrals, and subscriptions without code changes
- Real-time monitoring of performance and profits

### Admin Dashboard UI

**Overview:**
- Total Burns
- Total prizes distributed
- Platform profits (Profit Pool)
- Current Reward Pool balance
- Number of active players

**Prizes Management:**
- Set the Prize Table (Jackpot / Big / Medium / Small)
- Define values and probabilities for each prize
- Set daily/weekly maximum limits for prizes
- Fallback rules (what happens when the Reward Pool is depleted)

**Referral System:**
- Adjust commission percentage (e.g., 5% instead of 10%)
- Set reward type (USDC or ASH)
- Define daily or monthly caps for rewards

**Holy Fire Subscription:**
- Adjust subscription price (USDC)
- Adjust benefits (Bonus Weight, Extra ASH %)
- View current subscribers

**ASH Token Settings:**
- Define ASH reward range for losers (200–500)
- Adjust Boost value for ASH (e.g., 1000 ASH = +0.5 Weight)
- Monitor remaining distribution amount from the 1B supply cap

**Visual/Audio Effects Settings:**
- Customize random messages (Win / Lose)
- Upload new AI voice recordings
- Adjust visual effects

**Reports:**
- Burns today / this week / this month
- Prize distribution by category
- Top-performing referrals
- Most active players

**Security:**
- Add or remove admins
- Mandatory 2FA for dashboard login
- Activity log (Audit Log)

### Workflow — Admin Panel Usage
1. Admin logs in (2FA mandatory)
2. Opens the Overview Dashboard → sees all key statistics

**If adjusting prizes:**
- Opens "Prizes Management" tab
- Changes probabilities or values
- Saves changes → Prize Table is updated on-chain

**If adjusting referrals:**
- Opens "Referral System"
- Adjusts percentage (e.g., from 10% to 7%)
- Saves → changes apply instantly

**If managing ASH:**
- Sets loss rewards (e.g., 250–600 instead of 200–500)
- Defines available Boosts

**If monitoring profits:**
- Opens "Reports"
- Views project profit (Profit Pool)
- Reviews Reward Pool consumption

### Practical Example
Reward Pool = 10,000 USDC

Admin sets:
- Jackpot = 2500 USDC (1% chance)
- Big = 500 USDC (4%)
- Medium = 200 USDC (15%)
- Small = 50 USDC (80%)
- Referral Reward = 7%
- Holy Fire Subscription = 24.99 USDC/month
- ASH for loss = 300–600

Now every Burn operates under these new settings instantly.

### Result
- The Admin Panel = the brain of the platform
- Any change (prizes, percentages, referrals) is applied directly to the smart contracts
- Guarantees transparency, flexibility, and full control over the project

---

## SECTION 16: User Settings Workflow

### Goal
- Give the user full control over their account and security
- Allow customization of experience (Profile, Notifications, 2FA)

### User Settings UI

**Profile Settings (Optional):**
- Change username
- Upload avatar
- Select country or flag
- Show/Hide name when winning (Privacy Toggle)

**Security Settings:**
- Enable/disable 2FA (Google Authenticator or OTP via email)
- Manage authorized devices
- Change email
- Link/unlink social accounts (Google / Apple / Telegram)

**Wallet Settings:**
- Display unique deposit address
- Add trusted withdrawal addresses (Whitelisted Addresses)
- Enable "Withdraw requires 2FA always" (enabled by default)

**Notification Settings:**
- Enable/disable email notifications
- Internal notifications (Burn results, Wins, Referrals)
- Notifications from AI Assistant

**Subscription Settings (Holy Fire):**
- Subscription status (Active / Expired)
- Next renewal date
- Renew or cancel button

**Referral Settings:**
- Display referral link
- Copy / Share button
- Referral earnings history

**Delete / Deactivate Account:**
- Option to permanently delete or temporarily deactivate account
- Warning: "You will lose access to all balances if you don't withdraw before deletion"

### Workflow — User Settings Examples

**Enable 2FA:**
1. Open Security Settings
2. Click "Enable 2FA"
3. QR Code + secret key appears
4. Link with Google Authenticator
5. Enter code → Activated successfully
6. Now every withdrawal or Admin Panel login requires 2FA

**Add Trusted Withdrawal Address:**
1. Open Wallet Settings
2. Add external Solana address
3. System requests 2FA confirmation
4. On success → address becomes "Trusted"

**Hide Identity When Winning:**
1. Open Profile Settings
2. Enable "Hide my name when I win"
3. Ticker now shows: "Anonymous won 200 USDC!" instead of real name

### Result
- The Settings interface = the user's personal control center
- Full security control (2FA mandatory for withdrawals)
- Flexible (customize username, avatar, notifications)
- Powerful (manage subscription, referrals, wallet)

---

## SECTION 17: Transaction History Workflow

### Goal
- Display all user financial activities transparently
- Allow users to track earnings, losses, deposits, and withdrawals
- Reduce disputes by keeping a permanent clear log

### Transaction History UI
- Chronological list (newest first)
- Categories of activities:
  - Burn (burn operation)
  - Win (prize)
  - Lose (ASH reward)
  - Deposit
  - Withdraw
  - Referral Bonus
  - Subscription (Holy Fire)
- Details of each transaction:
  - Date and time
  - Type (Burn, Win, etc.)
  - Amount (USDC or ASH)
  - Status: Success / Failed / Pending
  - Transaction ID on blockchain (clickable → opens in Solana Explorer)
- Filter / Search options:
  - By type (only Burns, only Wins, etc.)
  - By date (day, week, month)
  - By amount (e.g., greater than 100 USDC)

### Workflow — Transaction Logging
For every operation (Burn, Win, Deposit, etc.):
1. Smart contract generates a Transaction ID
2. Event is sent to the Backend
3. Backend stores it in the database (for quick display)
4. Recorded on blockchain (for audit)

Frontend:
- Calls API to display recent activities
- Each transaction appears clearly with an icon (fire = Burn, explosion = Win, moon = Lose)
- User can click on a transaction → see full details

**Example transaction entry:**
- Type: Burn
- Amount: 10 USDC
- Result: Lose → 300 ASH
- Transaction ID: xxxxx (link to Solana Explorer)
- Time: 25 Aug 2025 — 16:32

### Practical Example
- Ahmed burns 10 USDC → Transaction History logs: Burn -10 USDC, Lose +300 ASH
- Sarah wins 200 USDC → Her history shows: Burn -4.99 USDC, Win +200 USDC
- Ahmed withdraws 100 USDC → Withdraw -100 USDC (Successful)

### Security
- Every transaction is tied to a Transaction ID on blockchain → no disputes possible
- Users can always verify their activities via Solana Explorer
- Any failed operation is marked as Failed

### Result
- Transaction History = the backbone of transparency
- Rich, user-friendly interface
- Every player trusts that their funds and operations are recorded and monitored accurately

---

## SECTION 18: AI Assistant Workflow

### Goal
- Make the experience more interactive and realistic
- Provide smart messages (motivational, educational, personal) directly tied to player behavior
- Integrate AI with the burn and prize interface

### AI Assistant UI
- Permanent icon (AI AshBot) at the bottom of the screen
- Popup chat window on click
- Assistant sends short chat-style or voice (TTS) messages
- Fire/Ash-themed colors and backgrounds

### Workflow — AI Assistant Core

**After every Burn (Win):**
- Message: "Incredible! You just forged a rare treasure: {amount} USDC!"
- Excited AI voice

**After every Burn (Lose):**
- Message: "No jackpot, but from ashes comes rarity — you got {ash} ASH"
- Calm, encouraging voice

**Dynamic Hints:**
- If player loses 3 times in a row: "The flames whisper... your fortune may be near"
- If large Burn (e.g., 100 USDC): "Bold move! Your chances just got a massive boost"

**Special Events:**
- VIP Subscription: "Welcome to Holy Fire! Your flames are now stronger"
- Social Sharing: "Your victory is now echoing across X!"
- Referral: "You just gained {amount} USDC from a referral burn"
- Deposit success: "Balance updated — ready to burn!"
- Withdraw success: "Withdrawal confirmed — funds sent to your wallet"

### Workflow — Personalization
AI Assistant connects to player data:
- Total Burns
- Total ASH Balance
- Biggest Win
- Referral Count

Personalized messages:
- "You've burned 50 times already — your loyalty to the fire is unmatched"
- "You hold 20,000 ASH — consider using them for a boost"
- "You're top 10 in leaderboards this week!"

### Workflow — Technical Flow
1. **Frontend Trigger:** Any event (Burn, Win, Deposit, etc.)
2. **Backend AI Engine:**
   - Receives event + player data
   - Selects suitable message from AI library
   - Or generates dynamic message (LLM integration)
3. **Output:**
   - Appears as text message
   - Can also play as TTS (Text-to-Speech)

### Practical Example
- Ahmed burns 20 USDC and loses → receives 400 ASH
  - AI Assistant: "No jackpot this time, but ashes rewarded you 400 ASH"
- Next Burn he wins 200 USDC
  - AI Assistant: "Incredible! The flames blessed you with 200 USDC!"

### Result
- AI Assistant transforms the experience from just a game → into a personal adventure with continuous interaction
- Makes the player feel the platform "understands" and follows them
- Adds a mysterious, motivational, and thrilling atmosphere that significantly boosts engagement

---

## SECTION 19: Staking and Post-1B Supply

### Goal
- Give ASH Token real value even after distribution ends (1B Cap)
- Enable users to earn yields through Staking instead of just holding
- Ensure the project continues as a Burn & Earn + Token Utility system

### Workflow — Before 1B Supply Depletion
During the distribution phase:
- Every loss = player receives 200–500 ASH
- ASH is used for: Boosts, exclusive raffles, and discounts
- Some players start accumulating large amounts in preparation for the next phase

**Optional Early Staking:**
- Can be activated earlier to incentivize holding
- Player deposits ASH into a Staking contract
- Receives additional yields (USDC from profits or extra ASH from the Reward Pool)

### Workflow — After 1B Supply Depletion

**Distribution stops:**
- No more free ASH for losses
- Every loss = only USDC loss (or symbolic alternative rewards such as Bonus Tickets)

**ASH becomes scarce:**
- Fixed supply (1B)
- Value rises with growing demand (needed for Boosts, Raffles, Discounts)

**Full Staking Activation:**
- Player deposits ASH into Staking contract
- Earns periodic yields:
  - USDC → share of Profit Pool earnings
  - Or ASH → through partial market recycling

**ASH Utility (post-supply):**
- Boost Weight (essential to increase win chances)
- Entry into exclusive raffles (ASH-only access)
- Burn discounts (e.g., 10% if partially paid with ASH)
- Listing and trading on DEX/CEX (independent market value)

### Workflow — Staking Process
1. Player opens Staking Tab
2. Selects the amount to stake
3. Signs transaction with 2FA + internal wallet
4. Smart contract locks the amount
5. User starts earning yields (daily / weekly)
6. On unstake request: contract releases principal (ASH) + yields (USDC/ASH)

### Practical Example
- Ahmed holds 100,000 ASH
- After supply depletion → he stakes 50,000 ASH
- Contract pays 10% annually (≈ 5,000 ASH or 200 USDC)
- The rest he uses for Boosts or sells on DEX
- Token value rises as supply decreases and demand increases

### Result
- Before supply depletion: ASH = player reward + internal utility
- After supply depletion: ASH = scarce tradable asset + essential tool (Boosts, Raffles, Staking)
- Staking sustains token strength and encourages holding instead of quick selling

---

## SECTION 20: User Journey — Full Workflow

### Goal
- Map the user experience from start to finish in sequence
- Cover all branches (Win / Lose / Share / Withdraw)
- Show how all previous systems integrate into a single journey

### Step 1 — Entering the Website (Landing Page)
- User visits burn2win.com
- Sees: Start Burning button, short description "Burn USDC to win prizes or earn ASH", Live Ticker
- Clicks Start Burning → redirected to registration

### Step 2 — Registration (Onboarding)
- Options: Email + OTP / Google / Apple / Telegram / Connect Wallet (optional)
- Registers with email → receives OTP → enters code → account ready
- System generates an internal wallet + unique deposit address
- Dashboard opens: USDC Balance = 0, ASH Balance = 0, Burn Now button (disabled)

### Step 3 — Deposit
- User clicks Deposit
- Copies unique address and sends 50 USDC from external wallet
- Smart contract confirms → notification: "Deposit Successful — Balance: 50 USDC"
- Burn Now button is enabled

### Step 4 — First Burn Operation
- User clicks Burn Now, selects 4.99 USDC
- System: deducts 4.99 from balance, calculates Weight, generates VRF Random, determines result

### Step 5A — Win Scenario
- System instantly credits prize (e.g., +200 USDC)
- Dashboard updates: balance = 245.01 USDC
- Effects: fiery explosion + AI Assistant: "Incredible! You won 200 USDC!"
- Live Ticker: "Ahmed won 200 USDC!"
- Share Moment button appears → shares on X/TikTok → earns +500 ASH

### Step 5B — Lose Scenario
- System grants 300 ASH
- Dashboard updates: ASH Balance = 300
- Effects: falling ash + AI Assistant: "No prize, but from ashes you gained 300 ASH"
- Live Ticker: "Ahmed burned 4.99 USDC and got 300 ASH"
- Share button appears → shares on X/TikTok → earns +500 ASH bonus

### Step 6 — Referrals
- Ahmed copies referral link from Dashboard
- Friend Omar registers and burns 10 USDC
- Instantly Ahmed receives 1 USDC in his balance
- Notification: "You earned 1 USDC from Omar's burn!"

### Step 7 — VIP Subscription (Holy Fire)
- Ahmed subscribes for 24.99 USDC
- Gains: VIP Badge, +0.5 Weight on every Burn, +20% ASH when losing, automatic entry into weekly raffles
- Dashboard updates to show VIP status

### Step 8 — Withdraw
- Ahmed clicks Withdraw, enters amount + external wallet address
- System requests 2FA Code
- Success → funds sent instantly to external wallet
- Transaction History records the operation

### Result
Complete and seamless journey:

> Enter → Register → Deposit → Burn → (Win/Lose) → Social Sharing → Referrals → VIP Subscription → Withdraw

Every step includes visual effects, AI messages, and blockchain transparency. User leaves the experience excited and motivated to burn again.

---

## SECTION 21: Roadmap and Tokenomics

### 1. Tokenomics — ASH Token Lifecycle

**Total Supply:** 1,000,000,000 ASH (1 billion)  
**Mint Policy:** No additional mint after launch — fixed supply

#### Allocation

| Category | Allocation | Amount |
|----------|-----------|--------|
| Burns (player loss rewards) | 70% | 700,000,000 ASH |
| Community Incentives (Airdrops, Social, Referrals) | 15% | 150,000,000 ASH |
| Staking Rewards (after distribution ends) | 10% | 100,000,000 ASH |
| Team and Development (12-month lock + 24-month vesting) | 5% | 50,000,000 ASH |

#### Distribution Mechanism
- Every Burn = loser receives 200–500 ASH
- Continues until full 1B supply is depleted
- After depletion:
  - Automatic ASH rewards stop
  - ASH becomes scarce → listed on DEX/CEX

#### Utility — Token Use Cases
| Use Case | Description |
|----------|-------------|
| Boosts | 1000 ASH = +0.5 Weight for 1 hour |
| Exclusive Raffles | Entry into raffles only for ASH holders |
| Discounts | Reduced Burn cost if partially paid with ASH |
| Staking | After depletion, stake ASH to earn USDC or more ASH |
| Trading | Tradable on secondary markets after launch |

#### Tokenomics Objective
- Create a fair reward system (Gamified Pre-Sale)
- Turn losses into profitable experiences
- Build a strong internal economy, then expand after supply depletion

---

### 2. Roadmap — Project Stages

#### Phase 1 — Preparation (Q4 2025)
- Smart contract development (Burn + Rewards + Internal Wallets)
- Frontend build (Landing Page + Dashboard + Burn System)
- AI Assistant integration (initial version for interactive messages)
- Referral system launch (10% instant rewards)
- Internal testing (Closed Beta)

#### Phase 2 — Official Launch (Q1 2026)
- Global official website launch
- Activate Burn Now button (USDC → Prizes/ASH)
- Add visual/audio effects
- Launch Holy Fire Subscription (24.99 USDC)
- Launch Live Ticker + X/TikTok sharing
- Inject first 100M ASH into the system (start of distribution)

#### Phase 3 — Expansion (Q2–Q3 2026)
- Launch Leaderboards (Top Burners, Winners, Referrals)
- Add ASH-exclusive raffles
- Launch Community Quests (group burns + massive rewards)
- First version of Ash TV (live stream of burn results)
- Multi-language support
- Partnerships with influencers + large marketing campaigns

#### Phase 4 — Post-1B Supply (2027+)
- Stop ASH distribution as loss rewards
- ASH listed globally on DEX/CEX
- Activate Staking Contracts (ASH → USDC yields)
- Build Burn Community:
  - Group Burns (Clans/Guilds)
  - Weekly challenges
  - Advanced AI interacting with each user personally
- Develop Metaverse Integration → burns inside immersive 3D worlds

### Result
- **Tokenomics** ensures the project is transparent, fair, and sustainable
- **Roadmap** shows investors and players a clear plan:
  - Start as a fun burn experience
  - Evolve into a full token economy
  - Transform into a global Web3 community built on fire and ashes

---

*End of Document — Ashnance Project | Burn to Win ASH Token | "Keep Burning, Keep Earning"*

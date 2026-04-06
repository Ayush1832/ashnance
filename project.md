Tagline
•	The official tagline of the product is now:
“Keep Burning, Keep Earning”
•	This tagline should appear prominently on the Landing Page, Dashboard header, and in all promotional materials.
Section One: Main Landing Page (Before Registration)
Goal
Present the project to the user and convince him to register quickly.
Components of the Main Landing Page
•	Project logo and platform name (Burn to Win ASH Token).
•	Main CTA button:
 "Start Burning" → takes the user to the registration or login page.
•	Quick idea showcase (Hero Section):
 "Burn 4.99 USDC → Win a grand prize or get ASH Token".
•	Visual effect (explosion, fire, ash).
•	Live Ticker effects:
 "Ahmed just burned 10 USD"
 "Sarah won 250 USDC"
 "John earned 300 ASH".
•	Short explanation with simple steps (How it works):
o	Deposit USDC.
o	Click Burn Now.
o	Win a prize or get ASH.
•	Registration and login buttons.
Workflow – Landing Page
•	The user enters the website.
•	He sees the "Start Burning" button and a quick introduction.
•	Options appear:
 Sign Up → New registration.
 Login → Existing account login.
 Connect Wallet (optional from the beginning).
•	If the user clicks Start Burning without registration → he will be asked to complete registration first.
•	Live Ticker runs automatically (from blockchain or API).
Result
The main landing page is very simple and visually dynamic. The main goal is to attract the user and motivate him to register quickly.

Section Two: Registration and Login (Onboarding)
Goal
Enable the user to create an account or log in quickly with the flexibility of both Web2 and Web3.
Registration and Login Interface
Option 1 – Web2
•	Email + OTP (temporary code via email).
•	Quick sign up with Gmail, X , Facebook, or Telegram.
Option 2 – Web3
•	Connect Wallet (Phantom, Solflare, Backpack).
•	Link the wallet to create a blockchain-based account directly.
Additional Option
•	"Join Telegram Community" button to join the official group (optional).
On First Login
•	An internal wallet is automatically created for the user.
•	This wallet is linked to a unique deposit address on the Solana network.
Workflow – Registration and Login
•	The user clicks Sign Up.
•	Registration options appear:
Email + OTP
1.	The user enters his email.
2.	He receives a 6-digit code via email.
3.	He inputs the code → account is activated.
Google, Apple, Telegram
•	One-click registration via OAuth.
Connect Wallet (Web3)
1.	The user links his Solana wallet.
2.	Signs a message (Signature) to prove ownership.
•	On successful registration:
o	An internal account is created.
o	A unique deposit address on Solana is generated for the user.
o	The Dashboard (post-registration interface) opens.
First Login Experience
•	The user enters his Dashboard.
•	The following are displayed:
o	USDC Balance = 0.00
o	ASH Balance = 0
o	Deposit button and Withdraw button
o	Main button: Burn Now (greyed out until deposit is made)
•	Sidebar includes:
o	Referral Link (copy your link)
o	Upgrade to VIP button
o	Join Telegram button
•	Live Ticker showing the latest burning and winning activities.
Result
•	The user can log in easily through Web2 or Web3.
•	On first login, he gets a ready-to-use internal wallet.
•	He has a unique deposit address to receive USDC from anywhere.

Section Three: Deposit and Withdraw
Wallet Screen Interface
•	Balances:
o	USDC Balance
o	ASH Balance
•	Main Buttons:
o	Deposit
o	Withdraw
•	Transactions History:
o	Every deposit, withdrawal, burn, and reward.
Workflow – Deposit
•	The user clicks Deposit.
•	Options appear:
o	Connect Wallet: the user links his wallet (for example Phantom) and sends USDC to his internal wallet.
o	Deposit Address: a unique address is generated for him on Solana.
o	The user copies the address and sends USDC from any platform or wallet.
o	The smart contract verifies that the transfer is received.
o	The USDC Balance in the internal wallet is updated.
o	Notification: "Deposit Successful – Your balance has been updated".
Workflow – Withdraw
•	The user clicks Withdraw.
•	He chooses:
o	USDC or ASH.
•	He enters the required amount.
•	He adds the external Solana wallet address.
•	The system requests 2FA Authentication:
o	If Google Authenticator is enabled → the user must enter the code.
o	If not → an OTP is sent to the email or phone.
•	On successful verification:
o	The smart contract deducts the amount from the internal wallet.
o	The funds are sent to the specified withdrawal address.
o	Instant notification: "Withdrawal Request Completed".
o	The transaction appears in Transaction History as a successful operation.
Security
•	All withdrawal operations require mandatory 2FA.
•	2FA can be enabled or disabled from account settings.
•	Any failed withdrawal attempt triggers a notification, and after 3 failed attempts the account is temporarily frozen.

Result
•	The user can deposit easily through Connect Wallet or a unique deposit address.
•	Withdrawals are highly secure with mandatory 2FA.
•	All transactions are clearly visible in the account history.

Section Four: Core Gameplay – Burn Now
Burn Screen Interface
•	Main button: Burn Now
•	Amount selection field:
o	The user writes or selects the amount to burn (≥ 1 USDC).
•	Shortcut buttons: (4.99 / 10 / 50 / Custom)
•	Luck Meter:
o	Shows the probability of winning depending on the amount and bonus.
o	Example: Burn 4.99 → 1x chance, Burn 10 → 2x chance.
•	Instant panel:
o	USDC Balance
o	ASH Balance
o	User’s Burn count statistics
Workflow – Burn Now
•	The user clicks Burn Now.
•	The system checks:
o	Does he have enough balance in his internal wallet? ✅ / ❌
o	If ❌ → Notification: “Insufficient Balance – Please Deposit”
o	If ✅:
	The required amount is deducted from the USDC Balance.
	The burn operation is recorded on the blockchain.
	The system calculates Weight:
Weight = (Amount ÷ 4.99) + Bonus
	Bonus can come from:
•	Referrals
•	VIP Subscriptions
•	Using Boosts with ASH Token
	The smart contract generates a random number (VRF).
	The number is compared with the Weight and Reward Pool table:
•	If result = Win →
o	Prize is deducted from Reward Pool.
o	The amount is instantly credited to the user’s USDC Balance.
o	Visual effects appear:
	3D explosion + screen shake
	AI voice: “Congratulations! You won 1000 USDC!”
•	If result = Lose →
o	ASH Tokens (200–500) are distributed.
o	Added to the internal ASH Balance.
o	Visual effects appear:
	Falling ash
	AI voice: “Not this time… but you earned 250 ASH!”
•	The result is recorded in Transaction History:
o	Burn → Win (Prize)
o	Burn → Lose (ASH)
•	Appears instantly in the Live Ticker:
o	“Ahmed burned 10 USD”
o	If win: “Ahmed won 200 USDC!”
Practical Example
•	The user burns 10 USDC.
•	Weight = (10 ÷ 4.99) ≈ 2x chance.
•	The system runs VRF → result: Lose.
•	The user receives 300 ASH.
•	His balance shows:
o	USDC: –10
o	ASH: +300
Result
•	Every Burn operation = instant attempt to win.
•	Either USDC prize (from Reward Pool) or ASH Token.
•	Visual and audio effects create an addictive, fun, and transparent experience.

Section Five: Reward and Profit Distribution
System Components
•	Reward Pool → The vault dedicated for prizes and referrals.
•	Profit Pool → The net profit of the project.
•	Admin Controls → From the dashboard, the admin can set distribution ratios and prize values.
Workflow – Distribution per Burn
•	A player burns (for example 4.99 USDC).
•	The system splits the amount instantly:
o	X% → Reward Pool (example 50%).
o	Y% → Profit Pool (example 50%).
•	Reward Pool is used to cover:
o	Prizes
o	Referral Rewards
•	Profit Pool remains untouched as net profit for the project.
Workflow – Prize Calculation
•	Each Burn generates a VRF Random Number.
•	The number is compared with the Prize Table:
Examples:
•	Jackpot (2500 USDC) → 1% chance
•	Medium Prize (200–500 USDC) → 5% chance
•	Small Prize (50–100 USDC) → 10% chance
•	If the condition is met → the prize is deducted from the Reward Pool and sent instantly to the player.
•	If not met → the player is compensated with ASH Tokens (200–500).
Workflow – Referral Rewards
•	If the Burn is made through a referral:
o	10% of the burn value is deducted directly from the Reward Pool.
o	It is instantly transferred to the referrer as USDC.
o	Instant notification: "You earned 0.49 USDC from your referral’s burn."
•	Profit Pool remains fixed.
Workflow – Admin Control
From the admin dashboard, the manager can set:
•	Distribution ratio (for example 50/50 or 60/40).
•	Number of daily winners.
•	Value of each prize.
•	Maximum daily prize cap.
The system ensures that the available amount in the Reward Pool is never exceeded.
Practical Example
•	1000 Burns × 4.99 USDC = 4990 USDC.
•	If 50% → Reward Pool = 2495 USDC.
•	If 50% → Profit Pool = 2495 USDC.
From the 2495 USDC (Reward Pool):
•	1 × 1000 USDC (Jackpot)
•	5 × 200 USDC (Medium)
•	20 × 50 USDC (Small)
•	Referrals (example 300 USDC)
•	Remaining stays as reserve for next rounds.
Result
•	Every Burn = either a prize or ASH.
•	Prizes are funded only from the Reward Pool.
•	Project profit is always preserved in the Profit Pool.
•	Referral Rewards never affect project profit, they are part of the Reward Pool allocation.
Section Six: Winner Selection Logic (Workflow)
Goal
•	Every Burn operation determines its result instantly (win or lose).
•	The result is transparent and fair through blockchain (VRF).
•	Ensures a fixed number of prizes and sustainability of the Reward Pool.
Workflow – Winner Selection
•	The player clicks Burn Now and selects the amount.
•	The smart contract receives the operation.
•	The system calculates:
Weight = (Amount ÷ 4.99) + Bonuses
•	Bonuses can come from:
o	VIP Subscriptions
o	Referrals
o	Boosts (using ASH)
•	The smart contract generates a random number (VRF Random Number).
•	The system compares the number with the Prize Table stored on-chain.
Prize Table – Example
•	Jackpot (2500 USDC): 0.5% chance
•	Big Prize (500 USDC): 2% chance
•	Medium Prize (200 USDC): 5% chance
•	Small Prize (50 USDC): 10% chance
•	Otherwise → ASH Tokens
Workflow – Instant Resolution
•	If the random number falls within a prize range:
o	Win
o	The prize value is deducted from the Reward Pool.
o	It is sent instantly to the player (USDC).
o	Notification and effects: 3D explosion + AI congratulation.
•	If the random number falls outside prize ranges:
o	Lose
o	200–500 ASH Tokens are distributed.
o	Visual effects: falling ash + AI message “You got ASH”.
Workflow – Fairness and Limits
•	The system ensures through the Admin Panel:
o	Maximum number of daily prizes.
o	Maximum total prize value (never exceeding the Reward Pool).
•	If the Reward Pool is close to empty:
o	The system automatically reduces the winning probability.
o	Or pauses big prizes until a new refill occurs.
Practical Example
•	The player burns 10 USDC.
•	Weight = (10 ÷ 4.99) ≈ 2.
•	VRF generates a number = 0.03.
•	Prize Table:
o	Jackpot ≤ 0.005
o	Big ≤ 0.02
o	Medium ≤ 0.07
•	Result = Medium Prize (200 USDC).
•	200 USDC is deducted from the Reward Pool.
•	Added instantly to the player’s balance → Notification: “You won 200 USDC!”.
Result
•	Every Burn = instant resolution.
•	The winner is determined immediately.
•	No waiting for rounds or manual draws.
•	Prizes are probability-based and restricted by the Reward Pool budget.

Section Seven: Weight Logic (Workflow)
Goal
•	Give every player a fair chance, but the more amount he burns or the more advantages he has (VIP, Referrals, Boosts) the higher his chances.
•	The logic must be simple, transparent, and scalable.
Workflow – Weight Calculation
When a Burn operation is executed:
•	Input: Amount (burn amount).
•	Input: User bonuses (VIP, Referrals, Boosts).
Normalize Amount
•	BaseUnit = 4.99 USDC (reference amount).
•	AmountWeight = Amount ÷ BaseUnit.
Examples:
•	4.99 USDC = Weight 1
•	10 USDC = Weight 2
•	50 USDC = Weight 10
Apply Bonuses
•	VIP:
o	Spark = +0.1 Weight
o	Active Ash = +0.25 Weight
o	Holy Fire = +0.5 Weight
•	Referrals:
o	Every 5 active referrals = +0.2 Weight
•	Boost (using ASH):
o	1000 ASH = +0.5 Weight for 1 hour
Final Weight = AmountWeight + VIP Bonus + Referral Bonus + Boost Bonus
Workflow – Applying Weight to Winning
•	The contract generates a random number (VRF Random) between 0 → 1.
•	It calculates:
EffectiveChance = Weight ÷ (Weight + ConstantFactor)
•	ConstantFactor = a fixed number to maintain balance (example 100).
•	If Random ≤ EffectiveChance → Win.
•	If Random > EffectiveChance → Lose (receive ASH).
Practical Example
•	Player A burns 4.99 USDC (Weight = 1).
o	No bonus → FinalWeight = 1.
o	EffectiveChance = 1 ÷ (1+100) = 0.009 ≈ 0.9%
•	Player B burns 50 USDC (Weight = 10).
o	Has VIP (Active Ash = +0.25).
o	FinalWeight = 10.25.
o	EffectiveChance = 10.25 ÷ (10.25+100) ≈ 9.3%
•	Player C burns 100 USDC + Boost (+0.5).
o	FinalWeight = 20.5.
o	EffectiveChance = 20.5 ÷ (20.5+100) ≈ 17%


 
Result
•	Weight = combines burn amount and bonuses.
•	The higher the amount or interaction, the higher the chance of winning.
•	There is always an element of luck because ConstantFactor maintains randomness.

Section Eight: Weight and Prize Table Logic
Goal
•	Every Burn determines:
o	Did the user win or not?
o	If won → which prize exactly (Jackpot, Medium, Small).
•	The system must be fair, dynamic, and aligned with the Reward Pool.
Workflow – Prize Selection
Step 1: Calculate Weight
•	FinalWeight = AmountWeight + VIP Bonus + Referral Bonus + Boost Bonus
Step 2: Determine Win or Lose
•	EffectiveChance = FinalWeight ÷ (FinalWeight + ConstantFactor)
•	RandomNumber = VRF(0,1)
•	If Random ≤ EffectiveChance → Win
•	If not → Lose (user receives ASH)
Step 3: Determine Prize Type (if Win)
•	The prize is selected from the Prize Table stored on-chain.
Prize Table example:
•	Jackpot (2500 USDC) → 1% of all win cases
•	Big Prize (500 USDC) → 4%
•	Medium Prize (200 USDC) → 15%
•	Small Prize (50 USDC) → 80%
•	RandomPrize = VRF(0,1)
•	RandomPrize is compared with the table to determine the prize.
Step 4: Check Reward Pool
•	If the Reward Pool has enough balance for the prize → it is sent instantly.
•	If not enough → the prize is automatically downgraded to the next available one (Fallback).
Practical Example
•	A player burns 10 USDC.
•	FinalWeight = 2.0
•	EffectiveChance = 2 ÷ (2+100) = 1.96%
•	VRF number = 0.012 → Win
Now:
•	RandomPrize = 0.73
•	Prize Table:
o	Jackpot ≤ 0.01
o	Big ≤ 0.05
o	Medium ≤ 0.20
o	Small ≤ 1.0
•	Result = Small Prize (50 USDC)
•	Reward Pool has enough balance → 50 USDC is deducted and sent instantly to the player.
Updates to Prize Distribution
Dynamic Prize Distribution
•	All references to number of burns or persons as limits or fixed conditions are no longer valid.
•	Prize distribution (Jackpot, Big, Medium, Small, etc.) will be allocated dynamically based on the total funds available in the Reward Pool, not on static counts or pre-set numbers of prizes.
•	This ensures sustainability and fairness, as the system automatically adjusts to the Reward Pool balance in real-time.
•	Jackpot might represent 10% of the Reward Pool, Big = 5%, Medium = 2%, Small = 1%. These percentages are configurable and used to dynamically calculate prizes relative to available Reward Pool funds.
 

Result
•	Weight determines whether the player wins at all.
•	If the player wins → the exact prize type is selected from the Prize Table.
•	The system is smart and never grants a prize larger than the Reward Pool capacity.
•	The outcome is always instant and transparent.

Section Nine: Admin Prize Control Workflow
Goal
•	Enable the administration to have full control over prizes: their number, value, and distribution across periods.
•	Ensure that prizes never exceed the Reward Pool balance.
•	Allow dynamic adjustments to prize tables (weekly, daily, monthly).
Admin Panel UI – Prize Control
•	Set distribution ratios
o	X% → Reward Pool
o	Y% → Profit Pool
•	Set Prize Table
o	Jackpot: value + probability
o	Big Prize: value + probability
o	Medium Prize: value + probability
o	Small Prize: value + probability
•	Set daily limits
o	Maximum number of winners per day
o	Maximum value of prizes per day
•	Set scheduling
o	Daily / Weekly / Custom
•	Fallback Rules
o	If Reward Pool is insufficient → any prize is downgraded to the next available level.
Workflow – Admin Prize Control
•	The admin defines:
o	Number of prizes and their values
o	Probability percentage for each prize
o	Daily or weekly limits
•	The Prize Table is published on-chain for full transparency.
•	On each Burn:
o	The system reads the current Prize Table
o	Determines the probability of winning
o	Deducts the prize from the Reward Pool if the player wins
•	If the Reward Pool is close to empty:
o	The system automatically reduces winning probabilities
o	Or downgrades prizes to the lowest available level
•	At the end of each cycle (day/week):
o	Counters are reset
o	Remaining Reward Pool balance is carried over to the next cycle
Practical Example
•	Admin sets:
o	Jackpot = 2500 USDC (1% of win cases)
o	Big = 500 USDC (5%)
o	Medium = 200 USDC (15%)
o	Small = 50 USDC (79%)
o	Daily prize cap = 10,000 USDC
•	Current day:
o	2000 Burns × 4.99 ≈ 10,000 USDC
o	Reward Pool = 5000 USDC
•	System distributes:
o	1 Jackpot winner (2500)
o	3 Big winners (1500)
o	5 Medium winners (1000)
o	Total = 5000 (entire daily Reward Pool consumed)
•	Remaining Burns → converted only into ASH (no USDC prizes).

 

Result
•	The administration has full control over the number of winners and the value of prizes.
•	The system automatically stops prizes when the Reward Pool is depleted or the daily cap is exceeded.
•	All prizes are transparent on-chain, and players know that the game is fair.

Section Ten: Referral System Workflow
Goal
•	Motivate users to bring their friends.
•	Each referral is tied to an actual Burn operation (growth linked to revenue).
•	Rewards are instant and direct.
User Referral UI
•	Unique referral link for each user.
•	Copy link button + share button for X, Telegram, WhatsApp.
•	Panel displays:
o	Number of friends joined
o	Total rewards from referrals (USDC)
o	Referral status: Pending / Active
Workflow – Referral Process
•	User A copies his unique referral link.
•	His friend B registers through the link (Web2 or Web3).
•	The system links account B to referrer A.
•	The first time B performs a Burn:
o	The system splits the amount as usual:
	X% → Reward Pool
	Y% → Profit Pool
o	From Reward Pool only:
	10% of the burn amount is instantly transferred to referrer A as USDC.
o	The rest of Reward Pool remains for covering prizes.
•	Notification to referrer A:
o	“You earned 0.49 USDC from your referral’s burn!”
•	Notification to user B:
o	“You’re now linked with Ahmed – your referrer”.
Workflow – Multiple Burns
•	Every time B burns → A receives 10% of the burn value (from Reward Pool).
•	No cap on the number of referrals or the number of burns.
•	Reward is always instant (added directly to the referrer’s balance).
Security and Control
•	Admin Panel can set:
o	Reward percentage (default 10%)
o	Reward type (USDC or ASH)
o	Daily or monthly reward caps
•	Every operation is on-chain → no manipulation possible.
Practical Example
•	B burns 4.99 USDC.
•	Reward Pool = 2.50 USDC (50%)
•	Profit Pool = 2.49 USDC (50%)
•	From Reward Pool:
o	0.49 USDC → A (Referrer)
o	2.01 USDC → remains for prizes
Result:
•	A receives the reward instantly.
•	B knows his referrer benefited.
•	The platform loses no profit (Profit Pool remains fixed).
Result
•	Referrals are part of the Reward Pool.
•	Rewards are instant and direct.
•	Growth is directly tied to burns → every new user = new revenue.

Section Eleven: VIP Subscription (Holy Fire) Workflow
Goal
•	Add a stable revenue stream for the platform.
•	Provide subscribers with exclusive perks that increase excitement and retention.
•	Keep the system simple with only one subscription plan.
Holy Fire Subscription Details
•	Price: 24.99 USDC per month
•	Benefits:
o	VIP Badge on profile (special marker)
o	+0.5 Weight Bonus on every Burn
o	Automatic entry into exclusive weekly raffles
o	Extra ASH reward when losing (+20% above normal)
o	Special notifications from AI Assistant (hints, close opportunities)
o	Priority access to beta features
Workflow – Holy Fire Subscription
•	The user clicks "Upgrade to Holy Fire".
•	A subscription details screen opens:
o	Price: 24.99 USDC / month
o	List of benefits
o	Button: "Subscribe Now"
•	On confirmation:
o	The amount is deducted from the internal USDC Balance
o	The contract registers the user in the VIP Registry on-chain
o	Expiration date is set to 30 days
o	Perks are activated instantly:
	Badge on profile
	+0.5 Weight Bonus on every Burn
	User added to the weekly raffle list
	AI Assistant adjusts its interactions (treats the user as VIP)
•	Subscription Renewal:
o	The system attempts to deduct 24.99 USDC at the end of the period
o	If balance is insufficient → Notification: "Renew your Holy Fire to keep VIP benefits"
o	If not renewed → perks expire automatically
Workflow – Admin Controls
•	From the admin panel, the manager can adjust:
o	Subscription price
o	Weight Bonus value
o	Type of exclusive weekly prizes
o	Percentage increase of ASH when losing
Practical Example
•	Ahmed is subscribed to Holy Fire.
•	He burns 10 USDC.
•	Base Weight = (10 ÷ 4.99) ≈ 2
•	+0.5 from Holy Fire → Final Weight = 2.5
•	His winning chance is higher than a regular player.
•	If he loses → he gets 360 ASH instead of 300
Result
•	One clear subscription (Holy Fire)
•	Adds stable income to the project
•	Gives the user a true VIP experience with tangible perks
•	Simple and easy to understand (no distraction with multiple plans)

Section Twelve: ASH Token Lifecycle Workflow
Goal
•	Explain the lifecycle of the ASH Token from distribution to becoming a scarce tradable asset after the 1B supply cap.
•	Show how it rewards players, how it is used, and how it evolves into a core part of the platform later.
Workflow – ASH Earning
•	The player clicks Burn Now.
•	If he loses:
o	He receives 200–500 ASH depending on the burned amount.
o	Balance is added instantly to his internal wallet (ASH Balance).
•	If he wins a USDC prize:
o	He does not receive ASH in that operation (the prize compensates him).
•	When subscribing to Holy Fire:
o	He receives +20% additional ASH on every loss.
Workflow – ASH Storage
•	ASH Balance is displayed in the Dashboard.
•	Balance details:
o	Current Balance
o	Earned Today / Total Earned
o	Usage History (where it was spent)
•	The user can keep it in the internal wallet or withdraw externally.
Workflow – ASH Usage (Inside the Platform)
•	Boost Weight: Burn 1000 ASH → +0.5 Weight Bonus for 1 hour.
•	Exclusive Raffles: Entry into raffles only for ASH holders.
•	Discounts: 5–10% discount on burn cost if partially paid with ASH.
•	VIP Access (future): Some perks or exclusive experiences unlocked only with ASH.
Workflow – ASH Withdraw (External)
•	The user clicks Withdraw ASH.
•	Specifies the amount.
•	Adds his external Solana wallet address.
•	The system requests 2FA (Google Authenticator or OTP).
•	On successful verification:
o	The smart contract deducts the amount from the internal wallet.
o	Sends it to the user’s Solana wallet.
o	Transaction History shows: “Withdraw 1000 ASH → Wallet XXXX”.
Workflow – Post-1B Supply
•	Once the entire 1B ASH is distributed:
o	The system stops granting ASH for losing attempts.
o	All losses = only losses (or replaced with alternative rewards such as Bonus Tickets).
•	ASH becomes scarce:
o	Fully tradable on DEX/CEX.
o	Value rises over time due to limited supply and increasing demand.
•	Staking System begins:
o	Users stake ASH for returns (USDC or ASH).
o	Increases token utility after distribution ends.
•	Platform transformation:
o	From burn + reward system → into a Burn Community Platform built on ASH trading, additional games, and AI features.
Practical Example
•	Mohammed burns 4.99 USDC → loses → receives 250 ASH.
•	After one week he collects 5000 ASH.
•	Uses 1000 ASH → Boost (+0.5 Weight for one hour).
•	Withdraws 2000 ASH to his external wallet and sells them on a DEX.
•	After supply depletion, ASH value rises → Mohammed benefits as an early holder.
Result
•	ASH = reward token and utility currency during the distribution phase.
•	Later transforms into a scarce currency and investment asset after supply depletion.
•	The platform benefits from acting as a “Gamified Pre-Sale” of the token.

Section Thirteen: Visual and Audio Effects Workflow
Goal
•	Every Burn operation generates a unique visual, audio, and text experience.
•	Win = explosion, fire, excitement.
•	Lose = ash, fading fire, motivational messages.
•	Always include a message of “something is born from fire and ash” so that even losing is not disappointing.
Types of Effects
Win (Prize)
•	3D fiery explosion fills the screen
•	Golden shards or flames flying everywhere
•	AI Voice: “Incredible! You just forged a rare prize from the flames!”
•	Text: “Congratulations! You won 500 USDC.”
Lose (ASH Reward)
•	Fire slowly extinguishes
•	Ash falling realistically
•	AI Voice: “Not the jackpot… but from the ashes, something rare is always born.”
•	Dynamic random text such as:
o	“The fire fades, but you gained 250 ASH.”
o	“No treasure this time, but the ashes gifted you 300 ASH.”
o	“Your burn didn’t spark a prize, but ashes created 200 ASH for you.”
Special Rewards (Boost / Referral / VIP)
•	Unique visual effect (fiery wings, golden spark)
•	AI Voice: “Your Holy Fire gives you extra power!”
Workflow – Effects Execution
•	The player clicks Burn Now.
•	The system determines the result (Win / Lose / Bonus).
•	The Effects Engine (Frontend):
o	Selects the appropriate animation
o	Adds the sound effect (explosion, burn, AI voice)
o	Generates a dynamic message from a prepared set
•	The message is displayed on-screen as a short pop-up
•	The result is recorded in the Transaction History
Suggested Dynamic Messages
On Win
•	“The flames crowned you with glory! +1000 USDC”
•	“Explosion of fortune! You won 200 USDC.”
•	“Your burn unleashed a rare treasure – Jackpot!”
On Loss
•	“No prize this time, but ashes gave you 300 ASH.”
•	“The fire tested you… from the ashes you received 250 ASH.”
•	“Smoke clears, leaving you with 400 ASH.”
•	“Even in loss, ashes always create something rare – 200 ASH for you.”





 

Result
•	Winning and losing are always enjoyable (no purely disappointing moment).
•	Messages change every time → maintaining the element of surprise.
•	Effects and messages create a unique identity for the platform (Ash, Fire, Flames).


Section Fourteen: Social Layer Workflow
Goal
•	Build a live community inside and outside the game.
•	Every Burn or win is visible to the world → creating competition and excitement.
•	Encourage players to share their moments on social networks (X, TikTok, Telegram).
Social Interaction Elements
Live Ticker
•	Appears at the bottom or top of the screen.
•	Displays the latest events in real-time:
o	"Ahmed burned 10 USDC"
o	"Sarah won 200 USDC"
o	"Omar gained 300 ASH"
•	Disappears after a few seconds and continues updating.
Share Moment (Share Button)
•	After every Burn (especially when winning):
o	A button appears: “Share your moment on X/TikTok”.
•	On click:
o	A short image/video card is generated (explosion or ash effect).
o	It is accompanied by automatic text such as:
	"I just burned on #BurnToWin and won 200 USDC!"
	"Burned 10 USDC, got 400 ASH. Ashes always create something rare."
o	Sharing the post rewards the player with 500 ASH (Bonus).
Leaderboards
•	Top Winners (most prizes won)
•	Most Burns (highest number of Burns)
•	Referral Kings (most referrals)
•	Displayed visually (fiery crowns + flying ash effects)
Workflow – Live Ticker
•	Every Burn is recorded on the smart contract.
•	The API system captures the data and sends it to the frontend.
•	The frontend displays it as ticker animations (auto-scrolling).
•	Messages appear and disappear within 2–3 seconds.
Workflow – Share Moment
•	The player wins or loses.
•	A "Share" button appears.
•	On click:
o	The system generates a visual card (Image/GIF) with:
	Player name (or anonymous if not chosen)
	Prize or ASH earned
	Fire/ash effects
o	Automatic text is added with hashtags (#BurnToWin #Crypto #Web3)
o	Opens the share link (X/TikTok/Telegram)
•	After posting:
o	The system rewards the player with 500 ASH
o	Notification: “You earned 500 ASH for sharing your moment!”
Workflow – Leaderboards
•	Every Burn, win, or referral is logged into the database.
•	The system updates the boards regularly (real-time or every 5 minutes).
•	The frontend displays:
o	Names and profile images of players
o	Rewards or badges for top ranks
•	Leaderboards reset daily or weekly.
Practical Example
•	Ahmed burns 20 USDC → loses → earns 400 ASH
•	Ticker: “Ahmed burned 20 USDC and gained 400 ASH”
•	Share button appears
•	He shares on X → receives 500 ASH bonus
•	Leaderboard updates → he climbs higher in Most Burns
Result
•	The platform becomes a live stage (every action visible to all).
•	Players get rewards even for social sharing.
•	Leaderboards increase competition and keep the community constantly excited.

Section Fifteen: Admin Panel Workflow
Goal
•	Full management of all platform elements from one place.
•	Dynamic adjustment of prizes, referrals, and subscriptions without code changes.
•	Real-time monitoring of performance and profits.
Admin Dashboard UI
Overview
•	Total Burns
•	Total prizes distributed
•	Platform profits (Profit Pool)
•	Current Reward Pool balance
•	Number of active players
Prizes Management
•	Set the Prize Table (Jackpot / Big / Medium / Small)
•	Define values and probabilities for each prize
•	Set daily/weekly maximum limits for prizes
•	Fallback rules (what happens when the Reward Pool is depleted)
Referral System
•	Adjust commission percentage (e.g., 5% instead of 10%)
•	Set reward type (USDC or ASH)
•	Define daily or monthly caps for rewards
Holy Fire Subscription
•	Adjust subscription price (USDC)
•	Adjust benefits (Bonus Weight, Extra ASH %)
•	View current subscribers
ASH Token Settings
•	Define ASH reward range for losers (200–500)
•	Adjust Boost value for ASH (e.g., 1000 ASH = +0.5 Weight)
•	Monitor remaining distribution amount from the 1B supply cap
Visual/Audio Effects Settings
•	Customize random messages (Win / Lose)
•	Upload new AI voice recordings
•	Adjust visual effects
Reports
•	Burns today / this week / this month
•	Prize distribution by category
•	Top-performing referrals
•	Most active players
Security
•	Add or remove admins
•	Mandatory 2FA for dashboard login
•	Activity log (Audit Log)
Workflow – Admin Panel Usage
•	Admin logs in (2FA mandatory).
•	Opens the Overview Dashboard → sees all key statistics.
If adjusting prizes:
•	Opens "Prizes Management" tab
•	Changes probabilities or values
•	Saves changes → Prize Table is updated on-chain
If adjusting referrals:
•	Opens "Referral System"
•	Adjusts percentage (e.g., from 10% to 7%)
•	Saves → changes apply instantly
If managing ASH:
•	Sets loss rewards (e.g., 250–600 instead of 200–500)
•	Defines available Boosts
If monitoring profits:
•	Opens "Reports"
•	Views project profit (Profit Pool)
•	Reviews Reward Pool consumption
Practical Example
•	Reward Pool = 10,000 USDC
•	Admin sets:
o	Jackpot = 2500 USDC (1% chance)
o	Big = 500 USDC (4%)
o	Medium = 200 USDC (15%)
o	Small = 50 USDC (80%)
o	Referral Reward = 7%
o	Holy Fire Subscription = 24.99 USDC/month
o	ASH for loss = 300–600
Now every Burn operates under these new settings instantly.
Result
•	The Admin Panel = the brain of the platform.
•	Any change (prizes, percentages, referrals) is applied directly to the smart contracts.
•	Guarantees transparency, flexibility, and full control over the project.

Section Sixteen: User Settings Workflow
Goal
•	Give the user full control over his account and security.
•	Allow customization of experience (Profile, Notifications, 2FA).
User Settings UI
Profile Settings (Optional)
•	Change username
•	Upload avatar
•	Select country or flag
•	Show/Hide name when winning (Privacy Toggle)
Security Settings
•	Enable/disable 2FA (Google Authenticator or OTP via email)
•	Manage authorized devices
•	Change email
•	Link/unlink social accounts (Google / Apple / Telegram)
Wallet Settings
•	Display unique deposit address
•	Add trusted withdrawal addresses (Whitelisted Addresses)
•	Enable “Withdraw requires 2FA always” (enabled by default)
Notification Settings
•	Enable/disable email notifications
•	Internal notifications (Burn results, Wins, Referrals)
•	Notifications from AI Assistant
Subscription Settings (Holy Fire)
•	Subscription status (Active / Expired)
•	Next renewal date
•	Renew or cancel button
Referral Settings
•	Display referral link
•	Copy / Share button
•	Referral earnings history
Delete / Deactivate Account
•	Option to permanently delete or temporarily deactivate account
•	Warning: “You will lose access to all balances if you don’t withdraw before deletion.”
Workflow – User Settings
•	User opens the Settings tab
•	Selects the desired section (Profile / Security / Wallet, etc.)
Example – Enable 2FA
•	Open Security Settings
•	Click “Enable 2FA”
•	QR Code + secret key appears
•	Link with Google Authenticator
•	Enter code → Activated successfully
•	Now every withdrawal or Admin Panel login requires 2FA
Example – Add Trusted Withdrawal Address
•	Open Wallet Settings
•	Add external Solana address
•	System requests 2FA confirmation
•	On success → address becomes “Trusted”
Example – Hide Identity When Winning
•	Open Profile Settings
•	Enable “Hide my name when I win”
•	Now Ticker shows: “Anonymous won 200 USDC!” instead of real name
Result
•	The Settings interface = the user’s personal control center.
•	Full security control (2FA mandatory for withdrawals).
•	Flexible (customize username, avatar, notifications).
•	Powerful (manage subscription, referrals, wallet).

Section Seventeen: Transaction History Workflow
Goal
•	Display all user financial activities transparently.
•	Allow users to track earnings, losses, deposits, and withdrawals.
•	Reduce disputes by keeping a permanent clear log.
Transaction History UI
•	Chronological list (newest first).
•	Categories of activities:
o	Burn (burn operation)
o	Win (prize)
o	Lose (ASH reward)
o	Deposit
o	Withdraw
o	Referral Bonus
o	Subscription (Holy Fire)
•	Details of each transaction:
o	Date and time
o	Type (Burn, Win, etc.)
o	Amount (USDC or ASH)
o	Status (Success ✅ / Failed ❌ / Pending ⏳)
o	Transaction ID on blockchain (clickable → opens in Solana Explorer)
•	Filter / Search options:
o	By type (only Burns, only Wins, etc.)
o	By date (day, week, month)
o	By amount (greater than 100 USDC for example)
Workflow – Transaction Logging
•	For every operation (Burn, Win, Deposit, etc.):
o	Smart contract generates a Transaction ID.
o	Event is sent to the Backend.
o	Backend stores it in the database (for quick display).
o	Recorded on blockchain (for audit).
•	Frontend:
o	Calls API to display recent activities.
o	Each transaction appears clearly with an icon (🔥 Burn, 💥 Win, 🌑 Lose).
o	User can click on a transaction → see full details.
Example:
•	Type: Burn
•	Amount: 10 USDC
•	Result: Lose → 300 ASH
•	Transaction ID: xxxxx (link to Solana Explorer)
•	Time: 25 Aug 2025 – 16:32
Practical Example
•	Ahmed burns 10 USDC.
o	Transaction History logs:
	Burn → –10 USDC
	Lose → +300 ASH
•	One minute later, Sarah wins 200 USDC.
o	Her history shows:
	Burn → –4.99 USDC
	Win → +200 USDC
•	Later, Ahmed withdraws 100 USDC.
o	Withdraw → –100 USDC (✅ Successful)
Security
•	Every transaction is tied to a Transaction ID on blockchain → no disputes possible.
•	Users can always verify their activities via Solana Explorer.
•	Any failed operation is marked as ❌ Failed.
Result
•	Transaction History = the backbone of transparency.
•	Rich, user-friendly interface.
•	Every player trusts that their funds and operations are recorded and monitored accurately.

Section Eighteen: AI Assistant Workflow
Goal
•	Make the experience more interactive and realistic.
•	Provide smart messages (motivational, educational, personal) directly tied to player behavior.
•	Integrate AI with the burn and prize interface.
AI Assistant UI
•	Permanent icon (AI AshBot) at the bottom of the screen.
•	Popup chat window on click.
•	Assistant sends short chat-style or voice (TTS) messages.
•	Fire/Ash-themed colors and backgrounds.
Workflow – AI Assistant Core
After every Burn:
•	Win:
o	Message: “Incredible! You just forged a rare treasure: {amount} USDC!”
o	Excited AI voice
•	Lose:
o	Message: “No jackpot, but from ashes comes rarity – you got {ash} ASH.”
o	Calm, encouraging voice
Dynamic Hints:
•	If player loses 3 times in a row:
o	“The flames whisper… your fortune may be near.”
•	If large Burn (e.g., 100 USDC):
o	“Bold move! Your chances just got a massive boost.”
Special Events:
•	VIP Subscription:
o	“Welcome to Holy Fire! Your flames are now stronger.”
•	Social Sharing:
o	“Your victory is now echoing across X!”
•	Referral:
o	“You just gained {amount} USDC from a referral burn.”
•	Deposit/Withdraw:
o	Deposit success: “Balance updated – ready to burn!”
o	Withdraw success: “Withdrawal confirmed – funds sent to your wallet.”
Workflow – Personalization
AI Assistant connects to player data:
•	Total Burns
•	Total ASH Balance
•	Biggest Win
•	Referral Count
Uses them to send personalized messages:
•	“You’ve burned 50 times already – your loyalty to the fire is unmatched.”
•	“You hold 20,000 ASH – consider using them for a boost.”
•	“You’re top 10 in leaderboards this week!”
Workflow – Technical Flow
•	Frontend Trigger: Any event (Burn, Win, Deposit, etc.)
•	Backend AI Engine:
o	Receives event + player data
o	Selects suitable message from AI library
o	Or generates dynamic message (LLM integration)
•	Output:
o	Appears as text message
o	Can also play as TTS (Text-to-Speech)
Practical Example
•	Ahmed burns 20 USDC and loses → receives 400 ASH
o	AI Assistant: “No jackpot this time, but ashes rewarded you 400 ASH.”
•	Next Burn he wins 200 USDC
o	AI Assistant: “Incredible! The flames blessed you with 200 USDC!”
Result
•	AI Assistant transforms the experience from just a game → into a personal adventure with continuous interaction.
•	Makes the player feel the platform “understands” and follows him.
•	Adds a mysterious, motivational, and thrilling atmosphere that significantly boosts engagement.


Section Nineteen: Staking and Post-1B Supply Workflow
Goal
•	Give ASH Token real value even after distribution ends (1B Cap).
•	Enable users to earn yields through Staking instead of just holding.
•	Ensure the project continues as a Burn & Earn + Token Utility system.
Workflow – Before 1B Supply Depletion
During the distribution phase:
•	Every loss = player receives 200–500 ASH.
•	ASH is used for: Boosts, exclusive raffles, and discounts.
•	Some players start accumulating large amounts in preparation for the next phase.
Optional Early Staking:
•	Can be activated earlier to incentivize holding.
•	Player deposits ASH into a Staking contract.
•	Receives additional yields (USDC from profits or extra ASH from the Reward Pool).
Workflow – After 1B Supply Depletion
Distribution stops:
•	No more free ASH for losses.
•	Every loss = only USDC loss (or symbolic alternative rewards such as Bonus Tickets).
ASH becomes scarce:
•	Fixed supply (1B).
•	Value rises with growing demand (needed for Boosts, Raffles, Discounts).
Full Staking Activation:
•	Player deposits ASH into Staking contract.
•	Earns periodic yields:
o	USDC → share of Profit Pool earnings.
o	Or ASH → through partial market recycling.
ASH Utility (post-supply):
•	Boost Weight (essential to increase win chances).
•	Entry into exclusive raffles (ASH-only access).
•	Burn discounts (e.g., 10% if partially paid with ASH).
•	Listing and trading on DEX/CEX (independent market value).
Workflow – Staking Process
•	Player opens Staking Tab.
•	Selects the amount to stake.
•	Signs transaction with 2FA + internal wallet.
•	Smart contract locks the amount.
•	User starts earning yields (daily / weekly).
•	On unstake request:
o	Contract releases principal (ASH) + yields (USDC/ASH).
Practical Example
•	Ahmed holds 100,000 ASH.
•	After supply depletion → he stakes 50,000 ASH.
•	Contract pays 10% annually (≈ 5,000 ASH or 200 USDC).
•	The rest he uses for Boosts or sells on DEX.
•	Token value rises as supply decreases and demand increases.
Result
•	Before supply depletion: ASH = player reward + internal utility.
•	After supply depletion: ASH = scarce tradable asset + essential tool (Boosts, Raffles, Staking).
•	Staking sustains token strength and encourages holding instead of quick selling.
Section Twenty: User Journey – Full Workflow
Goal
•	Map the user experience from start to finish in sequence.
•	Cover all branches (Win / Lose / Share / Withdraw).
•	Show how all previous systems integrate into a single journey.
Workflow – User Journey
1. Entering the Website (Landing Page)
•	User visits burn2win.com
•	Sees:
o	Button: Start Burning
o	Short description: "Burn USDC to win prizes or earn ASH"
o	Live Ticker displaying other users’ activities
•	Clicks Start Burning → redirected to registration
2. Registration (Onboarding)
•	Options displayed:
o	Email + OTP
o	Google / Apple / Telegram
o	Connect Wallet (optional)
•	Registers with email → receives OTP → enters code → account ready ✅
•	System generates an internal wallet + unique deposit address
•	Dashboard opens:
o	USDC Balance = 0
o	ASH Balance = 0
o	Burn Now button (disabled)
3. Deposit
•	User clicks Deposit
•	Copies his unique address and sends 50 USDC from external wallet
•	Smart contract confirms → notification appears:
o	“Deposit Successful – Balance: 50 USDC”
•	Burn Now button is enabled
4. First Burn Operation
•	User clicks Burn Now
•	Selects: 4.99 USDC
•	System:
o	Deducts 4.99 from balance
o	Calculates Weight
o	Generates VRF Random
o	Determines result
5A. Win Scenario
•	System instantly credits prize (e.g., +200 USDC)
•	Dashboard updates: balance = 245.01 USDC
•	Effects: fiery explosion + AI Assistant:
o	“Incredible! You won 200 USDC!”
•	Live Ticker displays:
o	"Ahmed won 200 USDC!"
•	Share Moment button appears:
o	Clicks → shares on X/TikTok → earns +500 ASH
5B. Lose Scenario
•	System grants 300 ASH
•	Dashboard updates: ASH Balance = 300
•	Effects: falling ash + AI Assistant:
o	“No prize, but from ashes you gained 300 ASH.”
•	Live Ticker displays:
o	"Ahmed burned 4.99 USDC and got 300 ASH"
•	Share Moment button appears:
o	Clicks → shares on X/TikTok → earns +500 ASH bonus
6. Referrals
•	Ahmed copies referral link from Dashboard
•	His friend Omar registers and burns 10 USDC
•	Instantly Ahmed receives 1 USDC in his balance
•	Notification: “You earned 1 USDC from Omar’s burn!”
7. VIP Subscription (Holy Fire)
•	Ahmed subscribes for 24.99 USDC
•	Gains:
o	VIP Badge
o	+0.5 Weight on every Burn
o	+20% ASH when losing
o	Automatic entry into weekly raffles
•	Dashboard updates to show VIP status
8. Withdraw
•	Ahmed decides to withdraw 100 USDC
•	Clicks Withdraw
•	Enters amount + external wallet address
•	System requests 2FA Code
•	Success ✅ → funds sent instantly to external wallet
•	Transaction History records the operation
Result
•	The journey is complete and seamless:
 Enter → Register → Deposit → Burn → (Win/Lose) → Social Sharing → Referrals → VIP Subscription → Withdraw
•	Every step includes visual effects, AI messages, and blockchain transparency
•	User leaves the experience excited and motivated to burn again

Section Twenty-One: Roadmap and Tokenomics Page
Page Design
Main Title: Roadmap & Tokenomics
Two main sections:
•	Tokenomics – ASH Token details
•	Roadmap – Project development stages

1. Tokenomics – ASH Token Lifecycle
Total Supply
•	1,000,000,000 ASH (1 billion)
•	No additional mint after launch → fixed supply
Allocation
•	70% (700M) → Distributed via Burns (player rewards on losses)
•	15% (150M) → Community Incentives (Airdrops, Social Rewards, Referrals)
•	10% (100M) → Staking Rewards (after initial distribution ends)
•	5% (50M) → Team and Development (12-month lock + 24-month vesting)
Distribution Mechanism
•	Every Burn = loser receives 200–500 ASH
•	Continues until full 1B supply is depleted
•	After depletion:
o	Automatic ASH rewards stop
o	ASH becomes scarce → listed on DEX/CEX
Utility (Token Use Cases)
•	Boosts – use ASH to increase Weight (1000 ASH = +0.5 Weight / 1 hour)
•	Exclusive Raffles – entry into raffles only for ASH holders
•	Discounts – reduced Burn cost if partially paid with ASH
•	Staking – after depletion, stake ASH to earn USDC or more ASH
•	Trading – tradable on secondary markets after launch
Tokenomics Objective
•	Create a fair reward system (Gamified Pre-Sale)
•	Turn losses into profitable experiences
•	Build a strong internal economy, then expand after supply depletion

2. Roadmap – Project Stages
Phase 1 – Preparation (Q4 2025)
•	Smart contract development (Burn + Rewards + Internal Wallets)
•	Frontend build (Landing Page + Dashboard + Burn System)
•	AI Assistant integration (initial version for interactive messages)
•	Referral system launch (10% instant rewards)
•	Internal testing (Closed Beta)
Phase 2 – Official Launch (Q1 2026)
•	Global official website launch
•	Activate Burn Now button (USDC → Prizes/ASH)
•	Add visual/audio effects
•	Launch Holy Fire Subscription (24.99 USDC)
•	Launch Live Ticker + X/TikTok sharing
•	Inject first 100M ASH into the system (start of distribution)
Phase 3 – Expansion (Q2–Q3 2026)
•	Launch Leaderboards (Top Burners, Winners, Referrals)
•	Add ASH-exclusive raffles
•	Launch Community Quests (group burns + massive rewards)
•	First version of Ash TV (live stream of burn results)
•	Multi-language support
•	Partnerships with influencers + large marketing campaigns
Phase 4 – Post-1B Supply (2027+)
•	Stop ASH distribution as loss rewards
•	ASH listed globally on DEX/CEX
•	Activate Staking Contracts (ASH → USDC yields)
•	Build Burn Community:
o	Group Burns (Clans/Guilds)
o	Weekly challenges
o	Advanced AI interacting with each user personally
•	Develop Metaverse Integration → burns inside immersive 3D worlds

Result
•	Tokenomics ensures the project is transparent, fair, and sustainable.
•	Roadmap shows investors and players a clear plan:
o	Start as a fun burn experience
o	Evolve into a full token economy
o	Transform into a global Web3 community built on fire and ashes


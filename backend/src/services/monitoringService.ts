import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BlockchainService } from "./blockchainService";
import { EmailService } from "./emailService";
import { config } from "../config";

// Alert thresholds
const SOL_THRESHOLD = 0.2;    // alert when master wallet SOL drops below 0.2
const USDC_THRESHOLD = 50;    // alert when master wallet USDC drops below $50

// Prevent alert spam — only send once per asset per hour
const lastAlertSent: Record<string, number> = {};
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

async function checkMasterWalletBalance(): Promise<void> {
  try {
    const masterAddress = BlockchainService.getMasterWalletAddress();
    if (!masterAddress) return;

    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    // Check SOL balance
    const lamports = await connection.getBalance(new PublicKey(masterAddress));
    const solBalance = lamports / LAMPORTS_PER_SOL;

    if (solBalance < SOL_THRESHOLD) {
      const key = "SOL";
      const lastSent = lastAlertSent[key] ?? 0;
      if (Date.now() - lastSent > ALERT_COOLDOWN_MS) {
        lastAlertSent[key] = Date.now();
        console.warn(`[Monitoring] Master wallet SOL low: ${solBalance.toFixed(4)} SOL`);
        await EmailService.sendLowBalanceAlert("SOL", solBalance, SOL_THRESHOLD);
      }
    }

    // Check USDC balance
    const usdcBalance = await BlockchainService.getUsdcBalance(masterAddress);

    if (usdcBalance < USDC_THRESHOLD) {
      const key = "USDC";
      const lastSent = lastAlertSent[key] ?? 0;
      if (Date.now() - lastSent > ALERT_COOLDOWN_MS) {
        lastAlertSent[key] = Date.now();
        console.warn(`[Monitoring] Master wallet USDC low: ${usdcBalance.toFixed(2)} USDC`);
        await EmailService.sendLowBalanceAlert("USDC", usdcBalance, USDC_THRESHOLD);
      }
    }
  } catch (err) {
    console.error("[Monitoring] Balance check failed:", err);
  }
}

/**
 * Start periodic master wallet balance monitoring.
 * Checks every 30 minutes and emails all owners if SOL or USDC drops below threshold.
 */
export function startBalanceMonitoring(): void {
  // First check after 1 minute (let server fully start)
  setTimeout(() => {
    checkMasterWalletBalance();
    setInterval(checkMasterWalletBalance, 30 * 60 * 1000);
  }, 60_000);

  console.log("[Monitoring] Balance monitoring started (checks every 30 min)");
}

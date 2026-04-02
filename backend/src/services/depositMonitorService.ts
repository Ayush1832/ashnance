// ============================================================
// Ashnance — Deposit Monitor Service
// ============================================================
// Starts on-chain polling for every user deposit address.
// Must be called once at server startup.
// Also exported so new accounts can start monitoring immediately.

import { prisma } from "../utils/prisma";
import { BlockchainService } from "./blockchainService";
import { WalletService } from "./walletService";

/**
 * Start polling for a single deposit address.
 * Safe to call multiple times — BlockchainService deduplicates monitors.
 */
export function watchDepositAddress(userId: string, depositAddress: string): void {
  BlockchainService.monitorDeposit(
    depositAddress,
    async (amount: number, txHash: string) => {
      try {
        await WalletService.processDeposit(userId, amount, txHash);
        console.log(
          `[DepositMonitor] Credited ${amount} USDC → user ${userId} (tx: ${txHash.slice(0, 16)}...)`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Idempotency — already processed transactions are expected, not errors
        if (msg.includes("already processed")) return;
        console.error(
          `[DepositMonitor] Failed to process deposit for ${depositAddress}:`,
          err
        );
      }
    }
  );
}

/**
 * Load all wallet deposit addresses from the DB and start monitoring each.
 * Called once when the server starts.
 */
export async function startAllDepositMonitors(): Promise<void> {
  try {
    const wallets = await prisma.wallet.findMany({
      select: { userId: true, depositAddress: true },
    });

    console.log(`[DepositMonitor] Starting monitors for ${wallets.length} wallet(s)`);

    for (const wallet of wallets) {
      watchDepositAddress(wallet.userId, wallet.depositAddress);
    }
  } catch (err) {
    console.error("[DepositMonitor] Failed to start monitors:", err);
  }
}

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
        // Sweep the deposited USDC from the deposit address to the master wallet
        // so the master wallet has funds to pay prizes and withdrawals
        BlockchainService.sweepDepositToMaster(userId, depositAddress).then((sweepTx) => {
          if (sweepTx) {
            console.log(`[DepositMonitor] Swept ${amount} USDC to master wallet (tx: ${sweepTx.slice(0, 16)}...)`);
          }
        }).catch((err) => {
          console.error(`[DepositMonitor] Sweep failed for ${depositAddress}:`, err);
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
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

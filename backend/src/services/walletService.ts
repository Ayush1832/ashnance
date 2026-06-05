import { prisma } from "../utils/prisma";
import {
  InsufficientBalanceError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from "../utils/errors";
import { BlockchainService } from "./blockchainService";
import { EmailService } from "./emailService";
import speakeasy from "speakeasy";

const WHITELIST_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export class WalletService {
  /**
   * Get wallet details for a user
   */
  static async getWallet(userId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError("Wallet not found");

    return {
      usdcBalance:      wallet.usdcBalance,
      ashBalance:       wallet.ashBalance,
      cumulativeWeight: wallet.cumulativeWeight,
      depositAddress:   wallet.depositAddress,
    };
  }

  /**
   * Verify a deposit transaction on-chain and credit the user's balance.
   * The user must have sent USDC directly to the platform master wallet.
   */
  static async verifyAndProcessDeposit(userId: string, txHash: string) {
    // Verify on-chain first (finalized commitment)
    const verified = await BlockchainService.verifyDepositTransaction(txHash);
    if (!verified) {
      throw new BadRequestError(
        "Could not verify transaction. Make sure you sent USDC to the platform wallet on Solana and the transaction is finalized."
      );
    }

    // Attribution check: the deposit must carry this user's id as an on-chain
    // memo. Without this, anyone watching the public master wallet could submit
    // someone else's deposit txHash and have it credited to their own account.
    if (verified.memo !== userId) {
      throw new BadRequestError(
        "This transaction is not attributed to your account. Deposits must be made through the app's Deposit button so they can be credited to you."
      );
    }

    const { amount } = verified;
    if (amount < 1) throw new BadRequestError("Minimum deposit is 1 USDC");

    // Atomic credit — DB unique constraint on (txHash, type) prevents double-credit even under race
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        const wallet = await tx.wallet.update({
          where: { userId },
          data: { usdcBalance: { increment: amount } },
        });

        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: "DEPOSIT",
            amount,
            currency: "USDC",
            status: "COMPLETED",
            txHash,
            description: `Deposited ${amount} USDC via wallet`,
          },
        });

        return { wallet, transaction };
      });

      return {
        amount,
        newBalance: result.wallet.usdcBalance,
        transactionId: result.transaction.id,
      };
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw new BadRequestError("Transaction already processed");
      }
      throw err;
    }
  }

  /**
   * On-demand deposit recovery. Scans the most recent transfers to the master
   * wallet and credits any that carry THIS user's attribution memo and have not
   * already been credited. Used as a safety net when the client sent USDC but
   * never reported the txHash (e.g. the tab closed before POST /deposit ran).
   *
   * Reuses verifyAndProcessDeposit per candidate, so the memo check, minimum
   * amount, finalized-commitment check, and (txHash, type) idempotency all
   * still apply. Other users' deposits fail the memo check and are skipped;
   * already-credited ones hit the unique constraint and are skipped.
   */
  static async recoverDeposits(userId: string) {
    const signatures = await BlockchainService.getRecentDepositSignatures(20);

    let recovered = 0;
    let totalAmount = 0;
    const txHashes: string[] = [];

    for (const txHash of signatures) {
      try {
        const res = await WalletService.verifyAndProcessDeposit(userId, txHash);
        recovered += 1;
        totalAmount += res.amount;
        txHashes.push(txHash);
      } catch {
        // Expected during a scan: not this user's memo, already credited,
        // below minimum, or unverifiable. Skip and keep going.
        continue;
      }
    }

    return { recovered, totalAmount, txHashes };
  }

  /**
   * @deprecated Legacy deposit used by deposit-address monitor.
   * Use verifyAndProcessDeposit for new direct deposits.
   */
  static async processDeposit(userId: string, amount: number, txHash: string) {
    if (amount < 1) throw new BadRequestError("Minimum deposit is 1 USDC");

    try {
      const result = await prisma.$transaction(async (tx: any) => {
        const wallet = await tx.wallet.update({
          where: { userId },
          data: { usdcBalance: { increment: amount } },
        });
        const transaction = await tx.transaction.create({
          data: {
            userId, type: "DEPOSIT", amount, currency: "USDC",
            status: "COMPLETED", txHash,
            description: `Deposited ${amount} USDC`,
          },
        });
        return { wallet, transaction };
      });

      return { newBalance: result.wallet.usdcBalance, transactionId: result.transaction.id };
    } catch (err: any) {
      if (err.code === "P2002") throw new ConflictError("Transaction already processed");
      throw err;
    }
  }

  /**
   * Process withdrawal (requires 2FA)
   */
  static async processWithdrawal(
    userId: string,
    amount: number,
    address: string,
    twoFaCode: string
  ) {
    if (amount < 10) throw new BadRequestError("Minimum withdrawal is $10 USDC");
    if (!BlockchainService.validateSolanaAddress(address)) {
      throw new BadRequestError("Invalid destination Solana address");
    }

    // Get user + wallet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        whitelistAddrs: true,
      },
    });

    if (!user || !user.wallet) throw new NotFoundError("User not found");

    // Verify 2FA
    if (!user.twoFaEnabled || !user.twoFaSecret) {
      throw new BadRequestError("2FA must be enabled for withdrawals");
    }

    const isValid2FA = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: "base32",
      token: twoFaCode,
    });

    if (!isValid2FA) {
      // Increment failed attempts
      const attempts = user.failedAttempts + 1;
      if (attempts >= 3) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            failedAttempts: attempts,
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
          },
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { failedAttempts: attempts },
        });
      }
      throw new UnauthorizedError("Invalid 2FA code");
    }

    // Check whitelisted address (must be verified AND past 24-hour activation cooldown)
    const matchingAddr = user.whitelistAddrs.find(
      (addr: any) => addr.address === address && addr.isVerified
    );
    if (!matchingAddr) {
      throw new BadRequestError(
        "Address not whitelisted. Add it in Settings before withdrawing."
      );
    }
    if (matchingAddr.activatesAt && new Date(matchingAddr.activatesAt) > new Date()) {
      const msRemaining = new Date(matchingAddr.activatesAt).getTime() - Date.now();
      const hours = Math.ceil(msRemaining / 3_600_000);
      throw new BadRequestError(
        `New whitelist addresses have a 24-hour security cooldown. ` +
        `This address will be ready in ~${hours} hour${hours === 1 ? "" : "s"}.`
      );
    }

    // Banned users cannot withdraw automatically — flag for manual review
    if (user.isBanned) {
      throw new BadRequestError(
        "Your account is suspended. Please contact support to arrange withdrawal of your funds."
      );
    }

    // --- Step 1: Reserve balance atomically (check + decrement in one transaction) ---
    // This prevents race conditions where two concurrent withdrawals could both pass
    // the pre-check and both drain the balance.
    let pendingTxId: string;
    try {
      const reservation = await prisma.$transaction(async (tx: any) => {
        // Atomic GUARDED debit — only decrement if the balance still covers the
        // amount. Prevents two concurrent withdrawals (or a withdraw racing a
        // burn) from both passing a stale read and draining the balance twice.
        const debit = await tx.wallet.updateMany({
          where: { userId, usdcBalance: { gte: amount } },
          data: { usdcBalance: { decrement: amount } },
        });
        if (debit.count === 0) {
          throw new InsufficientBalanceError();
        }
        const pendingTx = await tx.transaction.create({
          data: {
            userId,
            type: "WITHDRAW",
            amount,
            currency: "USDC",
            status: "PROCESSING",
            description: `Withdrawal of ${amount} USDC to ${address.slice(0, 8)}...`,
            metadata: { address },
          },
        });
        return { pendingTxId: pendingTx.id };
      });
      pendingTxId = reservation.pendingTxId;
    } catch (err) {
      if (err instanceof InsufficientBalanceError) throw err;
      throw new BadRequestError("Could not reserve withdrawal balance. Please try again.");
    }

    // --- Step 2: Execute on-chain transfer ---
    let txHash: string;
    try {
      txHash = await BlockchainService.sendUsdcTransfer(address, amount);
    } catch (err: any) {
      // If the transfer was broadcast but its confirmation is uncertain, the tx
      // MAY have landed — refunding would double-pay. Do NOT refund; mark it for
      // manual reconciliation instead and alert.
      if (err?.unconfirmed && err?.signature) {
        await prisma.transaction.update({
          where: { id: pendingTxId },
          data: { status: "PROCESSING", txHash: err.signature },
        });
        const alert = `Withdrawal BROADCAST but UNCONFIRMED — NOT refunded (avoids double-spend).\nuserId=${userId}\namount=${amount}\ntxHash=${err.signature}\naddress=${address}\npendingTxId=${pendingTxId}`;
        console.error("[CRITICAL]", alert);
        EmailService.sendCriticalAlert("Withdrawal unconfirmed — verify on-chain before refunding", alert).catch(() => {});
        throw new BadRequestError(
          "Your withdrawal was submitted and is still confirming. If it doesn't arrive shortly, contact support — your balance was not refunded to avoid a double payment."
        );
      }
      // Genuine broadcast failure (the transfer was never sent) — safe to refund.
      console.error("[WalletService] On-chain withdrawal failed — refunding:", err);
      await prisma.wallet.update({ where: { userId }, data: { usdcBalance: { increment: amount } } });
      await prisma.transaction.update({ where: { id: pendingTxId }, data: { status: "FAILED" } });
      throw new BadRequestError("On-chain transfer failed. Your balance has been restored.");
    }

    // --- Step 3: Mark as completed ---
    // Edge case: if this fails after on-chain success, the balance is already decremented
    // so there is no double-spend — but we need to update the transaction record.
    let finalTxRecord: any;
    try {
      finalTxRecord = await prisma.$transaction(async (tx: any) => {
        const transaction = await tx.transaction.update({
          where: { id: pendingTxId },
          data: { txHash, status: "COMPLETED" },
        });
        await tx.user.update({ where: { id: userId }, data: { failedAttempts: 0 } });
        return transaction;
      });
    } catch (dbErr) {
      // Non-critical: balance already decremented, on-chain already confirmed.
      // The PROCESSING record exists in DB so support can reconcile.
      const criticalMsg = `Withdrawal record update failed after successful on-chain transfer.\nuserId=${userId}\namount=${amount}\ntxHash=${txHash}\naddress=${address}\npendingTxId=${pendingTxId}\nerror=${dbErr}`;
      console.error("[CRITICAL]", criticalMsg);
      EmailService.sendCriticalAlert("Withdrawal record update failed — verify manually", criticalMsg).catch(() => {});
    }

    const finalWallet = await prisma.wallet.findUnique({ where: { userId }, select: { usdcBalance: true } });

    return {
      newBalance: finalWallet?.usdcBalance ?? 0,
      transactionId: finalTxRecord?.id ?? pendingTxId,
      txHash,
      status: "COMPLETED",
    };
  }

  /**
   * Claim ASH tokens to the user's on-chain wallet.
   * Supports partial claims — user specifies the amount to transfer.
   * If amount is omitted, the full balance is claimed.
   */
  static async claimAsh(userId: string, toAddress: string, requestedAmount?: number) {
    if (!BlockchainService.validateSolanaAddress(toAddress)) {
      throw new BadRequestError("Invalid Solana address");
    }

    // Atomically check + reserve the requested ASH to prevent double-claim race condition
    let amount: number;
    try {
      const reserved = await prisma.$transaction(async (tx: any) => {
        const wallet = await tx.wallet.findUnique({
          where: { userId },
          select: { ashBalance: true },
        });
        if (!wallet) throw new NotFoundError("Wallet not found");
        const bal = Number(wallet.ashBalance);
        if (bal < 1) throw new BadRequestError("No ASH balance to claim");

        // Partial claim support
        const claimAmount = requestedAmount !== undefined ? requestedAmount : bal;
        if (claimAmount <= 0) throw new BadRequestError("Claim amount must be greater than 0");
        if (claimAmount > bal) {
          throw new BadRequestError(
            `Requested ${claimAmount} ASH but only ${bal} ASH available`
          );
        }

        // Atomic GUARDED debit — fails (count 0) if a concurrent claim already
        // moved the balance below claimAmount, preventing double-claim drain.
        const debit = await tx.wallet.updateMany({
          where: { userId, ashBalance: { gte: claimAmount } },
          data: { ashBalance: { decrement: claimAmount } },
        });
        if (debit.count === 0) {
          throw new BadRequestError("ASH balance changed — please try again.");
        }
        return claimAmount;
      });
      amount = reserved;
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof BadRequestError) throw err;
      throw new BadRequestError("Could not reserve ASH balance. Please try again.");
    }

    let txHash: string;
    try {
      txHash = await BlockchainService.sendAshTransfer(toAddress, amount);
    } catch (err) {
      // Refund DB balance if on-chain transfer fails
      await prisma.wallet.update({
        where: { userId },
        data: { ashBalance: { increment: amount } },
      });
      throw new BadRequestError("ASH on-chain transfer failed. Balance restored.");
    }

    const newWallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { ashBalance: true },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: "ASH_CLAIM",
        amount,
        currency: "ASH",
        status: "COMPLETED",
        txHash,
        description: `Claimed ${amount} ASH to ${toAddress.slice(0, 8)}...`,
        metadata: { address: toAddress },
      },
    });

    return { claimed: amount, txHash, newBalance: Number(newWallet?.ashBalance ?? 0) };
  }

  /**
   * Get whitelisted withdrawal addresses
   */
  static async getWhitelistedAddresses(userId: string) {
    return prisma.whitelistedAddress.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Add a new whitelist address.
   * On mainnet (NODE_ENV=production): address enters a 24-hour pending state
   * before it can be used for withdrawals (activatesAt = now + 24h).
   * On devnet: immediately active (activatesAt = null).
   */
  static async addWhitelistedAddress(userId: string, address: string, label?: string) {
    if (!BlockchainService.validateSolanaAddress(address)) {
      throw new BadRequestError("Invalid Solana address");
    }

    const existing = await prisma.whitelistedAddress.findFirst({
      where: { userId, address },
    });
    if (existing) throw new ConflictError("Address already whitelisted");

    // Apply the 24h cooldown whenever we're on mainnet (real funds), derived from
    // the actual RPC network — NOT NODE_ENV, which could be misset and silently
    // disable this control on a live mainnet deployment.
    const isMainnet = BlockchainService.getNetwork() === "mainnet-beta";
    const activatesAt = isMainnet
      ? new Date(Date.now() + WHITELIST_COOLDOWN_MS)
      : null;

    return prisma.whitelistedAddress.create({
      data: {
        userId,
        address,
        label: label || null,
        isVerified: true,
        activatesAt,
      },
    });
  }

  /**
   * Remove a whitelist address
   */
  static async removeWhitelistedAddress(userId: string, addressId: string) {
    const addr = await prisma.whitelistedAddress.findFirst({
      where: { id: addressId, userId },
    });
    if (!addr) throw new NotFoundError("Address not found");

    await prisma.whitelistedAddress.delete({ where: { id: addressId } });
  }

  /**
   * Get transaction history
   */
  static async getTransactions(
    userId: string,
    options: {
      type?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { type, page = 1, limit = 20 } = options;

    const where: any = { userId };
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

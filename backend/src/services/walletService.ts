import { prisma } from "../utils/prisma";
import {
  InsufficientBalanceError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from "../utils/errors";
import { BlockchainService } from "./blockchainService";
import speakeasy from "speakeasy";

export class WalletService {
  /**
   * Get wallet details for a user
   */
  static async getWallet(userId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError("Wallet not found");

    return {
      usdcBalance: wallet.usdcBalance,
      ashBalance: wallet.ashBalance,
      depositAddress: wallet.depositAddress,
    };
  }

  /**
   * Process deposit (after on-chain confirmation)
   */
  static async processDeposit(
    userId: string,
    amount: number,
    txHash: string
  ) {
    if (amount < 1) throw new BadRequestError("Minimum deposit is 1 USDC");

    // Check if tx already processed
    const existingTx = await prisma.transaction.findFirst({
      where: { txHash, type: "DEPOSIT" },
    });
    if (existingTx) throw new BadRequestError("Transaction already processed");

    const result = await prisma.$transaction(async (tx: any) => {
      // Credit wallet
      const wallet = await tx.wallet.update({
        where: { userId },
        data: { usdcBalance: { increment: amount } },
      });

      // Log transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          amount,
          currency: "USDC",
          status: "COMPLETED",
          txHash,
          description: `Deposited ${amount} USDC`,
        },
      });

      return { wallet, transaction };
    });

    return {
      newBalance: result.wallet.usdcBalance,
      transactionId: result.transaction.id,
    };
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

    // Check balance
    if (Number(user.wallet.usdcBalance) < amount) {
      throw new InsufficientBalanceError();
    }

    // Check whitelisted address
    const isWhitelisted = user.whitelistAddrs.some(
      (addr: any) => addr.address === address && addr.isVerified
    );
    if (!isWhitelisted) {
      throw new BadRequestError(
        "Address not whitelisted. Add and verify it in Settings before withdrawing."
      );
    }

    // Process withdrawal
    const result = await prisma.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.update({
        where: { userId },
        data: { usdcBalance: { decrement: amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: "WITHDRAWAL",
          amount,
          currency: "USDC",
          status: "PROCESSING",
          description: `Withdrawal of ${amount} USDC to ${address.slice(0, 8)}...`,
          metadata: { address },
        },
      });

      // Reset failed attempts
      await tx.user.update({
        where: { id: userId },
        data: { failedAttempts: 0 },
      });

      return { wallet, transaction };
    });

    // Execute actual on-chain USDC transfer
    let txHash: string | null = null;
    try {
      txHash = await BlockchainService.sendUsdcTransfer(address, amount);

      // Mark transaction as COMPLETED with txHash
      await prisma.transaction.update({
        where: { id: result.transaction.id },
        data: { status: "COMPLETED", txHash },
      });
    } catch (err) {
      console.error("[WalletService] On-chain withdrawal failed:", err);

      // Refund the balance on-chain failure
      await prisma.$transaction(async (tx: any) => {
        await tx.wallet.update({
          where: { userId },
          data: { usdcBalance: { increment: amount } },
        });
        await tx.transaction.update({
          where: { id: result.transaction.id },
          data: { status: "FAILED" },
        });
      });

      throw new BadRequestError(
        "On-chain transfer failed. Your balance has been restored. Please try again."
      );
    }

    return {
      newBalance: result.wallet.usdcBalance,
      transactionId: result.transaction.id,
      txHash,
      status: "COMPLETED",
    };
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
   * Add a new whitelist address
   */
  static async addWhitelistedAddress(userId: string, address: string, label?: string) {
    if (!BlockchainService.validateSolanaAddress(address)) {
      throw new BadRequestError("Invalid Solana address");
    }

    const existing = await prisma.whitelistedAddress.findFirst({
      where: { userId, address },
    });
    if (existing) throw new ConflictError("Address already whitelisted");

    return prisma.whitelistedAddress.create({
      data: {
        userId,
        address,
        label: label || null,
        isVerified: false, // requires admin approval in production
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

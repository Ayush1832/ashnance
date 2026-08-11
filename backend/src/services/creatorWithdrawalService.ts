import { prisma } from "../utils/prisma";
import { BadRequestError, InsufficientBalanceError, NotFoundError } from "../utils/errors";
import { BlockchainService } from "./blockchainService";
import { EmailService } from "./emailService";

export class CreatorWithdrawalService {
  static async requestWithdrawal(creatorId: string, amount: number, address: string) {
    if (!BlockchainService.validateSolanaAddress(address)) {
      throw new BadRequestError("Invalid destination Solana address");
    }
    const wallet = await prisma.creatorWallet.findUnique({ where: { creatorId } });
    if (!wallet) throw new NotFoundError("Creator wallet not found");
    if (Number(wallet.usdcBalance) < amount) {
      throw new InsufficientBalanceError("Insufficient creator wallet balance");
    }

    return prisma.creatorWithdrawalRequest.create({
      data: { creatorId, amount, address, status: "PENDING" },
    });
  }

  static async listForCreator(creatorId: string) {
    return prisma.creatorWithdrawalRequest.findMany({
      where: { creatorId },
      orderBy: { requestedAt: "desc" },
    });
  }

  static async listPending() {
    return prisma.creatorWithdrawalRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { creator: { select: { displayName: true, slug: true } } },
    });
  }

  static async reject(requestId: string) {
    const request = await prisma.creatorWithdrawalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundError("Withdrawal request not found");
    if (request.status !== "PENDING") throw new BadRequestError(`Request is already ${request.status}`);

    return prisma.creatorWithdrawalRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", processedAt: new Date() },
    });
  }

  /**
   * Approve + execute a withdrawal on-chain. Mirrors WalletService.processWithdrawal's
   * safe reserve → send → confirm pattern: balance is debited atomically BEFORE the
   * on-chain send (guarded so it can't double-spend), and a broadcast-but-unconfirmed
   * transfer is never auto-refunded (would risk double-paying if it actually landed).
   */
  static async approveAndExecute(requestId: string) {
    const request = await prisma.creatorWithdrawalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundError("Withdrawal request not found");
    if (request.status !== "PENDING") throw new BadRequestError(`Request is already ${request.status}`);
    if (!request.address) throw new BadRequestError("Withdrawal request has no destination address");

    const amount = Number(request.amount);

    // Step 1: reserve balance atomically
    const reserved = await prisma.creatorWallet.updateMany({
      where: { creatorId: request.creatorId, usdcBalance: { gte: amount } },
      data: { usdcBalance: { decrement: amount } },
    });
    if (reserved.count === 0) {
      throw new InsufficientBalanceError("Creator wallet balance is insufficient for this withdrawal");
    }
    await prisma.creatorWithdrawalRequest.update({
      where: { id: requestId },
      data: { status: "PROCESSING" },
    });

    // Step 2: execute on-chain transfer
    let txHash: string;
    try {
      txHash = await BlockchainService.sendUsdcTransfer(request.address, amount);
    } catch (err: any) {
      if (err?.unconfirmed && err?.signature) {
        await prisma.creatorWithdrawalRequest.update({
          where: { id: requestId },
          data: { status: "PROCESSING", txHash: err.signature },
        });
        const alert = `Creator withdrawal BROADCAST but UNCONFIRMED — NOT refunded.\nrequestId=${requestId}\ncreatorId=${request.creatorId}\namount=${amount}\ntxHash=${err.signature}`;
        console.error("[CRITICAL]", alert);
        EmailService.sendCriticalAlert("Creator withdrawal unconfirmed — verify on-chain before refunding", alert).catch(() => {});
        throw new BadRequestError("Withdrawal submitted and still confirming — do not retry, it will be reconciled manually if needed.");
      }
      console.error("[CreatorWithdrawalService] On-chain transfer failed — refunding:", err);
      await prisma.creatorWallet.update({
        where: { creatorId: request.creatorId },
        data: { usdcBalance: { increment: amount } },
      });
      await prisma.creatorWithdrawalRequest.update({
        where: { id: requestId },
        data: { status: "FAILED" },
      });
      throw new BadRequestError("On-chain transfer failed. Creator balance has been restored.");
    }

    // Step 3: mark completed + log a Transaction against the creator's own User row
    const creator = await prisma.creator.findUnique({ where: { id: request.creatorId } });
    const updated = await prisma.creatorWithdrawalRequest.update({
      where: { id: requestId },
      data: { status: "COMPLETED", txHash, processedAt: new Date() },
    });
    if (creator) {
      await prisma.transaction.create({
        data: {
          userId: creator.userId,
          type: "POOL_WITHDRAWAL",
          amount,
          currency: "USDC",
          status: "COMPLETED",
          txHash,
          description: `Creator wallet withdrawal of $${amount} USDC`,
        },
      });
    }

    return updated;
  }
}

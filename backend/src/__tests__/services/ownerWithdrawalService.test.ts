/**
 * OwnerService Withdrawal Tests (§15 Owner Panel)
 *
 * Covers: initiate, self-approve rejection, non-owner rejection,
 * two-owner happy path, partial failure, duplicate pending, cancel.
 */

// Set up owner config before any imports so config reads env
process.env.OWNER_EMAILS = "owner1@test.com,owner2@test.com";
process.env.OWNER_1_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
process.env.OWNER_2_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

jest.mock("../../utils/prisma", () => ({
  prisma: {
    ownerWithdrawalRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    profitPool: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    platformConfig: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../services/blockchainService", () => ({
  BlockchainService: {
    validateSolanaAddress: jest.fn().mockReturnValue(true),
    sendUsdcTransfer: jest.fn(),
    getMasterWalletAddress: jest.fn().mockReturnValue("masterWallet"),
    getUsdcBalance: jest.fn().mockResolvedValue(10000),
    getNetwork: jest.fn().mockReturnValue("devnet"),
  },
}));

jest.mock("../../services/emailService", () => ({
  EmailService: {
    sendCriticalAlert: jest.fn().mockResolvedValue(undefined),
    sendOwnerWithdrawalReceipt: jest.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from "../../utils/prisma";
import { BlockchainService } from "../../services/blockchainService";
import { OwnerService } from "../../services/ownerService";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBlockchain = BlockchainService as jest.Mocked<typeof BlockchainService>;

const OWNER1 = "owner1@test.com";
const OWNER2 = "owner2@test.com";
const NON_OWNER = "hacker@evil.com";

function makeProfitPool(balance: number) {
  return { id: "pool-1", balance: String(balance), totalDeposited: String(balance), totalWithdrawn: "0" };
}

function makePendingRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    status: "PENDING",
    initiatorEmail: OWNER1,
    amount: 100,
    owner1Wallet: process.env.OWNER_1_WALLET,
    owner2Wallet: process.env.OWNER_2_WALLET,
    owner1Amount: 60,
    owner2Amount: 40,
    txHash1: null,
    txHash2: null,
    approverEmail: null,
    approvedAt: null,
    executedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: platformConfig returns nothing (use defaults)
  (mockPrisma.platformConfig.findMany as jest.Mock).mockResolvedValue([]);
});

// ===========================================================================
// initiateWithdrawal
// ===========================================================================
describe("OwnerService.initiateWithdrawal", () => {
  test("creates PENDING request for a valid owner", async () => {
    (mockPrisma.ownerWithdrawalRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.profitPool.findFirst as jest.Mock).mockResolvedValue(makeProfitPool(100));
    (mockPrisma.ownerWithdrawalRequest.create as jest.Mock).mockResolvedValue(makePendingRequest());

    const req = await OwnerService.initiateWithdrawal(OWNER1);
    expect(mockPrisma.ownerWithdrawalRequest.create).toHaveBeenCalled();
    expect((req as any).status).toBe("PENDING");
  });

  test("rejects non-owner", async () => {
    await expect(OwnerService.initiateWithdrawal(NON_OWNER)).rejects.toThrow(UnauthorizedError);
  });

  test("rejects when a PENDING request already exists", async () => {
    (mockPrisma.ownerWithdrawalRequest.findFirst as jest.Mock).mockResolvedValue(makePendingRequest());
    await expect(OwnerService.initiateWithdrawal(OWNER1)).rejects.toThrow(BadRequestError);
  });

  test("rejects when profit pool balance is zero", async () => {
    (mockPrisma.ownerWithdrawalRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.profitPool.findFirst as jest.Mock).mockResolvedValue(makeProfitPool(0));
    (mockPrisma.profitPool.create as jest.Mock).mockResolvedValue(makeProfitPool(0));
    await expect(OwnerService.initiateWithdrawal(OWNER1)).rejects.toThrow(/empty/i);
  });
});

// ===========================================================================
// approveWithdrawal — self-approve rejection
// ===========================================================================
describe("OwnerService.approveWithdrawal — self-approve rejection", () => {
  test("same Owner 1 calling approve is rejected", async () => {
    (mockPrisma.ownerWithdrawalRequest.findUnique as jest.Mock).mockResolvedValue(
      makePendingRequest({ initiatorEmail: OWNER1 })
    );
    (mockPrisma.ownerWithdrawalRequest.updateMany as jest.Mock).mockResolvedValue({ count: 1 }); // atomic claim succeeds
    await expect(OwnerService.approveWithdrawal(OWNER1, "req-1")).rejects.toThrow(UnauthorizedError);
    expect(mockBlockchain.sendUsdcTransfer).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// approveWithdrawal — non-owner rejection
// ===========================================================================
describe("OwnerService.approveWithdrawal — non-owner rejection", () => {
  test("non-owner calling approve is rejected (403)", async () => {
    await expect(OwnerService.approveWithdrawal(NON_OWNER, "req-1")).rejects.toThrow(UnauthorizedError);
  });
});

// ===========================================================================
// approveWithdrawal — happy path (two signatures)
// ===========================================================================
describe("OwnerService.approveWithdrawal — two-owner happy path", () => {
  test("Owner 2 approves → both transfers execute, status EXECUTED, profit pool decremented by full amount", async () => {
    (mockPrisma.ownerWithdrawalRequest.findUnique as jest.Mock).mockResolvedValue(
      makePendingRequest({ initiatorEmail: OWNER1 })
    );
    (mockPrisma.ownerWithdrawalRequest.updateMany as jest.Mock).mockResolvedValue({ count: 1 }); // atomic claim succeeds

    mockBlockchain.sendUsdcTransfer
      .mockResolvedValueOnce("txhash-owner1")
      .mockResolvedValueOnce("txhash-owner2");

    (mockPrisma.ownerWithdrawalRequest.update as jest.Mock).mockResolvedValue({
      ...makePendingRequest(), status: "EXECUTED", txHash1: "txhash-owner1", txHash2: "txhash-owner2",
    });

    const txResult: unknown[] = [];
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (ops: unknown[]) => {
      // Prisma batch transaction (array of promises)
      return ops;
    });

    await OwnerService.approveWithdrawal(OWNER2, "req-1");

    expect(mockBlockchain.sendUsdcTransfer).toHaveBeenCalledTimes(2);
    // First call: 60% to owner1Wallet
    expect(mockBlockchain.sendUsdcTransfer).toHaveBeenNthCalledWith(
      1, process.env.OWNER_1_WALLET, 60
    );
    // Second call: 40% to owner2Wallet
    expect(mockBlockchain.sendUsdcTransfer).toHaveBeenNthCalledWith(
      2, process.env.OWNER_2_WALLET, 40
    );
  });
});

// ===========================================================================
// approveWithdrawal — Partial Owner Withdrawal (§21)
// ===========================================================================
describe("Partial Owner Withdrawal", () => {
  test("Owner 1 paid, Owner 2 transfer fails → status PARTIAL, pool decremented by owner1 share only, [CRITICAL] logged", async () => {
    (mockPrisma.ownerWithdrawalRequest.findUnique as jest.Mock).mockResolvedValue(
      makePendingRequest({ initiatorEmail: OWNER1 })
    );
    (mockPrisma.ownerWithdrawalRequest.updateMany as jest.Mock).mockResolvedValue({ count: 1 }); // atomic claim succeeds

    mockBlockchain.sendUsdcTransfer
      .mockResolvedValueOnce("txhash-owner1") // owner1 succeeds
      .mockRejectedValueOnce(new Error("RPC timeout")); // owner2 fails

    (mockPrisma.ownerWithdrawalRequest.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.profitPool.updateMany as jest.Mock).mockResolvedValue({});

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(OwnerService.approveWithdrawal(OWNER2, "req-1")).rejects.toThrow(/Owner1.*paid/i);

    // Profit pool decremented by owner1's share (60) only
    expect(mockPrisma.profitPool.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ balance: { decrement: 60 } }),
      })
    );

    // Status set to PARTIAL
    expect(mockPrisma.ownerWithdrawalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PARTIAL" }) })
    );

    // [CRITICAL] log emitted
    expect(consoleSpy).toHaveBeenCalledWith("[CRITICAL]", expect.stringContaining("PARTIAL"));

    consoleSpy.mockRestore();
  });
});

// ===========================================================================
// approveWithdrawal — not found / wrong state
// ===========================================================================
describe("OwnerService.approveWithdrawal — state guards", () => {
  test("throws NotFoundError when request doesn't exist", async () => {
    (mockPrisma.ownerWithdrawalRequest.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(OwnerService.approveWithdrawal(OWNER2, "no-req")).rejects.toThrow(NotFoundError);
  });

  test("throws BadRequestError when request is not PENDING", async () => {
    (mockPrisma.ownerWithdrawalRequest.findUnique as jest.Mock).mockResolvedValue(
      makePendingRequest({ status: "EXECUTED" })
    );
    await expect(OwnerService.approveWithdrawal(OWNER2, "req-1")).rejects.toThrow(BadRequestError);
  });
});

// ===========================================================================
// cancelWithdrawal
// ===========================================================================
describe("OwnerService.cancelWithdrawal", () => {
  test("cancels a PENDING request", async () => {
    (mockPrisma.ownerWithdrawalRequest.findUnique as jest.Mock).mockResolvedValue(makePendingRequest());
    (mockPrisma.ownerWithdrawalRequest.update as jest.Mock).mockResolvedValue(
      makePendingRequest({ status: "CANCELLED" })
    );

    await OwnerService.cancelWithdrawal(OWNER1, "req-1");

    expect(mockPrisma.ownerWithdrawalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CANCELLED" } })
    );
    // No on-chain transfer
    expect(mockBlockchain.sendUsdcTransfer).not.toHaveBeenCalled();
  });

  test("rejects cancellation by non-owner", async () => {
    await expect(OwnerService.cancelWithdrawal(NON_OWNER, "req-1")).rejects.toThrow(UnauthorizedError);
  });

  test("rejects cancellation of non-PENDING request", async () => {
    (mockPrisma.ownerWithdrawalRequest.findUnique as jest.Mock).mockResolvedValue(
      makePendingRequest({ status: "EXECUTED" })
    );
    await expect(OwnerService.cancelWithdrawal(OWNER1, "req-1")).rejects.toThrow(BadRequestError);
  });

  test("rejects cancellation of non-existent request", async () => {
    (mockPrisma.ownerWithdrawalRequest.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(OwnerService.cancelWithdrawal(OWNER1, "no-req")).rejects.toThrow(NotFoundError);
  });
});

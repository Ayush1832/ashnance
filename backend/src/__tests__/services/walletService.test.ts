/**
 * WalletService Tests (§5.2, §5.3, §5.16)
 *
 * Tests deposit idempotency, withdrawal race conditions, and ASH claim.
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    wallet: { findUnique: jest.fn(), update: jest.fn() },
    transaction: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    whitelistedAddress: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
  },
}));

jest.mock("../../services/blockchainService", () => ({
  BlockchainService: {
    verifyDepositTransaction: jest.fn(),
    sendUsdcTransfer: jest.fn(),
    sendAshTransfer: jest.fn(),
    validateSolanaAddress: jest.fn().mockReturnValue(true),
  },
}));

jest.mock("../../services/emailService", () => ({
  EmailService: {
    verifyOtp: jest.fn(),
  },
}));

import speakeasy from "speakeasy";
import { prisma } from "../../utils/prisma";
import { WalletService } from "../../services/walletService";
import { BlockchainService } from "../../services/blockchainService";
import { BadRequestError, InsufficientBalanceError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBlockchain = BlockchainService as jest.Mocked<typeof BlockchainService>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---- Deposit Tests ----

describe("WalletService.verifyAndProcessDeposit", () => {
  test("rejects when on-chain verification fails", async () => {
    mockBlockchain.verifyDepositTransaction.mockResolvedValue(null);
    await expect(WalletService.verifyAndProcessDeposit("user-1", "fakehash")).rejects.toThrow(BadRequestError);
  });

  test("rejects when amount < 1 USDC", async () => {
    mockBlockchain.verifyDepositTransaction.mockResolvedValue({ amount: 0.5 });
    await expect(WalletService.verifyAndProcessDeposit("user-1", "fakehash")).rejects.toThrow(BadRequestError);
  });

  test("credits balance on valid deposit", async () => {
    mockBlockchain.verifyDepositTransaction.mockResolvedValue({ amount: 50 });

    let walletUpdated = false;
    let txCreated = false;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          update: jest.fn().mockImplementation(() => {
            walletUpdated = true;
            return { usdcBalance: "1050" };
          }),
        },
        transaction: {
          create: jest.fn().mockImplementation(() => {
            txCreated = true;
            return { id: "tx-1" };
          }),
        },
      };
      return fn(tx);
    });

    const result = await WalletService.verifyAndProcessDeposit("user-1", "validhash");

    expect(walletUpdated).toBe(true);
    expect(txCreated).toBe(true);
    expect(result.amount).toBe(50);
  });

  test("rejects duplicate txHash via P2002 (DB unique constraint)", async () => {
    mockBlockchain.verifyDepositTransaction.mockResolvedValue({ amount: 50 });

    (mockPrisma.$transaction as jest.Mock).mockRejectedValue({ code: "P2002" });

    await expect(WalletService.verifyAndProcessDeposit("user-1", "duplicatehash")).rejects.toThrow(
      "Transaction already processed"
    );
  });

  test("concurrent deposits with same txHash: second gets P2002 error", async () => {
    mockBlockchain.verifyDepositTransaction.mockResolvedValue({ amount: 50 });

    let callCount = 0;
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      callCount++;
      if (callCount === 1) {
        // First call succeeds
        const tx = {
          wallet: { update: jest.fn().mockResolvedValue({ usdcBalance: "1050" }) },
          transaction: { create: jest.fn().mockResolvedValue({ id: "tx-1" }) },
        };
        return fn(tx);
      } else {
        // Second call gets unique constraint violation
        throw { code: "P2002" };
      }
    });

    const [r1, r2] = await Promise.allSettled([
      WalletService.verifyAndProcessDeposit("user-1", "samehash"),
      WalletService.verifyAndProcessDeposit("user-1", "samehash"),
    ]);

    expect(r1.status).toBe("fulfilled");
    expect(r2.status).toBe("rejected");
    if (r2.status === "rejected") {
      expect((r2.reason as BadRequestError).message).toContain("already processed");
    }
  });
});

// ---- Withdrawal Tests ----

describe("WalletService.processWithdrawal", () => {
  function mockUserWith2FA(twoFaSecret: string) {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      twoFaEnabled: true,
      twoFaSecret,
      failedAttempts: 0,
      lockedUntil: null,
      wallet: { id: "wallet-1", usdcBalance: "100" },
      whitelistAddrs: [],
    });
  }

  function mockWhitelistedAddress(cooldownPassed = true) {
    const createdAt = cooldownPassed
      ? new Date(Date.now() - 25 * 60 * 60 * 1000) // 25h ago
      : new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago
    // walletService uses user.whitelistAddrs (from include), not a separate findFirst query
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      twoFaEnabled: true,
      twoFaSecret: "JBSWY3DPEHPK3PXP",
      failedAttempts: 0,
      lockedUntil: null,
      wallet: { id: "wallet-1", usdcBalance: "100" },
      whitelistAddrs: [{
        id: "addr-1",
        address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        isVerified: true,
        createdAt,
      }],
    });
  }

  function validTotp(secret: string) {
    return speakeasy.totp({ secret, encoding: "base32" });
  }

  test("rejects when 2FA not enabled", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      twoFaEnabled: false,
      twoFaSecret: null,
      failedAttempts: 0,
      lockedUntil: null,
    });

    await expect(
      WalletService.processWithdrawal("user-1", 10, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", "123456")
    ).rejects.toThrow();
  });

  test("rejects when address not whitelisted", async () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    mockUserWith2FA(secret.base32);
    (mockPrisma.whitelistedAddress.findFirst as jest.Mock).mockResolvedValue(null);

    const code = validTotp(secret.base32);
    await expect(
      WalletService.processWithdrawal("user-1", 10, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", code)
    ).rejects.toThrow();
  });

  test("rejects when address in 24h cooldown", async () => {
    mockWhitelistedAddress(false); // cooldown not passed — mockWhitelistedAddress sets its own secret
    const code = speakeasy.totp({ secret: "JBSWY3DPEHPK3PXP", encoding: "base32" });
    await expect(
      WalletService.processWithdrawal("user-1", 10, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", code)
    ).rejects.toThrow(/cooldown/i);
  });

  test("rejects when balance insufficient (atomic reserve fails)", async () => {
    mockWhitelistedAddress(true);
    const code = speakeasy.totp({ secret: "JBSWY3DPEHPK3PXP", encoding: "base32" });

    // Reservation transaction reveals insufficient balance
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "5" }), // only $5, need $10
          update: jest.fn(),
        },
        transaction: { create: jest.fn() },
      };
      return fn(tx);
    });

    await expect(
      WalletService.processWithdrawal("user-1", 10, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", code)
    ).rejects.toThrow(InsufficientBalanceError);
  });

  test("refunds balance if on-chain transfer fails", async () => {
    mockWhitelistedAddress(true);
    const code = speakeasy.totp({ secret: "JBSWY3DPEHPK3PXP", encoding: "base32" });

    // Step 1: reservation succeeds
    (mockPrisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "100" }),
          update: jest.fn().mockResolvedValue({ usdcBalance: "90" }),
        },
        transaction: { create: jest.fn().mockResolvedValue({ id: "tx-pending" }) },
      };
      return fn(tx);
    });

    // Step 2: on-chain fails
    mockBlockchain.sendUsdcTransfer.mockRejectedValue(new Error("RPC error"));

    // Refund update + failed tx update
    (mockPrisma.wallet.update as jest.Mock).mockResolvedValue({ usdcBalance: "100" });
    (mockPrisma.transaction.update as jest.Mock).mockResolvedValue({});

    await expect(
      WalletService.processWithdrawal("user-1", 10, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", code)
    ).rejects.toThrow(/failed/i);

    // Confirm refund was called
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usdcBalance: { increment: 10 } }) })
    );
  });
});

// ---- ASH Claim Tests ----

describe("WalletService.claimAsh", () => {
  test("rejects invalid Solana address", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValue(false);
    await expect(WalletService.claimAsh("user-1", "invalid")).rejects.toThrow(BadRequestError);
  });

  test("rejects when ASH balance is zero", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValue(true);

    // Simulate a real-style transaction that runs the callback
    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ ashBalance: "0" }),
            update: jest.fn(),
          },
        };
        // Let any thrown error from fn propagate
        return await fn(tx);
      }
    );

    await expect(
      WalletService.claimAsh("user-1", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM")
    ).rejects.toThrow(/No ASH balance/);
  });

  test("restores ASH balance if on-chain transfer fails", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValue(true);
    mockBlockchain.sendAshTransfer.mockRejectedValue(new Error("RPC error"));

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ ashBalance: "5000" }),
          update: jest.fn().mockResolvedValue({ ashBalance: "0" }),
        },
      };
      return fn(tx);
    });

    (mockPrisma.wallet.update as jest.Mock).mockResolvedValue({ ashBalance: "5000" });

    await expect(
      WalletService.claimAsh("user-1", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM")
    ).rejects.toThrow("Balance restored");

    // Verify refund was called
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ashBalance: { increment: 5000 } }) })
    );
  });

  test("returns claimed amount and txHash on success", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValue(true);
    mockBlockchain.sendAshTransfer.mockResolvedValue("tx-abc123");

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ ashBalance: "5000" }),
          update: jest.fn().mockResolvedValue({ ashBalance: "0" }),
        },
      };
      return fn(tx);
    });

    (mockPrisma.transaction.create as jest.Mock).mockResolvedValue({});

    const result = await WalletService.claimAsh("user-1", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");

    expect(result.claimed).toBe(5000);
    expect(result.txHash).toBe("tx-abc123");
    expect(result.newBalance).toBe(0);
  });
});

/**
 * WalletService — Additional coverage tests
 * Targets uncovered lines:
 *   20-35  getWallet (including lazy deposit address backfill)
 *   91-122 processDeposit (legacy)
 *   149    withdrawal — address not whitelisted
 *   160-175 2FA lockout after 3 failures
 *   228    withdrawal refund on on-chain failure
 *   247-266 withdrawal step-3 DB failure [CRITICAL] log
 *   303    claimAsh — wallet not found (thrown from inner tx)
 *   338-405 whitelist + transaction history helpers
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    wallet: { findUnique: jest.fn(), update: jest.fn() },
    transaction: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    whitelistedAddress: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
  },
}));

jest.mock("../../services/blockchainService", () => ({
  BlockchainService: {
    verifyDepositTransaction: jest.fn(),
    sendUsdcTransfer: jest.fn(),
    sendAshTransfer: jest.fn(),
    validateSolanaAddress: jest.fn().mockReturnValue(true),
    generateDepositAddress: jest.fn().mockResolvedValue("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"),
  },
}));

jest.mock("../../services/emailService", () => ({
  EmailService: {
    verifyOtp: jest.fn(),
    sendCriticalAlert: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../services/depositMonitorService", () => ({
  watchDepositAddress: jest.fn(),
}));

import speakeasy from "speakeasy";
import { prisma } from "../../utils/prisma";
import { WalletService } from "../../services/walletService";
import { BlockchainService } from "../../services/blockchainService";
import { EmailService } from "../../services/emailService";
import { BadRequestError, NotFoundError, ConflictError, InsufficientBalanceError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBlockchain = BlockchainService as jest.Mocked<typeof BlockchainService>;
const mockEmail = EmailService as jest.Mocked<typeof EmailService>;

const ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const SECRET = "JBSWY3DPEHPK3PXP";

function validTotp() {
  return speakeasy.totp({ secret: SECRET, encoding: "base32" });
}

function mockWhitelistedUser(cooldownPassed = true) {
  // New code checks activatesAt field (not createdAt + COOLDOWN_MS)
  const activatesAt = cooldownPassed
    ? null // null = no pending cooldown (passed or devnet)
    : new Date(Date.now() + 23 * 60 * 60 * 1000); // 23h remaining

  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
    id: "user-1",
    twoFaEnabled: true,
    twoFaSecret: SECRET,
    failedAttempts: 0,
    lockedUntil: null,
    wallet: { id: "wallet-1", usdcBalance: "100" },
    whitelistAddrs: [{
      id: "addr-1",
      address: ADDRESS,
      isVerified: true,
      activatesAt,
    }],
  });
}

beforeEach(() => jest.clearAllMocks());

// ===========================================================================
// getWallet — lazy deposit address backfill (covers lines 20-35)
// ===========================================================================
describe("WalletService.getWallet", () => {
  test("returns existing wallet details", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      usdcBalance: "50",
      ashBalance: "5000",
      cumulativeWeight: "12.5",
      depositAddress: ADDRESS,
    });

    const result = await WalletService.getWallet("user-1");
    expect(result.usdcBalance).toBe("50");
    expect(result.depositAddress).toBe(ADDRESS);
  });

  test("throws NotFoundError when wallet not found", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(WalletService.getWallet("user-404")).rejects.toThrow(NotFoundError);
  });

  test("does NOT generate a deposit address when missing (on-demand deposit model)", async () => {
    // Deposits are now made by connecting a wallet and sending USDC directly to
    // the master wallet — no per-user deposit address is generated or monitored.
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      usdcBalance: "0",
      ashBalance: "0",
      cumulativeWeight: "0",
      depositAddress: null,
    });

    const result = await WalletService.getWallet("user-1");

    expect(mockBlockchain.generateDepositAddress).not.toHaveBeenCalled();
    expect(mockPrisma.wallet.update).not.toHaveBeenCalled();
    expect(result.depositAddress).toBeNull();
  });
});

// ===========================================================================
// processDeposit — legacy (covers lines 91-122)
// ===========================================================================
describe("WalletService.processDeposit (legacy)", () => {
  test("rejects amount < 1 USDC", async () => {
    await expect(
      (WalletService as any).processDeposit("user-1", 0.5, "hash-1")
    ).rejects.toThrow(BadRequestError);
  });

  test("rejects duplicate txHash", async () => {
    const p2002 = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(p2002);
    await expect(
      (WalletService as any).processDeposit("user-1", 10, "dup-hash")
    ).rejects.toThrow("already processed");
  });

  test("credits balance on first-time deposit", async () => {
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: { update: jest.fn().mockResolvedValue({ usdcBalance: "110" }) },
        transaction: { create: jest.fn().mockResolvedValue({ id: "tx-new" }) },
      };
      return fn(tx);
    });

    const result = await (WalletService as any).processDeposit("user-1", 10, "new-hash");
    expect(result.transactionId).toBe("tx-new");
  });
});

// ===========================================================================
// processWithdrawal — address not whitelisted (covers line ~149)
// ===========================================================================
describe("WalletService.processWithdrawal — whitelist check", () => {
  test("rejects when address not in user's whitelist", async () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      twoFaEnabled: true,
      twoFaSecret: secret.base32,
      failedAttempts: 0,
      lockedUntil: null,
      wallet: { id: "wallet-1", usdcBalance: "100" },
      whitelistAddrs: [], // empty — not whitelisted
    });

    const code = speakeasy.totp({ secret: secret.base32, encoding: "base32" });
    await expect(
      WalletService.processWithdrawal("user-1", 10, ADDRESS, code)
    ).rejects.toThrow(/not whitelisted/i);
  });
});

// ===========================================================================
// processWithdrawal — 2FA failure + lockout (covers lines 160-175)
// ===========================================================================
describe("WalletService.processWithdrawal — 2FA failure & lockout", () => {
  test("increments failedAttempts on wrong 2FA code", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      twoFaEnabled: true,
      twoFaSecret: SECRET,
      failedAttempts: 0,
      lockedUntil: null,
      wallet: { id: "wallet-1", usdcBalance: "100" },
      whitelistAddrs: [{ address: ADDRESS, isVerified: true, createdAt: new Date(Date.now() - 25 * 3600_000) }],
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    await expect(
      WalletService.processWithdrawal("user-1", 10, ADDRESS, "000000")
    ).rejects.toThrow(/Invalid 2FA/i);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failedAttempts: 1 }) })
    );
  });

  test("locks account after 3 failed 2FA attempts", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      twoFaEnabled: true,
      twoFaSecret: SECRET,
      failedAttempts: 2, // already 2 failures
      lockedUntil: null,
      wallet: { id: "wallet-1", usdcBalance: "100" },
      whitelistAddrs: [{ address: ADDRESS, isVerified: true, createdAt: new Date(Date.now() - 25 * 3600_000) }],
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    await expect(
      WalletService.processWithdrawal("user-1", 10, ADDRESS, "000000")
    ).rejects.toThrow();

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedAttempts: 3,
          lockedUntil: expect.any(Date),
        }),
      })
    );
  });
});

// ===========================================================================
// processWithdrawal — step 3 DB failure after on-chain success (covers 247-266)
// DB Failure After On-Chain Withdrawal (§21)
// ===========================================================================
describe("DB Failure After On-Chain Withdrawal", () => {
  test("DB update fails after on-chain success: [CRITICAL] log emitted, returns txHash anyway", async () => {
    mockWhitelistedUser(true);

    // Step 1: reservation succeeds
    (mockPrisma.$transaction as jest.Mock)
      .mockImplementationOnce(async (fn: any) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ usdcBalance: "100" }),
            update: jest.fn().mockResolvedValue({ usdcBalance: "90" }),
          },
          transaction: { create: jest.fn().mockResolvedValue({ id: "pending-tx" }) },
        };
        return fn(tx);
      })
      // Step 3: DB update fails after on-chain success
      .mockImplementationOnce(async () => {
        throw new Error("DB connection lost after transfer");
      });

    // Step 2: on-chain succeeds
    mockBlockchain.sendUsdcTransfer.mockResolvedValue("real-txhash-abc");

    // Step 3 final wallet read
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ usdcBalance: "90" });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const code = validTotp();
    const result = await WalletService.processWithdrawal("user-1", 10, ADDRESS, code);

    // Despite DB failure, txHash is returned (on-chain was successful)
    expect(result.txHash).toBe("real-txhash-abc");

    // [CRITICAL] must have been logged
    expect(consoleSpy).toHaveBeenCalledWith("[CRITICAL]", expect.stringContaining("real-txhash-abc"));

    // Critical alert email sent
    expect(mockEmail.sendCriticalAlert).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ===========================================================================
// claimAsh — wallet not found inside tx (covers line ~303)
// ===========================================================================
describe("WalletService.claimAsh — wallet not found", () => {
  test("throws NotFoundError when wallet not found in the reserve transaction", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValue(true);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null), // wallet not found
          update: jest.fn(),
        },
      };
      return await fn(tx);
    });

    await expect(
      WalletService.claimAsh("user-1", ADDRESS)
    ).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// getWhitelistedAddresses (covers lines ~338-345)
// ===========================================================================
describe("WalletService.getWhitelistedAddresses", () => {
  test("returns list of whitelisted addresses", async () => {
    (mockPrisma.whitelistedAddress.findMany as jest.Mock).mockResolvedValue([
      { id: "addr-1", address: ADDRESS, label: "My Wallet", isVerified: true },
    ]);

    const result = await WalletService.getWhitelistedAddresses("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(ADDRESS);
  });
});

// ===========================================================================
// addWhitelistedAddress (covers lines ~348-365)
// ===========================================================================
describe("WalletService.addWhitelistedAddress", () => {
  test("rejects invalid Solana address", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValueOnce(false);
    await expect(
      WalletService.addWhitelistedAddress("user-1", "not-a-solana-address")
    ).rejects.toThrow(BadRequestError);
  });

  test("rejects duplicate whitelist address", async () => {
    (mockPrisma.whitelistedAddress.findFirst as jest.Mock).mockResolvedValue({ id: "existing" });
    await expect(
      WalletService.addWhitelistedAddress("user-1", ADDRESS)
    ).rejects.toThrow(ConflictError);
  });

  test("creates new whitelist entry", async () => {
    (mockPrisma.whitelistedAddress.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.whitelistedAddress.create as jest.Mock).mockResolvedValue({
      id: "new-addr",
      address: ADDRESS,
      isVerified: true,
    });

    const result = await WalletService.addWhitelistedAddress("user-1", ADDRESS, "My Wallet");
    expect(result.isVerified).toBe(true);
  });
});

// ===========================================================================
// removeWhitelistedAddress (covers lines ~368-378)
// ===========================================================================
describe("WalletService.removeWhitelistedAddress", () => {
  test("deletes the whitelist entry", async () => {
    (mockPrisma.whitelistedAddress.findFirst as jest.Mock).mockResolvedValue({
      id: "addr-1",
      address: ADDRESS,
    });
    (mockPrisma.whitelistedAddress.delete as jest.Mock).mockResolvedValue({});

    await WalletService.removeWhitelistedAddress("user-1", "addr-1");
    expect(mockPrisma.whitelistedAddress.delete).toHaveBeenCalledWith({ where: { id: "addr-1" } });
  });

  test("throws NotFoundError when address doesn't belong to user", async () => {
    (mockPrisma.whitelistedAddress.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      WalletService.removeWhitelistedAddress("user-1", "not-my-addr")
    ).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// getTransactions (covers lines ~382-409)
// ===========================================================================
describe("WalletService.getTransactions", () => {
  test("returns paginated transactions", async () => {
    (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
      { id: "tx-1", type: "BURN", amount: 10 },
      { id: "tx-2", type: "DEPOSIT", amount: 50 },
    ]);
    (mockPrisma.transaction.count as jest.Mock).mockResolvedValue(2);

    const result = await WalletService.getTransactions("user-1");
    expect(result.transactions).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  test("filters by type when provided", async () => {
    (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
      { id: "tx-1", type: "BURN", amount: 10 },
    ]);
    (mockPrisma.transaction.count as jest.Mock).mockResolvedValue(1);

    const result = await WalletService.getTransactions("user-1", { type: "BURN" });
    expect(result.transactions).toHaveLength(1);
    // The where clause should have included the type filter
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: "BURN" }) })
    );
  });
});

// ===========================================================================
// processWithdrawal — 2FA not enabled (line 149)
// ===========================================================================
describe("WalletService.processWithdrawal — 2FA not enabled", () => {
  test("throws BadRequestError when twoFaEnabled is false", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      twoFaEnabled: false,
      twoFaSecret: null,
      failedAttempts: 0,
      lockedUntil: null,
      wallet: { id: "wallet-1", usdcBalance: "100" },
      whitelistAddrs: [{ address: ADDRESS, isVerified: true, createdAt: new Date(Date.now() - 25 * 3600_000) }],
    });

    await expect(
      WalletService.processWithdrawal("user-1", 10, ADDRESS, "000000")
    ).rejects.toThrow(/2FA must be enabled/i);
  });
});

// ===========================================================================
// processWithdrawal — min amount < 10 (line 134)
// ===========================================================================
describe("WalletService.processWithdrawal — min amount", () => {
  test("throws BadRequestError when withdrawal amount is below $10", async () => {
    await expect(
      WalletService.processWithdrawal("user-1", 5, ADDRESS, "000000")
    ).rejects.toThrow(/Minimum withdrawal/i);
  });
});

// ===========================================================================
// processWithdrawal — cooldown with exactly 1 hour remaining (line 191 singular "hour")
// ===========================================================================
describe("WalletService.processWithdrawal — whitelist cooldown singular hour", () => {
  test("error message uses singular 'hour' when ~1 hour of cooldown remains", async () => {
    // activatesAt = 30min from now → ceil(0.5h) = 1 hour remaining → singular "hour"
    const activatesAt = new Date(Date.now() + 30 * 60 * 1000);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      twoFaEnabled: true,
      twoFaSecret: SECRET,
      failedAttempts: 0,
      lockedUntil: null,
      wallet: { id: "wallet-1", usdcBalance: "100" },
      whitelistAddrs: [{
        id: "addr-1",
        address: ADDRESS,
        isVerified: true,
        activatesAt,
      }],
    });

    const code = validTotp();
    const err = await WalletService.processWithdrawal("user-1", 10, ADDRESS, code).catch((e) => e);
    expect(err.message).toMatch(/1 hour[^s]/); // singular "hour" not "hours"
  });
});

// ===========================================================================
// processWithdrawal — finalWallet null (line 267 ?? 0 right side)
// ===========================================================================
describe("WalletService.processWithdrawal — finalWallet null after step-3", () => {
  test("returns newBalance=0 when final wallet findUnique returns null", async () => {
    mockWhitelistedUser(true);

    (mockPrisma.$transaction as jest.Mock)
      .mockImplementationOnce(async (fn: any) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ usdcBalance: "100" }),
            update: jest.fn().mockResolvedValue({ usdcBalance: "90" }),
          },
          transaction: { create: jest.fn().mockResolvedValue({ id: "pending-tx" }) },
        };
        return fn(tx);
      })
      .mockImplementationOnce(async (fn: any) => {
        const tx = {
          transaction: { update: jest.fn().mockResolvedValue({ id: "pending-tx", status: "COMPLETED" }) },
          user: { update: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

    mockBlockchain.sendUsdcTransfer.mockResolvedValue("txhash-final");
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null); // finalWallet is null → ?? 0

    const code = validTotp();
    const result = await WalletService.processWithdrawal("user-1", 10, ADDRESS, code);
    expect(result.newBalance).toBe(0); // ?? 0 right side hit
  });
});

// ===========================================================================
// addWhitelistedAddress — no label (line 361 label || null)
// ===========================================================================
describe("WalletService.addWhitelistedAddress — no label", () => {
  test("stores null label when no label provided", async () => {
    (mockPrisma.whitelistedAddress.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.whitelistedAddress.create as jest.Mock).mockResolvedValue({
      id: "addr-new",
      address: ADDRESS,
      isVerified: true,
      label: null,
    });

    const result = await WalletService.addWhitelistedAddress("user-1", ADDRESS);
    expect(mockPrisma.whitelistedAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ label: null }) })
    );
  });
});

// ===========================================================================
// processWithdrawal — sendCriticalAlert rejects (covers .catch(() => {}) at line 261)
// ===========================================================================
describe("WalletService.processWithdrawal — critical alert email failure swallowed", () => {
  test("swallows sendCriticalAlert rejection via .catch(() => {})", async () => {
    mockWhitelistedUser(true);

    (mockPrisma.$transaction as jest.Mock)
      .mockImplementationOnce(async (fn: any) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ usdcBalance: "100" }),
            update: jest.fn().mockResolvedValue({ usdcBalance: "90" }),
          },
          transaction: { create: jest.fn().mockResolvedValue({ id: "pending-tx" }) },
        };
        return fn(tx);
      })
      .mockImplementationOnce(async () => {
        throw new Error("DB connection lost");
      });

    mockBlockchain.sendUsdcTransfer.mockResolvedValue("txhash-email-fail");
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ usdcBalance: "90" });

    // sendCriticalAlert REJECTS — the .catch(() => {}) at line 261 must swallow it
    mockEmail.sendCriticalAlert.mockRejectedValueOnce(new Error("SMTP down"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const code = validTotp();
    // Should NOT throw even though alert email fails
    const result = await WalletService.processWithdrawal("user-1", 10, ADDRESS, code);
    expect(result.txHash).toBe("txhash-email-fail");

    consoleSpy.mockRestore();
  });
});

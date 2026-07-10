/**
 * WalletService — Targeted edge case tests for remaining coverage gaps.
 * Covers:
 *   Line 91:  verifyAndProcessDeposit — non-P2002 DB error re-thrown
 *   Line 228: processWithdrawal — step-1 generic error → BadRequestError
 *   Lines 249-254: processWithdrawal — step-3 success path
 *   Line 303: claimAsh — catch block rethrows known errors
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
    sendCriticalAlert: jest.fn().mockResolvedValue(undefined),
  },
}));


import speakeasy from "speakeasy";
import { prisma } from "../../utils/prisma";
import { WalletService } from "../../services/walletService";
import { BlockchainService } from "../../services/blockchainService";
import { BadRequestError, NotFoundError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBlockchain = BlockchainService as jest.Mocked<typeof BlockchainService>;

const ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const SECRET = "JBSWY3DPEHPK3PXP";

function validTotp() {
  return speakeasy.totp({ secret: SECRET, encoding: "base32" });
}

function mockWhitelistedUser() {
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
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // past 24h cooldown
    }],
  });
}

beforeEach(() => jest.clearAllMocks());

// ===========================================================================
// Line 91: verifyAndProcessDeposit — non-P2002 error re-thrown
// ===========================================================================
describe("WalletService.verifyAndProcessDeposit — generic DB error", () => {
  test("re-throws non-P2002 errors from the transaction (line 91)", async () => {
    mockBlockchain.verifyDepositTransaction.mockResolvedValue({ amount: 50, memo: "user-1" });

    const genericError = new Error("Network timeout");
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(genericError);

    await expect(
      WalletService.verifyAndProcessDeposit("user-1", "valid-hash")
    ).rejects.toThrow("Network timeout");
  });
});

// ===========================================================================
// Line 228: processWithdrawal — step-1 generic error → BadRequestError
// ===========================================================================
describe("WalletService.processWithdrawal — step-1 generic error", () => {
  test("wraps non-InsufficientBalance step-1 errors as BadRequestError (line 228)", async () => {
    mockWhitelistedUser();

    // Step 1 transaction throws a generic DB error (not InsufficientBalanceError)
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error("DB deadlock"));

    const code = validTotp();
    await expect(
      WalletService.processWithdrawal("user-1", 10, ADDRESS, code)
    ).rejects.toThrow(/Could not reserve withdrawal balance/i);
  });
});

// ===========================================================================
// Lines 249-254: processWithdrawal — step-3 success path (the inner tx callback body)
// ===========================================================================
describe("WalletService.processWithdrawal — step-3 success path", () => {
  test("completes successfully: step-3 $transaction executes callback and marks COMPLETED", async () => {
    mockWhitelistedUser();

    let step3TxExecuted = false;
    let failedAttemptsReset = false;

    // Step 1: reservation succeeds
    (mockPrisma.$transaction as jest.Mock)
      .mockImplementationOnce(async (fn: any) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ usdcBalance: "100" }),
            update: jest.fn().mockResolvedValue({ usdcBalance: "90" }),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          transaction: { create: jest.fn().mockResolvedValue({ id: "pending-tx" }) },
        };
        return fn(tx);
      })
      // Step 3: success — the callback IS executed this time
      .mockImplementationOnce(async (fn: any) => {
        const tx = {
          transaction: {
            update: jest.fn().mockImplementation(() => {
              step3TxExecuted = true;
              return { id: "pending-tx", status: "COMPLETED" };
            }),
          },
          user: {
            update: jest.fn().mockImplementation(() => {
              failedAttemptsReset = true;
              return {};
            }),
          },
        };
        return fn(tx);
      });

    mockBlockchain.sendUsdcTransfer.mockResolvedValue("onchain-tx-hash");
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ usdcBalance: "90" });

    const code = validTotp();
    const result = await WalletService.processWithdrawal("user-1", 10, ADDRESS, code);

    expect(result.txHash).toBe("onchain-tx-hash");
    expect(result.status).toBe("COMPLETED");
    expect(step3TxExecuted).toBe(true);
    expect(failedAttemptsReset).toBe(true);
  });
});

// ===========================================================================
// Line 303: claimAsh catch block re-throws known errors
// ===========================================================================
describe("WalletService.claimAsh — catch block rethrows known errors (line 303)", () => {
  test("re-throws NotFoundError from inside the reserve transaction", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValue(true);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null), // triggers NotFoundError
          update: jest.fn(),
        },
      };
      return await fn(tx); // propagates the error
    });

    const err = await WalletService.claimAsh("user-1", ADDRESS).catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.message).toContain("Wallet not found");
  });

  test("re-throws BadRequestError (zero balance) from inside the reserve transaction", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValue(true);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ ashBalance: "0" }), // triggers BadRequestError
          update: jest.fn(),
        },
      };
      return await fn(tx);
    });

    const err = await WalletService.claimAsh("user-1", ADDRESS).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.message).toMatch(/No ASH balance/);
  });

  test("wraps unknown reserve errors as BadRequestError (not a known error type)", async () => {
    mockBlockchain.validateSolanaAddress.mockReturnValue(true);

    // $transaction itself throws unknown error (not from fn callback)
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error("Unknown DB error"));

    const err = await WalletService.claimAsh("user-1", ADDRESS).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.message).toMatch(/Could not reserve ASH balance/);
  });
});

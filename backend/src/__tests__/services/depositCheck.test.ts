/**
 * Tests for WalletService.checkAndCreditDeposit — the HD deposit address flow.
 *
 * Flow:
 *  1. Acquire per-user in-memory lock
 *  2. Get wallet (lazily populates deposit address via getDepositKeypair)
 *  3. Check on-chain USDC balance at deposit address
 *  4. If balance >= 1: atomic DB credit + async non-blocking sweep
 *  5. If balance < 1: release lock immediately, return credited: false
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    wallet: { findUnique: jest.fn(), update: jest.fn() },
    transaction: { create: jest.fn() },
  },
}));

jest.mock("../../services/blockchainService", () => ({
  BlockchainService: {
    getDepositKeypair: jest.fn().mockReturnValue({
      publicKey: { toBase58: () => "DepositAddr1111111111111111111111111111111" },
    }),
    getUsdcBalance: jest.fn(),
    sweepDepositToMaster: jest.fn(),
  },
}));

jest.mock("../../services/emailService", () => ({
  EmailService: { sendCriticalAlert: jest.fn().mockResolvedValue(undefined) },
}));

import { prisma } from "../../utils/prisma";
import { WalletService } from "../../services/walletService";
import { BlockchainService } from "../../services/blockchainService";
import { BadRequestError, NotFoundError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBlockchain = BlockchainService as jest.Mocked<typeof BlockchainService>;

const DEPOSIT_ADDR = "DepositAddr1111111111111111111111111111111";

function mockWalletExists(depositAddress: string | null = DEPOSIT_ADDR) {
  (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
    usdcBalance: "100",
    ashBalance: "0",
    cumulativeWeight: "0",
    depositAddress,
  });
  if (!depositAddress) {
    // If no deposit address, update will be called to persist it
    (mockPrisma.wallet.update as jest.Mock).mockResolvedValue({
      usdcBalance: "100",
      ashBalance: "0",
      cumulativeWeight: "0",
      depositAddress: DEPOSIT_ADDR,
    });
  }
}

function mockCreditTransaction(newBalance = 150) {
  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
    const tx = {
      wallet: {
        update: jest.fn().mockResolvedValue({ usdcBalance: String(newBalance) }),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({ id: "tx-deposit-1" }),
      },
    };
    return fn(tx);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Default: sweep resolves quickly (non-blocking)
  mockBlockchain.sweepDepositToMaster.mockResolvedValue("sweep-sig-abc");
});

afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

// ---- No funds at deposit address ----

describe("checkAndCreditDeposit — no USDC at deposit address", () => {
  test("returns credited:false and releases lock when balance is 0", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);

    const result = await WalletService.checkAndCreditDeposit("user-1");

    expect(result.credited).toBe(false);
    expect(result.amount).toBe(0);
    expect(result.depositAddress).toBe(DEPOSIT_ADDR);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockBlockchain.sweepDepositToMaster).not.toHaveBeenCalled();
  });

  test("returns credited:false when balance is 0.5 (below 1 USDC minimum)", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(0.5);

    const result = await WalletService.checkAndCreditDeposit("user-2");

    expect(result.credited).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test("allows re-check after no-funds response (lock released immediately)", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);

    // First check — no funds
    await WalletService.checkAndCreditDeposit("user-recheck");

    // Second check should NOT throw "already in progress"
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);
    const result = await WalletService.checkAndCreditDeposit("user-recheck");
    expect(result.credited).toBe(false);
  });
});

// ---- USDC found — credit + sweep ----

describe("checkAndCreditDeposit — USDC found", () => {
  test("credits balance atomically and triggers sweep when USDC found", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(50);
    mockCreditTransaction(150);

    const result = await WalletService.checkAndCreditDeposit("user-3");

    expect(result.credited).toBe(true);
    expect(result.amount).toBe(50);
    expect(result.newBalance).toBe(150);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("calls sweepDepositToMaster with correct userId and deposit address", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(25);
    mockCreditTransaction(125);

    await WalletService.checkAndCreditDeposit("user-sweep");

    // sweep is called synchronously (fire-and-forget) before the return statement
    expect(mockBlockchain.sweepDepositToMaster).toHaveBeenCalledWith("user-sweep", DEPOSIT_ADDR);
  });

  test("DB write includes increment and DEPOSIT transaction record", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(100);

    let walletIncrementArg: any;
    let txCreateArg: any;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          update: jest.fn().mockImplementation((args: any) => {
            walletIncrementArg = args.data.usdcBalance;
            return { usdcBalance: "200" };
          }),
        },
        transaction: {
          create: jest.fn().mockImplementation((args: any) => {
            txCreateArg = args.data;
            return { id: "tx-1" };
          }),
        },
      };
      return fn(tx);
    });

    await WalletService.checkAndCreditDeposit("user-4");

    expect(walletIncrementArg).toEqual({ increment: 100 });
    expect(txCreateArg.type).toBe("DEPOSIT");
    expect(txCreateArg.amount).toBe(100);
    expect(txCreateArg.currency).toBe("USDC");
    expect(txCreateArg.status).toBe("COMPLETED");
  });

  test("works when deposit address is null (lazy-populates via getDepositKeypair)", async () => {
    mockWalletExists(null); // no deposit address yet
    mockBlockchain.getUsdcBalance.mockResolvedValue(10);
    mockCreditTransaction(110);

    const result = await WalletService.checkAndCreditDeposit("user-newaddr");

    expect(mockBlockchain.getDepositKeypair).toHaveBeenCalledWith("user-newaddr");
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ depositAddress: DEPOSIT_ADDR }) })
    );
    expect(result.credited).toBe(true);
  });
});

// ---- Concurrent request lock ----

describe("checkAndCreditDeposit — per-user in-memory lock", () => {
  test("rejects a second concurrent call for the same user", async () => {
    mockWalletExists();
    // First call blocks — getUsdcBalance hangs until we resolve it
    let resolveBalance!: (v: number) => void;
    const balancePromise = new Promise<number>((res) => { resolveBalance = res; });
    mockBlockchain.getUsdcBalance.mockReturnValueOnce(balancePromise);

    const first = WalletService.checkAndCreditDeposit("user-lock");

    // Second call fires while first is still awaiting balance
    const second = WalletService.checkAndCreditDeposit("user-lock");

    // Second must reject immediately with lock error
    await expect(second).rejects.toThrow(/already in progress/i);

    // Resolve first so it can clean up
    resolveBalance(0);
    const r1 = await first;
    expect(r1.credited).toBe(false);
  });

  test("lock is per-user — different users can check concurrently", async () => {
    // Both users have their wallets
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      usdcBalance: "0",
      ashBalance: "0",
      cumulativeWeight: "0",
      depositAddress: DEPOSIT_ADDR,
    });
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);

    // user-a and user-b can both check concurrently without conflict
    const [r1, r2] = await Promise.all([
      WalletService.checkAndCreditDeposit("user-a"),
      WalletService.checkAndCreditDeposit("user-b"),
    ]);

    expect(r1.credited).toBe(false);
    expect(r2.credited).toBe(false);
  });
});

// ---- DB errors ----

describe("checkAndCreditDeposit — DB error handling", () => {
  test("throws BadRequestError on P2002 (duplicate credit prevented by constraint)", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(50);
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue({ code: "P2002" });

    await expect(WalletService.checkAndCreditDeposit("user-p2002")).rejects.toThrow(BadRequestError);
    await expect(WalletService.checkAndCreditDeposit("user-p2002")).rejects.toThrow(BadRequestError);
    // Both throw — but the second one didn't throw "already in progress", confirming lock was released
  });

  test("rethrows non-P2002 DB errors", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(50);
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error("DB timeout"));

    await expect(WalletService.checkAndCreditDeposit("user-dberr")).rejects.toThrow("DB timeout");
  });

  test("lock is released after DB error so user can retry", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(50);

    // First call: DB fails
    (mockPrisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error("DB timeout"));
    await expect(WalletService.checkAndCreditDeposit("user-retry")).rejects.toThrow("DB timeout");

    // Second call: succeeds — lock was released
    mockBlockchain.getUsdcBalance.mockResolvedValue(50);
    mockCreditTransaction(150);
    const result = await WalletService.checkAndCreditDeposit("user-retry");
    expect(result.credited).toBe(true);
  });

  test("sweep failure is non-fatal — credit result still returned", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(30);
    mockCreditTransaction(130);
    mockBlockchain.sweepDepositToMaster.mockRejectedValue(new Error("RPC timeout"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await WalletService.checkAndCreditDeposit("user-sweeperr");

    // Credit is returned before sweep settles
    expect(result.credited).toBe(true);
    expect(result.amount).toBe(30);
    // Sweep was kicked off (fire-and-forget)
    expect(mockBlockchain.sweepDepositToMaster).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ---- Wallet not found ----

describe("checkAndCreditDeposit — wallet not found", () => {
  test("propagates NotFoundError when user has no wallet", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(WalletService.checkAndCreditDeposit("user-nowallet")).rejects.toThrow(NotFoundError);
  });
});

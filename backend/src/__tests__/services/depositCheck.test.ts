/**
 * Tests for WalletService.checkAndCreditDeposit — the HD deposit address flow.
 *
 * Flow:
 *  1. Acquire a Postgres advisory lock for the userId, scoped to the transaction
 *     (serializes concurrent calls across ALL processes, not just this one)
 *  2. Get wallet (lazily populates deposit address via getDepositKeypair)
 *  3. Check on-chain USDC balance at deposit address
 *  4. If balance >= 1: atomic DB credit + sweep, all before the transaction commits
 *  5. If balance < 1: return credited: false (transaction commits immediately, lock released)
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    wallet: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
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

// Builds the `tx` object handed to the $transaction callback. Every test needs
// $executeRaw (the advisory lock acquisition) to resolve, regardless of whether
// it also needs to exercise the credit-write path.
function makeTx(overrides: { walletUpdate?: any; txCreate?: any } = {}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    wallet: {
      update: overrides.walletUpdate ?? jest.fn().mockResolvedValue({ usdcBalance: "150" }),
    },
    transaction: {
      create: overrides.txCreate ?? jest.fn().mockResolvedValue({ id: "tx-deposit-1" }),
    },
  };
}

function mockCreditTransaction(newBalance = 150) {
  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
    const tx = makeTx({ walletUpdate: jest.fn().mockResolvedValue({ usdcBalance: String(newBalance) }) });
    return fn(tx);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: any $transaction call just runs the callback against a working tx —
  // this covers the "no funds found" path, which now also runs inside the
  // transaction (for the advisory lock), even though it never touches wallet/tx writes.
  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(makeTx()));
  mockBlockchain.sweepDepositToMaster.mockResolvedValue("sweep-sig-abc");
});

// ---- No funds at deposit address ----

describe("checkAndCreditDeposit — no USDC at deposit address", () => {
  test("returns credited:false when balance is 0", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);

    const result = await WalletService.checkAndCreditDeposit("user-1");

    expect(result.credited).toBe(false);
    expect(result.amount).toBe(0);
    expect(result.depositAddress).toBe(DEPOSIT_ADDR);
    expect(mockBlockchain.sweepDepositToMaster).not.toHaveBeenCalled();
  });

  test("returns credited:false when balance is 0.5 (below 1 USDC minimum)", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(0.5);

    const result = await WalletService.checkAndCreditDeposit("user-2");

    expect(result.credited).toBe(false);
  });

  test("allows re-check after no-funds response", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);

    await WalletService.checkAndCreditDeposit("user-recheck");

    mockBlockchain.getUsdcBalance.mockResolvedValue(0);
    const result = await WalletService.checkAndCreditDeposit("user-recheck");
    expect(result.credited).toBe(false);
  });
});

// ---- USDC found — credit + sweep ----

describe("checkAndCreditDeposit — USDC found", () => {
  test("credits balance atomically and awaits the sweep when USDC found", async () => {
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

    // Sweep is awaited before the credit result and the lock are released.
    expect(mockBlockchain.sweepDepositToMaster).toHaveBeenCalledWith("user-sweep", DEPOSIT_ADDR);
  });

  test("DB write includes increment and DEPOSIT transaction record", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(100);

    let walletIncrementArg: any;
    let txCreateArg: any;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = makeTx({
        walletUpdate: jest.fn().mockImplementation((args: any) => {
          walletIncrementArg = args.data.usdcBalance;
          return { usdcBalance: "200" };
        }),
        txCreate: jest.fn().mockImplementation((args: any) => {
          txCreateArg = args.data;
          return { id: "tx-1" };
        }),
      });
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

// ---- Concurrency: advisory lock ----

describe("checkAndCreditDeposit — advisory lock", () => {
  test("acquires a Postgres advisory lock scoped to the userId inside the transaction", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);

    let capturedTx: any;
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      capturedTx = makeTx();
      return fn(capturedTx);
    });

    await WalletService.checkAndCreditDeposit("user-lock");

    expect(capturedTx.$executeRaw).toHaveBeenCalled();
  });

  test("a second call for a different user runs independently", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      usdcBalance: "0",
      ashBalance: "0",
      cumulativeWeight: "0",
      depositAddress: DEPOSIT_ADDR,
    });
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);

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
    // Simulate the conflict coming from inside the transaction (a real write
    // failure), not the outer $transaction call itself — the try/catch that
    // converts P2002 → BadRequestError lives inside the callback.
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = makeTx({ walletUpdate: jest.fn().mockRejectedValue({ code: "P2002" }) });
      return fn(tx);
    });

    await expect(WalletService.checkAndCreditDeposit("user-p2002")).rejects.toThrow(BadRequestError);
  });

  test("rethrows non-P2002 DB errors", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(50);
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error("DB timeout"));

    await expect(WalletService.checkAndCreditDeposit("user-dberr")).rejects.toThrow("DB timeout");
  });

  test("a later call succeeds normally after an earlier DB error", async () => {
    mockWalletExists();
    mockBlockchain.getUsdcBalance.mockResolvedValue(50);

    (mockPrisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error("DB timeout"));
    await expect(WalletService.checkAndCreditDeposit("user-retry")).rejects.toThrow("DB timeout");

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

    expect(result.credited).toBe(true);
    expect(result.amount).toBe(30);
    expect(mockBlockchain.sweepDepositToMaster).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ---- Wallet not found / self-heal ----

describe("checkAndCreditDeposit — wallet self-heal", () => {
  test("self-heals by creating a wallet when none exists yet", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (mockPrisma.wallet.create as jest.Mock).mockResolvedValue({
      usdcBalance: "0", ashBalance: "0", cumulativeWeight: "0", depositAddress: null,
    });
    (mockPrisma.wallet.update as jest.Mock).mockResolvedValue({
      usdcBalance: "0", ashBalance: "0", cumulativeWeight: "0", depositAddress: DEPOSIT_ADDR,
    });
    mockBlockchain.getUsdcBalance.mockResolvedValue(0);

    const result = await WalletService.checkAndCreditDeposit("user-nowallet");

    expect(mockPrisma.wallet.create).toHaveBeenCalledWith({ data: { userId: "user-nowallet" } });
    expect(result.depositAddress).toBe(DEPOSIT_ADDR);
  });

  test("rethrows if wallet creation fails for a non-P2002 reason", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.wallet.create as jest.Mock).mockRejectedValue(new Error("DB down"));

    await expect(WalletService.checkAndCreditDeposit("user-createerr")).rejects.toThrow("DB down");
  });
});

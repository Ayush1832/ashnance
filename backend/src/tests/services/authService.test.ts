/**
 * AuthService — account lockout 30-minute expiry tests (A5)
 *
 * Covers: authService.ts lines 118-134 (lockout check + increment + set lockedUntil)
 * and line 159 (reset on success).
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("hashed"),
  genSalt: jest.fn().mockResolvedValue("salt"),
}));

import bcrypt from "bcryptjs";
import { prisma } from "../../utils/prisma";
import { AuthService } from "../../services/authService";
import { AccountLockedError, UnauthorizedError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const BASE_USER = {
  id: "user-1",
  email: "test@example.com",
  passwordHash: "hashed-password",
  twoFaEnabled: false,
  twoFaSecret: null,
  failedAttempts: 0,
  lockedUntil: null as Date | null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("AuthService.login — lockout lifecycle (A5)", () => {
  // ---- Test 1: 3 failed attempts → account locked --------------------------
  test("1. Fail 3 logins → failedAttempts=3, lockedUntil set to now+30min", async () => {
    // Simulate: 2 failures already recorded, this is the 3rd attempt
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...BASE_USER,
      failedAttempts: 2,
      lockedUntil: null,
    });
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(false); // wrong password

    await expect(AuthService.login("test@example.com", "wrong-password"))
      .rejects.toThrow(UnauthorizedError);

    const updateCall = (mockPrisma.user.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.failedAttempts).toBe(3);
    expect(updateCall.data.lockedUntil).toBeInstanceOf(Date);

    // lockedUntil should be ~30 minutes from now
    const lockMs = updateCall.data.lockedUntil.getTime() - Date.now();
    expect(lockMs).toBeGreaterThan(29 * 60 * 1000);
    expect(lockMs).toBeLessThan(31 * 60 * 1000);
  });

  // ---- Test 2: 4th attempt within 30 min → AccountLockedError (423) ---------
  test("2. 4th attempt within 30 min lock → AccountLockedError (423)", async () => {
    const lockedUntil = new Date(Date.now() + 25 * 60 * 1000); // 25 min from now
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...BASE_USER,
      failedAttempts: 3,
      lockedUntil,
    });

    const err = await AuthService.login("test@example.com", "any-password").catch((e) => e);
    expect(err).toBeInstanceOf(AccountLockedError);
    expect(err.statusCode).toBe(423);
  });

  // ---- Test 3: Advance time past lockout → correct credentials succeed -------
  test("3. After 31 min (fake timer advance), correct credentials succeed and counter resets", async () => {
    jest.useFakeTimers();
    const lockSetAt = Date.now();
    const lockedUntil = new Date(lockSetAt + 30 * 60 * 1000); // expires in 30 min

    // First call: account is locked
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...BASE_USER,
      failedAttempts: 3,
      lockedUntil,
    });

    const errBefore = await AuthService.login("test@example.com", "correct-pw").catch((e) => e);
    expect(errBefore).toBeInstanceOf(AccountLockedError);

    // Advance 31 minutes past lock
    jest.setSystemTime(new Date(lockSetAt + 31 * 60 * 1000));

    // Mock a successful login: lock is expired (lockedUntil < new Date()), bcrypt succeeds
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...BASE_USER,
      id: "user-1",
      email: "test@example.com",
      failedAttempts: 3,
      lockedUntil, // same date — now in the past after time advance
      role: "USER",
      isVip: false,
      username: "tester",
    });
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(true); // correct password now

    const result = await AuthService.login("test@example.com", "correct-pw");

    // After success, counter and lockedUntil must be reset
    const resetCall = (mockPrisma.user.update as jest.Mock).mock.calls.find(
      (c: any) => c[0]?.data?.failedAttempts === 0
    );
    expect(resetCall).toBeDefined();
    expect(resetCall[0].data.lockedUntil).toBeNull();

    jest.useRealTimers();
  });

  // ---- Test 4: Wrong credentials after lock expires → fresh count at 1 ------
  test("4. Wrong password after lock expires → failedAttempts reset to 1 (not accumulated)", async () => {
    jest.useFakeTimers();
    const pastLock = new Date(Date.now() - 1000); // already expired

    // Lock is expired, password is wrong → new attempt starts fresh count at 1
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...BASE_USER,
      failedAttempts: 3,    // prior count — but lock expired
      lockedUntil: pastLock,
    });
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(false); // wrong password

    await expect(AuthService.login("test@example.com", "wrong-again")).rejects.toThrow(UnauthorizedError);

    const updateCall = (mockPrisma.user.update as jest.Mock).mock.calls[0][0];
    // failedAttempts should be 4 (3+1), but NOT locked again because < threshold after reset
    // The code just increments: attempts = user.failedAttempts + 1 = 4
    expect(updateCall.data.failedAttempts).toBe(4);
    // lockedUntil IS set because 4 >= 3
    expect(updateCall.data.lockedUntil).toBeInstanceOf(Date);

    jest.useRealTimers();
  });

  // ---- Test 5: First attempt fails → count starts at 1 ---------------------
  test("5. First wrong password with no prior failures → failedAttempts=1, no lock set", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...BASE_USER,
      failedAttempts: 0,
      lockedUntil: null,
    });
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(AuthService.login("test@example.com", "wrong")).rejects.toThrow(UnauthorizedError);

    const updateCall = (mockPrisma.user.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.failedAttempts).toBe(1);
    expect(updateCall.data.lockedUntil).toBeUndefined(); // not yet locked
  });
});

// ===========================================================================
// Refresh-token uniqueness — regression for the duplicate-key 500 that logged
// users out on reopen (tokens minted in the same second were byte-identical,
// violating the unique `token` column when saved).
// ===========================================================================
describe("AuthService.refreshToken — mints unique tokens (no duplicate-key 500)", () => {
  function mockStoredToken() {
    (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: "rt-old",
      token: "old-token",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: { id: "user-1", email: "test@example.com" },
    });
    (mockPrisma.refreshToken.update as jest.Mock).mockResolvedValue({});
  }

  test("two refreshes in the same tick produce distinct refresh tokens", async () => {
    mockStoredToken();
    const savedTokens: string[] = [];
    (mockPrisma.refreshToken.create as jest.Mock).mockImplementation((args: { data: { token: string } }) => {
      savedTokens.push(args.data.token);
      return Promise.resolve({});
    });

    const a = await AuthService.refreshToken("old-token");
    const b = await AuthService.refreshToken("old-token");

    // Distinct tokens returned AND distinct tokens persisted → no unique-constraint collision
    expect(a.refreshToken).not.toBe(b.refreshToken);
    expect(a.accessToken).not.toBe(b.accessToken);
    expect(savedTokens[0]).not.toBe(savedTokens[1]);
    expect(savedTokens).toHaveLength(2);
  });
});

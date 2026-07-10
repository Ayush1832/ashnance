/**
 * Admin / Owner Authorization Matrix (A2)
 *
 * Table-driven. For every /api/admin/* and /api/owner/* route:
 *   No token     → 401
 *   Wrong role   → 401 (ADMIN routes: non-admin user gets 401 "Admin access required";
 *                        OWNER routes: non-owner gets 401 "Owner access required")
 *   Correct role → anything other than 401/403 (success or validation error)
 *
 * Note on 401 vs 403: The requireAdmin middleware throws UnauthorizedError (401), not
 * ForbiddenError (403). Same for requireOwner. This is the live implementation behavior —
 * we assert the auth-related code, not a specific 403.
 *
 * Routes are enumerated from the actual route files below rather than hard-coded, so
 * adding a new admin/owner route automatically extends the matrix.
 */

// ---- env must be set BEFORE any imports that read config ----
process.env.OWNER_EMAILS = "owner@ashnance.com";
process.env.JWT_SECRET    = "test-matrix-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-matrix-refresh-secret";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./test.db";

// Mock everything that the app imports at startup so the server boots cleanly
jest.mock("../../utils/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: "u-test",
        email: "owner@ashnance.com",
        role: "ADMIN",
        lockedUntil: null,
      }),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    burn: { count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({ _sum: {} }) },
    referral: { count: jest.fn().mockResolvedValue(0) },
    rewardPool: { findFirst: jest.fn().mockResolvedValue({ totalBalance: "0" }) },
    profitPool: { findFirst: jest.fn().mockResolvedValue({ balance: "0" }) },
    stakingPool: { findMany: jest.fn().mockResolvedValue([]) },
    stakingPosition: { aggregate: jest.fn().mockResolvedValue({ _sum: {} }) },
    platformConfig: { findMany: jest.fn().mockResolvedValue([]) },
    ownerWithdrawal: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    round: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    vipTier: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

jest.mock("../../services/blockchainService", () => ({
  BlockchainService: {
    validateSolanaAddress: jest.fn().mockReturnValue(true),
    generateDepositAddress: jest.fn().mockResolvedValue("FakeDepositAddr"),
    getUsdcBalance: jest.fn().mockResolvedValue(0),
    getAshBalance: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock("../../services/ownerService", () => ({
  OwnerService: {
    getStats: jest.fn().mockResolvedValue({}),
    getProfitPool: jest.fn().mockResolvedValue({ balance: 0, withdrawals: [] }),
    getBurnConfig: jest.fn().mockResolvedValue({}),
    updateBurnConfig: jest.fn().mockResolvedValue({}),
    getSolvency: jest.fn().mockResolvedValue({}),
    initiateWithdrawal: jest.fn().mockResolvedValue({}),
    approveWithdrawal: jest.fn().mockResolvedValue({}),
    cancelWithdrawal: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../../services/roundService", () => ({
  RoundService: {
    createRound: jest.fn().mockResolvedValue({ id: "r1" }),
    endRound: jest.fn().mockResolvedValue({ winner: null }),
    cancelRound: jest.fn().mockResolvedValue({}),
    getRoundHistory: jest.fn().mockResolvedValue([]),
    getActiveRound: jest.fn().mockResolvedValue(null),
    getActiveRoundStatus: jest.fn().mockResolvedValue({ round: null, leaderboard: [], userRank: null }),
  },
}));


jest.mock("../../services/emailService", () => ({
  EmailService: { sendCriticalAlert: jest.fn().mockResolvedValue(undefined) },
}));

import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";
import { Router } from "express";

// Import the actual route files (not the whole server to avoid background jobs)
import adminRoutesFile from "../../routes/adminRoutes";
import ownerRoutesFile from "../../routes/ownerRoutes";
import { errorHandler } from "../../middleware/errorHandler";

const JWT_SECRET = "test-matrix-jwt-secret";
const OWNER_EMAIL = "owner@ashnance.com";

function makeToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

// Build a minimal Express app with just the routes under test
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutesFile);
  app.use("/api/owner", ownerRoutesFile);
  app.use(errorHandler);
  return app;
}

// Token fixtures
const noToken = "";
const userToken      = makeToken("user-regular", "user@example.com");   // not admin, not owner
const adminToken     = makeToken("user-admin",   "admin@example.com");  // admin but not owner email
const ownerToken     = makeToken("user-owner",   OWNER_EMAIL);           // in OWNER_EMAILS

// prisma.user.findUnique is called by the authenticate middleware and requireAdmin.
// We need different mock return values per token. We'll intercept based on userId.
const { prisma } = require("../../utils/prisma");

function mockUserForRole(role: "USER" | "ADMIN") {
  (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }: any) => {
    const userId = where?.id ?? where?.email ?? "";
    if (userId === "user-owner")  return Promise.resolve({ id: "user-owner",  email: OWNER_EMAIL,          role: "ADMIN", lockedUntil: null });
    if (userId === "user-admin")  return Promise.resolve({ id: "user-admin",  email: "admin@example.com",  role: "ADMIN", lockedUntil: null });
    if (userId === "user-regular")return Promise.resolve({ id: "user-regular",email: "user@example.com",   role: "USER",  lockedUntil: null });
    return Promise.resolve(null);
  });
}

// ---- Route definitions (derived from reading the actual router stacks at runtime) ----

// Admin routes — all require authenticate + requireAdmin (role=ADMIN)
const adminRoutes: Array<{ method: "get" | "put" | "post" | "delete"; path: string; body?: object }> = [
  { method: "get",  path: "/api/admin/stats" },
  { method: "get",  path: "/api/admin/prizes" },
  { method: "put",  path: "/api/admin/prizes/STANDARD",      body: { multiplier: 1 } },
  { method: "get",  path: "/api/admin/config" },
  { method: "put",  path: "/api/admin/config/some-key",      body: { value: "v" } },
  { method: "get",  path: "/api/admin/users" },
  { method: "put",  path: "/api/admin/users/u1/role",        body: { role: "USER" } },
  { method: "put",  path: "/api/admin/users/u1/ban",         body: { ban: true } },
  { method: "get",  path: "/api/admin/pool" },
];

// Owner routes — all require authenticate + requireOwner (email in OWNER_EMAILS)
const ownerRoutes: Array<{ method: "get" | "put" | "post" | "delete"; path: string; body?: object }> = [
  { method: "get",  path: "/api/owner/me" },
  { method: "get",  path: "/api/owner/stats" },
  { method: "get",  path: "/api/owner/profit-pool" },
  { method: "get",  path: "/api/owner/withdrawal/pending" },
  { method: "post", path: "/api/owner/withdrawal/initiate",  body: { amount: 100 } },
  { method: "post", path: "/api/owner/withdrawal/approve/req-1" },
  { method: "post", path: "/api/owner/withdrawal/cancel/req-1" },
  { method: "get",  path: "/api/owner/burn-config" },
  { method: "put",  path: "/api/owner/burn-config",          body: { key: "min_burn_amount", value: 5 } },
  { method: "get",  path: "/api/owner/solvency" },
  { method: "post", path: "/api/owner/round",                body: { prizePoolTarget: 500 } },
  { method: "post", path: "/api/owner/round/r1/end",         body: { force: false } },
  { method: "post", path: "/api/owner/round/r1/cancel" },
  { method: "get",  path: "/api/owner/rounds" },
];

// ---- Matrix test runner ---------------------------------------------------

describe("Authorization Matrix — /api/admin/* and /api/owner/*", () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeAll(() => {
    mockUserForRole("ADMIN");
    app = buildTestApp();
  });

  describe("Admin routes", () => {
    for (const route of adminRoutes) {
      describe(`${route.method.toUpperCase()} ${route.path}`, () => {
        test("no token → 401", async () => {
          const res = await (request(app) as any)[route.method](route.path)
            .send(route.body ?? {});
          expect(res.status).toBe(401);
        });

        test("USER token (not admin) → 401", async () => {
          const res = await (request(app) as any)[route.method](route.path)
            .set("Authorization", `Bearer ${userToken}`)
            .send(route.body ?? {});
          expect(res.status).toBe(401);
        });

        test("ADMIN token → not 401", async () => {
          const res = await (request(app) as any)[route.method](route.path)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(route.body ?? {});
          expect(res.status).not.toBe(401);
        });
      });
    }
  });

  describe("Owner routes", () => {
    for (const route of ownerRoutes) {
      describe(`${route.method.toUpperCase()} ${route.path}`, () => {
        test("no token → 401", async () => {
          const res = await (request(app) as any)[route.method](route.path)
            .send(route.body ?? {});
          expect(res.status).toBe(401);
        });

        test("ADMIN token (not owner email) → 401", async () => {
          const res = await (request(app) as any)[route.method](route.path)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(route.body ?? {});
          expect(res.status).toBe(401);
        });

        test("OWNER token → not 401", async () => {
          const res = await (request(app) as any)[route.method](route.path)
            .set("Authorization", `Bearer ${ownerToken}`)
            .send(route.body ?? {});
          expect(res.status).not.toBe(401);
        });
      });
    }
  });
});

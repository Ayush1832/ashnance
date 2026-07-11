/**
 * Config startup secret validation tests (A4)
 *
 * Naming note: the environment variable is JWT_SECRET (not JWT_ACCESS_SECRET).
 * Consistent across config.ts, .env.example, and server.ts.
 * The prior audit report contained a naming error — JWT_SECRET is the canonical name.
 *
 * dotenv is mocked to prevent the real .env file from overwriting process.env
 * changes we make during each test. Without this, dotenv.config() in config.ts
 * would restore JWT_SECRET from the .env file before the validation check runs.
 */

// Mock dotenv before any imports so config.ts sees a no-op dotenv
jest.mock("dotenv", () => ({ config: jest.fn() }));

function requireConfig() {
  jest.resetModules();
  // Re-mock dotenv in the fresh module registry too
  jest.mock("dotenv", () => ({ config: jest.fn() }));
  return require("../../config");
}

const PROD_KEYS = ["NODE_ENV", "JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL", "FRONTEND_URL", "BACKEND_URL", "MASTER_KEYPAIR_SECRET", "SOLANA_RPC_URL", "USDC_MINT"];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  PROD_KEYS.forEach((k) => { savedEnv[k] = process.env[k]; });
});

afterEach(() => {
  Object.entries(savedEnv).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  });
  jest.resetModules();
});

describe("Config — production startup secret validation", () => {
  // ---- Test 1: JWT_SECRET missing → throws -----------------------------------
  test("1. NODE_ENV=production with JWT_SECRET unset → throws 'Missing required environment variables'", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = "strong-refresh-secret-value-64chars-xxxx";
    process.env.DATABASE_URL = "postgres://prod/db";

    expect(() => requireConfig()).toThrow(/Missing required environment variables/i);
  });

  // ---- Test 2: Dev default JWT_SECRET → throws --------------------------------
  test("2. NODE_ENV=production with JWT_SECRET='dev-jwt-secret' → throws 'Dev JWT secrets must not be used'", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "dev-jwt-secret";
    process.env.JWT_REFRESH_SECRET = "strong-refresh-secret-value-64chars-xxxx";
    process.env.DATABASE_URL = "postgres://prod/db";
    process.env.FRONTEND_URL = "https://www.ashnance.com";
    process.env.BACKEND_URL = "https://api.ashnance.com";
    process.env.MASTER_KEYPAIR_SECRET = "[1,2,3]";
    process.env.SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=test";

    expect(() => requireConfig()).toThrow(/Dev JWT secrets must not be used/i);
  });

  // ---- Test 3: Dev default JWT_REFRESH_SECRET → throws -----------------------
  test("3. NODE_ENV=production with JWT_REFRESH_SECRET='dev-refresh-secret' → throws", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "super-strong-random-secret-64chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    process.env.JWT_REFRESH_SECRET = "dev-refresh-secret";
    process.env.DATABASE_URL = "postgres://prod/db";
    process.env.FRONTEND_URL = "https://www.ashnance.com";
    process.env.BACKEND_URL = "https://api.ashnance.com";
    process.env.MASTER_KEYPAIR_SECRET = "[1,2,3]";
    process.env.SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=test";

    expect(() => requireConfig()).toThrow(/Dev JWT secrets must not be used/i);
  });

  // ---- Test 4: All required vars set → does not throw -----------------------
  test("4. NODE_ENV=production with all secrets set to strong values → does not throw", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    process.env.JWT_REFRESH_SECRET = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";
    process.env.DATABASE_URL = "postgres://prod/db";
    process.env.FRONTEND_URL = "https://www.ashnance.com";
    process.env.BACKEND_URL = "https://api.ashnance.com";
    process.env.MASTER_KEYPAIR_SECRET = "[1,2,3]";
    process.env.SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=test";

    expect(() => requireConfig()).not.toThrow();
  });

  // ---- Test 4b: SOLANA_RPC_URL missing → throws ------------------------------
  test("4b. NODE_ENV=production with SOLANA_RPC_URL unset → throws 'Missing required environment variables'", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    process.env.JWT_REFRESH_SECRET = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";
    process.env.DATABASE_URL = "postgres://prod/db";
    process.env.FRONTEND_URL = "https://www.ashnance.com";
    process.env.BACKEND_URL = "https://api.ashnance.com";
    process.env.MASTER_KEYPAIR_SECRET = "[1,2,3]";
    delete process.env.SOLANA_RPC_URL;

    expect(() => requireConfig()).toThrow(/Missing required environment variables/i);
  });

  // ---- Test 4c: SOLANA_RPC_URL pointing at devnet → throws -------------------
  test("4c. NODE_ENV=production with SOLANA_RPC_URL pointing at devnet → throws", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    process.env.JWT_REFRESH_SECRET = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";
    process.env.DATABASE_URL = "postgres://prod/db";
    process.env.FRONTEND_URL = "https://www.ashnance.com";
    process.env.BACKEND_URL = "https://api.ashnance.com";
    process.env.MASTER_KEYPAIR_SECRET = "[1,2,3]";
    process.env.SOLANA_RPC_URL = "https://api.devnet.solana.com";

    expect(() => requireConfig()).toThrow(/devnet/i);
  });

  // ---- Test 4d: USDC_MINT set to the wrong mint → throws ---------------------
  test("4d. NODE_ENV=production with USDC_MINT set to a non-mainnet-USDC mint → throws", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    process.env.JWT_REFRESH_SECRET = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";
    process.env.DATABASE_URL = "postgres://prod/db";
    process.env.FRONTEND_URL = "https://www.ashnance.com";
    process.env.BACKEND_URL = "https://api.ashnance.com";
    process.env.MASTER_KEYPAIR_SECRET = "[1,2,3]";
    process.env.SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=test";
    process.env.USDC_MINT = "SomeOtherTokenMintAddressNotRealUSDC11111111";

    expect(() => requireConfig()).toThrow(/USDC_MINT/);
  });

  // ---- Test 4e: USDC_MINT set to the real mainnet mint → does not throw -----
  test("4e. NODE_ENV=production with USDC_MINT set to the real mainnet USDC mint → does not throw", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    process.env.JWT_REFRESH_SECRET = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";
    process.env.DATABASE_URL = "postgres://prod/db";
    process.env.FRONTEND_URL = "https://www.ashnance.com";
    process.env.BACKEND_URL = "https://api.ashnance.com";
    process.env.MASTER_KEYPAIR_SECRET = "[1,2,3]";
    process.env.SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=test";
    process.env.USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    expect(() => requireConfig()).not.toThrow();
  });

  // ---- Test 5: development with dev defaults → succeeds ----------------------
  test("5. NODE_ENV=development with default dev secrets → does not throw", () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "dev-jwt-secret";
    process.env.JWT_REFRESH_SECRET = "dev-refresh-secret";
    delete process.env.DATABASE_URL;

    expect(() => requireConfig()).not.toThrow();
  });
});

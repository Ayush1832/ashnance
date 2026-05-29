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

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  // Snapshot current env
  ["NODE_ENV", "JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL", "FRONTEND_URL", "BACKEND_URL"].forEach((k) => {
    savedEnv[k] = process.env[k];
  });
});

afterEach(() => {
  // Restore
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

    expect(() => requireConfig()).toThrow(/Dev JWT secrets must not be used/i);
  });

  // ---- Test 4: All strong secrets → succeeds ---------------------------------
  test("4. NODE_ENV=production with all secrets set to strong values → does not throw", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    process.env.JWT_REFRESH_SECRET = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";
    process.env.DATABASE_URL = "postgres://prod/db";
    process.env.FRONTEND_URL = "https://www.ashnance.com";
    process.env.BACKEND_URL = "https://api.ashnance.com";

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

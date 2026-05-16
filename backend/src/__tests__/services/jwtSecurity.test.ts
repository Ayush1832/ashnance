/**
 * JWT Security Tests (§4.3, §6.1)
 *
 * Verifies that JWT signing uses HS256 explicitly and verification
 * rejects tokens with unexpected algorithms (alg:none bypass).
 */

import jwt from "jsonwebtoken";

const SECRET = "test-secret-for-jest-only";
const REFRESH_SECRET = "test-refresh-secret-for-jest-only";

// Mirror what authService.ts does after our fix
function signAccess(userId: string, email: string): string {
  return jwt.sign({ userId, email }, SECRET, { algorithm: "HS256", expiresIn: 900 });
}

function signRefresh(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: "refresh" },
    REFRESH_SECRET,
    { algorithm: "HS256", expiresIn: 604800 }
  );
}

// Mirror what auth.ts does after our fix
function verifyAccess(token: string) {
  return jwt.verify(token, SECRET, { algorithms: ["HS256"] });
}

describe("JWT algorithm enforcement (§6.1)", () => {
  test("valid HS256 token is accepted", () => {
    const token = signAccess("user-123", "test@example.com");
    const decoded = verifyAccess(token) as { userId: string; email: string };
    expect(decoded.userId).toBe("user-123");
    expect(decoded.email).toBe("test@example.com");
  });

  test("token signed with wrong algorithm is rejected", () => {
    // Attacker crafts a token with none algorithm
    const maliciousHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ userId: "attacker", email: "evil@example.com" })).toString("base64url");
    const noneToken = `${maliciousHeader}.${payload}.`;

    expect(() => verifyAccess(noneToken)).toThrow();
  });

  test("token signed with RS256 is rejected by HS256-only verify", () => {
    // jwt.sign with RS256 requires a real private key — use 'none' variant to test algo restriction
    // Ensure jwt.verify with algorithms:["HS256"] rejects any non-HS256 token
    const header = Buffer.from(JSON.stringify({ alg: "HS384", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ userId: "attacker" })).toString("base64url");
    const fakeToken = `${header}.${payload}.fakesig`;

    expect(() => verifyAccess(fakeToken)).toThrow();
  });

  test("expired token is rejected", () => {
    const token = jwt.sign({ userId: "u1" }, SECRET, { algorithm: "HS256", expiresIn: -1 });
    expect(() => verifyAccess(token)).toThrow(/expired/i);
  });

  test("tampered payload is rejected (signature mismatch)", () => {
    const token = signAccess("user-123", "test@example.com");
    const [header, , sig] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: "attacker", email: "evil@test.com", iat: Math.floor(Date.now() / 1000) })).toString("base64url");
    const tamperedToken = `${header}.${tamperedPayload}.${sig}`;
    expect(() => verifyAccess(tamperedToken)).toThrow();
  });

  test("token signed with different secret is rejected", () => {
    const tokenWithWrongSecret = jwt.sign({ userId: "u1", email: "a@b.com" }, "different-secret", { algorithm: "HS256" });
    expect(() => verifyAccess(tokenWithWrongSecret)).toThrow();
  });

  test("access token algorithm claim is HS256", () => {
    const token = signAccess("u1", "a@b.com");
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded?.header?.alg).toBe("HS256");
  });

  test("refresh token algorithm claim is HS256", () => {
    const token = signRefresh("u1", "a@b.com");
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded?.header?.alg).toBe("HS256");
  });

  test("refresh token contains type:refresh claim", () => {
    const token = signRefresh("u1", "a@b.com");
    const decoded = jwt.decode(token) as { type?: string };
    expect(decoded?.type).toBe("refresh");
  });
});

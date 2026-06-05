import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nacl from "tweetnacl";
import speakeasy from "speakeasy";
import { PublicKey } from "@solana/web3.js";
import { prisma } from "../utils/prisma";
import { config } from "../config";
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  AccountLockedError,
  BadRequestError,
} from "../utils/errors";

export class AuthService {
  /**
   * Register a new user with email
   */
  static async register(data: {
    email: string;
    username: string;
    password?: string;
    referralCode?: string;
  }) {
    // Check existing
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      throw new ConflictError("Email or username already in use");
    }

    // Hash password if provided
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 12)
      : null;

    // Resolve referrer
    let referredById: string | undefined;
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: data.referralCode },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const userId = crypto.randomUUID();

    // Create user + wallet in transaction
    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          email: data.email,
          username: data.username,
          passwordHash,
          referredById,
          referralCode: crypto.randomBytes(6).toString("hex"),
        },
      });

      await tx.wallet.create({
        data: { userId: newUser.id },
      });

      // Create referral record if referred
      if (referredById) {
        await tx.referral.create({
          data: {
            referrerId: referredById,
            refereeId: newUser.id,
            // Inactive until the referee actually burns (proof of activity).
            // Prevents farming weight/commission with sign-ups that never burn.
            isActive: false,
          },
        });
      }

      return newUser;
    });

    // Deposits are made by connecting a wallet and sending USDC directly to the
    // master wallet (verified via POST /api/wallet/deposit) — no per-user
    // deposit address is generated or monitored.

    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        referralCode: user.referralCode,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Login with email + password
   */
  static async login(email: string, password: string, twoFaCode?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError(
        "Account temporarily locked. Please try again later."
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Increment failed attempts
      const attempts = user.failedAttempts + 1;
      const lockData =
        attempts >= 3
          ? {
              failedAttempts: attempts,
              lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 min
            }
          : { failedAttempts: attempts };

      await prisma.user.update({ where: { id: user.id }, data: lockData });
      throw new UnauthorizedError("Invalid email or password");
    }

    // Enforce 2FA if enabled
    if (user.twoFaEnabled && user.twoFaSecret) {
      if (!twoFaCode) {
        throw new UnauthorizedError("2FA code required");
      }
      const valid = speakeasy.totp.verify({
        secret: user.twoFaSecret,
        encoding: "base32",
        token: twoFaCode,
        window: 1,
      });
      if (!valid) {
        // Count a wrong 2FA code as a failed attempt and lock after 3 — otherwise
        // an attacker who already has the password could brute-force the 6-digit
        // TOTP (the per-IP rate limit alone is defeated by IP rotation).
        const attempts = user.failedAttempts + 1;
        const lockData =
          attempts >= 3
            ? { failedAttempts: attempts, lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
            : { failedAttempts: attempts };
        await prisma.user.update({ where: { id: user.id }, data: lockData });
        throw new UnauthorizedError("Invalid 2FA code");
      }
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVip: user.isVip,
        vipTier: user.vipTier,
        referralCode: user.referralCode,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Login with email + password + backup recovery code (instead of TOTP)
   */
  static async loginWithRecoveryCode(email: string, password: string, recoveryCode: string) {
    const { TwoFAService } = await import("./twoFAService");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError("Account temporarily locked. Please try again later.");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const attempts = user.failedAttempts + 1;
      const lockData =
        attempts >= 3
          ? { failedAttempts: attempts, lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
          : { failedAttempts: attempts };
      await prisma.user.update({ where: { id: user.id }, data: lockData });
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.twoFaEnabled) {
      throw new BadRequestError("2FA is not enabled on this account");
    }

    const redeemed = await TwoFAService.redeemRecoveryCode(user.id, recoveryCode);
    if (!redeemed) {
      throw new UnauthorizedError("Invalid or already-used recovery code");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    const remaining = await TwoFAService.getRemainingRecoveryCodes(user.id);
    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVip: user.isVip,
        vipTier: user.vipTier,
        referralCode: user.referralCode,
        role: user.role,
      },
      remainingRecoveryCodes: remaining,
      ...tokens,
    };
  }

  /**
   * Passwordless login by email (after OTP verified externally)
   */
  static async loginByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundError("No account found with this email. Please register.");

    // Check lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError("Account temporarily locked. Please try again later.");
    }

    // Reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVip: user.isVip,
        vipTier: user.vipTier,
        referralCode: user.referralCode,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(token: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Reuse of an ALREADY-rotated token is a theft signal — the legitimate client
    // rotated it, so whoever presents it again is likely an attacker. Revoke the
    // whole token family to force a fresh login for everyone.
    if (stored.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError("Session invalidated for security. Please log in again.");
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Banned users cannot refresh a session.
    if (stored.user.isBanned) {
      throw new UnauthorizedError("Your account has been suspended.");
    }

    // Rotate: revoke the presented token, issue a fresh pair.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const tokens = AuthService.generateTokens(stored.user.id, stored.user.email);
    await AuthService.saveRefreshToken(stored.user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Logout — revoke refresh token
   */
  static async logout(token: string) {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string) {
    const [user, recoveryCodesRemaining] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallet: true,
          _count: {
            select: { burns: true, referralsMade: true },
          },
        },
      }),
      prisma.recoveryCode.count({ where: { userId, usedAt: null } }),
    ]);

    if (!user) throw new NotFoundError("User not found");

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role,
      solanaAddress: user.solanaAddress,
      isVip: user.isVip,
      vipTier: user.vipTier,
      vipExpiresAt: user.vipExpiresAt,
      referralCode: user.referralCode,
      twoFaEnabled: user.twoFaEnabled,
      privacyMode: user.privacyMode,
      banned: user.isBanned,
      isOwner: config.ownerEmails.includes(user.email),
      recoveryCodesRemaining,
      wallet: user.wallet
        ? {
            usdcBalance: user.wallet.usdcBalance,
            ashBalance: user.wallet.ashBalance,
            depositAddress: user.wallet.depositAddress,
            ashBoostExpiresAt: user.wallet.boostExpiresAt,
          }
        : null,
      stats: {
        totalBurns: user._count.burns,
        totalReferrals: user._count.referralsMade,
      },
      createdAt: user.createdAt,
    };
  }

  /**
   * Link a Solana wallet to an existing user account (post-login)
   */
  static async linkWallet(userId: string, data: {
    publicKey: string;
    signature: number[];
    message: string;
  }) {
    // Validate key
    let pubKey: PublicKey;
    try {
      pubKey = new PublicKey(data.publicKey);
    } catch {
      throw new BadRequestError("Invalid Solana public key");
    }

    // Replay attack prevention (5 min window)
    const match = data.message.match(/timestamp:(\d+)/);
    if (!match) throw new BadRequestError("Invalid message format");
    if (Date.now() - parseInt(match[1]) > 5 * 60 * 1000) {
      throw new UnauthorizedError("Message expired. Please try again.");
    }

    // Verify signature
    const msgBytes = new TextEncoder().encode(data.message);
    const sigBytes = new Uint8Array(data.signature);
    let isValid = false;
    try {
      isValid = nacl.sign.detached.verify(msgBytes, sigBytes, pubKey.toBytes());
    } catch {
      // nacl throws on wrong-length signature bytes
    }
    if (!isValid) throw new UnauthorizedError("Invalid wallet signature");

    // Check if address already linked to another account
    const existing = await prisma.user.findUnique({ where: { solanaAddress: data.publicKey } });
    if (existing && existing.id !== userId) {
      throw new ConflictError("This wallet is already linked to another account");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { solanaAddress: data.publicKey },
    });

    return { solanaAddress: data.publicKey };
  }

  /**
   * Find or create a user via Google OAuth
   */
  static async loginWithGoogle(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    // Check if user already exists by email
    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (user) {
      // Only let Google sign-in assume an existing account if that account was
      // actually created via Google. Otherwise it's an email/password (or wallet)
      // account, and logging in by matching email alone would be account takeover.
      if (user.authProvider !== "GOOGLE") {
        throw new ConflictError(
          "An account with this email already exists. Please sign in with your password."
        );
      }
      // Update avatar if not set
      if (!user.avatarUrl && data.avatarUrl) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: data.avatarUrl },
        });
      }
    } else {
      // Create new user from Google account
      const username = await AuthService.generateUniqueUsername(data.name);
      const googleUserId = crypto.randomUUID();

      user = await prisma.$transaction(async (tx: any) => {
        const newUser = await tx.user.create({
          data: {
            id:           googleUserId,
            email:        data.email,
            username,
            avatarUrl:    data.avatarUrl,
            authProvider: "GOOGLE",
            referralCode: crypto.randomBytes(6).toString("hex"),
          },
        });
        await tx.wallet.create({ data: { userId: newUser.id } });
        return newUser;
      });
    }

    if (!user) throw new Error("Failed to create user");
    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Verify a Phantom wallet signature and find/create user
   */
  static async loginWithWallet(data: {
    publicKey: string;
    signature: number[];
    message: string;
  }) {
    // Validate public key format
    let pubKey: PublicKey;
    try {
      pubKey = new PublicKey(data.publicKey);
    } catch {
      throw new BadRequestError("Invalid Solana public key");
    }

    // Verify timestamp in message to prevent replay attacks (5 min window)
    const match = data.message.match(/timestamp:(\d+)/);
    if (!match) throw new BadRequestError("Invalid sign-in message format");
    const ts = parseInt(match[1]);
    if (Date.now() - ts > 5 * 60 * 1000) throw new UnauthorizedError("Sign-in message expired. Please try again.");

    // Verify signature using nacl
    const msgBytes = new TextEncoder().encode(data.message);
    const sigBytes = new Uint8Array(data.signature);
    let isValid = false;
    try {
      isValid = nacl.sign.detached.verify(msgBytes, sigBytes, pubKey.toBytes());
    } catch {
      // nacl throws on wrong-length signature bytes
    }
    if (!isValid) throw new UnauthorizedError("Invalid wallet signature");

    // Find or create user by solana address
    let user = await prisma.user.findUnique({ where: { solanaAddress: data.publicKey } });

    if (!user) {
      const username = await AuthService.generateUniqueUsername("phantom" + data.publicKey.slice(0, 6));
      const walletUserId = crypto.randomUUID();

      user = await prisma.$transaction(async (tx: any) => {
        const newUser = await tx.user.create({
          data: {
            id:            walletUserId,
            // Solana addresses are case-sensitive — do NOT lowercase, or two
            // distinct addresses differing only by case collide on this email.
            email:         `${data.publicKey}@wallet.ashnance`,
            username,
            solanaAddress: data.publicKey,
            authProvider:  "WALLET",
            referralCode:  crypto.randomBytes(6).toString("hex"),
          },
        });
        await tx.wallet.create({ data: { userId: newUser.id } });
        return newUser;
      });
    }

    if (!user) throw new Error("Failed to create user");
    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Generate a unique username from a display name
   */
  private static async generateUniqueUsername(name: string): Promise<string> {
    // Sanitize: keep only alphanumeric + underscore, max 16 chars
    const base = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "user";
    let username = base;
    let attempt = 0;
    while (true) {
      const exists = await prisma.user.findUnique({ where: { username } });
      if (!exists) return username;
      attempt++;
      username = `${base}${attempt}`;
    }
  }

  /**
   * Update user profile (username, avatarUrl, privacyMode, country)
   */
  static async updateProfile(
    userId: string,
    data: { username?: string; avatarUrl?: string; privacyMode?: boolean; country?: string }
  ) {
    if (data.username) {
      const conflict = await prisma.user.findFirst({
        where: { username: data.username, NOT: { id: userId } },
      });
      if (conflict) throw new ConflictError("Username already taken");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.privacyMode !== undefined && { privacyMode: data.privacyMode }),
        ...(data.country !== undefined && { country: data.country }),
      },
      select: {
        id: true, email: true, username: true, avatarUrl: true,
        privacyMode: true, isVip: true, vipTier: true,
      },
    });

    return updated;
  }

  /**
   * Change password (requires current password verification)
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestError("No password set. Use OTP login.");
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedError("Current password is incorrect");

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    // Invalidate all existing sessions so a compromised refresh token can't
    // survive a password change.
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  // ---- Helpers ----

  private static generateTokens(userId: string, email: string) {
    // jti = unique nonce per token. Without it, two tokens minted for the same
    // user in the same second are byte-identical (JWTs are deterministic), and
    // saving the refresh token then violates the unique `token` constraint —
    // which made POST /api/auth/refresh 500 and logged users out on reopen.
    const accessToken = jwt.sign(
      { userId, email, jti: crypto.randomUUID() },
      config.jwt.secret,
      { algorithm: "HS256", expiresIn: 900 }
    );

    const refreshToken = jwt.sign(
      { userId, email, type: "refresh", jti: crypto.randomUUID() },
      config.jwt.refreshSecret,
      { algorithm: "HS256", expiresIn: 604800 }
    );

    return { accessToken, refreshToken };
  }

  private static async saveRefreshToken(userId: string, token: string) {
    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }
}

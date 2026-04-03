import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { prisma } from "../utils/prisma";
import { config } from "../config";
import { BlockchainService } from "./blockchainService";
import { watchDepositAddress } from "./depositMonitorService";
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
      throw new ConflictError(
        existing.email === data.email
          ? "Email already registered"
          : "Username already taken"
      );
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

    // Pre-generate user ID so we can derive a deterministic deposit address
    const userId = crypto.randomUUID();
    const depositAddress = await BlockchainService.generateDepositAddress(userId);

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
        data: {
          userId: newUser.id,
          depositAddress,
        },
      });

      // Create referral record if referred
      if (referredById) {
        await tx.referral.create({
          data: {
            referrerId: referredById,
            refereeId: newUser.id,
          },
        });
      }

      return newUser;
    });

    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    // Start on-chain deposit monitor for this new wallet
    watchDepositAddress(user.id, depositAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        referralCode: user.referralCode,
      },
      ...tokens,
    };
  }

  /**
   * Login with email + password
   */
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError(
        `Account locked until ${user.lockedUntil.toISOString()}`
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
      },
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
      throw new AccountLockedError(`Account locked until ${user.lockedUntil.toISOString()}`);
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

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    // Issue new tokens
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        _count: {
          select: { burns: true, referralsMade: true },
        },
      },
    });

    if (!user) throw new NotFoundError("User not found");

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      solanaAddress: user.solanaAddress,
      isVip: user.isVip,
      vipTier: user.vipTier,
      vipExpiresAt: user.vipExpiresAt,
      referralCode: user.referralCode,
      twoFaEnabled: user.twoFaEnabled,
      privacyMode: user.privacyMode,
      wallet: user.wallet
        ? {
            usdcBalance: user.wallet.usdcBalance,
            ashBalance: user.wallet.ashBalance,
            depositAddress: user.wallet.depositAddress,
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
    const isValid = nacl.sign.detached.verify(msgBytes, sigBytes, pubKey.toBytes());
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
    let newDepositAddress: string | undefined;

    if (user) {
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
      newDepositAddress = await BlockchainService.generateDepositAddress(googleUserId);

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
        await tx.wallet.create({
          data: { userId: newUser.id, depositAddress: newDepositAddress },
        });
        return newUser;
      });
    }

    if (!user) throw new Error("Failed to create user");
    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    // Start deposit monitor for newly created Google users
    if (newDepositAddress) watchDepositAddress(user.id, newDepositAddress);

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
    const isValid = nacl.sign.detached.verify(msgBytes, sigBytes, pubKey.toBytes());
    if (!isValid) throw new UnauthorizedError("Invalid wallet signature");

    // Find or create user by solana address
    let user = await prisma.user.findUnique({ where: { solanaAddress: data.publicKey } });
    let newDepositAddress: string | undefined;

    if (!user) {
      const username = await AuthService.generateUniqueUsername("phantom" + data.publicKey.slice(0, 6));
      const walletUserId = crypto.randomUUID();
      newDepositAddress = await BlockchainService.generateDepositAddress(walletUserId);

      user = await prisma.$transaction(async (tx: any) => {
        const newUser = await tx.user.create({
          data: {
            id:            walletUserId,
            email:         `${data.publicKey.toLowerCase()}@wallet.ashnance`,
            username,
            solanaAddress: data.publicKey,
            authProvider:  "WALLET",
            referralCode:  crypto.randomBytes(6).toString("hex"),
          },
        });
        await tx.wallet.create({
          data: { userId: newUser.id, depositAddress: newDepositAddress },
        });
        return newUser;
      });
    }

    if (!user) throw new Error("Failed to create user");
    const tokens = AuthService.generateTokens(user.id, user.email);
    await AuthService.saveRefreshToken(user.id, tokens.refreshToken);

    // Start deposit monitor for newly created wallet users
    if (newDepositAddress) watchDepositAddress(user.id, newDepositAddress);

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
  }

  // ---- Helpers ----

  private static generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign(
      { userId, email },
      config.jwt.secret,
      { expiresIn: 900 } // 15 minutes in seconds
    );

    const refreshToken = jwt.sign(
      { userId, email, type: "refresh" },
      config.jwt.refreshSecret,
      { expiresIn: 604800 } // 7 days in seconds
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

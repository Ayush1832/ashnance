import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../utils/prisma";
import { config } from "../config";
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  AccountLockedError,
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

    // Generate unique deposit address (placeholder — in prod, use Solana keypair)
    const depositAddress = `ash_${crypto.randomBytes(20).toString("hex")}`;

    // Create user + wallet in transaction
    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
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

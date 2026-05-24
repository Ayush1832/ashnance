import speakeasy from "speakeasy";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { prisma } from "../utils/prisma";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors";

const RECOVERY_CODE_COUNT = 8;
const RECOVERY_CODE_LENGTH = 10; // e.g. "A3K9-PX72W" — shown as two groups of 5

function generatePlaintextCode(): string {
  const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export class TwoFAService {
  /**
   * Generate a 2FA secret for user setup
   */
  static async generateSecret(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    if (user.twoFaEnabled) {
      throw new BadRequestError("2FA is already enabled");
    }

    const secret = speakeasy.generateSecret({
      name: `Ashnance (${user.email})`,
      issuer: "Ashnance",
    });

    // Store secret temporarily (will be confirmed on verification)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: secret.base32 },
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  /**
   * Verify and enable 2FA.
   * Returns 8 one-time backup recovery codes shown exactly once.
   * Store them securely — they cannot be retrieved again.
   */
  static async enable(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFaSecret) {
      throw new BadRequestError("Generate a secret first");
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: "base32",
      token,
    });

    if (!isValid) {
      throw new UnauthorizedError("Invalid 2FA token");
    }

    // Generate recovery codes
    const plainCodes: string[] = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      plainCodes.push(generatePlaintextCode());
    }

    // Hash and persist — plaintext codes are NOT stored
    const hashed = await Promise.all(
      plainCodes.map(async (code) => {
        const codeHash = await bcrypt.hash(code.replace("-", ""), 10);
        return { userId, codeHash };
      })
    );

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { twoFaEnabled: true },
      }),
      // Delete any stale recovery codes from a previous 2FA setup
      prisma.recoveryCode.deleteMany({ where: { userId } }),
      prisma.recoveryCode.createMany({ data: hashed }),
    ]);

    return {
      success: true,
      message: "2FA enabled successfully",
      recoveryCodes: plainCodes,
    };
  }

  /**
   * Disable 2FA. Clears all recovery codes.
   */
  static async disable(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFaEnabled || !user.twoFaSecret) {
      throw new BadRequestError("2FA is not enabled");
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: "base32",
      token,
    });

    if (!isValid) {
      throw new UnauthorizedError("Invalid 2FA token");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { twoFaEnabled: false, twoFaSecret: null },
      }),
      prisma.recoveryCode.deleteMany({ where: { userId } }),
    ]);

    return { success: true, message: "2FA disabled" };
  }

  /**
   * Verify a TOTP token. Returns true/false.
   */
  static async verify(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFaEnabled || !user.twoFaSecret) {
      throw new BadRequestError("2FA is not enabled");
    }

    return speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: "base32",
      token,
    });
  }

  /**
   * Redeem a backup recovery code in lieu of a TOTP token.
   * Each code is one-time-use — it is marked as used on success.
   * Returns true if a valid unused code was found, false otherwise.
   */
  static async redeemRecoveryCode(userId: string, rawCode: string): Promise<boolean> {
    const normalized = rawCode.replace("-", "").trim().toUpperCase();
    const codes = await prisma.recoveryCode.findMany({
      where: { userId, usedAt: null },
    });

    for (const code of codes) {
      const match = await bcrypt.compare(normalized, code.codeHash);
      if (match) {
        await prisma.recoveryCode.update({
          where: { id: code.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }
    return false;
  }

  /**
   * Count remaining unused recovery codes for a user.
   */
  static async getRemainingRecoveryCodes(userId: string): Promise<number> {
    return prisma.recoveryCode.count({ where: { userId, usedAt: null } });
  }
}

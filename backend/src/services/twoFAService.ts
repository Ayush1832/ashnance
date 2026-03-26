import speakeasy from "speakeasy";
import { prisma } from "../utils/prisma";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors";

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
   * Verify and enable 2FA
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

    await prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: true },
    });

    return { success: true, message: "2FA enabled successfully" };
  }

  /**
   * Disable 2FA
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

    await prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: false, twoFaSecret: null },
    });

    return { success: true, message: "2FA disabled" };
  }

  /**
   * Verify a 2FA token (for withdrawal checks etc.)
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
}

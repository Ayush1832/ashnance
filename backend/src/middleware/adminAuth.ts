import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { UnauthorizedError } from "../utils/errors";
import { config } from "../config";
import { AuthRequest } from "./auth";

/**
 * Admin gate — accepts users whose DB role is ADMIN OR whose email is in
 * config.ownerEmails (owners implicitly have admin powers).
 *
 * Must be used AFTER the `authenticate` middleware.
 */
export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new UnauthorizedError("Authentication required");
    }

    // Owner emails always pass the admin gate
    if (config.ownerEmails.includes(authReq.user.email)) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      throw new UnauthorizedError("Admin access required");
    }

    next();
  } catch (error) {
    next(error);
  }
};

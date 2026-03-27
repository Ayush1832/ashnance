import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { UnauthorizedError } from "../utils/errors";
import { AuthRequest } from "./auth";

/**
 * Admin role middleware — checks if authenticated user has ADMIN role
 * Must be used AFTER the `authenticate` middleware
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

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UnauthorizedError, AccountLockedError, ForbiddenError } from "../utils/errors";
import { prisma } from "../utils/prisma";

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

/**
 * Middleware: Verify JWT access token
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] }) as AuthPayload;

    // Check if user account is locked
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, lockedUntil: true, isBanned: true },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Centrally block banned users at the auth layer so a ban can't be bypassed
    // by simply continuing to use an already-issued token on any endpoint.
    if (user.isBanned) {
      throw new ForbiddenError("Your account has been suspended.");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError("Account is temporarily locked due to security concerns");
    }

    req.user = { userId: user.id, email: user.email };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid or expired token"));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware: Optional auth — attaches user if token present, doesn't fail
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] }) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    next(); // silently continue without auth
  }
};

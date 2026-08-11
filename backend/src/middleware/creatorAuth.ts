import { Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "../utils/errors";
import { AuthRequest } from "./auth";

export interface CreatorRequest extends AuthRequest {
  creator?: { id: string; verified: boolean };
}

/**
 * Creator gate — must run AFTER `authenticate`. Attaches req.creator if the
 * caller has claimed a Creator profile. A distinct tier from requireAdmin/
 * requireOwner — a creator is not an admin, and verification (Creator.verified)
 * is a separate flag checked per-action, not by this middleware itself, since
 * some routes (e.g. GET /profile) should work for unverified creators too.
 */
export const requireCreator = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, verified: true },
    });

    if (!creator) {
      throw new NotFoundError("No creator profile found. Create one first.");
    }

    (req as CreatorRequest).creator = creator;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Verifies the CreatorPool identified by poolId belongs to req.creator.
 * Not global middleware — poolId is a route param, so this is called inside
 * handlers after requireCreator has run.
 */
export async function assertPoolOwnership(creatorId: string, poolId: string) {
  const pool = await prisma.creatorPool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new NotFoundError("Pool not found");
  }
  if (pool.creatorId !== creatorId) {
    throw new ForbiddenError("You do not own this pool");
  }
  return pool;
}

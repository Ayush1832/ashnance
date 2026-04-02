import { Response, NextFunction } from "express";
import { config } from "../config";
import { UnauthorizedError } from "../utils/errors";
import { AuthRequest } from "./auth";

export function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  const email = req.user?.email;
  if (!email || !config.ownerEmails.includes(email)) {
    return next(new UnauthorizedError("Owner access required"));
  }
  next();
}

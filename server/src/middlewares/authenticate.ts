// LEARN: Authentication middleware.
// Runs BEFORE any protected route handler. Checks the Authorization header,
// verifies the JWT, and attaches the user payload to req.user.
//
// Usage:
//   router.get('/me', authenticate, userController.getMe)
//   router.get('/public', publicController.show)  // no authenticate
//
// Header format expected: "Authorization: Bearer <token>"

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@utils/token";
import { AppError } from "@utils/AppError";

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("No token provided.", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;  // attach to request — available in all subsequent handlers
    return next();
  } catch {
    return next(new AppError("Invalid or expired token.", 401));
  }
};

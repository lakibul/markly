// LEARN: Central error handler — the "catch-all" for the entire Express app.
// Express identifies an error handler by its 4 parameters: (err, req, res, next).
// Any time next(error) is called (or an async error is caught by asyncHandler),
// Express skips all regular middleware and jumps straight here.
//
// This is the LAST middleware registered in app.ts.

import { Request, Response, NextFunction } from "express";
import { AppError } from "@utils/AppError";
import { env } from "@config/env";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction  // must declare 4 params even if unused
) => {
  // Our own AppError — has a known statusCode
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(env.isDev && { stack: err.stack }),
    });
  }

  // Prisma unique constraint violation (e.g., duplicate email)
  if ((err as any).code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
    });
  }

  // Prisma record not found
  if ((err as any).code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired." });
  }

  // Unknown error — log it and return 500
  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error.",
    ...(env.isDev && { error: err.message, stack: err.stack }),
  });
};

// LEARN: Express doesn't catch async errors automatically (in older versions).
// Without asyncHandler, you'd need try/catch in EVERY controller:
//
//   router.get('/', async (req, res, next) => {
//     try { ... } catch (e) { next(e) }  // repeated boilerplate!
//   })
//
// asyncHandler wraps any async function and automatically calls next(error)
// when a promise rejects. This lets our central error handler catch everything.

import { Request, Response, NextFunction } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncFn) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

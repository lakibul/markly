// LEARN: Validation middleware with Zod.
// Zod schemas define the EXACT shape of expected input at runtime.
// If the request body doesn't match the schema, we return a 400 with details.
//
// Usage:
//   router.post('/login', validate(loginSchema), authController.login)
//
// LEARN: Why validate at the route level (not in the service)?
//  - Fail fast: reject bad input before it reaches business logic or the DB
//  - Separation of concerns: routes handle HTTP, services handle business logic

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type Target = "body" | "params" | "query";

export const validate =
  (schema: ZodSchema, target: Target = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Replace the target with the parsed (and possibly coerced/stripped) data
    req[target] = result.data;
    return next();
  };

function formatZodErrors(error: ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

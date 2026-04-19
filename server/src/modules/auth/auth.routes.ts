// LEARN: Routes connect HTTP methods + paths to controller functions.
// Middleware is applied per-route or per-router.
// Reading a route definition tells you: method + path + validation + handler
//
//   POST /api/auth/register → validate body → authController.register

import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "@middlewares/validate";
import { authLimiter } from "@middlewares/rateLimiter";
import { registerSchema, loginSchema, refreshSchema } from "./auth.schema";

const router = Router();

// Apply strict rate limit to all auth routes
router.use(authLimiter);

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", validate(refreshSchema), authController.logout);

export default router;

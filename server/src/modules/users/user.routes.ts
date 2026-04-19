import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate } from "@middlewares/authenticate";

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get("/me", userController.getMe);
router.patch("/me", userController.updateProfile);

export default router;

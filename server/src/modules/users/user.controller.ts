import { Request, Response } from "express";
import { userService } from "./user.service";
import { sendSuccess } from "@utils/response";
import { asyncHandler } from "@utils/asyncHandler";

export const userController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getMe(req.user!.userId);
    sendSuccess(res, user);
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const { name, avatarUrl } = req.body;
    const user = await userService.updateProfile(req.user!.userId, { name, avatarUrl });
    sendSuccess(res, user, "Profile updated.");
  }),
};

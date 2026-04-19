// LEARN: Controllers are the HTTP layer. They:
//   1. Extract data from the request (body, params, query, headers)
//   2. Call the appropriate service method
//   3. Send the response
//
// Controllers should NOT contain business logic — that belongs in the service.
// Thin controllers make the code easy to test and maintain.

import { Request, Response } from "express";
import { authService } from "./auth.service";
import { sendSuccess } from "@utils/response";
import { asyncHandler } from "@utils/asyncHandler";
import { RegisterInput, LoginInput, RefreshInput } from "./auth.schema";

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as RegisterInput;
    const result = await authService.register(input);
    sendSuccess(res, result, "Account created successfully.", 201);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as LoginInput;
    const result = await authService.login(input);
    sendSuccess(res, result, "Login successful.");
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as RefreshInput;
    const result = await authService.refresh(refreshToken);
    sendSuccess(res, result, "Token refreshed.");
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as RefreshInput;
    await authService.logout(refreshToken);
    sendSuccess(res, null, "Logged out successfully.");
  }),
};

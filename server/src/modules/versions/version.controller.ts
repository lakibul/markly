import { Request, Response } from "express";
import { versionService } from "./version.service";
import { sendSuccess, sendPaginated } from "@utils/response";
import { asyncHandler } from "@utils/asyncHandler";

export const versionController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    const result = await versionService.list(
      req.params.documentId,
      req.user!.userId,
      Number(page) || 1,
      Number(limit) || 20
    );
    sendPaginated(res, result.versions, result.total, result.page, result.limit);
  }),

  createManual: asyncHandler(async (req: Request, res: Response) => {
    const { label } = req.body;
    const version = await versionService.createManual(req.params.documentId, req.user!.userId, label);
    sendSuccess(res, version, "Version saved.", 201);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const result = await versionService.restore(req.params.versionId, req.user!.userId);
    sendSuccess(res, result, "Document restored to selected version.");
  }),
};

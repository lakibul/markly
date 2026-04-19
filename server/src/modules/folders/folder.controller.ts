import { Request, Response } from "express";
import { folderService } from "./folder.service";
import { sendSuccess } from "@utils/response";
import { asyncHandler } from "@utils/asyncHandler";

export const folderController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const folders = await folderService.list(req.user!.userId);
    sendSuccess(res, folders);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, parentId } = req.body;
    const folder = await folderService.create(req.user!.userId, name, parentId);
    sendSuccess(res, folder, "Folder created.", 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    const folder = await folderService.update(req.params.id, req.user!.userId, name);
    sendSuccess(res, folder, "Folder updated.");
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await folderService.delete(req.params.id, req.user!.userId);
    sendSuccess(res, null, "Folder deleted.");
  }),
};

import { Request, Response } from "express";
import { documentService } from "./document.service";
import { sendSuccess, sendPaginated } from "@utils/response";
import { asyncHandler } from "@utils/asyncHandler";
import {
  CreateDocumentInput,
  UpdateDocumentInput,
  ListDocumentsQuery,
} from "./document.schema";

export const documentController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListDocumentsQuery;
    const { documents, total, page, limit } = await documentService.list(req.user!.userId, query);
    sendPaginated(res, documents, total, page, limit);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const doc = await documentService.getById(req.params.id, req.user!.userId);
    sendSuccess(res, doc);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const doc = await documentService.create(req.user!.userId, req.body as CreateDocumentInput);
    sendSuccess(res, doc, "Document created.", 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const doc = await documentService.update(req.params.id, req.user!.userId, req.body as UpdateDocumentInput);
    sendSuccess(res, doc, "Document updated.");
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await documentService.delete(req.params.id, req.user!.userId);
    sendSuccess(res, null, "Document deleted.");
  }),

  share: asyncHandler(async (req: Request, res: Response) => {
    const { isPublic } = req.body as { isPublic: boolean };
    const result = await documentService.share(req.params.id, req.user!.userId, isPublic);
    sendSuccess(res, result, `Document ${isPublic ? "shared" : "unshared"}.`);
  }),

  getShared: asyncHandler(async (req: Request, res: Response) => {
    const doc = await documentService.getByShareToken(req.params.token);
    sendSuccess(res, doc);
  }),

  addCollaborator: asyncHandler(async (req: Request, res: Response) => {
    const { email, role } = req.body;
    const result = await documentService.addCollaborator(req.params.id, req.user!.userId, email, role);
    sendSuccess(res, result, "Collaborator added.", 201);
  }),

  removeCollaborator: asyncHandler(async (req: Request, res: Response) => {
    await documentService.removeCollaborator(req.params.id, req.user!.userId, req.params.userId);
    sendSuccess(res, null, "Collaborator removed.");
  }),
};

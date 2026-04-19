import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().default(""),
  folderId: z.string().cuid().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  isPublic: z.boolean().default(false),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  folderId: z.string().cuid().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().optional(),
});

export const listDocumentsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  folderId: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(["updatedAt", "createdAt", "title"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const shareDocumentSchema = z.object({
  isPublic: z.boolean(),
  role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
});

export const addCollaboratorSchema = z.object({
  email: z.string().email(),
  role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsSchema>;

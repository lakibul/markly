// LEARN: This service covers all Phase 1 + Phase 2 document operations.
// Key patterns demonstrated:
//   - Prisma queries with where, select, include, orderBy, skip, take
//   - Authorization checks (does this user own this document?)
//   - Prisma transactions (save doc + create version atomically)
//   - Generating secure share tokens with uuid

import { prisma } from "@config/database";
import { AppError } from "@utils/AppError";
import { getPagination } from "@utils/pagination";
import { v4 as uuidv4 } from "uuid";
import {
  CreateDocumentInput,
  UpdateDocumentInput,
  ListDocumentsQuery,
} from "./document.schema";

export const documentService = {
  // ─── List documents (with search, filter, pagination) ─────────────────────
  async list(userId: string, query: ListDocumentsQuery) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    // LEARN: Prisma `where` clause builds SQL WHERE conditions.
    // We dynamically add conditions only if the query param is provided.
    const where = {
      ownerId: userId,
      ...(query.folderId !== undefined && {
        folderId: query.folderId === "null" ? null : query.folderId,
      }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...(query.search && {
        title: { contains: query.search, mode: "insensitive" as const },
      }),
    };

    // LEARN: Prisma transactions allow running multiple queries in a single DB roundtrip
    const [documents, total] = await prisma.$transaction([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sort]: query.order },
        select: {
          id: true,
          title: true,
          tags: true,
          isPublic: true,
          folderId: true,
          createdAt: true,
          updatedAt: true,
          folder: { select: { id: true, name: true } },
          _count: { select: { versions: true, collaborators: true, attachments: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return { documents, total, page, limit };
  },

  // ─── Get single document ──────────────────────────────────────────────────
  async getById(documentId: string, userId: string) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        folder: { select: { id: true, name: true } },
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: true,
        _count: { select: { versions: true } },
      },
    });

    if (!doc) throw new AppError("Document not found.", 404);

    // Check access: owner OR collaborator
    const isOwner = doc.ownerId === userId;
    const isCollaborator = doc.collaborators.some((c) => c.userId === userId);
    if (!isOwner && !isCollaborator) throw new AppError("Access denied.", 403);

    return doc;
  },

  // ─── Create document ──────────────────────────────────────────────────────
  async create(userId: string, input: CreateDocumentInput) {
    // Validate folder ownership if provided
    if (input.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: input.folderId, ownerId: userId },
      });
      if (!folder) throw new AppError("Folder not found.", 404);
    }

    return prisma.document.create({
      data: {
        title: input.title,
        content: input.content,
        tags: input.tags,
        isPublic: input.isPublic,
        ownerId: userId,
        folderId: input.folderId ?? null,
      },
      select: { id: true, title: true, content: true, tags: true, isPublic: true, createdAt: true },
    });
  },

  // ─── Update document (auto-saves a version) ───────────────────────────────
  // LEARN: Prisma transactions ensure that the document update AND version creation
  // either both succeed or both fail — no partial updates.
  async update(documentId: string, userId: string, input: UpdateDocumentInput) {
    const doc = await findOwnedDocument(documentId, userId);

    // If content changed, auto-save current content as a version before updating
    if (input.content !== undefined && input.content !== doc.content) {
      await prisma.$transaction([
        prisma.documentVersion.create({
          data: { documentId, content: doc.content, label: "Auto-save", createdBy: userId },
        }),
        prisma.document.update({
          where: { id: documentId },
          data: { ...input, folderId: input.folderId ?? undefined },
        }),
      ]);
    } else {
      await prisma.document.update({
        where: { id: documentId },
        data: { ...input, folderId: input.folderId ?? undefined },
      });
    }

    return prisma.document.findUnique({ where: { id: documentId } });
  },

  // ─── Delete document ──────────────────────────────────────────────────────
  async delete(documentId: string, userId: string) {
    await findOwnedDocument(documentId, userId);
    await prisma.document.delete({ where: { id: documentId } });
  },

  // ─── Share document (generate public link or toggle visibility) ───────────
  async share(documentId: string, userId: string, isPublic: boolean) {
    await findOwnedDocument(documentId, userId);

    // Generate a unique share token if making public for the first time
    const shareToken = isPublic ? uuidv4() : null;

    return prisma.document.update({
      where: { id: documentId },
      data: { isPublic, shareToken },
      select: { id: true, isPublic: true, shareToken: true },
    });
  },

  // ─── Get document by share token (public, no auth) ────────────────────────
  async getByShareToken(shareToken: string) {
    const doc = await prisma.document.findUnique({
      where: { shareToken },
      select: {
        id: true, title: true, content: true, tags: true, createdAt: true, updatedAt: true,
        owner: { select: { name: true, avatarUrl: true } },
      },
    });
    if (!doc) throw new AppError("Shared document not found.", 404);
    return doc;
  },

  // ─── Add collaborator ─────────────────────────────────────────────────────
  async addCollaborator(documentId: string, ownerId: string, email: string, role: "VIEWER" | "EDITOR") {
    await findOwnedDocument(documentId, ownerId);

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) throw new AppError("User not found.", 404);
    if (targetUser.id === ownerId) throw new AppError("Cannot add yourself as collaborator.", 400);

    return prisma.collaborator.upsert({
      where: { documentId_userId: { documentId, userId: targetUser.id } },
      update: { role },
      create: { documentId, userId: targetUser.id, role },
    });
  },

  // ─── Remove collaborator ──────────────────────────────────────────────────
  async removeCollaborator(documentId: string, ownerId: string, collaboratorUserId: string) {
    await findOwnedDocument(documentId, ownerId);
    await prisma.collaborator.deleteMany({ where: { documentId, userId: collaboratorUserId } });
  },
};

// ─── Helper: find doc and verify ownership ────────────────────────────────────
async function findOwnedDocument(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new AppError("Document not found.", 404);
  if (doc.ownerId !== userId) throw new AppError("Access denied.", 403);
  return doc;
}

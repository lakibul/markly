// LEARN: Document versioning — every content save creates a snapshot.
// This is a simplified version of how Google Docs history works.
// In production, you'd store diffs (deltas) rather than full content
// to save storage, but full snapshots are simpler to start with.

import { prisma } from "@config/database";
import { AppError } from "@utils/AppError";
import { getPagination } from "@utils/pagination";

export const versionService = {
  async list(documentId: string, userId: string, page = 1, limit = 20) {
    // Verify user has access to the document
    const doc = await prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
      },
    });
    if (!doc) throw new AppError("Document not found or access denied.", 404);

    const { skip } = getPagination(page, limit);

    const [versions, total] = await prisma.$transaction([
      prisma.documentVersion.findMany({
        where: { documentId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.documentVersion.count({ where: { documentId } }),
    ]);

    return { versions, total, page, limit };
  },

  async createManual(documentId: string, userId: string, label?: string) {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, ownerId: userId },
    });
    if (!doc) throw new AppError("Document not found.", 404);

    return prisma.documentVersion.create({
      data: { documentId, content: doc.content, label: label ?? null, createdBy: userId },
    });
  },

  async restore(versionId: string, userId: string) {
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { document: true },
    });
    if (!version) throw new AppError("Version not found.", 404);
    if (version.document.ownerId !== userId) throw new AppError("Access denied.", 403);

    // Save current state as a version before restoring
    await prisma.$transaction([
      prisma.documentVersion.create({
        data: {
          documentId: version.documentId,
          content: version.document.content,
          label: "Before restore",
          createdBy: userId,
        },
      }),
      prisma.document.update({
        where: { id: version.documentId },
        data: { content: version.content },
      }),
    ]);

    return { documentId: version.documentId, restoredContent: version.content };
  },
};

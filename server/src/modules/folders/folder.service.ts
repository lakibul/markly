import { prisma } from "@config/database";
import { AppError } from "@utils/AppError";

export const folderService = {
  async list(userId: string) {
    return prisma.folder.findMany({
      where: { ownerId: userId },
      include: {
        children: { select: { id: true, name: true } },
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async create(userId: string, name: string, parentId?: string | null) {
    if (parentId) {
      const parent = await prisma.folder.findFirst({ where: { id: parentId, ownerId: userId } });
      if (!parent) throw new AppError("Parent folder not found.", 404);
    }
    return prisma.folder.create({
      data: { name, ownerId: userId, parentId: parentId ?? null },
    });
  },

  async update(folderId: string, userId: string, name: string) {
    const folder = await prisma.folder.findFirst({ where: { id: folderId, ownerId: userId } });
    if (!folder) throw new AppError("Folder not found.", 404);
    return prisma.folder.update({ where: { id: folderId }, data: { name } });
  },

  async delete(folderId: string, userId: string) {
    const folder = await prisma.folder.findFirst({ where: { id: folderId, ownerId: userId } });
    if (!folder) throw new AppError("Folder not found.", 404);
    // Documents in this folder will have folderId set to null (SetNull cascade)
    await prisma.folder.delete({ where: { id: folderId } });
  },
};

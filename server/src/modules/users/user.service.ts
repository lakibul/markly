import { prisma } from "@config/database";
import { AppError } from "@utils/AppError";

export const userService = {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { documents: true, folders: true } },
      },
    });
    if (!user) throw new AppError("User not found.", 404);
    return user;
  },

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, avatarUrl: true, updatedAt: true },
    });
  },
};

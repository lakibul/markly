// LEARN: PrismaClient is a singleton — we create ONE instance for the whole app.
// If we created a new PrismaClient() on every request, we'd exhaust the DB
// connection pool very quickly. Singleton pattern solves this.
//
// In development, Next.js hot-reloading can accidentally create multiple instances,
// so we stash it on `global` to prevent that (the `globalForPrisma` trick).

import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev ? ["query", "error", "warn"] : ["error"],
  });

if (env.isDev) globalForPrisma.prisma = prisma;

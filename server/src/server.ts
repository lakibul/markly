// LEARN: server.ts is the entry point — it starts the HTTP server.
// We keep it separate from app.ts so tests can import app without starting a server.
//
// The startup sequence:
//   1. Load env config (fail fast if missing vars)
//   2. Connect to DB (test the connection)
//   3. Start listening on the port
//   4. Handle graceful shutdown (SIGTERM/SIGINT)

import { env } from "@config/env";
import { prisma } from "@config/database";
import app from "./app";

async function bootstrap() {
  // Test DB connection before starting the server
  await prisma.$connect();
  console.log("✅ Database connected");

  const server = app.listen(env.port, () => {
    console.log(`🚀 Server running at http://localhost:${env.port}`);
    console.log(`📊 Environment: ${env.nodeEnv}`);
    console.log(`🔍 Health check: http://localhost:${env.port}/health`);
  });

  // LEARN: Graceful shutdown — when the process receives SIGTERM (e.g., from
  // Docker, Kubernetes, or Ctrl+C), we stop accepting new requests, finish
  // existing ones, then close the DB connection cleanly.
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log("💤 Server closed. DB disconnected.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection:", reason);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

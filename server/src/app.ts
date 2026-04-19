// LEARN: app.ts is the Express application factory.
// We separate the app from server.ts so we can import the app in tests
// without actually starting a server on a port.
//
// Middleware order matters in Express — each middleware runs top to bottom.
// The flow for every request:
//   helmet → cors → morgan → body-parser → routes → 404 → errorHandler

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "@config/env";
import { errorHandler } from "@middlewares/errorHandler";
import { apiLimiter } from "@middlewares/rateLimiter";

// Route imports
import authRoutes from "@modules/auth/auth.routes";
import userRoutes from "@modules/users/user.routes";
import documentRoutes from "@modules/documents/document.routes";
import folderRoutes from "@modules/folders/folder.routes";
import versionRoutes from "@modules/versions/version.routes";
import uploadRoutes from "@modules/uploads/upload.routes";

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
// helmet sets secure HTTP headers (XSS protection, no sniff content type, etc.)
app.use(helmet());

// LEARN: CORS (Cross-Origin Resource Sharing) — browsers block requests from
// one origin to another by default. We whitelist our React client's origin.
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,  // allows cookies/auth headers cross-origin
  })
);

// ─── Logging ─────────────────────────────────────────────────────────────────
if (env.isDev) {
  app.use(morgan("dev"));  // logs: GET /api/auth/login 200 45ms
}

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// LEARN: Without body parsing middleware, req.body is undefined.
// express.json() parses requests with Content-Type: application/json
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
// LEARN: /health is used by monitoring tools, Docker, and deployment platforms
// to know if your server is alive and ready to accept traffic.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
// LEARN: Mounting routes at a prefix — all auth routes become /api/auth/*
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/versions", versionRoutes);
app.use("/api/uploads", uploadRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
// MUST be the LAST middleware — 4 params signals to Express this is an error handler
app.use(errorHandler);

export default app;

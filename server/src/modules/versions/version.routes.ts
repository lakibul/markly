import { Router } from "express";
import { versionController } from "./version.controller";
import { authenticate } from "@middlewares/authenticate";

const router = Router();
router.use(authenticate);

// GET  /api/versions/:documentId         → list versions of a document
// POST /api/versions/:documentId         → manually save a named version
// POST /api/versions/:versionId/restore  → restore a specific version
router.get("/:documentId", versionController.list);
router.post("/:documentId", versionController.createManual);
router.post("/:versionId/restore", versionController.restore);

export default router;

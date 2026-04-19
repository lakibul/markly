import { Router } from "express";
import { documentController } from "./document.controller";
import { authenticate } from "@middlewares/authenticate";
import { validate } from "@middlewares/validate";
import {
  createDocumentSchema,
  updateDocumentSchema,
  listDocumentsSchema,
  addCollaboratorSchema,
} from "./document.schema";

const router = Router();

// Public route — no authentication needed
router.get("/shared/:token", documentController.getShared);

// All routes below require a valid JWT
router.use(authenticate);

router.get("/", validate(listDocumentsSchema, "query"), documentController.list);
router.post("/", validate(createDocumentSchema), documentController.create);
router.get("/:id", documentController.getById);
router.patch("/:id", validate(updateDocumentSchema), documentController.update);
router.delete("/:id", documentController.delete);

// Sharing
router.post("/:id/share", documentController.share);

// Collaborators
router.post("/:id/collaborators", validate(addCollaboratorSchema), documentController.addCollaborator);
router.delete("/:id/collaborators/:userId", documentController.removeCollaborator);

export default router;

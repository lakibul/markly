import { Router } from "express";
import { folderController } from "./folder.controller";
import { authenticate } from "@middlewares/authenticate";

const router = Router();
router.use(authenticate);

router.get("/", folderController.list);
router.post("/", folderController.create);
router.patch("/:id", folderController.update);
router.delete("/:id", folderController.delete);

export default router;

import { Router } from "express";
import {
  completeSession,
  createSession,
  getProgress,
  updateProgress,
} from "../controllers/sessionController.js";

const router = Router();

router.post("/", createSession);
router.get("/:sessionId/progress", getProgress);
router.put("/:sessionId/progress", updateProgress);
router.post("/:sessionId/complete", completeSession);

export default router;

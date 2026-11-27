import { Router } from "express";
import {
  completeSession,
  createSession,
  getProgress,
  updateProgress,
} from "../controllers/sessionController.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const router = Router();

// Only creation can use a verified identity. Progress/complete routes remain
// unchanged so the deployed guest client and its saved sessions keep working.
router.post("/", optionalAuth, createSession);
router.get("/:sessionId/progress", getProgress);
router.put("/:sessionId/progress", updateProgress);
router.post("/:sessionId/complete", completeSession);

export default router;

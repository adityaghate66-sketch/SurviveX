import { Router } from "express";
import { summary } from "../controllers/playerController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Protected: a player may only read their own summary. Guest sessions are
// untouched — no auth is added to the existing /sessions or /missions routes.
router.get("/summary", requireAuth, summary);

export default router;

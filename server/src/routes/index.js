import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import missionRoutes from "./missionRoutes.js";

// Every API router is mounted here, which keeps app.js free of route details.
// Later stages add: sessionRoutes.
const router = Router();

router.use("/health", healthRoutes);
router.use("/missions", missionRoutes);

export default router;

import { Router } from "express";
import healthRoutes from "./healthRoutes.js";

// Every API router is mounted here, which keeps app.js free of route details.
// Later stages add: missionRoutes, sessionRoutes.
const router = Router();

router.use("/health", healthRoutes);

export default router;

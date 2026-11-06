import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Builds the Express application without starting it. Keeping "create" and
// "listen" separate is what lets tests import the app later on.
export function createApp() {
  const app = express();

  app.disable("x-powered-by"); // don't advertise the server technology

  // CORS: the browser blocks requests between different origins (ports count),
  // so the Vite dev server on :5173 may only call this API on :4000 if the API
  // explicitly allows it.
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
    })
  );

  // Parses JSON request bodies into req.body. Requests without a body and
  // requests with a non-JSON Content-Type pass through untouched.
  app.use(express.json({ limit: "100kb" }));

  // All feature endpoints live under /api.
  app.use("/api", apiRoutes);

  // Order matters: 404 first, then the error handler, both after all routes.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

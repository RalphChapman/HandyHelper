// Force development mode for Replit environment
process.env.NODE_ENV = "development";

import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { createServer } from "http";

const app = express();
app.use(express.json());

// Simple request logging
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    log(`${req.method} ${req.path}`);
  }
  next();
});

(async () => {
  try {
    const server = createServer(app);

    // Register API routes first
    await registerRoutes(app);

    // Then setup Vite for development
    await setupVite(app, server);

    server.listen(5000, "0.0.0.0", () => {
      log("Server running on port 5000");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
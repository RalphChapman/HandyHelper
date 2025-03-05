// Force development mode for Replit environment
process.env.NODE_ENV = "development";

import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple request logging
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    log(`${req.method} ${req.path}`);
  }
  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Basic error handling
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ message: "Internal Server Error" });
    });

    // Always use setupVite in development
    await setupVite(app, server);

    server.listen(5000, "0.0.0.0", () => {
      log("Server running on port 5000");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
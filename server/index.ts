// Force production mode for Replit environment
process.env.NODE_ENV = "production";

import express from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(compression());

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  log(`[${requestId}] Incoming ${req.method} ${req.path}`);
  log(`[${requestId}] Rate Limit Headers: ${JSON.stringify({
    'x-ratelimit-limit': req.headers['x-ratelimit-limit'],
    'x-ratelimit-remaining': req.headers['x-ratelimit-remaining'],
    'x-ratelimit-reset': req.headers['x-ratelimit-reset']
  })}`);

  // Add small artificial delay to prevent rate limiting
  setTimeout(() => {
    // Log response status and timing after request completes
    res.on('finish', () => {
      const duration = Date.now() - start;
      log(`[${requestId}] Completed ${req.method} ${req.path} with status ${res.statusCode} in ${duration}ms`);
    });

    next();
  }, 100); // 100ms delay
});

(async () => {
  try {
    // Register API routes first
    await registerRoutes(app);

    // Serve static files in production
    serveStatic(app);

    app.listen(5000, "0.0.0.0", () => {
      log("Server running on port 5000");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
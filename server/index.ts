// Force production mode for Replit environment
process.env.NODE_ENV = "production";

import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic, setupVite, log } from "./vite";
import { createServer } from "http";
import path from "path";

const app = express();

// Trust proxies in the Replit environment
app.set('trust proxy', 1);

// Create a limiter for API requests only
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(compression());

// Serve static files from the public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Apply rate limiting to API routes only
app.use("/api", apiLimiter);

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

    try {
      // Try to serve static files first
      serveStatic(app);
      log("Running in production mode with static files");
    } catch (error) {
      // If static files are not available, fall back to development mode
      log("Static files not found, falling back to development mode");
      const server = createServer(app);
      await setupVite(app, server);
      server.listen(5000, "0.0.0.0", () => {
        log("Server running on port 5000 (development mode)");
      });
      return;
    }

    app.listen(5000, "0.0.0.0", () => {
      log("Server running on port 5000 (production mode)");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
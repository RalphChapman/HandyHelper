// Force production mode for Replit environment
process.env.NODE_ENV = "production";

import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
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

// Apply rate limiting to API routes only
app.use("/api", apiLimiter);

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  log(`[${requestId}] Incoming ${req.method} ${req.path}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    log(`[${requestId}] Completed ${req.method} ${req.path} with status ${res.statusCode} in ${duration}ms`);
  });

  next();
});

(async () => {
  try {
    // Register API routes first
    await registerRoutes(app);

    const distPath = path.join(process.cwd(), 'dist', 'public');
    const server = createServer(app);

    if (process.env.NODE_ENV === "production") {
      log(`[Server] Setting up static file serving from ${distPath}`);

      // Serve static files
      app.use(express.static(distPath));

      // Handle client-side routing for all non-API routes
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          log("[Server] Forwarding API request:", req.path);
          return next();
        }

        log("[Server] Serving client app for path:", req.path);
        const indexPath = path.join(distPath, 'index.html');

        res.sendFile(indexPath, (err) => {
          if (err) {
            log("[Server] Error serving index.html:", err);
            next(err);
          }
        });
      });
    } else {
      // In development mode, use Vite's dev server
      log("[Server] Setting up Vite development server");
      await setupVite(app, server);
    }

    server.listen(5000, "0.0.0.0", () => {
      log(`[Server] Server running on port 5000 (${process.env.NODE_ENV} mode)`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
// Remove forced production mode to allow proper environment detection
import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import path from "path";
import fs from 'fs';

const app = express();

// Trust proxies in the Replit environment
app.set('trust proxy', 1);

// Add permissive CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );
  next();
});

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

// Serve static files from the public directory with proper MIME types
app.use(express.static(path.resolve(process.cwd(), "public"), {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));


(async () => {
  try {
    // Register API routes first
    await registerRoutes(app);

    const server = createServer(app);

    if (process.env.NODE_ENV === 'production') {
      // Serve static files in production
      app.use(express.static(path.resolve(process.cwd(), "dist/public")));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(process.cwd(), "dist/public/index.html"));
      });
    } else {
      // Let Vite handle all routing in development
      await setupVite(app, server);
    }

    server.listen(5000, "0.0.0.0", () => {
      log(`[Server] Server running on port 5000 (${process.env.NODE_ENV || 'development'} mode)`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
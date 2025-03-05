import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple rate limiting middleware
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60000; // 1 minute in milliseconds

// Rate limiting middleware - only for API routes
app.use((req, res, next) => {
  const path = req.path;

  // Skip rate limiting for non-API routes and development assets
  if (!path.startsWith('/api')) {
    return next();
  }

  const ip = req.ip || 'unknown';
  const now = Date.now();
  const userRate = rateLimit.get(ip) || { count: 0, resetTime: now + RATE_WINDOW };

  // Reset counter if the window has passed
  if (now > userRate.resetTime) {
    userRate.count = 0;
    userRate.resetTime = now + RATE_WINDOW;
  }

  userRate.count++;
  rateLimit.set(ip, userRate);

  if (userRate.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((userRate.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      message: `Too many requests. Please try again in ${retryAfter} seconds.`
    });
    return;
  }

  // Add debug logging
  log(`API Request (${ip}): ${req.method} ${path} (count: ${userRate.count}/${RATE_LIMIT})`, 'rate-limit');

  const start = Date.now();
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const tryPort = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true,
      })
      .on('listening', () => {
        log(`serving on port ${port}`);
        resolve(port);
      })
      .on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${port} is busy, trying port ${port + 1}`);
          server.close();
          tryPort(port + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  };

  tryPort(5000).catch(err => {
    log(`Failed to start server: ${err.message}`);
    process.exit(1);
  });
})();
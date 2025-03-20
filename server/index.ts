import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import path from "path";
import fs from 'fs';
import { storage } from "./storage";

const app = express();

// Trust proxies in the Replit environment
app.set('trust proxy', 1);

// Add permissive CSP headers that allow PDFs and Google Fonts
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com https://www.googletagmanager.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://www.google.com https://images.unsplash.com; connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://www.google.com; worker-src 'self' blob:;"
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

// Add proper MIME type handling for uploaded files
app.use('/uploads', express.static(path.resolve(process.cwd(), "uploads"), {
  setHeaders: (res, filePath) => {
    console.log('[Server] Serving file:', filePath);

    // Set proper MIME types for images
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    }

    // Add cache control headers
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    // Log response headers for debugging
    console.log('[Server] Response headers:', res.getHeaders());
  }
}));

// Create uploads directory if it doesn't exist
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Log environment and directory contents
console.log('[Server] Environment configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  cwd: process.cwd(),
  uploadsDir
});

try {
  const files = fs.readdirSync(uploadsDir);
  console.log('[Server] Files in uploads directory:', files);
} catch (error) {
  console.error('[Server] Error reading uploads directory:', error);
}


(async () => {
  try {
    // Initialize storage first
    console.log("[Server] Initializing database storage...");
    await storage.initialize();
    console.log("[Server] Database storage initialized successfully");

    // Register API routes
    await registerRoutes(app);

    const server = createServer(app);

    if (process.env.NODE_ENV === 'production') {
      console.log("[Server] Running in PRODUCTION mode");
      
      // Create and verify uploads directory in production
      const productionUploadsDir = path.resolve(process.cwd(), "uploads");
      console.log("[Server] Production uploads directory:", productionUploadsDir);
      
      try {
        if (!fs.existsSync(productionUploadsDir)) {
          console.log("[Server] Creating uploads directory for production");
          fs.mkdirSync(productionUploadsDir, { recursive: true });
        }
        
        // Check if directory is writable
        fs.accessSync(productionUploadsDir, fs.constants.W_OK);
        console.log("[Server] Uploads directory is writable");
        
        // List files in uploads directory
        const files = fs.readdirSync(productionUploadsDir);
        console.log("[Server] Files in production uploads directory:", files);
      } catch (error) {
        console.error("[Server] Error with uploads directory:", error);
      }
      
      // Serve static files in production
      app.use(express.static(path.resolve(process.cwd(), "dist/public")));
      
      // IMPORTANT: Create a route for uploads before the catch-all route
      console.log("[Server] Setting up uploads route for production");
      app.use('/uploads', express.static(productionUploadsDir, {
        setHeaders: (res, filePath) => {
          console.log('[Server] Serving uploaded file in production:', filePath);
          const ext = path.extname(filePath).toLowerCase();
          if (ext === '.jpg' || ext === '.jpeg') {
            res.setHeader('Content-Type', 'image/jpeg');
          } else if (ext === '.png') {
            res.setHeader('Content-Type', 'image/png');
          } else if (ext === '.gif') {
            res.setHeader('Content-Type', 'image/gif');
          } else if (ext === '.webp') {
            res.setHeader('Content-Type', 'image/webp');
          }
          
          // Add cache control
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
      }));
      
      // Catch-all route for client-side routing
      app.get('*', (req, res, next) => {
        // Skip the catch-all for API requests and uploads
        if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
          return next();
        }
        res.sendFile(path.resolve(process.cwd(), "dist/public/index.html"));
      });
    } else {
      // Let Vite handle all routing in development
      await setupVite(app, server);
    }

    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`[Server] Server running on port ${port} (${process.env.NODE_ENV || 'development'} mode)`);
      log(`[Server] For production, using port ${port} mapped to external port 80`);
    });
  } catch (error) {
    console.error("[Server] Failed to start server:", error);
    process.exit(1);
  }
})();
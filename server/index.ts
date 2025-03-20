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
    // First, ensure uploads directory exists with proper permissions
    console.log("[Server] Checking uploads directory on startup...");
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    
    try {
      if (!fs.existsSync(uploadsDir)) {
        console.log("[Server] Creating uploads directory at startup:", uploadsDir);
        fs.mkdirSync(uploadsDir, { recursive: true });
        // Set directory permissions to ensure it's writable
        fs.chmodSync(uploadsDir, 0o755);
      } else {
        console.log("[Server] Uploads directory already exists:", uploadsDir);
      }
      
      // Verify it's writable
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      console.log("[Server] Uploads directory is writable");
      
      // Check what's in the directory
      const files = fs.readdirSync(uploadsDir);
      console.log("[Server] Uploads directory contents:", 
        files.length === 0 ? "Empty directory" : `${files.length} files`);
        
      // Try writing a test file to verify
      const testFile = path.join(uploadsDir, `server-startup-test-${Date.now()}.txt`);
      fs.writeFileSync(testFile, 'Server startup test');
      console.log("[Server] Successfully wrote test file:", testFile);
      
      // Clean up
      fs.unlinkSync(testFile);
      console.log("[Server] Removed test file");
    } catch (error) {
      console.error("[Server] Error with uploads directory during startup:", error);
    }

    // Initialize storage
    console.log("[Server] Initializing database storage...");
    await storage.initialize();
    console.log("[Server] Database storage initialized successfully");

    // Register API routes
    await registerRoutes(app);

    const server = createServer(app);

    if (process.env.NODE_ENV === 'production') {
      console.log("[Server] Running in PRODUCTION mode");
      
      // -------------------- CRITICAL UPLOADS CONFIGURATION ---------------------
      // Get absolute paths for uploads directory
      const productionUploadsDir = path.resolve(process.cwd(), "uploads");
      console.log("[Server] PRODUCTION UPLOADS CONFIG:", {
        uploadsDirectory: productionUploadsDir,
        cwd: process.cwd(),
        envPORT: process.env.PORT || "not set",
        platformDetails: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        }
      });
      
      // Ensure uploads directory exists with correct permissions
      try {
        if (!fs.existsSync(productionUploadsDir)) {
          console.log("[Server] Creating uploads directory for production");
          fs.mkdirSync(productionUploadsDir, { recursive: true });
          
          // Set permissions to 0755 (rwxr-xr-x)
          fs.chmodSync(productionUploadsDir, 0o755); 
          console.log("[Server] Created uploads directory with 0755 permissions");
        }
        
        // Check if directory is writable by writing a test file
        const testFile = path.join(productionUploadsDir, `prod-test-${Date.now()}.txt`);
        fs.writeFileSync(testFile, 'Production test file');
        console.log("[Server] Successfully wrote test file to uploads directory");
        
        // Clean up test file
        fs.unlinkSync(testFile);
        console.log("[Server] Removed test file, directory is writable");
        
        // Get directory stats
        const dirStats = fs.statSync(productionUploadsDir);
        console.log("[Server] Uploads directory stats:", {
          isDirectory: dirStats.isDirectory(),
          mode: dirStats.mode.toString(8),
          uid: dirStats.uid,
          gid: dirStats.gid,
          size: dirStats.size
        });
        
        // List files in uploads directory
        const files = fs.readdirSync(productionUploadsDir);
        console.log("[Server] Files in production uploads directory:", 
          files.length === 0 ? "No files" : files);
      } catch (error) {
        console.error("[Server] CRITICAL ERROR with uploads directory:", error);
        // We'll continue instead of exiting to allow the app to start, 
        // but uploads functionality will be broken
      }
      
      // --------------- ROUTE CONFIGURATION FOR PRODUCTION ---------------------
      console.log("[Server] Setting up production routes in priority order");
      
      // 1. First, setup API routes before any static routes
      //    API routes are already configured via registerRoutes(app) above
      
      // 2. Set up a dedicated uploads route with comprehensive logging and error handling
      console.log("[Server] Setting up enhanced /uploads route for production");
      app.use('/uploads', (req, res, next) => {
        // Enhanced uploads handling for production with direct file serving
        try {
          // Log all upload requests with details
          console.log('[Server] PRODUCTION UPLOADS REQUEST:', {
            path: req.path,
            method: req.method,
            originalUrl: req.originalUrl,
            ip: req.ip
          });
          
          // Safety check - only allow GET requests
          if (req.method !== 'GET') {
            return res.status(405).send('Method not allowed');
          }
          
          // Normalize the path to prevent path traversal
          const fileName = path.basename(req.path);
          if (!fileName || fileName === '' || fileName.includes('..')) {
            return res.status(400).send('Invalid file name');
          }
          
          // Full path to the requested file
          const filePath = path.resolve(productionUploadsDir, fileName);
          console.log(`[Server] Looking for file: ${filePath}`);
          
          // Check if file exists
          if (!fs.existsSync(filePath)) {
            console.error(`[Server] PRODUCTION: File not found: ${filePath}`);
            return res.status(404).send('File not found');
          }
          
          // Check file stats
          const stats = fs.statSync(filePath);
          if (!stats.isFile()) {
            console.error(`[Server] PRODUCTION: Not a file: ${filePath}`);
            return res.status(404).send('Not a file');
          }
          
          // Log detailed file information for debugging
          console.log(`[Server] PRODUCTION: Serving file: ${filePath}`, {
            size: stats.size,
            permissions: stats.mode.toString(8),
            uid: stats.uid, 
            gid: stats.gid,
            mtime: stats.mtime.toISOString()
          });
          
          // Determine content type based on file extension
          const ext = path.extname(filePath).toLowerCase();
          let contentType = 'application/octet-stream'; // Default
          
          if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
          } else if (ext === '.png') {
            contentType = 'image/png';
          } else if (ext === '.gif') {
            contentType = 'image/gif';
          } else if (ext === '.webp') {
            contentType = 'image/webp';
          } else if (ext === '.pdf') {
            contentType = 'application/pdf';
          }
          
          // Set response headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', stats.size);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader('Last-Modified', stats.mtime.toUTCString());
          res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin access to files
          res.setHeader('X-Content-Type-Options', 'nosniff'); // Security: prevent MIME type sniffing
          
          // Log response headers
          console.log(`[Server] PRODUCTION: Response headers:`, res.getHeaders());
          
          // Stream the file to the response for better memory usage
          const fileStream = fs.createReadStream(filePath);
          
          // Handle streaming errors
          fileStream.on('error', (error) => {
            console.error(`[Server] PRODUCTION: Error streaming file: ${error.message}`);
            if (!res.headersSent) {
              return res.status(500).send('Error serving file');
            }
            res.end();
          });
          
          // Stream the file directly to response
          fileStream.pipe(res);
        } catch (error) {
          console.error(`[Server] PRODUCTION: Error serving upload:`, error);
          if (!res.headersSent) {
            next(error);
          } else {
            res.end();
          }
        }
      });
      
      // 3. Then serve static client files from the dist directory
      console.log("[Server] Setting up static files route for production");
      app.use(express.static(path.resolve(process.cwd(), "dist/public"), {
        index: false // Disable directory listing
      }));
      
      // 4. Finally, add the catch-all route for client-side routing
      app.get('*', (req, res, next) => {
        // Skip API requests and let them go to 404 if not matched
        if (req.path.startsWith('/api/')) {
          console.log('[Server] Unmatched API request:', req.path);
          return next();
        }
        
        // Uploads should have been handled by the uploads middleware above
        // due to fallthrough: false
        
        // Serve index.html for all other routes for client-side routing
        console.log('[Server] Serving index.html for client route:', req.path);
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
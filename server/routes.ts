import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import multer from "multer";
import path from "path";
import express from "express";
import fs from 'fs';
import { storage } from "./storage";
import { fileManager } from "./utils/fileManager";
import { insertQuoteRequestSchema, insertBookingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendQuoteNotification, sendBookingConfirmation } from "./utils/email";
import { analyzeProjectDescription, estimateProjectCost } from "./utils/grok";
import { createCalendarEvent, getAvailableTimeSlots } from "./utils/calendar";

// Initialize multer with our upload directory
// Create explicit upload directory path using cwd
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
console.log('[Multer Setup] Configuring uploads directory at:', UPLOADS_DIR);
console.log('[Multer Setup] Current working directory:', process.cwd());
console.log('[Multer Setup] Environment:', process.env.NODE_ENV || 'development');

// Record current directory permissions
try {
  const cwdInfo = fs.statSync(process.cwd());
  console.log('[Multer Setup] CWD permissions:', {
    mode: cwdInfo.mode.toString(8),
    uid: cwdInfo.uid,
    gid: cwdInfo.gid,
    isDirectory: cwdInfo.isDirectory(),
    isWritable: Boolean(cwdInfo.mode & fs.constants.W_OK)
  });
} catch (error) {
  console.error('[Multer Setup] Error checking CWD:', error);
}

// Ensure uploads directory exists before configuring multer
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('[Multer Setup] Creating uploads directory:', UPLOADS_DIR);
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    // Set proper permissions on the directory
    fs.chmodSync(UPLOADS_DIR, 0o755);
  }
  
  // Check if directory is writable
  fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
  console.log('[Multer Setup] Uploads directory is writable:', UPLOADS_DIR);
  
  // Get directory info
  const dirInfo = fs.statSync(UPLOADS_DIR);
  console.log('[Multer Setup] Directory info:', {
    mode: dirInfo.mode.toString(8),
    uid: dirInfo.uid,
    gid: dirInfo.gid,
    isDirectory: dirInfo.isDirectory()
  });
  
  // List files in uploads directory
  const files = fs.readdirSync(UPLOADS_DIR);
  console.log('[Multer Setup] Files in uploads directory:', files.length ? files : 'No files');
} catch (error) {
  console.error('[Multer Setup] Error with uploads directory:', error);
}

// Enhanced Multer configuration with better error handling and logging
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        console.log('[Multer] Saving file to:', UPLOADS_DIR, 'File:', file.originalname);
        
        // Make sure directory exists again at upload time
        if (!fs.existsSync(UPLOADS_DIR)) {
          console.log('[Multer] Creating missing uploads directory');
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          // Set proper permissions on the directory
          fs.chmodSync(UPLOADS_DIR, 0o755);
        }
        
        // Verify directory is still writable
        fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
        
        cb(null, UPLOADS_DIR);
      } catch (error) {
        console.error('[Multer] Error setting destination:', error);
        cb(error as Error, '');
      }
    },
    filename: (req, file, cb) => {
      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Clean original filename and ensure valid file extension
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';  // Default to .jpg if no extension
        const sanitizedExt = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext) ? ext : '.jpg';
        const filename = file.fieldname + '-' + uniqueSuffix + sanitizedExt;
        
        console.log('[Multer] Generated filename:', filename, 'for', file.originalname);
        cb(null, filename);
      } catch (error) {
        console.error('[Multer] Error generating filename:', error);
        cb(error as Error, '');
      }
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF images are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Error handling middleware
const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API] Upload error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(500).json({ message: err.message });
  }
  next();
};

export async function registerRoutes(app: Express) {
  // Initialize storage and file manager
  await storage.initialize();
  await fileManager.initialize();

  // Serve uploaded files - use path.resolve with process.cwd() for better compatibility
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  console.log("[API] Serving uploads from:", uploadsDir);
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      console.log('[API] Serving uploaded file:', filePath);
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

  // Project upload endpoint with enhanced logging
  app.post("/api/projects", (req, res, next) => {
    console.log("[API Upload] Received upload request");
    console.log("[API Upload] Request headers:", req.headers);
    console.log("[API Upload] Content type:", req.headers['content-type']);
    console.log("[API Upload] Environment:", process.env.NODE_ENV || 'development');
    
    // Check if uploads directory exists and is writable
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    console.log("[API Upload] Uploads directory absolute path:", uploadsDir);
    
    try {
      // Always ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        console.log("[API Upload] Creating uploads directory");
        fs.mkdirSync(uploadsDir, { recursive: true });
        // Set permissions
        fs.chmodSync(uploadsDir, 0o755);
      }
      
      // Double check it's there and writable
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      
      // Get directory stats
      const stats = fs.statSync(uploadsDir);
      console.log("[API Upload] Uploads directory info:", {
        isDirectory: stats.isDirectory(),
        mode: stats.mode.toString(8),
        size: stats.size,
        uid: stats.uid,
        gid: stats.gid
      });
      
      // List all files in the upload directory
      const files = fs.readdirSync(uploadsDir);
      console.log("[API Upload] Current files in uploads directory:", 
        files.length === 0 ? "No files" : files);
        
      console.log("[API Upload] Uploads directory exists and is writable:", uploadsDir);
    } catch (error) {
      console.error("[API Upload] Error with uploads directory:", error);
      return res.status(500).json({
        message: "Server error: Unable to access uploads directory",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    console.log("[API Upload] Proceeding to multer upload handler");
    next();
  }, upload.array("images", 10), handleUploadError, async (req, res) => {
    try {
      console.log("[API] Project upload request processed by multer");
      console.log("[API] Request body:", req.body);
      console.log("[API] Files received:", req.files ? 
        (req.files as Express.Multer.File[]).map(f => ({
          fieldname: f.fieldname,
          originalname: f.originalname,
          filename: f.filename,
          path: f.path,
          size: f.size
        })) : 'No files uploaded');

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        console.log("[API] No files received");
        return res.status(400).json({ message: "At least one image is required" });
      }

      console.log("[API] Processing", files.length, "files");

      // Process each file and collect URLs
      const imageUrls = [];
      for (const file of files) {
        try {
          // Store just the filename in the database, not the full path
          // This ensures compatibility with both dev and production
          const filename = file.filename;
          const url = `/uploads/${filename}`;
          
          // Verify file exists in the uploads directory
          const fullPath = path.resolve(process.cwd(), 'uploads', filename);
          const fileExists = fs.existsSync(fullPath);
          
          console.log('[API] Generated URL for file:', {
            originalname: file.originalname,
            filename: filename,
            url: url,
            fullPath: fullPath,
            fileExists: fileExists,
            fileSize: fileExists ? fs.statSync(fullPath).size : 'N/A'
          });
          
          // If file doesn't exist or is empty, we have a problem
          if (!fileExists) {
            console.error('[API] File not found in uploads directory:', fullPath);
            return res.status(500).json({ 
              message: "File was uploaded but not found in expected location",
              details: { fullPath, filename }
            });
          }
          
          imageUrls.push(url);
        } catch (error) {
          console.error('[API] Failed to process file:', file.originalname, error);
          return res.status(500).json({ 
            message: "Failed to process uploaded file",
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const projectData = {
        title: req.body.title,
        description: req.body.description,
        imageUrls,
        comment: req.body.comment,
        customerName: req.body.customerName,
        projectDate: new Date(req.body.projectDate),
        serviceId: parseInt(req.body.serviceId)
      };

      console.log("[API] Creating project with data:", JSON.stringify(projectData, null, 2));

      const newProject = await storage.createProject(projectData);
      console.log("[API] Project created successfully:", newProject.id);
      res.status(201).json(newProject);
    } catch (error) {
      console.error("[API] Project creation error:", error);
      res.status(500).json({ 
        message: "Failed to create project", 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Quote requests routes
  app.post("/api/quote-requests", async (req, res) => {
    try {
      console.log("[API] Creating new quote request with data:", req.body);
      const quoteRequest = insertQuoteRequestSchema.parse(req.body);
      const newQuoteRequest = await storage.createQuoteRequest(quoteRequest);
      console.log(`[API] Successfully created quote request #${newQuoteRequest.id}`);
      
      // Fetch service name
      let serviceName = "Unknown Service";
      try {
        const service = await storage.getService(quoteRequest.serviceId);
        if (service) {
          serviceName = service.name;
        }
      } catch (err) {
        console.error("[API] Error fetching service name:", err);
      }

      // Send email notification
      try {
        // Prepare the quote request with service name for email
        const quoteRequestWithService = {
          ...newQuoteRequest,
          serviceName
        };
        
        console.log("[API] Sending quote email notification with data:", quoteRequestWithService);
        await sendQuoteNotification(quoteRequestWithService);
        console.log("[API] Quote notification email sent successfully");
      } catch (emailError) {
        // Don't fail the API call if email sending fails
        console.error("[API] Failed to send email notification:", emailError);
      }
      
      res.status(201).json(newQuoteRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[API] Invalid quote request data:", error.errors);
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
        return;
      }
      console.error("[API] Error creating quote request:", error);
      res.status(500).json({ message: "Failed to create quote request", error: (error as Error).message });
    }
  });

  app.get("/api/quote-requests", async (_req, res) => {
    try {
      console.log("[API] Fetching quote requests");
      const quoteRequests = await storage.getQuoteRequests();
      console.log(`[API] Successfully fetched ${quoteRequests.length} quote requests`);
      res.json(quoteRequests);
    } catch (error) {
      console.error("[API] Error fetching quote requests:", error);
      res.status(500).json({ message: "Failed to fetch quote requests", error: (error as Error).message });
    }
  });

  // Booking routes
  // Get available time slots
  app.get("/api/available-slots", async (req, res) => {
    try {
      const dateParam = req.query.date as string;
      if (!dateParam) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      console.log(`[API] Fetching available slots for date: ${dateParam}`);
      const date = new Date(dateParam);
      
      // Get available time slots from Google Calendar
      const availableSlots = await getAvailableTimeSlots(date);
      
      // Format slots for client
      const formattedSlots = availableSlots.map(slot => ({
        time: slot.toISOString(),
        hour: slot.getHours(),
        minute: slot.getMinutes(),
        formatted: slot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }));
      
      console.log(`[API] Found ${formattedSlots.length} available slots`);
      res.json(formattedSlots);
    } catch (error) {
      console.error("[API] Error fetching available slots:", error);
      res.status(500).json({ 
        message: "Failed to fetch available time slots", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Create booking
  app.post("/api/bookings", async (req, res) => {
    try {
      console.log("[API] Creating new booking with raw data:", req.body);
      let booking = insertBookingSchema.parse(req.body);
      const newBooking = await storage.createBooking(booking);
      console.log(`[API] Successfully created booking #${newBooking.id}`);
      
      // Create Google Calendar event
      let calendarEvent = null;
      try {
        console.log("[API] Creating Google Calendar event for booking");
        calendarEvent = await createCalendarEvent(newBooking);
        console.log("[API] Calendar event created:", calendarEvent ? "Success" : "Skipped");
      } catch (calendarError) {
        console.error("[API] Failed to create calendar event:", calendarError);
        // Don't fail the booking if calendar creation fails
      }
      
      // Send booking confirmation email
      try {
        console.log("[API] Sending booking confirmation email");
        const emailData = {
          ...newBooking,
          calendarEvent: calendarEvent || undefined
        };
        await sendBookingConfirmation(emailData);
        console.log("[API] Booking confirmation email sent successfully");
      } catch (emailError) {
        // Don't fail the API call if email sending fails
        console.error("[API] Failed to send booking confirmation email:", emailError);
      }
      
      // Return the booking with calendar info
      res.status(201).json({
        ...newBooking,
        calendarEventCreated: !!calendarEvent
      });
    } catch (error) {
      if (error instanceof ZodError) {
          console.error("[API] Invalid booking data:", error.errors);
          return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      console.error("[API] Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking", error: (error as Error).message });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      const email = req.query.email as string;
      console.log(`[API] Fetching bookings${email ? ` for email: ${email}` : ""}`);
      const bookings = email
        ? await storage.getBookingsByEmail(email)
        : await storage.getBookings();
      console.log(`[API] Successfully fetched ${bookings.length} bookings`);
      res.json(bookings);
    } catch (error) {
      console.error("[API] Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings", error: (error as Error).message });
    }
  });

  // Services routes
  app.get("/api/services", async (_req, res) => {
    try {
      console.log("[API] Fetching services");
      const services = await storage.getServices();
      console.log(`[API] Successfully fetched ${services.length} services`);
      res.json(services);
    } catch (error) {
      console.error("[API] Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services", error: (error as Error).message });
    }
  });

  // Individual service route
  app.get("/api/services/:id", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      console.log(`[API] Fetching service ${serviceId}`);
      const service = await storage.getService(serviceId);

      if (!service) {
        console.log(`[API] Service not found: ${serviceId}`);
        res.status(404).json({ message: "Service not found" });
        return;
      }

      console.log(`[API] Successfully fetched service: ${service.name}`);
      res.json(service);
    } catch (error) {
      console.error("[API] Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service", error: (error as Error).message });
    }
  });

  // Add projects fetch endpoint
  app.get("/api/projects", async (req, res) => {
    try {
      const serviceId = parseInt(req.query.serviceId as string);
      console.log(`[API] Fetching projects for service ${serviceId}`);
      const projects = await storage.getProjects(serviceId);
      console.log(`[API] Successfully fetched ${projects.length} projects`);
      res.json(projects);
    } catch (error) {
      console.error("[API] Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects", error: (error as Error).message });
    }
  });
  
  // Add a diagnostic endpoint for checking uploads functionality
  app.get("/api/uploads-check", (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    
    try {
      // Check if uploads directory exists
      const dirExists = fs.existsSync(uploadsDir);
      
      // Check if it's writable
      let isWritable = false;
      if (dirExists) {
        try {
          fs.accessSync(uploadsDir, fs.constants.W_OK);
          isWritable = true;
        } catch (e) {
          // Not writable
        }
      }
      
      // Get directory info if it exists
      let dirInfo = null;
      let files = [];
      if (dirExists) {
        const stats = fs.statSync(uploadsDir);
        dirInfo = {
          isDirectory: stats.isDirectory(),
          mode: stats.mode.toString(8),
          size: stats.size,
          uid: stats.uid,
          gid: stats.gid
        };
        
        // List files in directory
        files = fs.readdirSync(uploadsDir);
      }
      
      // Try to write a test file
      let canWrite = false;
      const testFilename = `test-${Date.now()}.txt`;
      const testPath = path.join(uploadsDir, testFilename);
      try {
        fs.writeFileSync(testPath, 'Upload test file');
        canWrite = true;
        // Clean up
        fs.unlinkSync(testPath);
      } catch (e) {
        // Couldn't write
      }
      
      res.json({
        environment: isProduction ? 'production' : 'development',
        uploadsDir,
        dirExists,
        isWritable,
        canWrite,
        dirInfo,
        fileCount: files.length,
        recentFiles: files.slice(-10), // Show last 10 files
        server: {
          cwd: process.cwd(),
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptime: process.uptime()
        }
      });
    } catch (error) {
      res.status(500).json({
        message: "Error checking uploads",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });
  
  // Special simple upload test endpoint for production troubleshooting
  app.post("/api/upload-test", upload.single("testFile"), (req, res) => {
    console.log("[API] Production upload test received");
    
    try {
      // Check if we have a file
      const file = req.file;
      if (!file) {
        console.error("[API] No file received in test upload");
        return res.status(400).json({ 
          success: false,
          message: "No file received"
        });
      }
      
      console.log("[API] Test file received:", {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      });
      
      // Check Multer's file path directly
      const fileExistsAtMulterPath = fs.existsSync(file.path);
      let fileStatsMulter = null;
      try {
        if (fileExistsAtMulterPath) {
          fileStatsMulter = fs.statSync(file.path);
          console.log("[API] File exists at Multer path:", {
            path: file.path,
            size: fileStatsMulter.size,
            mode: fileStatsMulter.mode.toString(8)
          });
        } else {
          console.error("[API] File NOT found at Multer path:", file.path);
        }
      } catch (err) {
        console.error("[API] Error checking Multer path:", err);
      }
      
      // Try multiple possible paths to verify where the file might be
      const possiblePaths = [
        file.path, // Multer's recorded path
        path.resolve(process.cwd(), 'uploads', file.filename),
        path.resolve('./uploads', file.filename),
        // Add any other potential paths here
      ];
      
      console.log("[API] Checking for file in multiple locations:", possiblePaths);
      
      // Check each path and record results
      const pathResults = [];
      let foundPath = null;
      let foundSize = 0;
      
      for (const pathToCheck of possiblePaths) {
        try {
          const exists = fs.existsSync(pathToCheck);
          const result = {
            path: pathToCheck,
            exists: exists,
            stats: null
          };
          
          if (exists) {
            const stats = fs.statSync(pathToCheck);
            result.stats = {
              size: stats.size,
              mode: stats.mode.toString(8),
              created: stats.birthtime.toISOString()
            };
            
            // If we don't have a found path yet, record this one
            if (!foundPath) {
              foundPath = pathToCheck;
              foundSize = stats.size;
            }
          }
          
          pathResults.push(result);
        } catch (statError) {
          pathResults.push({
            path: pathToCheck,
            exists: false,
            error: statError.message
          });
        }
      }
      
      console.log("[API] Path verification results:", pathResults);
      
      // Create a URL for the file
      const fileUrl = `/uploads/${file.filename}`;
      
      // List all files in uploads directory for diagnostics
      let currentFiles = [];
      try {
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
          currentFiles = fs.readdirSync(uploadsDir);
          console.log("[API] Current files in uploads directory:", currentFiles);
        } else {
          console.error("[API] Uploads directory does not exist!");
        }
      } catch (dirError) {
        console.error("[API] Error listing uploads directory:", dirError);
      }
      
      // Return detailed response to help debug
      res.json({
        success: foundPath !== null && foundSize > 0,
        environment: process.env.NODE_ENV || 'development',
        file: {
          originalName: file.originalname,
          savedAs: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          url: fileUrl,
          multerPath: file.path
        },
        verification: {
          foundAt: foundPath,
          pathChecks: pathResults,
          fileList: currentFiles,
          directory: path.resolve(process.cwd(), 'uploads')
        },
        server: {
          cwd: process.cwd(),
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        }
      });
    } catch (error) {
      console.error("[API] Upload test error:", error);
      res.status(500).json({
        success: false,
        message: "Upload test failed",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });
  
  // FileManager diagnostic endpoint
  app.get("/api/filemanager-diagnostics", async (req, res) => {
    console.log("[API] Running FileManager diagnostics");
    
    try {
      // Run diagnostics on the FileManager
      const results = await fileManager.diagnosticCheck();
      
      // Add more system information
      const enhancedResults = {
        ...results,
        system: {
          env: process.env.NODE_ENV || 'development',
          cwd: process.cwd(),
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      };
      
      res.json(enhancedResults);
    } catch (error) {
      console.error("[API] FileManager diagnostics error:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to run FileManager diagnostics',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });
  
  // Project analysis endpoint
  app.post("/api/analyze-project", async (req, res) => {
    try {
      console.log("[API] Analyzing project with data:", req.body);
      
      const { description } = req.body;
      if (!description) {
        return res.status(400).json({ message: "Project description is required" });
      }
      
      // Import the analyzeProjectDescription function
      const { analyzeProjectDescription } = await import("./utils/grok");
      
      // Call the analysis function
      console.log("[API] Calling X.AI API to analyze project");
      const analysis = await analyzeProjectDescription(description);
      
      console.log("[API] Successfully analyzed project");
      res.json({ analysis });
    } catch (error) {
      console.error("[API] Error analyzing project:", error);
      res.status(500).json({ message: "Failed to analyze project", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Calendar available slots endpoint
  app.get("/api/calendar/available-slots", async (req, res) => {
    try {
      console.log("[API] Fetching available calendar slots");
      
      // Get date from query parameter
      const dateString = req.query.date as string;
      if (!dateString) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      // Parse the date
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Get available time slots from calendar
      console.log("[API] Checking calendar availability for date:", dateString);
      
      try {
        const timeSlots = await getAvailableTimeSlots(date);
        console.log("[API] Successfully fetched available slots:", timeSlots.length);
        
        // Include extra metadata in development mode
        if (process.env.NODE_ENV !== 'production') {
          return res.json({
            slots: timeSlots,
            metadata: {
              calendarConfigured: true,
              requestedDate: dateString,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // In production, just return the slots
        return res.json(timeSlots);
      } catch (calendarError) {
        console.error("[API] Calendar API specific error:", calendarError);
        
        // For calendar-specific errors, still fall through to the fallback
        throw calendarError;
      }
    } catch (error) {
      console.error("[API] Error fetching available calendar slots:", error);
      
      // Even if calendar fails, return a default set of business hours
      const fallbackDate = new Date(req.query.date as string);
      const fallbackSlots = Array.from({ length: 9 }, (_, i) => {
        const date = new Date(fallbackDate);
        date.setHours(i + 9, 0, 0, 0); // 9 AM to 5 PM
        return date;
      });
      
      console.log("[API] Returning fallback time slots due to error");
      
      // In development mode, include error info
      if (process.env.NODE_ENV !== 'production') {
        return res.json({
          slots: fallbackSlots,
          metadata: {
            calendarConfigured: false,
            usingFallback: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            requestedDate: req.query.date as string,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // In production, just return the slots
      res.json(fallbackSlots);
    }
  });
}
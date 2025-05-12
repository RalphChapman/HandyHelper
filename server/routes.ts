import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import multer from "multer";
import path from "path";
import express from "express";
import fs from 'fs';
import { google } from 'googleapis';
import { storage } from "./storage";
import { fileManager } from "./utils/fileManager";
import { insertQuoteRequestSchema, insertBookingSchema, insertSupplySchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendQuoteNotification, sendBookingConfirmation, testEmailSending } from "./utils/email";
import { analyzeProjectDescription, estimateProjectCost } from "./utils/grok";
import { createCalendarEvent, getAvailableTimeSlots } from "./utils/calendar";

// Initialize multer with our upload directory from FileManager
// This ensures uploads persist across deployments in production
const isProduction = process.env.NODE_ENV === 'production';
// We need to access the private property - use type assertion to make TypeScript happy
const fileManagerAny = fileManager as any;
const UPLOADS_DIR = fileManagerAny.uploadDir || path.resolve(process.cwd(), isProduction ? '.data/uploads' : 'uploads');

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

  // Serve uploaded files - use the same directory as fileManager for consistency
  console.log("[API] Serving uploads from:", UPLOADS_DIR);
  app.use('/uploads', express.static(UPLOADS_DIR, {
    setHeaders: (res, filePath) => {
      console.log('[API] Serving uploaded file:', filePath);
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (ext === '.png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === '.gif') {
        res.setHeader('Content-Type', 'image/gif');
      }
      // Set cache headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }));
  
  // Serve public files like invoices
  const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
  app.use('/invoices', express.static(invoicesDir, {
    setHeaders: (res, filePath) => {
      console.log('[API] Serving invoice file:', filePath);
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      }
      // Use a shorter cache period for invoices as they may be updated
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }));

  app.get("/api/services", async (_req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("[API] Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid service ID" });
        return;
      }
      const service = await storage.getService(id);
      if (!service) {
        res.status(404).json({ message: "Service not found" });
        return;
      }
      res.json(service);
    } catch (error) {
      console.error("[API] Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.get("/api/services/:id/projects", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid service ID" });
        return;
      }
      const projects = await storage.getProjects(id);
      res.json(projects);
    } catch (error) {
      console.error("[API] Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/services/:id/providers", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid service ID" });
        return;
      }
      const providers = await storage.getServiceProvidersForService(id);
      res.json(providers);
    } catch (error) {
      console.error("[API] Error fetching service providers:", error);
      res.status(500).json({ message: "Failed to fetch service providers" });
    }
  });

  app.get("/api/providers", async (_req, res) => {
    try {
      const providers = await storage.getServiceProviders();
      res.json(providers);
    } catch (error) {
      console.error("[API] Error fetching providers:", error);
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  app.get("/api/providers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid provider ID" });
        return;
      }
      const provider = await storage.getServiceProvider(id);
      if (!provider) {
        res.status(404).json({ message: "Provider not found" });
        return;
      }
      res.json(provider);
    } catch (error) {
      console.error("[API] Error fetching provider:", error);
      res.status(500).json({ message: "Failed to fetch provider" });
    }
  });

  app.get("/api/providers/:id/reviews", async (req, res) => {
    try {
      // Eventually we'll filter reviews by provider
      const reviews = await storage.getReviews();
      res.json(reviews);
    } catch (error) {
      console.error("[API] Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const review = req.body;
      const newReview = await storage.createReview(review);
      res.status(201).json(newReview);
    } catch (error) {
      console.error("[API] Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/reviews", async (_req, res) => {
    try {
      const reviews = await storage.getReviews();
      res.json(reviews);
    } catch (error) {
      console.error("[API] Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get("/api/reviews/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid review ID" });
        return;
      }
      const review = await storage.getReview(id);
      if (!review) {
        res.status(404).json({ message: "Review not found" });
        return;
      }
      res.json(review);
    } catch (error) {
      console.error("[API] Error fetching review:", error);
      res.status(500).json({ message: "Failed to fetch review" });
    }
  });

  app.get("/api/testimonials", async (req, res) => {
    try {
      // Parse the approved param if provided
      const approvedParam = req.query.approved;
      let approved: boolean | undefined = undefined;
      
      if (approvedParam === 'true') {
        approved = true;
      } else if (approvedParam === 'false') {
        approved = false;
      }
      
      const testimonials = await storage.getTestimonials(approved);
      res.json(testimonials);
    } catch (error) {
      console.error("[API] Error fetching testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
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
      res.json(quoteRequests);
    } catch (error) {
      console.error("[API] Error fetching quote requests:", error);
      res.status(500).json({ message: "Failed to fetch quote requests", error: (error as Error).message });
    }
  });

  // Booking routes
  app.post("/api/bookings", async (req, res) => {
    try {
      console.log("[API] Creating new booking with data:", req.body);
      
      // Parse the booking data using the schema
      const booking = insertBookingSchema.parse(req.body);
      
      // Create the booking in the database
      const newBooking = await storage.createBooking(booking);
      console.log(`[API] Successfully created booking #${newBooking.id}`);
      
      // Try to create a calendar event for the booking
      let calendarEvent = null;
      try {
        console.log(`[API] Creating calendar event for booking #${newBooking.id}`);
        calendarEvent = await createCalendarEvent(newBooking);
        console.log(`[API] Calendar event created:`, calendarEvent);
      } catch (calendarError) {
        console.error("[API] Failed to create calendar event:", calendarError);
        // Don't fail the API call if calendar creation fails
      }
      
      // Send email confirmation with calendar info if available
      try {
        console.log("[API] Sending booking confirmation email");
        
        // Add calendar event info to the booking for the email
        const bookingWithEvent = {
          ...newBooking,
          calendarEvent
        };
        
        await sendBookingConfirmation(bookingWithEvent);
        console.log("[API] Booking confirmation email sent successfully");
      } catch (emailError) {
        console.error("[API] Failed to send booking confirmation email:", emailError);
        // Don't fail the API call if email sending fails
      }
      
      // Return the booking with calendar info
      res.status(201).json({
        ...newBooking,
        calendarEvent
      });
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[API] Invalid booking data:", error.errors);
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
        return;
      }
      console.error("[API] Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking", error: (error as Error).message });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      console.log("[API] Fetching bookings");
      
      // Check if filtering by email
      const email = req.query.email as string;
      let bookings;
      
      if (email) {
        console.log(`[API] Filtering bookings by email: ${email}`);
        bookings = await storage.getBookingsByEmail(email);
      } else {
        bookings = await storage.getBookings();
      }
      
      res.json(bookings);
    } catch (error) {
      console.error("[API] Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings", error: (error as Error).message });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid booking ID" });
        return;
      }
      
      console.log(`[API] Fetching booking #${id}`);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        res.status(404).json({ message: "Booking not found" });
        return;
      }
      
      res.json(booking);
    } catch (error) {
      console.error("[API] Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking", error: (error as Error).message });
    }
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid booking ID" });
        return;
      }
      
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ message: "Status is required" });
        return;
      }
      
      console.log(`[API] Updating booking #${id} status to: ${status}`);
      
      const updatedBooking = await storage.updateBookingStatus(id, status);
      if (!updatedBooking) {
        res.status(404).json({ message: "Booking not found" });
        return;
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("[API] Error updating booking status:", error);
      res.status(500).json({ message: "Failed to update booking status", error: (error as Error).message });
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.single("image"), handleUploadError, async (req, res) => {
    try {
      console.log("[API] Processing file upload");
      
      // Check if file was uploaded
      if (!req.file) {
        console.error("[API] No file was uploaded");
        return res.status(400).json({ message: "No file was uploaded" });
      }
      
      console.log("[API] File uploaded:", req.file);
      
      // Verify the file exists and is accessible
      const verified = await fileManager.verifyUpload(req.file.path);
      if (!verified) {
        console.error("[API] Uploaded file verification failed");
        return res.status(500).json({ message: "File upload verification failed" });
      }
      
      // Generate a public URL for the file
      const fileUrl = fileManager.getPublicUrl(req.file.filename);
      
      // Return success response with file info
      console.log("[API] Upload successful, returning file URL:", fileUrl);
      res.json({
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl
      });
    } catch (error) {
      console.error("[API] Error handling file upload:", error);
      res.status(500).json({ message: "Failed to process uploaded file", error: (error as Error).message });
    }
  });

  // File manager diagnostic check endpoint
  app.get("/api/files/diagnostic", async (_req, res) => {
    try {
      console.log("[API] Running FileManager diagnostics");
      const diagnosticResult = await fileManager.diagnosticCheck();
      console.log("[API] FileManager diagnostics completed:", diagnosticResult);
      res.json(diagnosticResult);
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
      return res.json(fallbackSlots);
    }
  });
  
  // Calendar refresh token endpoint
  app.get("/api/calendar/refresh-token", async (_req, res) => {
    try {
      console.log("[API] Manual calendar token refresh requested");
      
      // Import and use the Oauth2 client directly
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground' // Redirect URI used for token generation
      );
      
      // Check if we have the required environment variables
      if (!process.env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
        return res.status(500).json({ 
          success: false,
          message: "Refresh token not configured in environment variables"
        });
      }
      
      // Set refresh token
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
      });
      
      // Get a new access token using the refresh token
      console.log("[API] Requesting new access token with refresh token");
      const newTokenResponse = await oauth2Client.refreshAccessToken();
      console.log("[API] Token refresh response received");
      
      // Initialize calendar client with fresh token to verify it works
      const calendar = google.calendar({
        version: 'v3',
        auth: oauth2Client
      });
      
      // Test the token by making a real API call
      console.log("[API] Testing refreshed token with calendar API call");
      await calendar.calendarList.list();
      console.log("[API] Token refresh successful - able to access calendar API");
      
      return res.json({
        success: true,
        message: "Token refreshed successfully",
        tokenInfo: {
          expiryDate: newTokenResponse.credentials.expiry_date,
          scope: newTokenResponse.credentials.scope
        }
      });
    } catch (error) {
      console.error("[API] Error refreshing calendar token:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to refresh token", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Calendar admin diagnostics endpoint - safely shows information without exposing sensitive data
  app.get("/api/calendar/diagnostics", async (_req, res) => {
    try {
      console.log("[API] Calendar diagnostics requested");
      
      // Check configuration and build diagnostic info
      const diagnostics = {
        configuration: {
          clientConfigured: Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID),
          clientSecretConfigured: Boolean(process.env.GOOGLE_CALENDAR_CLIENT_SECRET),
          refreshTokenConfigured: Boolean(process.env.GOOGLE_CALENDAR_REFRESH_TOKEN),
          clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID ? 
            `${process.env.GOOGLE_CALENDAR_CLIENT_ID.substring(0, 5)}...${process.env.GOOGLE_CALENDAR_CLIENT_ID.slice(-5)}` : null,
          refreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN ? 
            `${process.env.GOOGLE_CALENDAR_REFRESH_TOKEN.substring(0, 5)}...${process.env.GOOGLE_CALENDAR_REFRESH_TOKEN.slice(-5)}` : null
        },
        status: {
          hasErrors: false,
          needsTokenRefresh: false,
          lastChecked: new Date().toISOString()
        },
        regenerationHelper: {
          available: true,
          helperScript: "server/utils/refresh-token-helper.ts",
          instructions: "Run 'npx tsx server/utils/refresh-token-helper.ts' to generate a new refresh token",
          webLink: "https://developers.google.com/oauthplayground",
          refreshEndpoint: "/api/calendar/refresh-token"
        },
        tips: [
          "Always keep your refresh token secure",
          "If calendar integration fails, try the token refresh endpoint first",
          "For persistent issues, generate a new refresh token using the helper script",
          "Make sure the Google Calendar API is enabled in your Google Cloud Console project",
          "Verify that your Google Account has appropriate Calendar access permissions"
        ]
      };
      
      // Test the calendar connection
      try {
        console.log("[API] Testing calendar connection for diagnostics");
        
        // Import and use the Oauth2 client directly
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CALENDAR_CLIENT_ID,
          process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
          'https://developers.google.com/oauthplayground' // Redirect URI used for token generation
        );
        
        // Check if all needed variables are present
        if (!process.env.GOOGLE_CALENDAR_CLIENT_ID || 
            !process.env.GOOGLE_CALENDAR_CLIENT_SECRET ||
            !process.env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
          throw new Error("Missing required configuration variables");
        }
        
        // Set refresh token
        oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
        });
        
        // Initialize calendar client
        const calendar = google.calendar({
          version: 'v3',
          auth: oauth2Client
        });
        
        // Test the token by making a real API call
        await calendar.calendarList.list();
        console.log("[API] Calendar connection test successful");
      } catch (calendarError) {
        console.error("[API] Calendar connection test failed:", calendarError);
        diagnostics.status.hasErrors = true;
        
        // Check if it's a token issue
        const errorMessage = calendarError instanceof Error ? calendarError.message : String(calendarError);
        if (errorMessage.includes('invalid_grant') || 
            errorMessage.includes('expired') || 
            errorMessage.includes('invalid token')) {
          diagnostics.status.needsTokenRefresh = true;
        }
      }
      
      return res.json(diagnostics);
    } catch (error) {
      console.error("[API] Error during calendar diagnostics:", error);
      return res.status(500).json({
        success: false, 
        message: "Failed to run calendar diagnostics", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Project cost estimator endpoint
  app.post("/api/estimate-cost", async (req, res) => {
    try {
      console.log("[API] Cost estimation requested with data:", req.body);
      
      const { description, parameters } = req.body;
      if (!description) {
        return res.status(400).json({ message: "Project description is required" });
      }
      
      // Default parameters if not provided
      const estimateParams = parameters || {
        location: "Charleston, SC",
        complexity: "medium",
        urgency: "normal", 
        materials: "standard"
      };
      
      // Import the cost estimation function
      const { estimateProjectCost } = await import("./utils/grok");
      
      // Call the estimation function
      console.log("[API] Calling X.AI API to estimate project cost");
      const estimateResult = await estimateProjectCost(description, estimateParams);
      
      console.log("[API] Successfully estimated project cost");
      res.json(estimateResult);
    } catch (error) {
      console.error("[API] Error estimating project cost:", error);
      res.status(500).json({ 
        message: "Failed to estimate project cost", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Supplier routes
  app.get("/api/supplies", async (req, res) => {
    try {
      console.log("[API] Fetching supplies");
      
      // Check if filtering by client name
      const clientName = req.query.client as string;
      let supplies;
      
      if (clientName) {
        console.log(`[API] Filtering supplies by client: ${clientName}`);
        supplies = await storage.getSuppliesByClient(clientName);
      } else {
        supplies = await storage.getSupplies();
      }
      
      res.json(supplies);
    } catch (error) {
      console.error("[API] Error fetching supplies:", error);
      res.status(500).json({ message: "Failed to fetch supplies", error: (error as Error).message });
    }
  });
  
  app.get("/api/supplies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid supply ID" });
        return;
      }
      
      console.log(`[API] Fetching supply #${id}`);
      const supply = await storage.getSupply(id);
      
      if (!supply) {
        res.status(404).json({ message: "Supply not found" });
        return;
      }
      
      res.json(supply);
    } catch (error) {
      console.error("[API] Error fetching supply:", error);
      res.status(500).json({ message: "Failed to fetch supply", error: (error as Error).message });
    }
  });
  
  app.post("/api/supplies", async (req, res) => {
    try {
      console.log("[API] Creating new supply with data:", req.body);
      const supply = insertSupplySchema.parse(req.body);
      const newSupply = await storage.createSupply(supply);
      console.log(`[API] Successfully created supply #${newSupply.id}`);
      res.status(201).json(newSupply);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[API] Invalid supply data:", error.errors);
        res.status(400).json({ message: "Invalid supply data", errors: error.errors });
        return;
      }
      console.error("[API] Error creating supply:", error);
      res.status(500).json({ message: "Failed to create supply", error: (error as Error).message });
    }
  });
  
  app.patch("/api/supplies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid supply ID" });
        return;
      }
      
      console.log(`[API] Updating supply #${id} with data:`, req.body);
      const updatedSupply = await storage.updateSupply(id, req.body);
      
      if (!updatedSupply) {
        res.status(404).json({ message: "Supply not found" });
        return;
      }
      
      res.json(updatedSupply);
    } catch (error) {
      console.error("[API] Error updating supply:", error);
      res.status(500).json({ message: "Failed to update supply", error: (error as Error).message });
    }
  });
  
  // Update payment status for a supply
  app.patch("/api/supplies/:id/payment", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid supply ID" });
        return;
      }
      
      const { paid, paymentMethod } = req.body;
      if (paid === undefined) {
        res.status(400).json({ message: "Paid status is required" });
        return;
      }
      
      console.log(`[API] Updating supply #${id} payment status to: ${paid}, method: ${paymentMethod || 'not specified'}`);
      
      const updatedSupply = await storage.updateSupplyPaymentStatus(id, paid, paymentMethod);
      if (!updatedSupply) {
        res.status(404).json({ message: "Supply not found" });
        return;
      }
      
      res.json(updatedSupply);
    } catch (error) {
      console.error("[API] Error updating supply payment status:", error);
      res.status(500).json({ message: "Failed to update supply payment status", error: (error as Error).message });
    }
  });
  
  app.delete("/api/supplies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid supply ID" });
        return;
      }
      
      console.log(`[API] Deleting supply #${id}`);
      const success = await storage.deleteSupply(id);
      
      if (!success) {
        res.status(404).json({ message: "Supply not found or could not be deleted" });
        return;
      }
      
      res.json({ success: true, message: "Supply deleted successfully" });
    } catch (error) {
      console.error("[API] Error deleting supply:", error);
      res.status(500).json({ message: "Failed to delete supply", error: (error as Error).message });
    }
  });

  // For debugging bcrypt in production
  app.get("/api/debug/bcrypt", async (req, res) => {
    try {
      // Import bcrypt dynamically
      const bcrypt = await import('bcrypt');
      
      // Create a test hash for debugging
      const testPassword = 'testPassword123';
      const testHash = await bcrypt.hash(testPassword, 10);
      const isValid = await bcrypt.compare(testPassword, testHash);
      
      // Get the existing admin user and try to verify with that hash too
      const adminUser = await storage.getUserByUsername('admin');
      const adminHash = adminUser?.password || 'not-found';
      const adminValid = adminUser ? await bcrypt.compare(testPassword, adminHash) : false;
      
      res.json({
        test: {
          password: testPassword,
          hash: testHash,
          isValid: isValid
        },
        admin: {
          hash: adminHash.substring(0, 10) + '...',
          isValid: adminValid
        }
      });
    } catch (error) {
      console.error("[API] Error in bcrypt debug:", error);
      res.status(500).json({ 
        message: "Failed to test bcrypt", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Temporary diagnostic route for email testing
  app.get("/api/test-email", async (_req, res) => {
    try {
      console.log("[API] Running email diagnostic tests");
      const result = await testEmailSending();
      res.json({ success: result, message: "Email tests completed" });
    } catch (error) {
      console.error("[API] Email test error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}